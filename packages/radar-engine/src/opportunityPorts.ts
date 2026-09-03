import type { OpportunityType } from "./domain/types.js";
import type { OpportunityContent } from "./content/opportunityContent.js";

export type OpportunityRepositorySort =
  | "recommended"
  | "soonest-deadline"
  | "recently-verified"
  | "recently-added"
  | "free-first"
  | "no-fee-first"
  | "alphabetical";

export type OpportunityRepositoryDeadlineKind =
  | "exact"
  | "inferred"
  | "rolling"
  | "until-filled"
  | "conflicting"
  | "unknown";

export interface OpportunityRepositoryQuery {
  query?: string;
  category?: string;
  types?: OpportunityType[];
  disciplines?: string[];
  genres?: string[];
  taxonomyTermIds?: string[];
  taxonomyIncludeDescendants?: boolean;
  locations?: string[];
  feeStatus?: "no-fee" | "paid" | "unknown";
  maxFeeCents?: number;
  deadlineWithinDays?: number;
  deadlineKind?: "rolling";
  openNow?: boolean;
  verifiedOnly?: boolean;
  simultaneousRequired?: boolean;
  sort: OpportunityRepositorySort;
  cursor?: string;
  limit: number;
}

export interface OpportunityRepositoryContext {
  accountId?: string;
}

export interface OpportunityFacetCounts {
  total: number;
  types: Array<{ value: OpportunityType; count: number }>;
  taxonomyTerms: Array<{ termId: string; count: number }>;
}

export interface OpportunityRepositoryDeadline {
  kind: OpportunityRepositoryDeadlineKind;
  date?: string;
  time?: string;
  timezone?: string;
  raw?: string;
}

export interface OpportunityRepositoryFee {
  status: "no-fee" | "paid" | "unknown";
  amountCents?: number;
  currency?: string;
  raw?: string;
}

export interface OpportunityRepositorySource {
  kind: string;
  name: string;
  url: string;
  checkedAt: string;
  processingSucceededAt?: string;
  organizationConfirmed: boolean;
  verifiedUntil?: string;
}

export interface OpportunityRepositoryTailoringReason {
  code: string;
  label: string;
}

export interface OpportunityRepositoryPersonalState {
  tracked: boolean;
  followingOrganization: boolean;
  tailoringReasons: OpportunityRepositoryTailoringReason[];
}

export interface OpportunityCallPrize {
  rank?: number;
  title?: string;
  amountCents?: number;
  currency?: string;
  description?: string;
  judgeName?: string;
  sourceUrl: string;
  confidence: "confirmed" | "probable" | "unknown";
}

export interface OpportunityCallWindow {
  label?: string;
  opensAt?: string;
  closesAt?: string;
  kind: "exact" | "rolling" | "year-round" | "seasonal" | "unknown";
  timezone?: string;
  current: boolean;
  sourceUrl: string;
  confidence: "confirmed" | "probable" | "unknown";
}

/** Call-level metadata modeled after literary market directories, but always
 * separated from the canonical opportunity row and marked with provenance. */
export interface OpportunityCallProfile {
  callKind: "general-submission" | "themed-call" | "contest" | "prize" | "fellowship" | "grant" | "residency" | "open-call" | "unknown";
  marketKind: "magazine" | "journal" | "press" | "anthology" | "contest" | "award" | "organization" | "unknown";
  publicationFormats: string[];
  acceptedFormats: string[];
  subgenres: string[];
  readingPeriodKind: "exact" | "rolling" | "year-round" | "seasonal" | "unknown";
  readingPeriodLabel?: string;
  issueTheme?: string;
  paymentType?: "none" | "contributor-copy" | "flat-fee" | "royalty" | "varies" | "unknown";
  paymentAmountCents?: number;
  paymentCurrency?: string;
  reprintsAllowed?: boolean;
  previouslyUnpublishedRequired?: boolean;
  multipleSubmissionsAllowed?: boolean;
  wordLimitMin?: number;
  wordLimitMax?: number;
  pageLimitMin?: number;
  pageLimitMax?: number;
  responseTimeDays?: number;
  acceptanceRate?: number;
  statsSampleSize?: number;
  judgeName?: string;
  prizeSummary?: string;
  eligibilitySummary?: string;
  rightsSummary?: string;
  confidence: "confirmed" | "probable" | "unknown";
  sourceUrl: string;
  lastVerifiedAt?: string;
  prizes: OpportunityCallPrize[];
  windows: OpportunityCallWindow[];
}

export interface OpportunityBrowseProjection {
  id: string;
  slug: string;
  /** Internal ordering cursor; transport mappers may omit it from public DTOs. */
  createdAt?: string;
  title: string;
  organizationId?: string;
  organizationName?: string;
  organizationVerified?: boolean;
  identityAssetUrl?: string;
  identityAssetAlt?: string;
  status: "opening-soon" | "open" | "closing-soon" | "deadline-extended" | "closed" | "archived";
  type: OpportunityType;
  discipline?: string;
  genres: string[];
  taxonomy?: {
    schemeVersion: number;
    termIds: string[];
    primaryTermIds: string[];
  };
  deadline: OpportunityRepositoryDeadline;
  fee: OpportunityRepositoryFee;
  prize?: string;
  location?: string;
  /** Whether submissions may be sent to multiple opportunities at once. */
  simultaneousAllowed?: boolean;
  submissionAvailable: boolean;
  source: OpportunityRepositorySource;
  personal?: OpportunityRepositoryPersonalState;
  callProfile?: OpportunityCallProfile;
  content?: OpportunityContent;
}

export interface OpportunityDetailProjection extends OpportunityBrowseProjection {
  openDate?: string;
  eligibility: Array<{
    key: string;
    description: string;
    value?: string;
    certainty: "confirmed" | "inferred" | "unknown";
  }>;
  requiredMaterials: Array<{
    label: string;
    description?: string;
    required: boolean;
    limit?: string;
  }>;
  guidelinesUrl?: string;
  submissionUrl?: string;
  simultaneousAllowed?: boolean;
  changes: Array<{
    kind: string;
    at: string;
    oldValue?: string;
    newValue?: string;
  }>;
  organizationSummary?: string;
  relatedOpportunityIds: string[];
}

export interface OpportunityBrowsePage {
  items: OpportunityBrowseProjection[];
  nextCursor: string | null;
  total: number;
}

/**
 * Storage boundary for public Opportunities. Implementations own SQL,
 * pagination, publication safety, and private augmentation; callers never
 * read RadarEngine.store or the compatibility snapshot tables directly.
 */
export interface OpportunityRepository {
  browse(
    query: OpportunityRepositoryQuery,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityBrowsePage>;
  facetCounts(
    query: OpportunityRepositoryQuery,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityFacetCounts>;
  getById(
    opportunityId: string,
    context?: OpportunityRepositoryContext,
  ): Promise<OpportunityDetailProjection | null>;
}
