import type {
  LibraryWork,
  OpportunityBrowseProjection,
  OpportunityDetailProjection,
  OpportunityPreferences,
  OrganizationFollow,
  RadarProfile,
  TrackedOpportunity,
  UserProfile,
} from "@missa/radar-engine";
import type {
  OpportunityEvidence,
  RecommendationContext,
  RecommendationSignal,
  SafetyEvidenceAuthority,
} from "@missa/radar-engine";

function signal<T>(input: Omit<RecommendationSignal<T>, "confidence"> & { confidence?: number }): RecommendationSignal<T> {
  return { ...input, confidence: Math.max(0, Math.min(1, input.confidence ?? 1)) };
}

function publicationState(value: "published" | "reviewable" | "suppressed" | "withdrawn" | "unknown" | undefined): OpportunityEvidence["publicationState"] {
  return value ?? "unknown";
}

function geographyMode(location: string | undefined): "remote" | "hybrid" | "onsite" | "travel-required" | "unknown" {
  const normalized = location?.trim().toLocaleLowerCase();
  if (!normalized) return "unknown";
  if (normalized.includes("remote") || normalized.includes("online")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("travel")) return "travel-required";
  return "onsite";
}

export interface CanonicalOpportunityEvidenceOptions {
  versionId: string;
  publicationState?: OpportunityEvidence["publicationState"];
  taxonomyCertainty?: "confirmed" | "probable" | "inferred" | "rejected";
  taxonomyVersion?: number;
  safetyState?: "clear" | "disputed" | "removed" | "unsafe" | "unknown";
  safetyAuthority?: SafetyEvidenceAuthority;
  safetyDecisionId?: string;
  safetySourceRef?: string;
  sourceVersion?: string;
  eligibilityRules?: OpportunityDetailProjection["eligibility"];
  accessibility?: string[];
  accessibilitySourceRef?: string;
  preparationDays?: number;
  funding?: {
    kind: string;
    amountMinor?: number;
    currency?: string;
    travelSupport?: boolean;
  };
  duplicate?: { isDuplicate: boolean; canonicalOpportunityId?: string };
}

export function toOpportunityEvidence(
  projection: OpportunityBrowseProjection | OpportunityDetailProjection,
  options: CanonicalOpportunityEvidenceOptions,
): OpportunityEvidence {
  const taxonomyCertainty = options.taxonomyCertainty ?? "inferred";
  const checkedAt = projection.source.checkedAt;
  const taxonomy = projection.taxonomy?.termIds.map((termId) => ({ termId, certainty: taxonomyCertainty })) ?? [];
  const rules = options.eligibilityRules ?? ("eligibility" in projection ? projection.eligibility : []);
  const sourceConfidence = projection.source.organizationConfirmed || projection.source.verifiedUntil ? 1 : 0.75;

  return {
    opportunityId: projection.id,
    versionId: options.versionId,
    title: projection.title,
    publicationState: publicationState(options.publicationState),
    lifecycle: projection.status === "archived" ? "unknown" : projection.status,
    type: projection.type,
    taxonomy: signal({
      key: "opportunity.taxonomy",
      value: taxonomy,
      source: "canonical-opportunity-taxonomy",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      taxonomyVersion: options.taxonomyVersion ?? projection.taxonomy?.schemeVersion,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: taxonomy.length ? sourceConfidence : 0,
    }),
    eligibilityRules: rules.map((rule) => signal({
      key: `opportunity.eligibility.${rule.key}`,
      value: { key: rule.key, value: rule.value, description: rule.description },
      source: "canonical-opportunity-eligibility",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: rule.certainty === "confirmed" ? 1 : rule.certainty === "inferred" ? 0.5 : 0,
      missing: rule.certainty === "unknown" ? "source-omitted" : undefined,
    })),
    geography: signal({
      key: "opportunity.geography",
      value: { mode: geographyMode(projection.location), regions: projection.location ? [projection.location] : undefined },
      source: "canonical-opportunity-location",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: projection.location ? sourceConfidence : 0,
      missing: projection.location ? undefined : "source-omitted",
    }),
    fee: signal({
      key: "opportunity.fee",
      value: { status: projection.fee.status, amountMinor: projection.fee.amountCents, currency: projection.fee.currency },
      source: "canonical-opportunity-fee",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: projection.fee.status === "unknown" ? 0 : sourceConfidence,
      missing: projection.fee.status === "unknown" ? "source-omitted" : undefined,
    }),
    funding: options.funding
      ? signal({ key: "opportunity.funding", value: options.funding, source: "canonical-opportunity-funding", sourceRef: projection.source.url, observedAt: checkedAt, sourceVersion: options.sourceVersion, explicit: false, confidence: 1 })
      : undefined,
    accessibility: options.accessibility
      ? signal({ key: "opportunity.accessibility", value: options.accessibility, source: "canonical-opportunity-accessibility", sourceRef: options.accessibilitySourceRef ?? projection.source.url, observedAt: checkedAt, sourceVersion: options.sourceVersion, explicit: false, confidence: 1 })
      : signal({ key: "opportunity.accessibility", source: "canonical-opportunity-accessibility", sourceRef: projection.source.url, observedAt: checkedAt, sourceVersion: options.sourceVersion, explicit: false, confidence: 0, missing: "not-modeled" }),
    preparation: signal({
      key: "opportunity.preparation",
      value: { requiredMaterialCount: "requiredMaterials" in projection ? projection.requiredMaterials.length : undefined, estimatedDays: options.preparationDays },
      source: "canonical-opportunity-materials",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: options.preparationDays === undefined ? 0 : sourceConfidence,
      missing: options.preparationDays === undefined ? "not-modeled" : undefined,
    }),
    deadline: signal({
      key: "opportunity.deadline",
      value: { kind: projection.deadline.kind, date: projection.deadline.date, timeZone: projection.deadline.timezone },
      source: "canonical-opportunity-deadline",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: projection.deadline.date ? sourceConfidence : 0,
      missing: projection.deadline.date ? undefined : "source-omitted",
    }),
    source: signal({
      key: "opportunity.source",
      value: { sourceId: projection.source.name, url: projection.source.url, authority: projection.source.organizationConfirmed ? "official-organization" : projection.source.kind },
      source: "canonical-opportunity-source",
      sourceRef: projection.source.url,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: sourceConfidence,
    }),
    safety: signal({
      key: "opportunity.safety",
      value: {
        state: options.safetyState ?? "unknown",
        opportunityVersionId: options.safetyAuthority ? options.versionId : undefined,
        authority: options.safetyAuthority,
        authorityDecisionId: options.safetyDecisionId,
        observedAt: checkedAt,
        sourceEvidenceRefs: [options.safetySourceRef, projection.source.url].filter((value): value is string => Boolean(value)),
      },
      source: "canonical-opportunity-safety",
      sourceRef: options.safetySourceRef,
      observedAt: checkedAt,
      sourceVersion: options.sourceVersion,
      explicit: false,
      confidence: options.safetyState ? 1 : 0,
      missing: options.safetyState ? undefined : "not-modeled",
    }),
    duplicate: options.duplicate
      ? signal({ key: "opportunity.duplicate", value: options.duplicate, source: "canonical-opportunity-deduplication", sourceRef: projection.source.url, observedAt: checkedAt, sourceVersion: options.sourceVersion, explicit: false, confidence: 1 })
      : undefined,
    organization: projection.organizationId && projection.organizationName
      ? signal({ key: "opportunity.organization", value: { organizationId: projection.organizationId, name: projection.organizationName }, source: "canonical-opportunity-organization", sourceRef: projection.source.url, observedAt: checkedAt, sourceVersion: options.sourceVersion, explicit: false, confidence: sourceConfidence })
      : undefined,
  };
}

export interface CanonicalCreatorEvidenceInput {
  accountId: string;
  now: string;
  contextVersion: string;
  user?: UserProfile;
  profiles?: RadarProfile[];
  follows?: OrganizationFollow[];
  works?: LibraryWork[];
  tracked?: TrackedOpportunity[];
  behavior?: Array<{
    opportunityId: string;
    action: "rendered" | "viewable" | "opened" | "saved" | "dismissed";
    occurredAt: string;
  }>;
  /** The legacy profile stores a fee amount without its currency; do not infer one. */
  maxFeeCurrency?: string;
}

export function toRecommendationContext(input: CanonicalCreatorEvidenceInput): RecommendationContext {
  const user = input.user;
  const taxonomy = user?.taxonomyPreferences ?? [];
  const practice = signal({
    key: "creator.practice",
    value: {
      include: taxonomy.filter((item) => item.preference === "include").map((item) => item.termId),
      prefer: taxonomy.filter((item) => item.preference === "prefer").map((item) => item.termId),
      exclude: taxonomy.filter((item) => item.preference === "exclude").map((item) => item.termId),
    },
    source: "creator-profile",
    observedAt: input.now,
    explicit: taxonomy.length > 0,
    confidence: taxonomy.length > 0 ? 1 : 0,
    missing: taxonomy.length > 0 ? undefined : "not-provided",
  });
  const preferences = user?.opportunityPreferences;
  const opportunityPreferences = signal({
    key: "creator.opportunity-preferences",
    value: preferences
      ? {
          types: preferences.types,
          disciplines: preferences.disciplines,
          genres: preferences.genres,
          locations: preferences.locations,
          noFeeOnly: preferences.noFeeOnly,
          maxFee: preferences.maxFeeCents !== undefined && input.maxFeeCurrency
            ? { amountMinor: preferences.maxFeeCents, currency: input.maxFeeCurrency }
            : undefined,
          careerStages: preferences.careerStages,
        }
      : undefined,
    source: "creator-profile",
    observedAt: input.now,
    explicit: Boolean(preferences),
    confidence: preferences ? 1 : 0,
    missing: preferences ? undefined : "not-provided",
  });
  return {
    accountId: input.accountId,
    contextVersion: input.contextVersion,
    now: input.now,
    practice,
    opportunityPreferences,
    savedSearches: (input.profiles ?? []).map((profile) => signal({ key: `creator.saved-search.${profile.id}`, value: { name: profile.name, criteria: profile.criteria }, source: "creator-saved-search", observedAt: input.now, explicit: true, confidence: 1 })),
    followedOrganizations: (input.follows ?? []).map((follow) => signal({ key: `creator.follow.${follow.organizationId}`, value: follow.organizationId, source: "creator-follow", observedAt: follow.followedAt, explicit: true, confidence: 1 })),
    selectedWorks: (input.works ?? []).filter((work) => work.taxonomyAssignments?.length).map((work) => signal({ key: `creator.work.${work.id}`, value: { workId: work.id, taxonomyTermIds: (work.taxonomyAssignments ?? []).map((assignment) => assignment.termId) }, source: "creator-selected-work", observedAt: work.updatedAt, explicit: true, confidence: 1 })),
    trackerSignals: (input.tracked ?? []).map((tracked) => signal({ key: `creator.tracker.${tracked.opportunityId}`, value: { opportunityId: tracked.opportunityId, status: tracked.myStatus, occurredAt: tracked.trackedAt }, source: "creator-tracker", observedAt: tracked.trackedAt, explicit: true, confidence: 0.75 })),
    behaviorSignals: (input.behavior ?? []).map((event, index) => signal({ key: `creator.behavior.${event.opportunityId}.${index}`, value: event, source: "creator-action", observedAt: event.occurredAt, explicit: false, confidence: 0.5 })),
    explicitEligibility: user?.attributes && Object.keys(user.attributes).length
      ? signal({ key: "creator.explicit-eligibility", value: user.attributes, source: "creator-profile", observedAt: input.now, explicit: true, confidence: 1 })
      : undefined,
  };
}
