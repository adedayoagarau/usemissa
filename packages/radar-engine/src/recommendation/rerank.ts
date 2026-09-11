import type {
  RecommendationCandidateResult,
  RecommendationPolicyConfig,
} from "./types.js";

function baseOrder(left: RecommendationCandidateResult, right: RecommendationCandidateResult): number {
  return right.relevanceScore - left.relevanceScore
    || right.scoreConfidence - left.scoreConfidence
    || left.opportunityId.localeCompare(right.opportunityId);
}

function sameTypeCount(items: RecommendationCandidateResult[], type: string): number {
  let count = 0;
  for (let index = items.length - 1; index >= 0 && count < 100; index -= 1) {
    if (items[index]?.opportunityType !== type) break;
    count += 1;
  }
  return count;
}

function organizationCount(items: RecommendationCandidateResult[], organizationId: string | undefined): number {
  if (!organizationId) return 0;
  return items.slice(0, 10).filter((item) => item.organizationId === organizationId).length;
}

function isDiscovery(candidate: RecommendationCandidateResult): boolean {
  return candidate.provenance.candidateGenerators.some((generator) => generator === "fresh-catalogue" || generator === "baseline-open-catalogue");
}

export function rerankCandidates(
  candidates: RecommendationCandidateResult[],
  config: RecommendationPolicyConfig,
): RecommendationCandidateResult[] {
  const eligible = candidates
    .filter((candidate) => candidate.eligibilityState === "eligible")
    .sort(baseOrder);
  const selected: RecommendationCandidateResult[] = [];
  const deferred: RecommendationCandidateResult[] = [];

  while (eligible.length) {
    let selectedIndex = -1;
    for (let index = 0; index < eligible.length; index += 1) {
      const candidate = eligible[index]!;
      const firstTen = selected.length < 10;
      const organizationAtLimit = firstTen
        && candidate.organizationId
        && organizationCount(selected, candidate.organizationId) >= config.maxOrganizationCountInFirstTen;
      const typeAtLimit = sameTypeCount(selected, candidate.opportunityType) >= config.maxConsecutiveSameType;
      const discoveryCount = selected.slice(0, 10).filter(isDiscovery).length;
      const discoveryAtLimit = firstTen && isDiscovery(candidate) && discoveryCount >= config.maxDiscoverySlotsInFirstTen;
      if (organizationAtLimit || typeAtLimit || discoveryAtLimit) continue;
      selectedIndex = index;
      break;
    }
    if (selectedIndex < 0) {
      deferred.push(...eligible.splice(0));
      break;
    }
    selected.push(eligible.splice(selectedIndex, 1)[0]!);
  }

  return [...selected, ...deferred];
}
