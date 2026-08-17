import { INGESTION_V2_VERSION, sha256 } from "./contracts.js";
import type { ShadowArtifact } from "./execution.js";
import type { CandidatePublisherReview } from "./publisher.js";
import { resolveCurrentDeadline } from "./deadline.js";

export interface CandidateReplaySourceResult {
  sourceId: string;
  passCount: number;
  candidateCount: number;
  stable: boolean;
  deadlineCoverage: number;
  duplicateCount: number;
  newCandidateCount: number;
  eligible: boolean;
  reasons: string[];
  fingerprints: string[];
}

export interface CandidateReplayGateResult {
  eligible: boolean;
  publicWrite: false;
  requiredPasses: number;
  pipelineVersion: string;
  sources: CandidateReplaySourceResult[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function fieldProjection(fields: ShadowArtifact["extraction"]["fields"]): unknown[] {
  return fields
    // Model prose may vary without the source evidence changing. Stability is
    // therefore calculated from deterministic fields, while the independent
    // per-pass model approval remains a separate required gate below.
    .filter((field) => field.provenance.method !== "deepseek-json-shadow")
    .map((field) => ({ fieldName: field.fieldName, normalizedValue: stableValue(field.normalizedValue ?? field.rawValue) }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function artifactFingerprint(artifact: ShadowArtifact): string {
  const candidates = artifact.publisher?.candidateReviews ?? [];
  const projection = candidates.length
    ? candidates
        .map((candidate) => ({
          key: candidate.candidate.stableId ?? candidate.candidate.canonicalUrl ?? candidate.candidate.url,
          authoritativeUrl: candidate.review.reconciliation.authoritativeUrl,
          decision: candidate.review.decision,
          reconciliation: candidate.review.reconciliation.decision,
          fields: fieldProjection(candidate.extraction.fields),
        }))
        .sort((left, right) => left.key.localeCompare(right.key))
    : {
        decision: artifact.publisher?.decision ?? null,
        reconciliation: artifact.publisher?.reconciliation.decision ?? null,
        links: artifact.extraction.candidateLinks
          .map((candidate) => candidate.stableId ?? candidate.canonicalUrl ?? candidate.url)
          .sort(),
        fields: fieldProjection(artifact.extraction.fields),
      };
  return sha256(JSON.stringify(stableValue(projection)));
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function candidateHasCurrentDeadline(candidate: CandidatePublisherReview, now: Date): boolean {
  const resolved = resolveCurrentDeadline(candidate.extraction.fields, candidate.review.reconciliation.authoritativeUrl, now);
  return Boolean(resolved.date && !resolved.conflict);
}

const CRITICAL_WARNING = /failed|invalid|disallow|blocked|http 40[134]|timeout/i;

function hasUncontainedCriticalWarning(artifact: ShadowArtifact): boolean {
  const coverage = artifact.publisher?.candidateCoverage;
  const quotaFilled = Boolean(coverage && coverage.target > 0 && coverage.completed === coverage.target);
  return artifact.extraction.warnings.some((warning) => {
    if (!CRITICAL_WARNING.test(warning)) return false;
    if (quotaFilled && /^Destination https?:\/\/\S+ failed:/i.test(warning)) return false;
    return true;
  });
}

/** A source may enter canonical review only after complete, exact repeated
 * candidate evidence. This gate never authorizes a public write. */
export function evaluateCandidateReplayGate(
  artifacts: readonly ShadowArtifact[],
  sourceIds: readonly string[],
  requiredPasses = 2,
  options: { now?: Date; existingCanonicalUrls?: ReadonlySet<string> } = {},
): CandidateReplayGateResult {
  const boundedPasses = Math.max(2, Math.trunc(requiredPasses));
  const now = options.now ?? new Date();
  const existingCanonicalUrls = new Set([...(options.existingCanonicalUrls ?? [])].map(normalizeUrl));
  const sources = sourceIds.map((sourceId): CandidateReplaySourceResult => {
    const passes = artifacts.filter((artifact) => artifact.run.sourceId === sourceId);
    const reasons: string[] = [];
    if (passes.length < boundedPasses) reasons.push(`requires ${boundedPasses} complete passes; found ${passes.length}`);
    if (passes.some((artifact) => artifact.run.status !== "completed" || artifact.unchanged)) reasons.push("every replay must be a complete forced extraction");
    if (passes.some((artifact) => artifact.published)) reasons.push("a replay recorded a publication side effect");
    if (passes.some((artifact) => artifact.publisher?.pipelineVersion !== INGESTION_V2_VERSION)) reasons.push("pipeline version mismatch");
    if (passes.some(hasUncontainedCriticalWarning)) reasons.push("critical extraction warning present");
    const fingerprints = passes.map(artifactFingerprint);
    const stable = fingerprints.length >= boundedPasses && new Set(fingerprints).size === 1;
    if (!stable) reasons.push("candidate evidence changed between replay passes");
    const candidateReviews = passes.flatMap((artifact) => artifact.publisher?.candidateReviews ?? []);
    const perPassCandidateCounts = passes.map((artifact) => artifact.publisher?.candidateReviews?.length ?? 0);
    const candidateCount = perPassCandidateCounts[0] ?? 0;
    if (!candidateCount || perPassCandidateCounts.some((count) => count !== candidateCount)) reasons.push("candidate coverage is empty or incomplete");
    if (passes.some((artifact) => {
      const coverage = artifact.publisher?.candidateCoverage;
      return Boolean(coverage && coverage.completed !== coverage.target);
    })) reasons.push("bounded candidate quota was not completed");
    if (candidateReviews.some((candidate) => candidate.review.decision !== "approve" || candidate.review.reconciliation.decision !== "pass")) reasons.push("not every candidate passed deterministic and model review");
    const deadlineCount = candidateReviews.filter((candidate) => candidateHasCurrentDeadline(candidate, now)).length;
    const deadlineCoverage = candidateReviews.length ? deadlineCount / candidateReviews.length : 0;
    if (deadlineCoverage !== 1) reasons.push("not every candidate has a current parseable deadline");
    const latestCandidates = passes.at(-1)?.publisher?.candidateReviews ?? [];
    const duplicateCount = latestCandidates.filter((candidate) => {
      const url = candidate.review.reconciliation.authoritativeUrl;
      return Boolean(url && existingCanonicalUrls.has(normalizeUrl(url)));
    }).length;
    const newCandidateCount = Math.max(0, candidateCount - duplicateCount);
    return { sourceId, passCount: passes.length, candidateCount, stable, deadlineCoverage, duplicateCount, newCandidateCount, eligible: reasons.length === 0, reasons, fingerprints };
  });
  return { eligible: sources.length > 0 && sources.every((source) => source.eligible), publicWrite: false, requiredPasses: boundedPasses, pipelineVersion: INGESTION_V2_VERSION, sources };
}
