import { buildReplayReport, diffOrdering, type OrderingDiff, type ReplayReport } from "./replay.js";
import { recommendFeed, type RecommendationFeedResult } from "./policy.js";
import {
  DETERMINISTIC_FIT_POLICY_VERSION,
  PRE_PRODUCTION_REPLAY_STATE,
  type OpportunityEvidence,
  type RecommendationContext,
  type RecommendationExecutionState,
  type RecommendationPolicyConfig,
  type RecommendationSurface,
} from "./types.js";

export type RecommendationHarnessMode = "replay" | "shadow";

export interface RecommendationHarnessInput {
  context: RecommendationContext;
  opportunities: OpportunityEvidence[];
  baselineOpportunityIds: string[];
  surface: RecommendationSurface;
  query: unknown;
  mode?: RecommendationHarnessMode;
  generatedAt?: string;
  ttlMs?: number;
  executionState?: RecommendationExecutionState;
  config?: RecommendationPolicyConfig;
}

export interface RecommendationHarnessResult {
  mode: RecommendationHarnessMode;
  servedOpportunityIds: string[];
  baselineOpportunityIds: string[];
  policyOpportunityIds: string[];
  policyVersion: typeof DETERMINISTIC_FIT_POLICY_VERSION | "baseline";
  executionState: RecommendationExecutionState;
  usedFallback: boolean;
  accountIsolationPassed: boolean;
  deterministic: boolean;
  ordering: OrderingDiff;
  replayReport: ReplayReport;
  counts: {
    candidates: number;
    eligible: number;
    ineligible: number;
    needsInput: number;
    unknown: number;
  };
}

function rejectActiveExecution(executionState: RecommendationExecutionState): void {
  if (executionState.servingMode === "active") {
    throw new Error("Recommendation harness is baseline-preserving and cannot run in active mode");
  }
}

function diagnostics(
  feed: RecommendationFeedResult,
  repeated: RecommendationFeedResult,
  input: RecommendationHarnessInput,
  executionState: RecommendationExecutionState,
): RecommendationHarnessResult {
  const policyOpportunityIds = feed.usedFallback ? [] : [...feed.orderedOpportunityIds];
  const repeatedOpportunityIds = repeated.usedFallback ? [] : [...repeated.orderedOpportunityIds];
  const replayReport = buildReplayReport({
    fixtureId: `harness:${input.context.accountId}:${input.surface}`,
    policyVersion: feed.policyVersion,
    baselineOrder: input.baselineOpportunityIds,
    currentResults: feed.results,
    repeatedResults: repeated.results,
    fallback: feed.usedFallback,
    executionState,
  });
  const counts = feed.results.reduce(
    (summary, result) => {
      summary.candidates += 1;
      if (result.eligibilityState === "eligible") summary.eligible += 1;
      if (result.eligibilityState === "ineligible") summary.ineligible += 1;
      if (result.eligibilityState === "needs_input") summary.needsInput += 1;
      if (result.eligibilityState === "unknown") summary.unknown += 1;
      return summary;
    },
    { candidates: 0, eligible: 0, ineligible: 0, needsInput: 0, unknown: 0 },
  );
  return {
    mode: input.mode ?? "replay",
    servedOpportunityIds: [...input.baselineOpportunityIds],
    baselineOpportunityIds: [...input.baselineOpportunityIds],
    policyOpportunityIds,
    policyVersion: feed.policyVersion,
    executionState,
    usedFallback: feed.usedFallback,
    accountIsolationPassed: feed.snapshot.accountId === input.context.accountId && repeated.snapshot.accountId === input.context.accountId,
    deterministic: replayReport.deterministic && JSON.stringify(policyOpportunityIds) === JSON.stringify(repeatedOpportunityIds),
    ordering: diffOrdering(input.baselineOpportunityIds, policyOpportunityIds),
    replayReport,
    counts,
  };
}

/**
 * Runs deterministic-fit-v1 for replay or future shadow diagnostics while
 * preserving the existing catalogue order as the only served order.
 *
 * This boundary intentionally rejects active execution. A later promotion
 * must introduce a separately reviewed serving composition and activation
 * manifest rather than changing this safety property implicitly.
 */
export function runRecommendationHarness(input: RecommendationHarnessInput): RecommendationHarnessResult {
  const executionState = input.executionState ?? PRE_PRODUCTION_REPLAY_STATE;
  rejectActiveExecution(executionState);
  const feed = recommendFeed({ ...input, executionState });
  const repeated = recommendFeed({ ...input, executionState });
  return diagnostics(feed, repeated, input, executionState);
}
