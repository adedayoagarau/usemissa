import {
  PRE_PRODUCTION_REPLAY_STATE,
  type RecommendationCandidateResult,
  type RecommendationExecutionState,
} from "./types.js";

export interface OrderingDiff {
  changed: boolean;
  baselineOnly: string[];
  currentOnly: string[];
  moved: Array<{ opportunityId: string; baselineIndex: number; currentIndex: number }>;
}

export interface ReplayReport {
  fixtureId: string;
  policyVersion: string;
  deterministic: boolean;
  ordering: OrderingDiff;
  eligibilityViolationCount: number;
  explanationFaithfulnessFailures: string[];
  missingnessCount: number;
  fallback: "not-used" | "used";
  executionState: RecommendationExecutionState;
}

export function diffOrdering(baseline: string[], current: string[]): OrderingDiff {
  const baselineSet = new Set(baseline);
  const currentSet = new Set(current);
  const moved = current
    .map((opportunityId, currentIndex) => ({ opportunityId, currentIndex, baselineIndex: baseline.indexOf(opportunityId) }))
    .filter((item) => item.baselineIndex >= 0 && item.baselineIndex !== item.currentIndex)
    .map(({ opportunityId, baselineIndex, currentIndex }) => ({ opportunityId, baselineIndex, currentIndex }));
  return {
    changed: baseline.length !== current.length || baseline.some((id, index) => current[index] !== id),
    baselineOnly: baseline.filter((id) => !currentSet.has(id)),
    currentOnly: current.filter((id) => !baselineSet.has(id)),
    moved,
  };
}

export function explanationFaithfulnessFailures(results: RecommendationCandidateResult[]): string[] {
  const failures: string[] = [];
  for (const result of results) {
    const contributionKeys = new Set(result.contributions.filter((item) => item.contribution > 0).map((item) => item.key));
    for (const reason of result.explanation.positiveReasons) {
      if (!reason.contributionKeys.some((key) => contributionKeys.has(key))) failures.push(`${result.opportunityId}:${reason.code}`);
    }
  }
  return failures;
}

export function buildReplayReport(input: {
  fixtureId: string;
  policyVersion: string;
  baselineOrder: string[];
  currentResults: RecommendationCandidateResult[];
  repeatedResults?: RecommendationCandidateResult[];
  fallback?: boolean;
  executionState?: RecommendationExecutionState;
}): ReplayReport {
  const currentOrder = input.currentResults
    .filter((result) => result.eligibilityState === "eligible")
    .map((result) => result.opportunityId);
  const repeatedOrder = input.repeatedResults
    ?.filter((result) => result.eligibilityState === "eligible")
    .map((result) => result.opportunityId) ?? currentOrder;
  const missingnessCount = input.currentResults.reduce(
    (count, result) => count + result.contributions.filter((item) => item.missing).length,
    0,
  );
  return {
    fixtureId: input.fixtureId,
    policyVersion: input.policyVersion,
    deterministic: JSON.stringify(currentOrder) === JSON.stringify(repeatedOrder),
    ordering: diffOrdering(input.baselineOrder, currentOrder),
    eligibilityViolationCount: input.currentResults.filter((result) => result.eligibilityState === "ineligible" && result.relevanceScore > 0).length,
    explanationFaithfulnessFailures: explanationFaithfulnessFailures(input.currentResults),
    missingnessCount,
    fallback: input.fallback ? "used" : "not-used",
    executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
  };
}
