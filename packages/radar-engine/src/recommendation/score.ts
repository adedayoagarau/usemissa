import type {
  EligibilityDecision,
  FeatureContribution,
  OpportunityEvidence,
  RecommendationContext,
} from "./types.js";
import { GROUP_WEIGHTS } from "./features.js";

function roundScore(value: number): number {
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function groupScore(contributions: FeatureContribution[], group: FeatureContribution["group"]): number | undefined {
  const available = contributions.filter((item) => item.group === group && item.normalized !== undefined && item.confidence > 0);
  if (!available.length) return undefined;
  const denominator = available.reduce((sum, item) => sum + item.weight * item.confidence, 0);
  if (!denominator) return undefined;
  const numerator = available.reduce((sum, item) => sum + item.contribution, 0);
  return numerator / denominator;
}

export function calculateRelevanceScore(
  contributions: FeatureContribution[],
  eligibility: EligibilityDecision,
): number {
  if (eligibility.state === "ineligible") return 0;
  const groups = (Object.keys(GROUP_WEIGHTS) as FeatureContribution["group"][])
    .map((group) => ({ group, score: groupScore(contributions, group) }))
    .filter((item): item is { group: FeatureContribution["group"]; score: number } => item.score !== undefined);
  if (!groups.length) return 0;
  const numerator = groups.reduce((sum, item) => sum + GROUP_WEIGHTS[item.group] * item.score, 0);
  const denominator = groups.reduce((sum, item) => sum + GROUP_WEIGHTS[item.group], 0);
  return roundScore((numerator / denominator) * 1000);
}

function freshness(context: RecommendationContext, opportunity: OpportunityEvidence): number {
  const observed = Date.parse(opportunity.source.observedAt);
  const now = Date.parse(context.now);
  if (!Number.isFinite(observed) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.max(0, now - observed) / 86_400_000 / 90));
}

function provenance(opportunity: OpportunityEvidence): number {
  let score = 0;
  if (opportunity.source.sourceRef) score += 0.35;
  if (opportunity.source.value?.url) score += 0.25;
  if (opportunity.source.value?.authority === "official-organization") score += 0.4;
  else if (opportunity.source.value?.authority) score += 0.2;
  return Math.min(1, score);
}

function authority(opportunity: OpportunityEvidence): number {
  const publication = opportunity.publicationState === "published" ? 1 : 0;
  const safety = opportunity.safety.value?.state === "clear" ? 1 : 0;
  const source = opportunity.source.value?.authority ? 1 : 0;
  return (publication + safety + source) / 3;
}

export function calculateScoreConfidence(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  contributions: FeatureContribution[],
  eligibility: EligibilityDecision,
): number {
  const declaredMass = contributions.reduce((sum, item) => sum + item.weight, 0);
  const availableMass = contributions
    .filter((item) => item.normalized !== undefined)
    .reduce((sum, item) => sum + item.weight, 0);
  const completeness = declaredMass ? availableMass / declaredMass : 0;
  const freshnessScore = freshness(context, opportunity);
  const provenanceScore = provenance(opportunity);
  const authorityScore = authority(opportunity);
  let score = 1000 * (
    0.35 * completeness +
    0.25 * freshnessScore +
    0.25 * provenanceScore +
    0.15 * authorityScore
  );
  if (eligibility.missing.some((item) => item.code.startsWith("eligibility."))) score = Math.min(score, 400);
  if (eligibility.missing.some((item) => item.code.includes("conflict"))) score = Math.min(score, 500);
  if (eligibility.state === "unknown") score = Math.min(score, 400);
  return roundScore(score);
}
