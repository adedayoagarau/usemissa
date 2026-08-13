import { DEFAULT_BENCHMARK_THRESHOLDS, type BenchmarkScorecard } from "./evaluation.js";
import type { EvidenceQuality } from "./quality.js";

export interface PromotionGateInput {
  scorecard: BenchmarkScorecard;
  quality: EvidenceQuality;
  duplicateDecision?: "same" | "different" | "review";
  warnings?: string[];
}

export interface PromotionGateResult {
  eligible: boolean;
  publicWrite: false;
  reasons: string[];
}

/** Fail-closed gate. It authorizes review readiness only; it never performs a public write. */
export function evaluatePromotionGate(input: PromotionGateInput): PromotionGateResult {
  const reasons: string[] = [];
  if (input.scorecard.sourceHealth !== "healthy") reasons.push(`source health is ${input.scorecard.sourceHealth}`);
  if (!input.scorecard.destinationSuccess) reasons.push("no authoritative detail or application destination");
  if (input.scorecard.baselineFieldRecall < DEFAULT_BENCHMARK_THRESHOLDS.minBaselineFieldRecall) reasons.push(`baseline field recall ${input.scorecard.baselineFieldRecall} is below ${DEFAULT_BENCHMARK_THRESHOLDS.minBaselineFieldRecall}`);
  if (input.scorecard.exactAgreement < DEFAULT_BENCHMARK_THRESHOLDS.minExactAgreement) reasons.push(`exact field agreement ${input.scorecard.exactAgreement} is below ${DEFAULT_BENCHMARK_THRESHOLDS.minExactAgreement}`);
  if (input.quality.decision !== "review" || input.quality.score < DEFAULT_BENCHMARK_THRESHOLDS.minQualityScore) reasons.push("evidence quality is below review threshold");
  if (input.duplicateDecision === "same") reasons.push("opportunity is already represented");
  if (input.duplicateDecision === "review") reasons.push("opportunity identity requires human review");
  if ((input.warnings ?? []).some((warning) => /failed|invalid|disallow|blocked|403|404|timeout/i.test(warning))) reasons.push("artifact contains a critical warning");
  return { eligible: reasons.length === 0, publicWrite: false, reasons };
}
