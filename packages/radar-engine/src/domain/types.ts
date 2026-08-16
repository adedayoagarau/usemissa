import type { TaxonomyFacetKey } from "@missa/taxonomy";
import type { SourceTrust } from "../registry/types.js";

/**
 * Missa Radar domain model.
 *
 * Mirrors the objects called for in docs/missa-strategy.md § "Radar Requirements":
 * Source, PageSnapshot, OpportunityCandidate, Opportunity, OpportunityVersion,
 * OpportunityChange, TrustSignal, ClaimRequest, VerificationTask, plus the
 * user-side objects (RadarProfile, follows, tracked opportunities, alerts).
 */

export type IsoDateTime = string; // e.g. "2026-07-07T12:00:00.000Z"
export type IsoDate = string; // e.g. "2026-07-07"

export type OpportunityType =
  | "open-call"
  | "magazine"
  | "grant"
  | "award"
  | "fellowship"
  | "residency"
  | "festival"
  | "scholarship"
  | "conference"
  | "rfp"
  | "contest"
  | "pitch"
  | "exhibition"
  | "commission"
  | "other";

/** Statuses exactly as enumerated in the strategy doc. "Claimed by Organization"
 * is modeled as the orthogonal `claimedByOrganizationId` flag on Opportunity so a
 * claimed call can still be Open / Closing Soon; `displayStatus()` surfaces it. */
export type OpportunityStatus =
  | "discovered"
  | "needs-verification"
  | "opening-soon"
  | "open"
  | "closing-soon"
  | "deadline-extended"
  | "closed"
  | "archived"
  | "uncertain"
  | "duplicate";

export type DeadlineKind =
  "exact" | "inferred" | "rolling" | "until-filled" | "conflicting" | "unknown";

export type SourceKind =
  | "organization-website"
  | "directory"
  | "feed"
  | "newsletter"
  | "user-suggested"
  | "partner-feed";

export interface Source {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  /** Organization the source belongs to, when known (org websites). */
  organizationId?: string;
  /** Registry context used to tailor and facet source-derived listings. */
  registryVerticalId?: string;
  registryGroup?: string;
  registryDisciplines?: string[];
  registryTaxonomyTermIds?: string[];
  registryTrust?: SourceTrust;
  registryEligibilityLens?: string;
  registrySourceChannel?: string;
  registryGeography?: string[];
  registryOpportunityTypes?: OpportunityType[];
  registryOrganizationName?: string;
  /** Source position in the opportunity graph (0 = canonical call page). */
  registryTier?: 0 | 1 | 2 | 3;
  /** Directory/feed sources may fan out to linked canonical call pages. */
  followsOutboundLinks?: boolean;
  /** Named source schema used by the discovery worker instead of generic link matching. */
  discoveryAdapterId?: string;
  /** Per-directory bound for large, finite indexes. Hard-capped by the worker. */
  discoveryLinkLimit?: number;
  /** Some permitted sources require browser-compatible request headers. */
  discoveryRequestProfile?: "browser-compatible";
  /** Registry/discovery source that produced this URL. Preserves the source graph. */
  discoveredFromSourceId?: string;
  /** Stable identifier and lifecycle reported by a machine-readable parent feed. */
  discoveryExternalId?: string;
  discoveryExternalStatus?: string;
  /** Structured first-party API evidence attached to a canonical call page. */
  discoveryMachineRecord?: {
    title: string;
    organizationName?: string;
    description?: string;
    openDate?: string;
    deadlineDate?: string;
    applicationUrl?: string;
    evidenceUrl: string;
  };
  /** Polite per-source cadence. */
  checkIntervalHours: number;
  active: boolean;
  /** Latest fetch attempt, including failures. Kept as the scheduler cursor. */
  lastCheckedAt?: IsoDateTime;
  /** Last terminal fetch outcome; distinguishes gone pages from never-attempted sources. */
  lastFetchStatus?: "ok" | "gone" | "error";
  lastFetchFailureReason?: string;
  /** First time the source passed verification or completed a usable fetch. */
  firstVerifiedAt?: IsoDateTime;
  /** Latest fetch that returned usable page content. */
  lastSuccessfulFetchAt?: IsoDateTime;
  /** Latest content hash observed, even when extraction later failed. */
  lastFetchedContentHash?: string;
  /** Latest content hash that completed extraction and canonicalization. */
  lastContentHash?: string;
  /** Latest time content completed extraction and canonicalization. */
  lastProcessedAt?: IsoDateTime;
  consecutiveFailures: number;
  /** Processing failures are tracked separately from network failures. */
  consecutiveProcessingFailures?: number;
  /** Independent cursor for directory fan-out; never shares Radar's cadence. */
  discoveryLastCheckedAt?: IsoDateTime;
  discoveryConsecutiveFailures?: number;
  /** HTTP validators persisted independently from canonical-page fetch state. */
  discoveryEtag?: string;
  discoveryLastModified?: string;
  /** Persisted scheduler target; absent means immediately due when never checked. */
  nextCheckAt?: IsoDateTime;
}

export type FetchStatus = "ok" | "error" | "gone";

export interface PageSnapshot {
  id: string;
  sourceId: string;
  url: string;
  fetchedAt: IsoDateTime;
  status: FetchStatus;
  contentHash: string;
  /** Raw text content kept for audit ("show the evidence"). */
  content: string;
}

export interface FeeInfo {
  /** Cents. 0 means explicitly free. */
  amountCents?: number;
  currency?: string;
  disclosed: boolean;
  raw?: string;
}

export interface EligibilityRule {
  /** Machine key matched against user attributes, e.g. "career-stage", "location", "nonprofit-status". */
  key: string;
  description: string;
  /** Expected value when checkable, e.g. "emerging", "nigeria", "501c3". */
  value?: string;
}

/** A taxonomy proposal is provenance-first: an extractor can suggest several
 * terms, but only an unambiguous candidate is safe to persist as canonical. */
export interface TaxonomyAssignmentProposal {
  facet: TaxonomyFacetKey;
  sourcePhrase: string;
  normalizedPhrase: string;
  candidateTermIds: string[];
  termId?: string;
  mapping: "exact" | "close" | "broad" | "narrow" | "legacy";
  confidence: number;
  certainty: "confirmed" | "probable" | "inferred" | "unknown" | "rejected";
  reason: string;
  assignmentOrigin?:
    | "extractor"
    | "registry"
    | "backfill"
    | "organization"
    | "reviewer"
    | "user"
    | "import";
  /** Evidence coordinates are carried from the source snapshot into review
   * and relational persistence; they are never inferred from the label. */
  evidenceUrl?: string;
  snapshotId?: string;
}

export interface DeadlineInfo {
  kind: DeadlineKind;
  date?: IsoDate;
  raw?: string;
}

/** Structured extraction result for one page, before dedup/canonicalization. */
export interface OpportunityCandidate {
  sourceId: string;
  /** Stable record identity from an official machine feed, when available. */
  discoveryExternalId?: string;
  snapshotId: string;
  url: string;
  extractedAt: IsoDateTime;
  title?: string;
  organizationName?: string;
  /** First-party destination extracted from the listing or linked evidence. */
  officialUrl?: string;
  type: OpportunityType;
  genres: string[];
  /** Canonical proposals emitted beside legacy genre strings during cutover. */
  taxonomyAssignments?: TaxonomyAssignmentProposal[];
  openDate?: IsoDate;
  deadline: DeadlineInfo;
  fee: FeeInfo;
  prize?: string;
  eligibility: EligibilityRule[];
  requiredMaterials: string[];
  submissionUrl?: string;
  contactEmailPresent: boolean;
  simultaneousAllowed?: boolean;
  openSignals: string[];
  closeSignals: string[];
  closedSignals: string[];
  suspiciousSignals: string[];
  /** Validation problems; a candidate with fatal issues never becomes an Opportunity. */
  issues: string[];
  /** 0–100 extraction confidence from deterministic validators. */
  extractionConfidence: number;
}

export interface TrustSignal {
  key: string;
  label: string;
  present: boolean;
  /** Positive builds trust, negative erodes it. */
  weight: number;
}

export interface OpportunityScores {
  freshness: number; // 0-100, decays since last successful check
  confidence: number; // 0-100, extraction certainty
  trust: number; // 0-100, weighted trust signals
}

/** Immutable snapshot of an opportunity's fields at a point in time. */
export interface OpportunityVersion {
  id: string;
  opportunityId: string;
  createdAt: IsoDateTime;
  snapshotId?: string;
  fields: OpportunityFields;
}

export interface OpportunityFields {
  title: string;
  organizationName?: string;
  organizationId?: string;
  type: OpportunityType;
  genres: string[];
  /** Canonical assignments survive dedup and are dual-written with legacy fields. */
  taxonomyAssignments?: TaxonomyAssignmentProposal[];
  openDate?: IsoDate;
  deadline: DeadlineInfo;
  fee: FeeInfo;
  prize?: string;
  eligibility: EligibilityRule[];
  requiredMaterials: string[];
  submissionUrl?: string;
  guidelinesUrl?: string;
  location?: string;
  simultaneousAllowed?: boolean;
  contactEmailPresent: boolean;
}

export type ChangeKind =
  | "deadline-changed"
  | "deadline-extended"
  | "fee-changed"
  | "genres-changed"
  | "eligibility-changed"
  | "submission-url-changed"
  | "call-closed"
  | "call-reopened"
  | "guidelines-updated"
  | "page-gone";

export interface OpportunityChange {
  id: string;
  opportunityId: string;
  at: IsoDateTime;
  kind: ChangeKind;
  field: string;
  oldValue?: string;
  newValue?: string;
  snapshotId?: string;
}

/** One historical open/close cycle, used by the prediction engine. */
export interface OpportunityCycle {
  openedOn?: IsoDate;
  closedOn?: IsoDate;
}

export interface OpeningPrediction {
  expectedOpenStart: IsoDate;
  expectedOpenEnd: IsoDate;
  confidence: "high" | "medium" | "low";
  basedOnCycles: number;
}

export interface Opportunity {
  id: string;
  createdAt: IsoDateTime;
  status: OpportunityStatus;
  fields: OpportunityFields;
  /** Canonical page this opportunity was discovered from. */
  sourceId: string;
  sourceUrl: string;
  /** Additional sources found to describe the same opportunity (dedup). */
  alternateSourceIds: string[];
  /** When set, this record is a duplicate of the canonical opportunity. */
  duplicateOfId?: string;
  claimedByOrganizationId?: string;
  /** Field overrides supplied by the claiming organization; authoritative. */
  organizationOverrides?: Partial<OpportunityFields>;
  scores: OpportunityScores;
  trustSignals: TrustSignal[];
  lastCheckedAt: IsoDateTime;
  lastChangedAt: IsoDateTime;
  /** Raw extraction confidence from the latest validated candidate. */
  lastExtractionConfidence: number;
  /** Signals observed on the most recent page version, used by status derivation. */
  lastOpenSignal: boolean;
  lastClosedSignal: boolean;
  lastSuspiciousSignals: string[];
  lastDeadlineExtensionAt?: IsoDateTime;
  /** Deadline published before the latest deadline change (drives Deadline Extended). */
  previousDeadline?: IsoDate;
  pastCycles: OpportunityCycle[];
  prediction?: OpeningPrediction;
  /** Unresolved conflicting values seen across sources, e.g. two deadlines. */
  conflicts: string[];
}

export interface Organization {
  id: string;
  name: string;
  domains: string[];
  verified: boolean;
  /** Commercial plan and seat override are optional for backwards-compatible imported orgs. */
  billingTier?: OrganizationBillingTier;
  seatLimit?: number;
  billingStatus?: OrganizationBillingStatus;
  billingCustomerId?: string;
  billingSubscriptionId?: string;
  billingCancelAtPeriodEnd?: boolean;
  stripeConnectAccountId?: string;
  stripeConnectStatus?: "not-connected" | "pending" | "connected";
}

export type OrganizationBillingTier =
  "free" | "indie" | "pro" | "program" | "enterprise";
export type OrganizationBillingStatus =
  "inactive" | "trialing" | "active" | "past_due" | "canceled";

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface ClaimRequest {
  id: string;
  opportunityId: string;
  organizationId: string;
  requestedBy: string;
  requestedAt: IsoDateTime;
  /** e.g. "domain-match", "manual-review" */
  verificationMethod: string;
  status: ClaimStatus;
  decidedAt?: IsoDateTime;
  decidedBy?: string;
  note?: string;
}

export type VerificationReason =
  | "low-confidence"
  | "conflicting-data"
  | "suspected-duplicate"
  | "suspicious-language"
  | "claim-review"
  | "stale-listing"
  | "page-gone";

export interface VerificationTask {
  id: string;
  opportunityId?: string;
  claimRequestId?: string;
  reason: VerificationReason;
  details: string;
  createdAt: IsoDateTime;
  status: "open" | "resolved" | "dismissed";
  resolvedAt?: IsoDateTime;
  resolvedBy?: string;
}

/** A user's saved search — what the strategy doc calls Opportunity Matching. */
export interface RadarProfile {
  id: string;
  userId: string;
  name: string;
  criteria: MatchCriteria;
}

export interface MatchCriteria {
  types?: OpportunityType[];
  /** Canonical taxonomy IDs selected by the submitter. Legacy genres remain
   * supported during the additive migration window. */
  taxonomyTermIds?: string[];
  taxonomyIncludeDescendants?: boolean;
  genres?: string[];
  keywords?: string[];
  maxFeeCents?: number;
  noFeeOnly?: boolean;
  verifiedOnly?: boolean;
  deadlineWithinDays?: number;
  locations?: string[];
  simultaneousRequired?: boolean;
}

/** Private creator-side configuration used to narrow and explain opportunity matches. */
export interface OpportunityPreferences {
  types: OpportunityType[];
  /** Legacy free-form discipline values remain available during taxonomy cutover. */
  disciplines: string[];
  genres: string[];
  locations: string[];
  careerStages: string[];
  maxFeeCents?: number;
  noFeeOnly: boolean;
  deadlineWithinDays?: number;
  simultaneousRequired: boolean;
}

export type OpportunityPreferencesPatch = Partial<
  Omit<OpportunityPreferences, "types">
> & { types?: string[] };

/** Attributes checked against EligibilityRules for the Fit Score. */
export interface UserAttributes {
  [key: string]: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  /** Optional public identity bio. Matching inputs remain private. */
  bio?: string;
  /** Optional visibility controls; legacy rows use effective defaults. */
  privacy?: Partial<ProfilePrivacySettings>;
  attributes: UserAttributes;
  genres: string[];
  /** Canonical private practice preferences; legacy genres remain during cutover. */
  taxonomyPreferences?: TaxonomyPreference[];
  /** Private opportunity search configuration; absent means not configured yet. */
  opportunityPreferences?: OpportunityPreferences;
  /** The creator explicitly published the public Profile at this time. */
  publicProfilePublishedAt?: IsoDateTime;
  /** Durable dismissal for the optional first-Profile handle prompt. */
  handlePromptDismissedAt?: IsoDateTime;
  /** Content explicitly saved to the public portfolio surface. */
  publicPortfolio?: PublicPortfolio;
}

export type ProfileSocialService =
  | "website"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "bluesky"
  | "x"
  | "mastodon"
  | "substack"
  | "medium"
  | "behance"
  | "vimeo"
  | "soundcloud"
  | "bandcamp"
  | "other";

export interface ProfileSocialLink {
  id: string;
  service: ProfileSocialService;
  url: string;
}

export interface ProfileSelectedWork {
  id: string;
  title: string;
  publication?: string;
  year?: number;
  url?: string;
  description?: string;
}

/** A creator-authored public snapshot. Presence here is an explicit publish act. */
export interface PublicPortfolio {
  profileImageUrl?: string;
  headline?: string;
  oneLine?: string;
  openTo?: string;
  socialLinks: ProfileSocialLink[];
  selectedWorks: ProfileSelectedWork[];
}

export interface PublicPortfolioPublishInput extends PublicPortfolio {
  displayName: string;
  bio?: string;
}

export interface TaxonomyPreference {
  termId: string;
  preference: "include" | "prefer" | "exclude";
  weight: number;
}

/** Private, reusable creative material owned by one submitter. */
export interface LibraryWorkTaxonomyAssignment {
  termId: string;
  primary: boolean;
  assignmentOrigin:
    "user" | "import" | "extractor" | "organization" | "reviewer";
}

export interface LibraryWork {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fileId?: string;
  /** Canonical private terms used to explain opportunity matches. */
  taxonomyAssignments?: LibraryWorkTaxonomyAssignment[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** File metadata only. Bytes live in the configured private blob provider. */
export interface LibraryFile {
  id: string;
  userId: string;
  filename: string;
  contentType: string;
  byteLength: number;
  storageKey: string;
  createdAt: IsoDateTime;
}

/** A reusable response such as an artist statement or short bio. */
export interface SavedAnswer {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** A private user-defined grouping of tracked opportunities. */
export interface CustomList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  /** Semantic token such as `coral` or `sage`, never a raw CSS value. */
  colorToken?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  archivedAt?: IsoDateTime;
}

/** Composite-key membership; one opportunity may belong to several Lists. */
export interface CustomListMembership {
  listId: string;
  userId: string;
  opportunityId: string;
  addedAt: IsoDateTime;
}

/** A private, opportunity-specific preparation state for one tracked call. */
export type ChecklistItemState =
  "missing" | "ready" | "complete" | "not-applicable";

export type ChecklistItemSource =
  "opportunity-required-material" | "user-added";
export type ChecklistSourceConfidence = "high" | "possible" | "unknown";

export interface OpportunityChecklist {
  id: string;
  userId: string;
  opportunityId: string;
  /** The tracking timestamp that caused this checklist to be created. */
  trackedAt: IsoDateTime;
  /** The opportunity version whose required materials were last reconciled. */
  sourceVersion?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  label: string;
  /** Lower-case, whitespace-collapsed key used to reconcile refreshes. */
  normalizedKey: string;
  order: number;
  state: ChecklistItemState;
  libraryWorkId?: string;
  libraryFileId?: string;
  savedAnswerId?: string;
  note?: string;
  source: ChecklistItemSource;
  sourceConfidence?: ChecklistSourceConfidence;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type ProfileVisibility = "public" | "private";

export interface ProfilePrivacySettings {
  displayName: ProfileVisibility;
  bio: ProfileVisibility;
  trackedOpportunityCount: ProfileVisibility;
}

export interface ProfilePrivacyPatch {
  displayName?: ProfileVisibility;
  bio?: ProfileVisibility;
  trackedOpportunityCount?: ProfileVisibility;
}

/** The intentionally small public projection used by public profile pages. */
export interface PublicUserProfile {
  id?: string;
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  headline?: string;
  oneLine?: string;
  openTo?: string;
  socialLinks?: ProfileSocialLink[];
  selectedWorks?: ProfileSelectedWork[];
  publishedAt?: IsoDateTime;
  isPrivate?: true;
}

export interface UserProfilePatch {
  displayName?: string;
  bio?: string;
  taxonomyPreferences?: TaxonomyPreference[];
  opportunityPreferences?: OpportunityPreferencesPatch;
}

/**
 * A login identity. Deliberately minimal — one email/password per person,
 * linked to at most one UserProfile (their tracker) and zero or more
 * OrgMemberships (which organizations they can act for). This is the "Now"
 * layer from the auth recommendation; WorkOS/SSO/SCIM is a separate,
 * later concern that sits in front of this, not a replacement for it.
 */
export interface Account {
  id: string;
  email: string;
  /** "<salt-hex>:<hash-hex>" — see auth/crypto.ts. */
  passwordHash: string;
  /** Stable identity from the managed authentication provider, when linked. */
  authUserId?: string;
  authProvider?: 'neon-auth';
  /** The individual tracker this account owns, if any. */
  userId?: string;
  /** Platform admin — can see the verification queue and claim reviews. */
  isAdmin: boolean;
  createdAt: IsoDateTime;
  /** Enterprise provisioning identifiers; private and never in public projections. */
  externalId?: string;
  displayName?: string;
  /**
   * Set only by a future domain-verification flow. Never infer this from
   * Account.email; an email address is contact data, not organizational proof.
   */
  verifiedEmailDomain?: string;
  active?: boolean;
}

/** Organization roles. `member` remains the compatibility role for existing workspaces. */
export type OrgRole =
  | "member"
  | "admin"
  | "owner"
  | "team-admin"
  | "program-manager"
  | "reviewer"
  | "finance"
  | "legal"
  | "viewer"
  | "guest";

/** Which accounts can act for which organization, and with what role. */
export interface OrgMembership {
  accountId: string;
  organizationId: string;
  role: OrgRole;
  grantedAt: IsoDateTime;
}

/** Append-only record of a mutating action, for the admin audit trail. */
export interface AuditEntry {
  id: string;
  at: IsoDateTime;
  accountId?: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
}

export interface OrganizationFollow {
  userId: string;
  organizationId: string;
  followedAt: IsoDateTime;
}

/**
 * "My Status" — the user's relationship to an opportunity, distinct from the
 * opportunity's own lifecycle status. Vocabulary exactly as the strategy doc's
 * tracker section lists it.
 */
export type MyStatus =
  | "interested"
  | "saved"
  | "preparing"
  | "draft-started"
  | "ready-to-submit"
  | "submitted"
  | "received"
  | "in-review"
  | "longlisted"
  | "shortlisted"
  | "finalist"
  | "accepted"
  | "declined"
  | "waitlisted"
  | "revision-requested"
  | "withdrawn"
  | "partially-withdrawn"
  | "delivered"
  | "archived";

/** My Statuses before the work has been sent — these get deadline reminders. */
export const PRE_SUBMISSION_STATUSES: readonly MyStatus[] = [
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
];

/** Terminal outcomes for personal stats. */
export const OUTCOME_STATUSES: readonly MyStatus[] = [
  "accepted",
  "declined",
  "withdrawn",
  "partially-withdrawn",
  "delivered",
];

/** Status Event Model (strategy § 26): every My Status transition is recorded. */
export interface StatusEvent {
  at: IsoDateTime;
  from?: MyStatus;
  to: MyStatus;
  /** 'user' = manual update; 'radar' = detected automatically. */
  source: "user" | "radar" | "email";
  note?: string;
  confidence?: "high" | "possible" | "unknown";
  candidateId?: string;
}

export interface TrackedOpportunity {
  userId: string;
  opportunityId: string;
  trackedAt: IsoDateTime;
  notify: boolean;
  myStatus: MyStatus;
  events: StatusEvent[];
  submittedAt?: IsoDateTime;
  /** Optional private Library Work this opportunity is being submitted with. */
  workId?: string;
  /** Private receipt that most recently changed this Tracker row through CSV import. */
  lastImportId?: string;
}

/** A private Tracker row imported from a source Missa cannot canonically match. */
export interface ManualTrackerEntry {
  id: string;
  userId: string;
  title: string;
  organizationName: string;
  work?: string;
  /** Explicitly confirmed canonical practice selections from a legacy import. */
  taxonomySelections?: Array<{
    termId: string;
    facet: TaxonomyFacetKey;
    label: string;
    sourcePhrase: string;
  }>;
  /** Legacy practice text the creator explicitly kept without canonicalising. */
  unresolvedTaxonomyLabels?: string[];
  /** Compatibility-only raw legacy column. Never treated as canonical taxonomy. */
  genre?: string;
  myStatus: MyStatus;
  deadline?: IsoDate;
  submittedAt?: IsoDateTime;
  responseAt?: IsoDateTime;
  feeRaw?: string;
  notes?: string;
  sourceUrl?: string;
  sourceKind: "csv" | "email";
  sourceRow: number;
  importedAt: IsoDateTime;
  /** Internal idempotency marker; never shown in public projections. */
  importHash?: string;
  /** Private receipt that created this imported Tracker row. */
  importId?: string;
  events?: StatusEvent[];
}

export type ForwardingAddressStatus = "active" | "paused" | "revoked";

export interface ForwardingAddress {
  id: string;
  userId: string;
  tokenHash: string;
  tokenCiphertext: string;
  tokenVersion: number;
  domain: string;
  status: ForwardingAddressStatus;
  createdAt: IsoDateTime;
  rotatedAt?: IsoDateTime;
  revokedAt?: IsoDateTime;
  lastReceivedAt?: IsoDateTime;
  acceptedCount: number;
  lastMutationKey?: string;
}

export interface InboundEmailEnvelope {
  provider: string;
  providerMessageId?: string;
  receivedAt: IsoDateTime;
  to: string[];
  from?: string;
  replyTo?: string;
  resentFrom?: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  messageIdHeader?: string;
  headers: Record<string, string>;
  attachments: Array<{
    filename: string;
    contentType: string;
    byteLength: number;
    sha256?: string;
  }>;
  authResults?: {
    spf?: "pass" | "fail" | "neutral" | "unknown";
    dkim?: "pass" | "fail" | "neutral" | "unknown";
    dmarc?: "pass" | "fail" | "neutral" | "unknown";
  };
}

export type EmailCandidateState =
  "pending" | "confirmed" | "ignored" | "deleted" | "duplicate" | "expired";
export type EmailCandidateClass =
  | "matched"
  | "ambiguous"
  | "unmatched"
  | "duplicate"
  | "unsupported-content"
  | "needs-review";
export type EmailConfidence = "high" | "possible" | "unknown";

export interface EmailReviewCandidate {
  id: string;
  userId: string;
  forwardingAddressId?: string;
  provider: string;
  providerMessageId: string;
  receivedAt: IsoDateTime;
  senderAddress?: string;
  senderDomain?: string;
  subject: string;
  bodyExcerpt: string;
  bodyHash: string;
  attachmentMetadata: Array<{
    filename: string;
    contentType: string;
    byteLength: number;
    sha256?: string;
    unsafe: boolean;
  }>;
  classification: EmailCandidateClass;
  state: EmailCandidateState;
  matchedOpportunityId?: string;
  candidates: Array<{
    opportunityId: string;
    title: string;
    organizationName?: string;
    confidence: "high" | "possible";
    reasons: string[];
  }>;
  proposedStatus?: MyStatus;
  proposedSubmittedAt?: IsoDateTime;
  proposedResponseAt?: IsoDateTime;
  proposedDeadline?: IsoDate;
  proposedWork?: string;
  confidence: EmailConfidence;
  warnings: string[];
  evidenceReasons: string[];
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  reviewedAt?: IsoDateTime;
  reviewIdempotencyKey?: string;
  /** Private review replay result; never returned to other users. */
  reviewResult?: {
    trackerUpdated: boolean;
    manualEntryId?: string;
    statusEventId?: string;
  };
  sourceMode?: "forwarding" | "gmail-sync" | "autopilot";
  gmailConnectionId?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  gmailHistoryId?: string;
}

export type GmailMode = "review" | "autopilot";
export type GmailConnectionStatus =
  "active" | "syncing" | "error" | "revoked" | "disconnected";
export interface GmailConnection {
  id: string;
  userId: string;
  googleSubjectId: string;
  /** HMAC lookup key for provider push notifications; never exposed. */
  googleAccountHash?: string;
  accountEmailMasked: string;
  encryptedRefreshToken: string;
  tokenKeyVersion: number;
  grantedScopes: string[];
  mode: GmailMode;
  status: GmailConnectionStatus;
  query?: string;
  labelIds?: string[];
  scanWindowDays: 30 | 60 | 90;
  historyId?: string;
  watchExpiration?: IsoDateTime;
  lastSyncAt?: IsoDateTime;
  nextSyncAt?: IsoDateTime;
  lastErrorCode?: string;
  consentedAt: IsoDateTime;
  disconnectedAt?: IsoDateTime;
  lastModeMutationKey?: string;
}
export type GmailSyncTrigger =
  "initial" | "manual" | "cron" | "pubsub" | "watch-renewal" | "history-reset";
export type GmailSyncJobStatus =
  "queued" | "running" | "succeeded" | "failed" | "cancelled";
export interface GmailSyncJob {
  id: string;
  connectionId: string;
  userId: string;
  trigger: GmailSyncTrigger;
  status: GmailSyncJobStatus;
  requestedAt: IsoDateTime;
  leaseUntil?: IsoDateTime;
  attemptCount: number;
  startHistoryId?: string;
  targetHistoryId?: string;
  dedupeKey: string;
  result?: {
    inspected: number;
    candidates: number;
    ignored: number;
    duplicates: number;
  };
  errorCode?: string;
  nextAttemptAt?: IsoDateTime;
  completedAt?: IsoDateTime;
}
export interface GmailOAuthState {
  id: string;
  stateHash: string;
  userId: string;
  redirectUri: string;
  encryptedPkceVerifier: string;
  nonceHash: string;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  consumedAt?: IsoDateTime;
}

export interface TrackerExportRow {
  opportunityId: string;
  title?: string;
  organizationName?: string;
  type?: string;
  opportunityStatus?: string;
  myStatus: MyStatus;
  trackedAt: IsoDateTime;
  submittedAt?: IsoDateTime;
  deadline?: IsoDate;
  deadlineKind?: DeadlineKind;
  sourceUrl?: string;
  dataState: "available" | "unavailable";
  statusEvents: StatusEvent[];
}

export interface TrackerExportV1 {
  exportVersion: 1;
  generatedAt: IsoDateTime;
  included: ["tracker"];
  omitted: Array<"library">;
  tracker: TrackerExportRow[];
}

export type FitLevel =
  "strong" | "possible" | "weak" | "not-eligible" | "unknown";

export interface FitScore {
  level: FitLevel;
  reasons: string[]; // ✓
  watchouts: string[]; // ⚠
  disqualifiers: string[]; // ✕
}

export type AlertAudience = "user" | "organization" | "admin";

export type AlertKind =
  // user
  | "new-match"
  | "opening-soon"
  | "closing-soon"
  | "deadline-extended"
  | "deadline-changed"
  | "fee-changed"
  | "eligibility-changed"
  | "call-reopened"
  | "call-closed"
  | "page-gone"
  | "expected-reopen"
  | "deadline-reminder"
  | "response-overdue"
  | "withdrawal-suggested"
  | "followed-org-new-call"
  | "submission-receipt"
  | "submission-decision"
  // organization
  | "claim-invite"
  // admin
  | "verification-needed";

export interface Alert {
  id: string;
  audience: AlertAudience;
  userId?: string;
  organizationId?: string;
  kind: AlertKind;
  opportunityId?: string;
  title: string;
  body: string;
  /** Every alert explains itself — transparency is a product rule. */
  reason: string;
  createdAt: IsoDateTime;
  read: boolean;
  /** Set only after the alert has been successfully included in an outbound digest. */
  emailSentAt?: IsoDateTime;
}
