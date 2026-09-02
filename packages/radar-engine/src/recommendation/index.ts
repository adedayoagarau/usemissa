export * from "./types.js";
export { evaluateEligibility } from "./eligibility.js";
export { AUTHORITATIVE_SAFETY_AUTHORITIES, resolveSafetyEvidence, safetyEvidenceIsCurrentAndAuthoritative } from "./safety.js";
export { FEATURE_WEIGHTS, GROUP_WEIGHTS, buildFeatureContributions } from "./features.js";
export { deriveExplanation } from "./explain.js";
export { rerankCandidates } from "./rerank.js";
export {
  buildReplayReport,
  diffOrdering,
  explanationFaithfulnessFailures,
  type OrderingDiff,
  type ReplayReport,
} from "./replay.js";
export { calculateRelevanceScore, calculateScoreConfidence } from "./score.js";
export {
  createBaselineFallbackSnapshot,
  createFeedSnapshot,
  stableHash,
  type FeedSnapshotInput,
} from "./snapshot.js";
export {
  evaluateCandidate,
  recommendFeed,
  replayScenario,
  type RecommendationFeedResult,
} from "./policy.js";
export {
  runRecommendationHarness,
  type RecommendationHarnessInput,
  type RecommendationHarnessMode,
  type RecommendationHarnessResult,
} from "./harness.js";
export * from "./writerMatchingEngine.js";
