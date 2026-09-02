export const DETERMINISTIC_FIT_POLICY_VERSION = "deterministic-fit-v1" as const;
export const DETERMINISTIC_FIT_FEATURE_VERSION = "deterministic-fit-features-v1" as const;
export const DETERMINISTIC_FIT_GATE_VERSION = "deterministic-fit-gates-v1" as const;
export const DETERMINISTIC_FIT_EXPLANATION_VERSION = "deterministic-fit-explanations-v1" as const;

export type EligibilityState =
  | "eligible"
  | "ineligible"
  | "needs_input"
  | "unknown";

export type MissingReason =
  | "not-provided"
  | "not-modeled"
  | "source-omitted"
  | "stale"
  | "conflict"
  | "redacted"
  | "not-applicable";

export interface RecommendationSignal<T> {
  key: string;
  value?: T;
  missing?: MissingReason;
  source: string;
  sourceRef?: string;
  observedAt: string;
  effectiveAt?: string;
  taxonomyVersion?: number;
  sourceVersion?: string;
  confidence: number;
  explicit: boolean;
}

export type SafetyEvidenceAuthority =
  | "canonical-moderation"
  | "publication-review"
  | "source-owner"
  | "customer-report";

export interface SafetyEvidence {
  state: "clear" | "disputed" | "removed" | "unsafe" | "unknown";
  opportunityVersionId?: string;
  authority?: SafetyEvidenceAuthority;
  authorityDecisionId?: string;
  observedAt?: string;
  expiresAt?: string;
  sourceEvidenceRefs?: string[];
}

export interface RecommendationContext {
  accountId: string;
  contextVersion: string;
  now: string;
  locale?: RecommendationSignal<string>;
  timeZone?: RecommendationSignal<string>;
  location?: RecommendationSignal<string>;
  practice: RecommendationSignal<{
    include: string[];
    prefer: string[];
    exclude: string[];
  }>;
  opportunityPreferences: RecommendationSignal<{
    types?: string[];
    disciplines?: string[];
    genres?: string[];
    locations?: string[];
    participation?: string[];
    maxFee?: { amountMinor: number; currency: string };
    noFeeOnly?: boolean;
    travel?: "willing" | "unwilling" | "unknown";
    accessibility?: string[];
    preparationDays?: number;
    careerStages?: string[];
    goals?: string[];
  }>;
  savedSearches: Array<RecommendationSignal<Record<string, unknown>>>;
  followedOrganizations: Array<RecommendationSignal<string>>;
  selectedWorks: Array<
    RecommendationSignal<{
      workId: string;
      taxonomyTermIds: string[];
    }>
  >;
  trackerSignals: Array<
    RecommendationSignal<{
      opportunityId: string;
      status: string;
      occurredAt: string;
    }>
  >;
  behaviorSignals: Array<
    RecommendationSignal<{
      opportunityId: string;
      action: "rendered" | "viewable" | "opened" | "saved" | "dismissed";
      occurredAt: string;
    }>
  >;
  explicitEligibility?: RecommendationSignal<Record<string, string>>;
}

export interface OpportunityEvidence {
  opportunityId: string;
  versionId: string;
  title: string;
  publicationState:
    | "published"
    | "reviewable"
    | "suppressed"
    | "withdrawn"
    | "unknown";
  lifecycle:
    | "opening-soon"
    | "open"
    | "closing-soon"
    | "deadline-extended"
    | "closed"
    | "unknown";
  type: string;
  taxonomy: RecommendationSignal<
    Array<{ termId: string; certainty: "confirmed" | "probable" | "inferred" | "rejected" }>
  >;
  eligibilityRules: Array<
    RecommendationSignal<{
      key: string;
      value?: string;
      description: string;
    }>
  >;
  geography: RecommendationSignal<{
    mode: "remote" | "hybrid" | "onsite" | "travel-required" | "unknown";
    regions?: string[];
  }>;
  fee: RecommendationSignal<{
    status: "no-fee" | "paid" | "unknown";
    amountMinor?: number;
    currency?: string;
  }>;
  funding?: RecommendationSignal<{
    kind: string;
    amountMinor?: number;
    currency?: string;
    travelSupport?: boolean;
  }>;
  accessibility?: RecommendationSignal<string[]>;
  preparation?: RecommendationSignal<{
    requiredMaterialCount?: number;
    estimatedDays?: number;
  }>;
  deadline?: RecommendationSignal<{
    kind: string;
    date?: string;
    timeZone?: string;
  }>;
  source: RecommendationSignal<{
    sourceId: string;
    url: string;
    authority: string;
  }>;
  safety: RecommendationSignal<SafetyEvidence>;
  duplicate?: RecommendationSignal<{
    isDuplicate: boolean;
    canonicalOpportunityId?: string;
  }>;
  organization?: RecommendationSignal<{
    organizationId: string;
    name: string;
  }>;
}

export interface EligibilityReason {
  code: string;
  signalKeys: string[];
  customerSafe: boolean;
}

export interface EligibilityDecision {
  state: EligibilityState;
  hardReasons: EligibilityReason[];
  missing: Array<{ code: string; signalKeys: string[] }>;
  gateVersion: typeof DETERMINISTIC_FIT_GATE_VERSION;
}

export type FeatureGroup =
  | "explicit-intent"
  | "feasibility"
  | "affinity"
  | "value-timing";

export interface FeatureContribution {
  group: FeatureGroup;
  key: string;
  value?: number;
  missing?: MissingReason;
  confidence: number;
  normalized?: number;
  weight: number;
  contribution: number;
  signalRefs: string[];
}

export interface PolicyExplanation {
  positiveReasons: Array<{
    code: string;
    label: string;
    contributionKeys: string[];
  }>;
  watchouts: Array<{ code: string; label: string; signalKeys: string[] }>;
  missingInformation: Array<{
    code: string;
    label: string;
    signalKeys: string[];
  }>;
  exclusions: Array<{ code: string; label: string; signalKeys: string[] }>;
  policyVersion: typeof DETERMINISTIC_FIT_POLICY_VERSION;
}

export interface RecommendationCandidateResult {
  opportunityId: string;
  eligibilityState: EligibilityState;
  relevanceScore: number;
  scoreConfidence: number;
  contributions: FeatureContribution[];
  explanation: PolicyExplanation;
  provenance: {
    candidateGenerators: string[];
    opportunityVersionId: string;
    taxonomyVersion?: number;
    sourceEvidenceRefs: string[];
  };
  organizationId?: string;
  opportunityType: string;
}

export type RecommendationSurface =
  | "browse"
  | "search"
  | "home"
  | "digest"
  | "notification"
  | "onboarding-preview";

export type RecommendationEnvironment = "pre-production" | "production";
export type RecommendationServingMode = "replay-only" | "shadow" | "active" | "baseline";

export type RecommendationExecutionState =
  | {
      environment: "pre-production";
      servingMode: "replay-only" | "shadow" | "baseline";
      productionVerification: "unverified" | "catalogue-read-verified";
    }
  | {
      environment: "production";
      servingMode: RecommendationServingMode;
      productionVerification: "verified";
    };

/*
 * This state is the only default available to pure policy/replay callers.
 * In particular, pre-production cannot be typed as active or production-verified.
 */
export const PRE_PRODUCTION_REPLAY_STATE: RecommendationExecutionState = {
  environment: "pre-production",
  servingMode: "replay-only",
  productionVerification: "unverified",
};

export const PRE_PRODUCTION_PRODUCTION_CATALOGUE_REPLAY_STATE: RecommendationExecutionState = {
  environment: "pre-production",
  servingMode: "replay-only",
  productionVerification: "catalogue-read-verified",
};

export interface RecommendationFeedSnapshot {
  feedId: string;
  accountId: string;
  surface: RecommendationSurface;
  queryHash: string;
  contextHash: string;
  policyVersion: typeof DETERMINISTIC_FIT_POLICY_VERSION | "baseline";
  orderedOpportunityIds: string[];
  generatedAt: string;
  expiresAt: string;
  executionState: RecommendationExecutionState;
}

export interface RecommendationPolicyConfig {
  policyVersion: typeof DETERMINISTIC_FIT_POLICY_VERSION;
  featureVersion: typeof DETERMINISTIC_FIT_FEATURE_VERSION;
  gateVersion: typeof DETERMINISTIC_FIT_GATE_VERSION;
  explanationVersion: typeof DETERMINISTIC_FIT_EXPLANATION_VERSION;
  includeNeedsInputInReplay: boolean;
  includeUnknownInReplay: boolean;
  maxOrganizationCountInFirstTen: number;
  maxConsecutiveSameType: number;
  maxDiscoverySlotsInFirstTen: number;
}

export const DEFAULT_RECOMMENDATION_POLICY_CONFIG: RecommendationPolicyConfig = {
  policyVersion: DETERMINISTIC_FIT_POLICY_VERSION,
  featureVersion: DETERMINISTIC_FIT_FEATURE_VERSION,
  gateVersion: DETERMINISTIC_FIT_GATE_VERSION,
  explanationVersion: DETERMINISTIC_FIT_EXPLANATION_VERSION,
  includeNeedsInputInReplay: true,
  includeUnknownInReplay: true,
  maxOrganizationCountInFirstTen: 2,
  maxConsecutiveSameType: 3,
  maxDiscoverySlotsInFirstTen: 1,
};
