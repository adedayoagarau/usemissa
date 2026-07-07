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
  | 'open-call'
  | 'magazine'
  | 'grant'
  | 'award'
  | 'fellowship'
  | 'residency'
  | 'festival'
  | 'scholarship'
  | 'conference'
  | 'rfp'
  | 'contest'
  | 'pitch'
  | 'other';

/** Statuses exactly as enumerated in the strategy doc. "Claimed by Organization"
 * is modeled as the orthogonal `claimedByOrganizationId` flag on Opportunity so a
 * claimed call can still be Open / Closing Soon; `displayStatus()` surfaces it. */
export type OpportunityStatus =
  | 'discovered'
  | 'needs-verification'
  | 'opening-soon'
  | 'open'
  | 'closing-soon'
  | 'deadline-extended'
  | 'closed'
  | 'archived'
  | 'uncertain'
  | 'duplicate';

export type DeadlineKind =
  | 'exact'
  | 'inferred'
  | 'rolling'
  | 'until-filled'
  | 'conflicting'
  | 'unknown';

export type SourceKind =
  | 'organization-website'
  | 'directory'
  | 'feed'
  | 'newsletter'
  | 'user-suggested'
  | 'partner-feed';

export interface Source {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  /** Organization the source belongs to, when known (org websites). */
  organizationId?: string;
  /** Polite per-source cadence. */
  checkIntervalHours: number;
  active: boolean;
  lastCheckedAt?: IsoDateTime;
  lastContentHash?: string;
  consecutiveFailures: number;
}

export type FetchStatus = 'ok' | 'error' | 'gone';

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

export interface DeadlineInfo {
  kind: DeadlineKind;
  date?: IsoDate;
  raw?: string;
}

/** Structured extraction result for one page, before dedup/canonicalization. */
export interface OpportunityCandidate {
  sourceId: string;
  snapshotId: string;
  url: string;
  extractedAt: IsoDateTime;
  title?: string;
  organizationName?: string;
  type: OpportunityType;
  genres: string[];
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
  | 'deadline-changed'
  | 'deadline-extended'
  | 'fee-changed'
  | 'genres-changed'
  | 'eligibility-changed'
  | 'submission-url-changed'
  | 'call-closed'
  | 'call-reopened'
  | 'guidelines-updated'
  | 'page-gone';

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
  confidence: 'high' | 'medium' | 'low';
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
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

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
  | 'low-confidence'
  | 'conflicting-data'
  | 'suspected-duplicate'
  | 'suspicious-language'
  | 'claim-review'
  | 'stale-listing'
  | 'page-gone';

export interface VerificationTask {
  id: string;
  opportunityId?: string;
  claimRequestId?: string;
  reason: VerificationReason;
  details: string;
  createdAt: IsoDateTime;
  status: 'open' | 'resolved' | 'dismissed';
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
  genres?: string[];
  keywords?: string[];
  maxFeeCents?: number;
  noFeeOnly?: boolean;
  verifiedOnly?: boolean;
  deadlineWithinDays?: number;
  locations?: string[];
  simultaneousRequired?: boolean;
}

/** Attributes checked against EligibilityRules for the Fit Score. */
export interface UserAttributes {
  [key: string]: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  attributes: UserAttributes;
  genres: string[];
}

export interface OrganizationFollow {
  userId: string;
  organizationId: string;
  followedAt: IsoDateTime;
}

export interface TrackedOpportunity {
  userId: string;
  opportunityId: string;
  trackedAt: IsoDateTime;
  notify: boolean;
}

export type FitLevel = 'strong' | 'possible' | 'weak' | 'not-eligible' | 'unknown';

export interface FitScore {
  level: FitLevel;
  reasons: string[]; // ✓
  watchouts: string[]; // ⚠
  disqualifiers: string[]; // ✕
}

export type AlertAudience = 'user' | 'organization' | 'admin';

export type AlertKind =
  // user
  | 'new-match'
  | 'opening-soon'
  | 'closing-soon'
  | 'deadline-extended'
  | 'deadline-changed'
  | 'fee-changed'
  | 'eligibility-changed'
  | 'call-reopened'
  | 'call-closed'
  | 'page-gone'
  | 'expected-reopen'
  | 'followed-org-new-call'
  // organization
  | 'claim-invite'
  // admin
  | 'verification-needed';

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
}
