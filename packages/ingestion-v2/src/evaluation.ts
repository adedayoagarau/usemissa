import type { ExtractionResult } from "./contracts.js";
import type { PageSnapshot } from "./contracts.js";
import type { EvidenceQuality } from "./quality.js";

export interface ExtractionComparison {
  leftFieldCount: number;
  rightFieldCount: number;
  sharedFieldNames: string[];
  disagreements: Array<{ fieldName: string; left: unknown; right: unknown }>;
  agreementRate: number;
}

export interface BenchmarkScorecard {
  sourceHealth: "healthy" | "blocked" | "missing";
  destinationSuccess: boolean;
  baselineFieldRecall: number;
  exactAgreement: number;
  qualityScore: number;
  publishable: false;
  reasons: string[];
}

export interface BenchmarkThresholds {
  minBaselineFieldRecall: number;
  minExactAgreement: number;
  minQualityScore: number;
}

export const DEFAULT_BENCHMARK_THRESHOLDS: BenchmarkThresholds = { minBaselineFieldRecall: 0.8, minExactAgreement: 0.8, minQualityScore: 0.75 };

export interface BenchmarkSummary {
  sampleCount: number;
  healthyCount: number;
  minimumBaselineFieldRecall: number;
  minimumExactAgreement: number;
  averageBaselineFieldRecall: number;
  averageExactAgreement: number;
  allPass: boolean;
  failures: string[];
}

export function summarizeBenchmarkScorecards(scorecards: BenchmarkScorecard[], thresholds: BenchmarkThresholds = DEFAULT_BENCHMARK_THRESHOLDS): BenchmarkSummary {
  const failures = scorecards.flatMap((scorecard, index) => {
    const reasons: string[] = [];
    if (scorecard.sourceHealth !== "healthy") reasons.push(`sample ${index + 1}: source health ${scorecard.sourceHealth}`);
    if (!scorecard.destinationSuccess) reasons.push(`sample ${index + 1}: destination not resolved`);
    if (scorecard.baselineFieldRecall < thresholds.minBaselineFieldRecall) reasons.push(`sample ${index + 1}: recall ${scorecard.baselineFieldRecall}`);
    if (scorecard.exactAgreement < thresholds.minExactAgreement) reasons.push(`sample ${index + 1}: agreement ${scorecard.exactAgreement}`);
    if (scorecard.qualityScore < thresholds.minQualityScore) reasons.push(`sample ${index + 1}: quality ${scorecard.qualityScore}`);
    return reasons;
  });
  const average = (values: number[]) => values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)) : 0;
  return {
    sampleCount: scorecards.length,
    healthyCount: scorecards.filter((scorecard) => scorecard.sourceHealth === "healthy").length,
    minimumBaselineFieldRecall: scorecards.length ? Math.min(...scorecards.map((scorecard) => scorecard.baselineFieldRecall)) : 0,
    minimumExactAgreement: scorecards.length ? Math.min(...scorecards.map((scorecard) => scorecard.exactAgreement)) : 0,
    averageBaselineFieldRecall: average(scorecards.map((scorecard) => scorecard.baselineFieldRecall)),
    averageExactAgreement: average(scorecards.map((scorecard) => scorecard.exactAgreement)),
    allPass: scorecards.length > 0 && failures.length === 0,
    failures,
  };
}

export function canonicalFieldName(fieldName: string): string {
  return ({ organizer: "organization", entry_fee: "fee", cash_prize: "prize", official_website: "submissionUrl", contact_email: "contactEmail" } as Record<string, string>)[fieldName] ?? fieldName;
}

/** A measurable, fail-closed score for deciding whether v2 beats a baseline. */
export function scoreBenchmarkCase(snapshot: PageSnapshot, v2: ExtractionResult, baseline: ExtractionResult, quality: EvidenceQuality, options: { destinationResolved?: boolean } = {}): BenchmarkScorecard {
  const v2Names = new Set(v2.fields.map((field) => canonicalFieldName(field.fieldName)));
  const baselineNames = new Set(baseline.fields.map((field) => canonicalFieldName(field.fieldName)));
  const shared = [...baselineNames].filter((name) => v2Names.has(name));
  const exact = compareExtractionResults(v2, baseline);
  const reasons: string[] = [];
  const sourceHealth = snapshot.statusCode === 403 || snapshot.statusCode === 429 || v2.warnings.some((warning) => /challenge|blocked/i.test(warning)) ? "blocked" : snapshot.statusCode >= 200 && snapshot.statusCode < 300 && !v2.warnings.some((warning) => /not found|404|invalid content/i.test(warning)) ? "healthy" : "missing";
  if (sourceHealth !== "healthy") reasons.push(`source returned HTTP ${snapshot.statusCode}`);
  const destinationSuccess = sourceHealth === "healthy" && (options.destinationResolved === true || v2.candidateLinks.some((candidate) => candidate.role === "detail" || candidate.role === "apply"));
  if (!destinationSuccess) reasons.push("no destination was classified");
  if (!shared.length) reasons.push("v2 shares no fields with the baseline");
  return {
    sourceHealth,
    destinationSuccess,
    baselineFieldRecall: baselineNames.size ? Number((shared.length / baselineNames.size).toFixed(3)) : 0,
    exactAgreement: exact.agreementRate,
    qualityScore: quality.score,
    publishable: false,
    reasons,
  };
}

function comparable(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : JSON.stringify(value);
}

function equivalent(fieldName: string, left: unknown, right: unknown): boolean {
  const a = comparable(left);
  const b = comparable(right);
  if (a === b) return true;
  if (fieldName.toLowerCase().includes("deadline") || fieldName.toLowerCase().includes("date")) {
    const leftDate = Date.parse(a);
    const rightDate = Date.parse(b);
    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) return new Date(leftDate).toISOString().slice(0, 10) === new Date(rightDate).toISOString().slice(0, 10);
  }
  if (fieldName === "description") return a.startsWith(b) || b.startsWith(a);
  if (fieldName === "prize" || fieldName === "fee") {
    const leftMoney: string[] = a.match(/[$€£]\s*[\d,]+(?:\.\d+)?/g) ?? [];
    const rightMoney: string[] = b.match(/[$€£]\s*[\d,]+(?:\.\d+)?/g) ?? [];
    const normalizeMoney = (amount: string) => amount.replace(/[,.]+$/, "");
    return leftMoney.some((amount) => rightMoney.some((other) => normalizeMoney(amount) === normalizeMoney(other)));
  }
  return false;
}

export function compareExtractionResults(left: ExtractionResult, right: ExtractionResult): ExtractionComparison {
  const leftByName = new Map(left.fields.map((field) => [canonicalFieldName(field.fieldName), field.normalizedValue]));
  const rightByName = new Map(right.fields.map((field) => [canonicalFieldName(field.fieldName), field.normalizedValue]));
  const sharedFieldNames = [...leftByName.keys()].filter((name) => rightByName.has(name)).sort();
  const disagreements = sharedFieldNames.filter((name) => !equivalent(name, leftByName.get(name), rightByName.get(name))).map((fieldName) => ({ fieldName, left: leftByName.get(fieldName), right: rightByName.get(fieldName) }));
  return { leftFieldCount: left.fields.length, rightFieldCount: right.fields.length, sharedFieldNames, disagreements, agreementRate: sharedFieldNames.length ? (sharedFieldNames.length - disagreements.length) / sharedFieldNames.length : 0 };
}
