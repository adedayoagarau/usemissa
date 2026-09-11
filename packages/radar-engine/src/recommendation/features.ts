import type {
  FeatureContribution,
  OpportunityEvidence,
  RecommendationContext,
  RecommendationSignal,
} from "./types.js";

export const FEATURE_WEIGHTS = {
  "explicit-intent.taxonomy": 20,
  "explicit-intent.type": 10,
  "explicit-intent.saved-search": 10,
  "explicit-intent.goal-stage": 5,
  "feasibility.fee": 8,
  "feasibility.participation": 5,
  "feasibility.preparation": 7,
  "feasibility.accessibility": 5,
  "affinity.work-taxonomy": 7,
  "affinity.organization-follow": 4,
  "affinity.behavior": 4,
  "value-timing.deadline": 6,
  "value-timing.freshness": 5,
  "value-timing.funding": 4,
} as const;

export const GROUP_WEIGHTS = {
  "explicit-intent": 45,
  feasibility: 25,
  affinity: 15,
  "value-timing": 15,
} as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function confidence(signal: RecommendationSignal<unknown> | undefined): number {
  return clamp(signal?.confidence ?? 0);
}

function known<T>(signal: RecommendationSignal<T> | undefined): signal is RecommendationSignal<T> & { value: T } {
  return Boolean(signal && signal.value !== undefined && !signal.missing);
}

function missingReason(signal: RecommendationSignal<unknown> | undefined): string {
  return signal?.missing ?? "not-provided";
}

function add(args: {
  contributions: FeatureContribution[];
  input: {
    group: FeatureContribution["group"];
    key: keyof typeof FEATURE_WEIGHTS;
    value?: number;
    missing?: string;
    confidence: number;
    signalRefs: string[];
  };
}): void {
  const { contributions, input } = args;
  const weight = FEATURE_WEIGHTS[input.key];
  const available = input.value !== undefined && !input.missing;
  const normalized = available ? clamp(input.value ?? 0) : undefined;
  contributions.push({
    group: input.group,
    key: input.key,
    value: input.value,
    missing: available ? undefined : (input.missing as FeatureContribution["missing"]),
    confidence: input.confidence,
    normalized,
    weight,
    contribution: available ? weight * (normalized ?? 0) * input.confidence : 0,
    signalRefs: input.signalRefs,
  });
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function taxonomyOverlap(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.practice) || !known(opportunity.taxonomy)) return undefined;
  const requested = new Set([
    ...context.practice.value.include,
    ...context.practice.value.prefer,
  ].map(normalized));
  if (!requested.size) return undefined;
  const matches = opportunity.taxonomy.value.filter((term) => requested.has(normalized(term.termId)));
  if (!matches.length) return 0;
  return Math.max(...matches.map((term) => term.certainty === "confirmed" ? 1 : term.certainty === "probable" ? 0.75 : 0.5));
}

function savedSearchScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  const scores = context.savedSearches
    .filter((signal) => known(signal))
    .map((signal) => {
      const value = signal.value;
      const direct = value.matchScore ?? value.match;
      if (typeof direct === "number") return clamp(direct);
      const type = value.type;
      return type === opportunity.type ? 1 : undefined;
    })
    .filter((value): value is number => value !== undefined);
  return scores.length ? Math.max(...scores) : undefined;
}

function goalStageScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.opportunityPreferences)) return undefined;
  const preferences = context.opportunityPreferences.value;
  const stages = preferences.careerStages ?? [];
  if (!stages.length) return undefined;
  const matchingRule = opportunity.eligibilityRules.find(
    (rule) => known(rule) && rule.value.key === "career-stage" && Boolean(rule.value.value) && stages.some((stage) => normalized(stage) === normalized(rule.value.value ?? "")),
  );
  return matchingRule ? 1 : 0;
}

function feeScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.opportunityPreferences) || !known(opportunity.fee)) return undefined;
  const preferences = context.opportunityPreferences.value;
  if (opportunity.fee.value.status === "unknown") return undefined;
  if (preferences.noFeeOnly) return opportunity.fee.value.status === "no-fee" ? 1 : 0;
  if (opportunity.fee.value.status === "no-fee") return 1;
  if (!preferences.maxFee || !opportunity.fee.value.amountMinor || opportunity.fee.value.currency !== preferences.maxFee.currency) return undefined;
  return clamp(1 - opportunity.fee.value.amountMinor / Math.max(1, preferences.maxFee.amountMinor));
}

function participationScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.opportunityPreferences) || !known(opportunity.geography)) return undefined;
  const preferred = context.opportunityPreferences.value.participation;
  if (!preferred?.length || opportunity.geography.value.mode === "unknown") return undefined;
  return preferred.includes(opportunity.geography.value.mode) ? 1 : 0;
}

function preparationScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.opportunityPreferences) || !known(opportunity.preparation)) return undefined;
  const capacity = context.opportunityPreferences.value.preparationDays;
  const required = opportunity.preparation.value.estimatedDays;
  if (capacity === undefined || required === undefined) return undefined;
  return clamp(capacity / Math.max(1, required));
}

function accessibilityScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(context.opportunityPreferences) || !context.opportunityPreferences.value.accessibility?.length) return undefined;
  if (!known(opportunity.accessibility)) return undefined;
  const available = new Set(opportunity.accessibility.value.map(normalized));
  const needs = context.opportunityPreferences.value.accessibility;
  return needs.every((need) => available.has(normalized(need))) ? 1 : 0;
}

function workScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(opportunity.taxonomy)) return undefined;
  const workTerms = context.selectedWorks
    .flatMap((signal) => known(signal) ? signal.value.taxonomyTermIds : []);
  if (!workTerms.length) return undefined;
  const opportunityTerms = new Set(opportunity.taxonomy.value.map((term) => normalized(term.termId)));
  return workTerms.some((term) => opportunityTerms.has(normalized(term))) ? 1 : 0;
}

function followScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!opportunity.organization || !known(opportunity.organization)) return undefined;
  const organizationId = opportunity.organization.value.organizationId;
  const followed = context.followedOrganizations.some(
    (signal) => known(signal) && signal.value === organizationId,
  );
  return followed ? 1 : 0;
}

function behaviorScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  const actions = context.behaviorSignals
    .flatMap((signal) => known(signal) && signal.value.opportunityId === opportunity.opportunityId ? [signal.value.action] : []);
  if (!actions.length) return undefined;
  if (actions.includes("saved")) return 1;
  if (actions.includes("opened")) return 0.7;
  if (actions.includes("viewable")) return 0.4;
  if (actions.includes("rendered")) return 0.2;
  return undefined;
}

function deadlineScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(opportunity.deadline) || !opportunity.deadline.value.date) return undefined;
  const deadline = Date.parse(opportunity.deadline.value.date);
  const now = Date.parse(context.now);
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return undefined;
  const days = (deadline - now) / 86_400_000;
  if (days < 0) return 0;
  return clamp(1 - days / 90);
}

function freshnessScore(context: RecommendationContext, opportunity: OpportunityEvidence): number | undefined {
  if (!known(opportunity.source)) return undefined;
  const observed = Date.parse(opportunity.source.observedAt);
  const now = Date.parse(context.now);
  if (!Number.isFinite(observed) || !Number.isFinite(now)) return undefined;
  const ageDays = Math.max(0, (now - observed) / 86_400_000);
  return clamp(1 - ageDays / 90);
}

function fundingScore(opportunity: OpportunityEvidence): number | undefined {
  if (!opportunity.funding || !known(opportunity.funding)) return undefined;
  const value = opportunity.funding.value;
  return value.travelSupport || value.amountMinor !== undefined ? 1 : 0.5;
}

export function buildFeatureContributions(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
): FeatureContribution[] {
  const contributions: FeatureContribution[] = [];
  const preferenceConfidence = confidence(context.opportunityPreferences);
  const taxonomyConfidence = Math.min(confidence(context.practice), confidence(opportunity.taxonomy));

  add({
    contributions,
    input: {
      group: "explicit-intent",
      key: "explicit-intent.taxonomy",
      value: taxonomyOverlap(context, opportunity),
      missing: taxonomyOverlap(context, opportunity) === undefined ? missingReason(context.practice) : undefined,
      confidence: taxonomyConfidence,
      signalRefs: [context.practice.key, opportunity.taxonomy.key],
    },
  });
  const preferences = known(context.opportunityPreferences) ? context.opportunityPreferences.value : undefined;
  const typeValue = preferences?.types?.length ? (preferences.types.includes(opportunity.type) ? 1 : 0) : undefined;
  add({
    contributions,
    input: {
      group: "explicit-intent",
      key: "explicit-intent.type",
      value: typeValue,
      missing: typeValue === undefined ? missingReason(context.opportunityPreferences) : undefined,
      confidence: preferenceConfidence,
      signalRefs: [context.opportunityPreferences.key, "opportunity.type"],
    },
  });
  const saved = savedSearchScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "explicit-intent",
      key: "explicit-intent.saved-search",
      value: saved,
      missing: saved === undefined ? "not-provided" : undefined,
      confidence: saved === undefined ? 0 : 1,
      signalRefs: context.savedSearches.map((signal) => signal.key),
    },
  });
  const stage = goalStageScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "explicit-intent",
      key: "explicit-intent.goal-stage",
      value: stage,
      missing: stage === undefined ? missingReason(context.opportunityPreferences) : undefined,
      confidence: preferenceConfidence,
      signalRefs: [context.opportunityPreferences.key, "opportunity.eligibility.career-stage"],
    },
  });

  const fee = feeScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "feasibility",
      key: "feasibility.fee",
      value: fee,
      missing: fee === undefined ? "not-provided" : undefined,
      confidence: fee === undefined ? 0 : Math.min(preferenceConfidence, confidence(opportunity.fee)),
      signalRefs: [context.opportunityPreferences.key, opportunity.fee.key],
    },
  });
  const participation = participationScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "feasibility",
      key: "feasibility.participation",
      value: participation,
      missing: participation === undefined ? "not-provided" : undefined,
      confidence: participation === undefined ? 0 : Math.min(preferenceConfidence, confidence(opportunity.geography)),
      signalRefs: [context.opportunityPreferences.key, opportunity.geography.key],
    },
  });
  const preparation = preparationScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "feasibility",
      key: "feasibility.preparation",
      value: preparation,
      missing: preparation === undefined ? "not-provided" : undefined,
      confidence: preparation === undefined ? 0 : Math.min(preferenceConfidence, confidence(opportunity.preparation)),
      signalRefs: [context.opportunityPreferences.key, opportunity.preparation?.key ?? "opportunity.preparation"],
    },
  });
  const accessibility = accessibilityScore(context, opportunity);
  add({
    contributions,
    input: {
      group: "feasibility",
      key: "feasibility.accessibility",
      value: accessibility,
      missing: accessibility === undefined ? "not-provided" : undefined,
      confidence: accessibility === undefined ? 0 : Math.min(preferenceConfidence, confidence(opportunity.accessibility)),
      signalRefs: [context.opportunityPreferences.key, opportunity.accessibility?.key ?? "opportunity.accessibility"],
    },
  });

  const work = workScore(context, opportunity);
  add({ contributions, input: { group: "affinity", key: "affinity.work-taxonomy", value: work, missing: work === undefined ? "not-provided" : undefined, confidence: work === undefined ? 0 : 1, signalRefs: context.selectedWorks.map((signal) => signal.key).concat(opportunity.taxonomy.key) } });
  const follow = followScore(context, opportunity);
  add({ contributions, input: { group: "affinity", key: "affinity.organization-follow", value: follow, missing: follow === undefined ? "not-applicable" : undefined, confidence: follow === undefined ? 0 : 1, signalRefs: context.followedOrganizations.map((signal) => signal.key).concat(opportunity.organization?.key ?? "opportunity.organization") } });
  const behavior = behaviorScore(context, opportunity);
  add({ contributions, input: { group: "affinity", key: "affinity.behavior", value: behavior, missing: behavior === undefined ? "not-provided" : undefined, confidence: behavior === undefined ? 0 : 0.5, signalRefs: context.behaviorSignals.map((signal) => signal.key) } });

  const deadline = deadlineScore(context, opportunity);
  add({ contributions, input: { group: "value-timing", key: "value-timing.deadline", value: deadline, missing: deadline === undefined ? "not-provided" : undefined, confidence: deadline === undefined ? 0 : confidence(opportunity.deadline), signalRefs: [opportunity.deadline?.key ?? "opportunity.deadline"] } });
  const freshness = freshnessScore(context, opportunity);
  add({ contributions, input: { group: "value-timing", key: "value-timing.freshness", value: freshness, missing: freshness === undefined ? "not-provided" : undefined, confidence: freshness === undefined ? 0 : confidence(opportunity.source), signalRefs: [opportunity.source.key] } });
  const funding = fundingScore(opportunity);
  add({ contributions, input: { group: "value-timing", key: "value-timing.funding", value: funding, missing: funding === undefined ? "not-provided" : undefined, confidence: funding === undefined ? 0 : confidence(opportunity.funding), signalRefs: [opportunity.funding?.key ?? "opportunity.funding"] } });

  return contributions;
}
