import { evaluateEligibility } from "./eligibility.js";
import { buildFeatureContributions } from "./features.js";
import { deriveExplanation } from "./explain.js";
import { rerankCandidates } from "./rerank.js";
import { buildReplayReport, type ReplayReport } from "./replay.js";
import { calculateRelevanceScore, calculateScoreConfidence } from "./score.js";
import { createBaselineFallbackSnapshot, createFeedSnapshot } from "./snapshot.js";
import {
  DETERMINISTIC_FIT_EXPLANATION_VERSION,
  DETERMINISTIC_FIT_FEATURE_VERSION,
  DETERMINISTIC_FIT_GATE_VERSION,
  DEFAULT_RECOMMENDATION_POLICY_CONFIG,
  PRE_PRODUCTION_REPLAY_STATE,
  type OpportunityEvidence,
  type RecommendationCandidateResult,
  type RecommendationContext,
  type RecommendationExecutionState,
  type RecommendationFeedSnapshot,
  type RecommendationPolicyConfig,
  type RecommendationSurface,
} from "./types.js";

function defaultGenerators(
  result: RecommendationCandidateResult,
): string[] {
  const generators = result.contributions
    .filter((contribution) => contribution.contribution > 0)
    .map((contribution) => {
      if (contribution.group === "explicit-intent") return "explicit-opportunity-preferences";
      if (contribution.group === "affinity") return "followed-organization";
      if (contribution.group === "feasibility") return "deadline-and-preparation";
      return "fresh-catalogue";
    });
  return [...new Set([...generators, "baseline-open-catalogue"])]
    .sort((left, right) => left.localeCompare(right));
}

export function evaluateCandidate(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  config: RecommendationPolicyConfig = DEFAULT_RECOMMENDATION_POLICY_CONFIG,
): RecommendationCandidateResult {
  const eligibility = evaluateEligibility(context, opportunity);
  const contributions = buildFeatureContributions(context, opportunity);
  const relevanceScore = calculateRelevanceScore(contributions, eligibility);
  const scoreConfidence = calculateScoreConfidence(context, opportunity, contributions, eligibility);
  const result: RecommendationCandidateResult = {
    opportunityId: opportunity.opportunityId,
    eligibilityState: eligibility.state,
    relevanceScore,
    scoreConfidence,
    contributions,
    explanation: deriveExplanation(context, opportunity, eligibility, contributions),
    provenance: {
      candidateGenerators: [],
      opportunityVersionId: opportunity.versionId,
      taxonomyVersion: opportunity.taxonomy.taxonomyVersion,
      sourceEvidenceRefs: [opportunity.source.sourceRef, opportunity.source.value?.url].filter((value): value is string => Boolean(value)),
    },
    organizationId: opportunity.organization?.value?.organizationId,
    opportunityType: opportunity.type,
  };
  result.provenance.candidateGenerators = defaultGenerators(result);
  if (config.policyVersion !== result.explanation.policyVersion) {
    throw new Error(`Policy configuration version mismatch: ${config.policyVersion}`);
  }
  if (config.featureVersion !== DETERMINISTIC_FIT_FEATURE_VERSION) {
    throw new Error(`Feature configuration version mismatch: ${config.featureVersion}`);
  }
  if (config.gateVersion !== DETERMINISTIC_FIT_GATE_VERSION) {
    throw new Error(`Gate configuration version mismatch: ${config.gateVersion}`);
  }
  if (config.explanationVersion !== DETERMINISTIC_FIT_EXPLANATION_VERSION) {
    throw new Error(`Explanation configuration version mismatch: ${config.explanationVersion}`);
  }
  return result;
}

export interface RecommendationFeedResult {
  policyVersion: typeof DEFAULT_RECOMMENDATION_POLICY_CONFIG.policyVersion | "baseline";
  results: RecommendationCandidateResult[];
  orderedOpportunityIds: string[];
  snapshot: RecommendationFeedSnapshot;
  usedFallback: boolean;
}

export function recommendFeed(input: {
  context: RecommendationContext;
  opportunities: OpportunityEvidence[];
  surface: RecommendationSurface;
  query: unknown;
  generatedAt?: string;
  ttlMs?: number;
  executionState?: RecommendationExecutionState;
  baselineOpportunityIds: string[];
  config?: RecommendationPolicyConfig;
}): RecommendationFeedResult {
  const generatedAt = input.generatedAt ?? input.context.now;
  const ttlMs = input.ttlMs ?? 15 * 60_000;
  const config = input.config ?? DEFAULT_RECOMMENDATION_POLICY_CONFIG;
  try {
    const results = input.opportunities.map((opportunity) => evaluateCandidate(input.context, opportunity, config));
    const ordered = rerankCandidates(results, config);
    const orderedOpportunityIds = ordered.map((result) => result.opportunityId);
    return {
      policyVersion: config.policyVersion,
      results,
      orderedOpportunityIds,
      snapshot: createFeedSnapshot({
        accountId: input.context.accountId,
        surface: input.surface,
        query: input.query,
        context: input.context,
        orderedOpportunityIds,
        generatedAt,
        ttlMs,
        policyVersion: config.policyVersion,
        executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
      }),
      usedFallback: false,
    };
  } catch {
    return {
      policyVersion: "baseline",
      results: [],
      orderedOpportunityIds: [...input.baselineOpportunityIds],
      snapshot: createBaselineFallbackSnapshot({
        accountId: input.context.accountId,
        surface: input.surface,
        query: input.query,
        context: input.context,
        orderedOpportunityIds: input.baselineOpportunityIds,
        generatedAt,
        ttlMs,
        executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
      }),
      usedFallback: true,
    };
  }
}

export function replayScenario(input: {
  fixtureId: string;
  context: RecommendationContext;
  opportunities: OpportunityEvidence[];
  baselineOrder: string[];
  config?: RecommendationPolicyConfig;
  executionState?: RecommendationExecutionState;
}): ReplayReport {
  const config = input.config ?? DEFAULT_RECOMMENDATION_POLICY_CONFIG;
  const first = input.opportunities.map((opportunity) => evaluateCandidate(input.context, opportunity, config));
  const second = input.opportunities.map((opportunity) => evaluateCandidate(input.context, opportunity, config));
  return buildReplayReport({
    fixtureId: input.fixtureId,
    policyVersion: config.policyVersion,
    baselineOrder: input.baselineOrder,
    currentResults: first,
    repeatedResults: second,
    executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
  });
}
