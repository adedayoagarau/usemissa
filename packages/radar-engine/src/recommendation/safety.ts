import type { RecommendationSignal, SafetyEvidence, SafetyEvidenceAuthority } from "./types.js";

export const AUTHORITATIVE_SAFETY_AUTHORITIES: SafetyEvidenceAuthority[] = [
  "canonical-moderation",
  "publication-review",
];

export interface SafetyEvidenceResolutionInput {
  opportunityId: string;
  opportunityVersionId: string;
  state: SafetyEvidence["state"];
  authority: SafetyEvidenceAuthority;
  authorityDecisionId: string;
  observedAt: string;
  sourceEvidenceRefs: string[];
  now: string;
  expiresAt?: string;
  sourceVersion?: string;
}

function authoritative(authority: SafetyEvidenceAuthority): boolean {
  return AUTHORITATIVE_SAFETY_AUTHORITIES.includes(authority);
}

function signal(input: {
  key: string;
  value: SafetyEvidence;
  observedAt: string;
  sourceVersion?: string;
  confidence: number;
  missing?: RecommendationSignal<SafetyEvidence>["missing"];
}): RecommendationSignal<SafetyEvidence> {
  return {
    key: input.key,
    value: input.value,
    source: "safety-evidence-resolver",
    observedAt: input.observedAt,
    sourceVersion: input.sourceVersion ?? "deterministic-fit-safety-evidence-v1",
    confidence: input.confidence,
    explicit: false,
    missing: input.missing,
  };
}

export function resolveSafetyEvidence(input: SafetyEvidenceResolutionInput): RecommendationSignal<SafetyEvidence> {
  const base: SafetyEvidence = {
    state: input.state,
    opportunityVersionId: input.opportunityVersionId,
    authority: input.authority,
    authorityDecisionId: input.authorityDecisionId,
    observedAt: input.observedAt,
    expiresAt: input.expiresAt,
    sourceEvidenceRefs: [...input.sourceEvidenceRefs].sort(),
  };
  const key = `opportunity.safety.${input.opportunityId}`;
  if (!authoritative(input.authority)) {
    return signal({ key, value: { ...base, state: "unknown" }, observedAt: input.observedAt, sourceVersion: input.sourceVersion, confidence: 0, missing: "not-modeled" });
  }
  if (input.expiresAt && Date.parse(input.expiresAt) < Date.parse(input.now)) {
    return signal({ key, value: { ...base, state: "unknown" }, observedAt: input.observedAt, sourceVersion: input.sourceVersion, confidence: 0, missing: "stale" });
  }
  return signal({ key, value: base, observedAt: input.observedAt, sourceVersion: input.sourceVersion, confidence: 1 });
}

export function safetyEvidenceIsCurrentAndAuthoritative(evidence: SafetyEvidence, opportunityVersionId: string, now: string): boolean {
  return Boolean(
    evidence.opportunityVersionId === opportunityVersionId &&
    evidence.authority &&
    authoritative(evidence.authority) &&
    (!evidence.expiresAt || Date.parse(evidence.expiresAt) >= Date.parse(now)) &&
    evidence.state !== "unknown",
  );
}
