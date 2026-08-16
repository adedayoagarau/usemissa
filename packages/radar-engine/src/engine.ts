import type {
  Account,
  Alert,
  AlertKind,
  AuditEntry,
  ChangeKind,
  FitScore,
  MatchCriteria,
  MyStatus,
  TrackedOpportunity,
  Opportunity,
  OpportunityChange,
  OpportunityCandidate,
  OpportunityType,
  OpportunityPreferences,
  OpportunityPreferencesPatch,
  OpportunityCycle,
  OpportunityFields,
  Organization,
  OrgMembership,
  OrgRole,
  PageSnapshot,
  RadarProfile,
  Source,
  SourceKind,
  UserAttributes,
  UserProfile,
  TaxonomyPreference,
  PublicUserProfile,
  PublicPortfolioPublishInput,
  ProfilePrivacyPatch,
  ProfilePrivacySettings,
  ProfileVisibility,
  UserProfilePatch,
  TrackerExportV1,
  VerificationTask,
  LibraryWork,
  LibraryFile,
  SavedAnswer,
  ChecklistItem,
  CustomList,
  CustomListMembership,
} from './domain/types.js';
import { publicPortfolioProjection, publishPortfolio, unpublishPortfolio } from './profile/publicPortfolio.js';
import type { Clock, Extractor, Fetcher, FetchResult, IdGenerator } from './ports.js';
import { sequentialIds, systemClock } from './ports.js';
import { createStore, type RadarStore, changesFor } from './store/store.js';
import { grantOrgMembership, isOrgMember, logIn, membershipsFor, organizationSeatUsage, provisionOrgAccount, revokeOrgMembership, signUp } from './auth/accounts.js';
import { recordAudit } from './auth/audit.js';
import { dueSources, nextCheckAt } from './ingestion/scheduler.js';
import { contentHash } from './ingestion/snapshot.js';
import { DeterministicExtractor } from './extraction/extractor.js';
import { hasFatalIssues, looksLikeOpportunity } from './extraction/validate.js';
import { findCanonical } from './dedup/dedup.js';
import { computeTrustSignals, confidenceScore, freshnessScore, trustScore } from './scoring/scores.js';
import { deriveStatus, displayStatus } from './status/statusEngine.js';
import { predictNextOpening, recordCycle } from './prediction/prediction.js';
import { matchProfiles } from './matching/matching.js';
import { fitScore, formatFee } from './matching/fit.js';
import {
  alertChanges,
  alertClaimInvites,
  alertFollowedOrgNewCalls,
  alertMatches,
  alertTimeSensitive,
  buildInboxDigest,
  type AlertContext,
  type InboxDigest,
} from './alerts/alerts.js';
import { applyOrganizationOverride, approveClaim, rejectClaim, requestClaim } from './claims/claims.js';
import { openTask, resolveConflicts, resolveTask, sweepForVerification, verificationQueue } from './verification/verification.js';
import { deadlineReminders, linkTrackedOpportunityToWork, overdueResponseAlerts, setMyStatus, track, trackerView, withdrawalSuggestionAlerts, type TrackerView } from './tracker/tracker.js';
import { computeResponseStats, type ResponseStats } from './tracker/responseStats.js';
import { buildIcsFeed } from './tracker/calendarFeed.js';
import { isoDateOf } from './extraction/dates.js';
import { commitTrackerImport as applyTrackerImport, type ImportRowDecision, type TrackerImportPlan, type TrackerImportResult } from './import/trackerImport.js';
import { propsForUser, type UserProp } from './props/props.js';
import { cleanupEmailCandidates as cleanupEmailReviewCandidates, createOrGetForwardingAddress, forwardingAddressView, ingestInboundEmail, listEmailCandidates, reviewEmailCandidate, revokeForwardingAddress, rotateForwardingAddress, setForwardingAddressStatus, type EmailReviewDecision, type IngestResult, type ForwardingAddressView } from './email/emailForwarding.js';
import type { EmailReviewCandidate } from './domain/types.js';
import type { GmailConnection, GmailMode, GmailSyncJob, GmailSyncTrigger, InboundEmailEnvelope } from './domain/types.js';
import { cleanupGmailOAuthStates, completeGmailSyncJob, createGmailConnection, createGmailOAuthState, consumeGmailOAuthState, disconnectGmail, failGmailSyncJob, gmailAutopilotGate, ingestGmailEnvelope, leaseGmailSyncJob, queueGmailSyncJob, setGmailMode, type GmailOAuthConfig, type GmailTokenExchange } from './gmail/gmailSync.js';
import { createLibraryFile, createLibraryWork, createSavedAnswer, deleteLibraryFile, deleteLibraryWork, deleteSavedAnswer, libraryForUser, updateLibraryWork, updateSavedAnswer } from './library/library.js';
import { addChecklistItem, checklistForUser, deleteChecklistItem, getOpportunityChecklist, refreshOpportunityChecklist, updateChecklistItem, type ChecklistItemPatch, type OpportunityChecklistView } from './checklist/checklist.js';
import { addOpportunityToCustomList as addToList, customListsForOpportunity, customListsForUser, createCustomList, deleteCustomList, opportunitiesForCustomList, removeOpportunityFromCustomList, updateCustomList } from './lists/lists.js';

const DEFAULT_FETCH_CONCURRENCY = 8;
const MAX_FETCH_CONCURRENCY = 16;

function fetchConcurrency(): number {
  const configured = Number(process.env.RADAR_FETCH_CONCURRENCY);
  if (!Number.isInteger(configured) || configured < 1) return DEFAULT_FETCH_CONCURRENCY;
  return Math.min(configured, MAX_FETCH_CONCURRENCY);
}

/** Fetch sources concurrently, then process their results in registry order. */
async function fetchSources(sources: Source[], fetcher: Fetcher): Promise<FetchResult[]> {
  const results: FetchResult[] = new Array(sources.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < sources.length) {
      const index = next++;
      try {
        results[index] = await fetcher.fetch(sources[index]!);
      } catch (error) {
        results[index] = { status: 'error', content: '', failureReason: error instanceof Error ? 'network' : 'unknown' };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(fetchConcurrency(), sources.length) }, worker));
  return results;
}

export class ProfileValidationError extends Error {
  readonly field: 'displayName' | 'bio' | 'taxonomyPreferences' | 'opportunityPreferences';

  constructor(field: 'displayName' | 'bio' | 'taxonomyPreferences' | 'opportunityPreferences', message: string) {
    super(message);
    this.name = 'ProfileValidationError';
    this.field = field;
  }
}

export class ProfilePrivacyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfilePrivacyValidationError';
  }
}

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacySettings = {
  displayName: 'public',
  bio: 'public',
  trackedOpportunityCount: 'private',
};

const PRIVACY_KEYS = ['displayName', 'bio', 'trackedOpportunityCount'] as const;

function visibility(value: unknown): ProfileVisibility {
  return value === 'public' ? 'public' : 'private';
}

function normalizedPrivacy(value: unknown): ProfilePrivacySettings {
  const stored = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    displayName: stored.displayName === undefined ? DEFAULT_PROFILE_PRIVACY.displayName : visibility(stored.displayName),
    bio: stored.bio === undefined ? DEFAULT_PROFILE_PRIVACY.bio : visibility(stored.bio),
    trackedOpportunityCount: stored.trackedOpportunityCount === undefined ? DEFAULT_PROFILE_PRIVACY.trackedOpportunityCount : visibility(stored.trackedOpportunityCount),
  };
}

function validatedPrivacyPatch(patch: ProfilePrivacyPatch): ProfilePrivacyPatch {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new ProfilePrivacyValidationError('Privacy settings must be an object.');
  const entries = Object.entries(patch as Record<string, unknown>);
  if (entries.some(([key]) => !(PRIVACY_KEYS as readonly string[]).includes(key))) throw new ProfilePrivacyValidationError('Only supported profile visibility settings can be changed.');
  if (entries.some(([, value]) => value !== 'public' && value !== 'private')) throw new ProfilePrivacyValidationError('Visibility must be exactly public or private.');
  return patch;
}

const OPPORTUNITY_PREFERENCE_TYPES: ReadonlySet<OpportunityType> = new Set([
  'open-call', 'magazine', 'grant', 'award', 'fellowship', 'residency', 'festival',
  'scholarship', 'conference', 'rfp', 'contest', 'pitch', 'exhibition', 'commission', 'other',
]);
const CAREER_STAGES = new Set(['emerging', 'mid-career', 'established']);
const EMPTY_OPPORTUNITY_PREFERENCES: OpportunityPreferences = {
  types: [],
  disciplines: [],
  genres: [],
  locations: [],
  careerStages: [],
  noFeeOnly: false,
  simultaneousRequired: false,
};

function normalizedStringList(field: string, value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== 'string')) {
    throw new ProfileValidationError('opportunityPreferences', `${field} must be a list of at most ${max} text values.`);
  }
  const values = value.map((item) => item.trim()).filter(Boolean);
  if (values.some((item) => item.length > 120)) throw new ProfileValidationError('opportunityPreferences', `${field} values must be 120 characters or fewer.`);
  return [...new Set(values)];
}

function normalizedOpportunityPreferences(user: UserProfile, patch: OpportunityPreferencesPatch): OpportunityPreferences {
  const current = user.opportunityPreferences ?? EMPTY_OPPORTUNITY_PREFERENCES;
  const next = { ...current, ...patch } as Record<string, unknown>;
  const types = normalizedStringList('types', next.types, 16) as OpportunityType[];
  if (types.some((type) => !OPPORTUNITY_PREFERENCE_TYPES.has(type))) throw new ProfileValidationError('opportunityPreferences', 'Choose supported opportunity types.');
  const careerStages = normalizedStringList('careerStages', next.careerStages, 3);
  if (careerStages.some((stage) => !CAREER_STAGES.has(stage))) throw new ProfileValidationError('opportunityPreferences', 'Choose supported career stages.');
  const maxFeeCents = next.maxFeeCents;
  if (maxFeeCents !== undefined && maxFeeCents !== null && (typeof maxFeeCents !== 'number' || !Number.isInteger(maxFeeCents) || maxFeeCents < 0)) throw new ProfileValidationError('opportunityPreferences', 'Maximum fee must be a non-negative whole number of cents.');
  const deadlineWithinDays = next.deadlineWithinDays;
  if (deadlineWithinDays !== undefined && deadlineWithinDays !== null && (typeof deadlineWithinDays !== 'number' || !Number.isInteger(deadlineWithinDays) || deadlineWithinDays < 0 || deadlineWithinDays > 366)) throw new ProfileValidationError('opportunityPreferences', 'Deadline window must be between 0 and 366 days.');
  if (typeof next.noFeeOnly !== 'boolean' || typeof next.simultaneousRequired !== 'boolean') throw new ProfileValidationError('opportunityPreferences', 'Fee and simultaneous-submission preferences must be boolean values.');
  return {
    types,
    disciplines: normalizedStringList('disciplines', next.disciplines, 32),
    genres: normalizedStringList('genres', next.genres, 32),
    locations: normalizedStringList('locations', next.locations, 32),
    careerStages,
    ...(typeof maxFeeCents === 'number' ? { maxFeeCents } : {}),
    noFeeOnly: next.noFeeOnly,
    ...(typeof deadlineWithinDays === 'number' ? { deadlineWithinDays } : {}),
    simultaneousRequired: next.simultaneousRequired,
  };
}

function normalizedProfileValues(user: UserProfile, patch: UserProfilePatch): { displayName: string; bio?: string; taxonomyPreferences?: TaxonomyPreference[]; opportunityPreferences?: OpportunityPreferences } {
  const displayName = patch.displayName === undefined ? user.displayName.trim() : patch.displayName.trim();
  if (!displayName || displayName.length > 120) {
    throw new ProfileValidationError('displayName', 'Display name must be between 1 and 120 characters.');
  }

  const bioValue = patch.bio === undefined ? user.bio : patch.bio;
  const bio = bioValue?.trim() || undefined;
  if (bio && bio.length > 1_000) {
    throw new ProfileValidationError('bio', 'Bio must be 1,000 characters or fewer.');
  }

  let taxonomyPreferences = user.taxonomyPreferences;
  if (patch.taxonomyPreferences !== undefined) {
    if (!Array.isArray(patch.taxonomyPreferences) || patch.taxonomyPreferences.length > 64) throw new ProfileValidationError('taxonomyPreferences', 'Choose no more than 64 practice preferences.');
    const seen = new Set<string>();
    taxonomyPreferences = patch.taxonomyPreferences.map((preference) => {
      if (!preference || typeof preference.termId !== 'string' || !preference.termId.trim()) throw new ProfileValidationError('taxonomyPreferences', 'Each preference needs a canonical term.');
      if (!['include', 'prefer', 'exclude'].includes(preference.preference)) throw new ProfileValidationError('taxonomyPreferences', 'Preference must be include, prefer, or exclude.');
      if (!Number.isInteger(preference.weight) || preference.weight < 0 || preference.weight > 100) throw new ProfileValidationError('taxonomyPreferences', 'Preference weight must be between 0 and 100.');
      const termId = preference.termId.trim();
      if (seen.has(termId)) throw new ProfileValidationError('taxonomyPreferences', 'A canonical term may only appear once.');
      seen.add(termId);
      return { termId, preference: preference.preference, weight: preference.weight };
    });
  }

  const opportunityPreferences = patch.opportunityPreferences === undefined
    ? user.opportunityPreferences
    : normalizedOpportunityPreferences(user, patch.opportunityPreferences);

  return { displayName, bio, taxonomyPreferences, opportunityPreferences };
}

export interface TickReport {
  at: string;
  sourcesSelected: number;
  sourcesFetched: number;
  successfulFetches: number;
  failedFetches: number;
  failedFetchesByReason: Record<string, number>;
  extractionSuccesses: number;
  extractionFailures: number;
  extractionFailuresByReason: Record<string, number>;
  sourcesChecked: number;
  /** Total fetch and processing failures. */
  sourcesFailed: number;
  fetchFailures: number;
  processingFailures: number;
  pagesUnchanged: number;
  pagesChanged: number;
  opportunitiesCreated: string[];
  opportunitiesUpdated: string[];
  duplicatesMerged: number;
  changes: OpportunityChange[];
  alerts: Alert[];
  verificationTasksOpened: VerificationTask[];
}

export interface RadarStats {
  opportunitiesDiscovered: number;
  opportunitiesOpen: number;
  opportunitiesClaimed: number;
  staleListings: number;
  duplicateRate: number;
  openVerificationTasks: number;
  alertsEmitted: number;
  trustDistribution: { high: number; medium: number; low: number };
}

export interface RadarEngineOptions {
  fetcher: Fetcher;
  store?: RadarStore;
  extractor?: Extractor;
  clock?: Clock;
  ids?: IdGenerator;
}

function* idsInStore(store: RadarStore): Iterable<string> {
  const maps = [
    store.sources,
    store.snapshots,
    store.opportunities,
    store.versions,
    store.changes,
    store.organizations,
    store.claims,
    store.verificationTasks,
    store.radarProfiles,
    store.users,
    store.alerts,
    store.accounts,
    store.checklists,
    store.checklistItems,
    store.customLists,
  ];
  for (const map of maps) yield* map.keys();
  for (const entry of store.auditLog) yield entry.id;
  for (const entry of store.manualTrackerEntries) yield entry.id;
  for (const entry of store.forwardingAddresses) yield entry.id;
  for (const entry of store.emailCandidates) yield entry.id;
  for (const entry of store.gmailConnections) yield entry.id;
  for (const entry of store.gmailSyncJobs) yield entry.id;
  for (const entry of store.gmailOAuthStates) yield entry.id;
}

/**
 * The Missa Radar engine: one tick runs the full pipeline —
 * schedule → fetch → snapshot → change-detect → extract → validate → dedup →
 * upsert (version + change records) → score → status → predict → match →
 * alert → verification sweep — for both users and organizations.
 */
export class RadarEngine {
  readonly store: RadarStore;
  private readonly fetcher: Fetcher;
  private readonly extractor: Extractor;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(opts: RadarEngineOptions) {
    this.store = opts.store ?? createStore();
    this.fetcher = opts.fetcher;
    this.clock = opts.clock ?? systemClock;
    this.ids = opts.ids ?? sequentialIds(idsInStore(this.store));
    this.extractor = opts.extractor ?? new DeterministicExtractor(this.clock);
  }

  private get ctx(): AlertContext {
    return { store: this.store, ids: this.ids, clock: this.clock };
  }

  // ── Registration API ─────────────────────────────────────────────

  addOrganization(org: Omit<Organization, 'id'> & { id?: string }): Organization {
    const full: Organization = { id: org.id ?? this.ids.next('org'), ...org };
    this.store.organizations.set(full.id, full);
    return full;
  }

  addSource(input: {
    name: string;
    url: string;
    kind: SourceKind;
    organizationId?: string;
    registryVerticalId?: string;
    registryGroup?: string;
    registryDisciplines?: string[];
    registryTaxonomyTermIds?: string[];
    registryTrust?: import('./registry/types.js').SourceTrust;
    registryEligibilityLens?: string;
    registrySourceChannel?: string;
    registryGeography?: string[];
    registryOpportunityTypes?: OpportunityType[];
    registryOrganizationName?: string;
    registryTier?: 0 | 1 | 2 | 3;
    followsOutboundLinks?: boolean;
    discoveryAdapterId?: string;
    discoveryLinkLimit?: number;
    discoveryRequestProfile?: 'browser-compatible';
    checkIntervalHours?: number;
  }): Source {
    const source: Source = {
      id: this.ids.next('src'),
      name: input.name,
      url: input.url,
      kind: input.kind,
      organizationId: input.organizationId,
      registryVerticalId: input.registryVerticalId,
      registryGroup: input.registryGroup,
      registryDisciplines: input.registryDisciplines,
      registryTaxonomyTermIds: input.registryTaxonomyTermIds,
      registryTrust: input.registryTrust,
      registryEligibilityLens: input.registryEligibilityLens,
      registrySourceChannel: input.registrySourceChannel,
      registryGeography: input.registryGeography,
      registryOpportunityTypes: input.registryOpportunityTypes,
      registryOrganizationName: input.registryOrganizationName,
      registryTier: input.registryTier,
      followsOutboundLinks: input.followsOutboundLinks,
      discoveryAdapterId: input.discoveryAdapterId,
      discoveryLinkLimit: input.discoveryLinkLimit,
      discoveryRequestProfile: input.discoveryRequestProfile,
      checkIntervalHours: input.checkIntervalHours ?? 24,
      active: true,
      consecutiveFailures: 0,
      consecutiveProcessingFailures: 0,
    };
    this.store.sources.set(source.id, source);
    return source;
  }

  /** User-suggested opportunity URL (strategy source type "User submissions"). */
  suggestOpportunity(url: string, suggestedBy: string): Source {
    return this.addSource({ name: `Suggested by ${suggestedBy}`, url, kind: 'user-suggested' });
  }

  addUser(user: Omit<UserProfile, 'id'> & { id?: string }): UserProfile {
    const full: UserProfile = { id: user.id ?? this.ids.next('user'), ...user };
    this.store.users.set(full.id, full);
    return full;
  }

  /** Normalize and persist the public identity fields without touching matching inputs. */
  updateUserProfile(userId: string, patch: UserProfilePatch): UserProfile {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`Unknown user: ${userId}`);
    const values = normalizedProfileValues(user, patch);
    user.displayName = values.displayName;
    user.bio = values.bio;
    if (values.taxonomyPreferences !== undefined) user.taxonomyPreferences = values.taxonomyPreferences;
    if (values.opportunityPreferences !== undefined) user.opportunityPreferences = values.opportunityPreferences;
    return user;
  }

  /** Return only fields explicitly safe for an unauthenticated visitor. */
  publicUserProfile(userId: string): PublicUserProfile | undefined {
    const user = this.store.users.get(userId);
    if (!user) return undefined;
    const settings = normalizedPrivacy(user.privacy);
    const bio = user.bio?.trim() || undefined;
    const displayName = user.displayName.trim();
    const publicProfile = publicPortfolioProjection(
      user,
      settings.displayName === 'public' && displayName ? displayName : undefined,
      settings.bio === 'public' ? bio : undefined,
    );
    // Legacy rows may still carry trackedOpportunityCount visibility. Tracker
    // activity is private product state and is never part of the public Profile.
    return publicProfile;
  }

  /** Publish only creator-authored Profile fields; private product state is untouched. */
  publishUserPortfolio(userId: string, input: PublicPortfolioPublishInput): UserProfile {
    return publishPortfolio(this.store, userId, input, this.clock.now().toISOString());
  }

  unpublishUserPortfolio(userId: string): UserProfile {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`Unknown user: ${userId}`);
    return unpublishPortfolio(user);
  }

  profilePrivacy(userId: string): ProfilePrivacySettings | undefined {
    const user = this.store.users.get(userId);
    return user ? normalizedPrivacy(user.privacy) : undefined;
  }

  updateProfilePrivacy(userId: string, patch: ProfilePrivacyPatch): { user: UserProfile; settings: ProfilePrivacySettings; changedFields: Array<keyof ProfilePrivacySettings> } {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`Unknown user: ${userId}`);
    const validated = validatedPrivacyPatch(patch);
    const current = normalizedPrivacy(user.privacy);
    const next: ProfilePrivacySettings = { ...current, ...validated };
    const changedFields = PRIVACY_KEYS.filter((key) => current[key] !== next[key]);
    if (changedFields.length > 0) user.privacy = next;
    return { user, settings: next, changedFields };
  }

  profileCompleteness(userId: string): { complete: boolean; missing: Array<'displayName' | 'bio' | 'opportunityPreferences'> } {
    const user = this.store.users.get(userId);
    if (!user) return { complete: false, missing: ['displayName', 'bio', 'opportunityPreferences'] };
    const missing: Array<'displayName' | 'bio' | 'opportunityPreferences'> = [];
    if (!user.displayName.trim()) missing.push('displayName');
    if (!user.bio?.trim()) missing.push('bio');
    if (!user.opportunityPreferences) missing.push('opportunityPreferences');
    return { complete: missing.length === 0, missing };
  }

  createRadarProfile(userId: string, name: string, criteria: MatchCriteria): RadarProfile {
    const profile: RadarProfile = { id: this.ids.next('profile'), userId, name, criteria };
    this.store.radarProfiles.set(profile.id, profile);
    return profile;
  }

  followOrganization(userId: string, organizationId: string): void {
    if (!this.store.follows.some((f) => f.userId === userId && f.organizationId === organizationId)) {
      this.store.follows.push({ userId, organizationId, followedAt: this.clock.now().toISOString() });
    }
  }

  trackOpportunity(userId: string, opportunityId: string, notify = true): TrackedOpportunity {
    return track(this.ctx, userId, opportunityId, notify);
  }

  /** Move an opportunity through the user's pipeline (Saved → Submitted → Accepted…). */
  setMyStatus(userId: string, opportunityId: string, status: MyStatus, opts?: { note?: string; source?: 'user' | 'radar' }) {
    return setMyStatus(this.ctx, userId, opportunityId, status, opts ?? {});
  }

  /** Pipeline + deadline views and personal stats for the tracker UI. */
  getTracker(userId: string): TrackerView {
    return trackerView(this.ctx, userId);
  }

  linkTrackedOpportunityToWork(userId: string, opportunityId: string, workId?: string): TrackedOpportunity {
    return linkTrackedOpportunityToWork(this.ctx, userId, opportunityId, workId);
  }

  propsForUser(userId: string): UserProp[] {
    return propsForUser(this.store, userId);
  }

  commitTrackerImport(userId: string, plan: TrackerImportPlan, decisions: Record<string, ImportRowDecision>, now = this.clock.now(), sourceHash = ''): TrackerImportResult {
    if (!this.store.users.has(userId)) throw new Error(`Unknown user: ${userId}`);
    return applyTrackerImport(this.store, this.ids, userId, plan, decisions, now, sourceHash);
  }

  /**
   * Build the versioned, own-user projection used by data exports.
   *
   * Tracked rows are deliberately the source of truth: when an opportunity
   * has since been removed or cannot be resolved, its row (and status history)
   * remains in the export with dataState=unavailable. This makes an export a
   * faithful account of the user's tracker rather than a join that silently
   * drops history.
   */
  exportTracker(userId: string, now = this.clock.now()): TrackerExportV1 {
    if (!this.store.users.has(userId)) throw new Error(`Unknown user: ${userId}`);

    const tracker = this.store.tracked
      .filter((tracked) => tracked.userId === userId)
      .slice()
      .sort((a, b) => a.trackedAt.localeCompare(b.trackedAt) || a.opportunityId.localeCompare(b.opportunityId))
      .map((tracked) => {
        const opportunity = this.store.opportunities.get(tracked.opportunityId);
        const base = {
          opportunityId: tracked.opportunityId,
          myStatus: tracked.myStatus,
          trackedAt: tracked.trackedAt,
          ...(tracked.submittedAt ? { submittedAt: tracked.submittedAt } : {}),
          dataState: opportunity ? ('available' as const) : ('unavailable' as const),
          statusEvents: tracked.events.map((event) => ({ ...event })),
        };
        if (!opportunity) return base;
        return {
          ...base,
          title: opportunity.fields.title,
          ...(opportunity.fields.organizationName ? { organizationName: opportunity.fields.organizationName } : {}),
          type: opportunity.fields.type,
          opportunityStatus: opportunity.status,
          ...(opportunity.fields.deadline.date ? { deadline: opportunity.fields.deadline.date } : {}),
          deadlineKind: opportunity.fields.deadline.kind,
          sourceUrl: opportunity.sourceUrl,
        };
      })
      .concat(this.store.manualTrackerEntries
        .filter((entry) => entry.userId === userId)
        .map((entry) => ({
          opportunityId: entry.id,
          title: entry.title,
          organizationName: entry.organizationName,
          type: 'manual-import',
          opportunityStatus: 'private-import',
          myStatus: entry.myStatus,
          trackedAt: entry.importedAt,
          ...(entry.submittedAt ? { submittedAt: entry.submittedAt } : {}),
          ...(entry.deadline ? { deadline: entry.deadline } : {}),
          deadlineKind: entry.deadline ? 'exact' as const : 'unknown' as const,
          ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
          dataState: 'unavailable' as const,
          statusEvents: entry.events?.map((event) => ({ ...event })) ?? [],
        })))
      .sort((a, b) => a.trackedAt.localeCompare(b.trackedAt) || a.opportunityId.localeCompare(b.opportunityId));

    return {
      exportVersion: 1,
      generatedAt: now.toISOString(),
      included: ['tracker'],
      omitted: ['library'],
      tracker,
    };
  }

  /** Seed known past open/close cycles so prediction works from day one. */
  importHistoricalCycles(opportunityId: string, cycles: OpportunityCycle[]): void {
    const opp = this.mustGet(opportunityId);
    for (const c of cycles) recordCycle(opp, c);
  }

  archiveOpportunity(opportunityId: string): void {
    this.mustGet(opportunityId).status = 'archived';
  }

  // ── Auth API ──────────────────────────────────────────────────────
  // The scoped permission model, minimal version: Account -> optional
  // UserProfile (their tracker) + OrgMemberships (which orgs they can act
  // for). Enterprise SSO/SCIM (WorkOS) sits in front of this later; it
  // does not replace it — see docs/missa-strategy.md §8.

  signUp(email: string, password: string, displayName: string, genres: string[] = [], attributes: UserAttributes = {}) {
    return signUp(this.ctx, email, password, displayName, genres, attributes);
  }

  logIn(email: string, password: string): Account {
    return logIn(this.ctx, email, password);
  }

  provisionOrgAccount(organizationId: string, input: { email: string; externalId?: string; displayName?: string; role?: OrgRole; active?: boolean }) {
    return provisionOrgAccount(this.ctx, organizationId, input);
  }

  grantOrgMembership(accountId: string, organizationId: string, role: OrgRole): OrgMembership {
    return grantOrgMembership(this.ctx, accountId, organizationId, role);
  }

  revokeOrgMembership(accountId: string, organizationId: string): OrgMembership {
    return revokeOrgMembership(this.store, accountId, organizationId);
  }

  organizationSeatUsage(organizationId: string): ReturnType<typeof organizationSeatUsage> {
    return organizationSeatUsage(this.store, organizationId);
  }

  membershipsFor(accountId: string): OrgMembership[] {
    return membershipsFor(this.store, accountId);
  }

  isOrgMember(accountId: string, organizationId: string): boolean {
    return isOrgMember(this.store, accountId, organizationId);
  }

  recordAudit(accountId: string | undefined, action: string, targetType: string, targetId: string, detail?: string): AuditEntry {
    return recordAudit(this.ctx, accountId, action, targetType, targetId, detail);
  }

  /** Add a deduplicated user Inbox alert for product events outside Radar's
   * ingestion tick (for example a Missa-hosted submission or organization
   * decision). The same alert stream powers the optional email digest. */
  addUserAlert(input: {
    dedupKey: string;
    userId: string;
    kind: Extract<AlertKind, 'submission-receipt' | 'submission-decision'>;
    title: string;
    body: string;
    reason: string;
    opportunityId?: string;
  }): Alert | undefined {
    if (this.store.emittedAlertKeys.has(input.dedupKey)) return undefined;
    this.store.emittedAlertKeys.add(input.dedupKey);
    const alert: Alert = {
      id: this.ids.next('alert'),
      audience: 'user',
      userId: input.userId,
      kind: input.kind,
      ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
      title: input.title,
      body: input.body,
      reason: input.reason,
      createdAt: this.clock.now().toISOString(),
      read: false,
    };
    this.store.alerts.set(alert.id, alert);
    return alert;
  }

  forwardingAddress(userId: string): ForwardingAddressView { return forwardingAddressView(this.store, userId); }
  createForwardingAddress(userId: string): { address: string; created: boolean; view: ForwardingAddressView } {
    const result = createOrGetForwardingAddress(this.store, userId, this.clock.now(), this.ids);
    return { address: result.address, created: result.created, view: forwardingAddressView(this.store, userId) };
  }
  rotateForwardingAddress(userId: string, idempotencyKey?: string): { address: string; view: ForwardingAddressView } {
    const result = rotateForwardingAddress(this.store, userId, this.clock.now(), this.ids, idempotencyKey);
    return { address: result.address, view: forwardingAddressView(this.store, userId) };
  }
  setForwardingAddressStatus(userId: string, status: 'active' | 'paused'): ForwardingAddressView {
    setForwardingAddressStatus(this.store, userId, status); return forwardingAddressView(this.store, userId);
  }
  revokeForwardingAddress(userId: string, deletePending = false): { deletedCandidates: number; view: ForwardingAddressView } {
    const result = revokeForwardingAddress(this.store, userId, this.clock.now(), deletePending); return { ...result, view: forwardingAddressView(this.store, userId) };
  }
  ingestInboundEmail(envelope: Parameters<typeof ingestInboundEmail>[1]): IngestResult { return ingestInboundEmail(this.store, envelope, this.clock.now(), this.ids); }
  emailCandidates(userId: string, state: 'pending' | 'all' = 'pending', classification?: string): EmailReviewCandidate[] { return listEmailCandidates(this.store, userId, state, classification); }
  reviewEmailCandidate(userId: string, candidateId: string, decision: EmailReviewDecision) { return reviewEmailCandidate(this.store, userId, candidateId, decision, this.clock.now(), this.ids); }
  cleanupEmailCandidates(): number { return cleanupEmailReviewCandidates(this.store, this.clock.now()); }
  createGmailOAuthState(userId: string, config?: Partial<GmailOAuthConfig>) { return createGmailOAuthState(this.store, userId, config, this.clock.now(), this.ids); }
  consumeGmailOAuthState(state: string, userId: string, redirectUri: string, nonce?: string) { return consumeGmailOAuthState(this.store, state, userId, redirectUri, this.clock.now(), nonce); }
  connectGmail(userId: string, exchange: GmailTokenExchange): GmailConnection { return createGmailConnection(this.store, userId, exchange, this.clock.now(), this.ids); }
  gmailConnection(userId: string): GmailConnection | undefined { return this.store.gmailConnections.find((item) => item.userId === userId && item.status !== 'disconnected'); }
  queueGmailSync(userId: string, trigger: GmailSyncTrigger, dedupeKey: string): GmailSyncJob { const connection = this.gmailConnection(userId); if (!connection) throw new Error('Gmail is not connected.'); return queueGmailSyncJob(this.store, connection, trigger, dedupeKey, this.clock.now(), this.ids); }
  leaseGmailSyncJob(jobId: string) { return leaseGmailSyncJob(this.store, jobId, this.clock.now()); }
  completeGmailSyncJob(jobId: string, result: GmailSyncJob['result'], targetHistoryId?: string) { return completeGmailSyncJob(this.store, jobId, result, targetHistoryId, this.clock.now()); }
  failGmailSyncJob(jobId: string, errorCode: string) { return failGmailSyncJob(this.store, jobId, errorCode, this.clock.now()); }
  cleanupGmailOAuthStates() { return cleanupGmailOAuthStates(this.store, this.clock.now()); }
  setGmailMode(userId: string, mode: GmailMode, confirmation: boolean, idempotencyKey: string): GmailConnection { return setGmailMode(this.store, userId, mode, confirmation, idempotencyKey); }
  disconnectGmail(userId: string, deletePending = false) { return disconnectGmail(this.store, userId, deletePending, this.clock.now()); }
  ingestGmailEnvelope(connectionId: string, envelope: InboundEmailEnvelope) { const connection = this.store.gmailConnections.find((item) => item.id === connectionId && item.status === 'active'); if (!connection) return { accepted: false as const, reason: 'unavailable' as const }; return ingestGmailEnvelope(this.store, connection, envelope, this.clock.now(), this.ids); }
  gmailAutopilotGate(candidateId: string) { const candidate = this.store.emailCandidates.find((item) => item.id === candidateId); if (!candidate?.gmailConnectionId) return { allowed: false, reason: 'This is not a Gmail candidate.' }; const connection = this.store.gmailConnections.find((item) => item.id === candidate.gmailConnectionId); if (!connection) return { allowed: false, reason: 'Gmail is no longer connected.' }; return gmailAutopilotGate(this.store, connection, candidate); }
  applyGmailAutopilotCandidate(candidateId: string) { const candidate = this.store.emailCandidates.find((item) => item.id === candidateId); if (!candidate?.gmailConnectionId || !candidate.proposedStatus || candidate.candidates.length !== 1) throw new Error('Gmail candidate is not eligible for Autopilot.'); const gate = this.gmailAutopilotGate(candidateId); if (!gate.allowed) throw new Error(gate.reason); return this.reviewEmailCandidate(candidate.userId, candidateId, { kind: 'confirm', opportunityId: candidate.candidates[0]!.opportunityId, status: candidate.proposedStatus, idempotencyKey: `autopilot:${candidateId}` }); }
  library(userId: string) { return libraryForUser(this.store, userId); }
  createLibraryWork(userId: string, input: { title: unknown; description?: unknown; fileId?: unknown; taxonomyTermIds?: unknown }): LibraryWork { return createLibraryWork(this.store, userId, input, this.clock.now(), this.ids); }
  updateLibraryWork(userId: string, workId: string, input: { title?: unknown; description?: unknown; fileId?: unknown | null; taxonomyTermIds?: unknown }): LibraryWork { return updateLibraryWork(this.store, userId, workId, input, this.clock.now()); }
  deleteLibraryWork(userId: string, workId: string): void { deleteLibraryWork(this.store, userId, workId); }
  createLibraryFile(userId: string, input: { filename: unknown; contentType: unknown; byteLength: unknown; storageKey: unknown }): LibraryFile { return createLibraryFile(this.store, userId, input, this.clock.now(), this.ids); }
  deleteLibraryFile(userId: string, fileId: string): void { deleteLibraryFile(this.store, userId, fileId); }
  createSavedAnswer(userId: string, input: { name: unknown; body: unknown }): SavedAnswer { return createSavedAnswer(this.store, userId, input, this.clock.now(), this.ids); }
  updateSavedAnswer(userId: string, answerId: string, input: { name?: unknown; body?: unknown }): SavedAnswer { return updateSavedAnswer(this.store, userId, answerId, input, this.clock.now()); }
  deleteSavedAnswer(userId: string, answerId: string): void { deleteSavedAnswer(this.store, userId, answerId); }

  opportunityChecklist(userId: string, opportunityId: string): OpportunityChecklistView {
    return getOpportunityChecklist(this.store, userId, opportunityId, this.clock.now(), this.ids);
  }

  refreshOpportunityChecklist(userId: string, opportunityId: string): OpportunityChecklistView {
    return refreshOpportunityChecklist(this.store, userId, opportunityId, this.clock.now(), this.ids);
  }

  checklistForUser(userId: string): OpportunityChecklistView[] { return checklistForUser(this.store, userId); }

  addChecklistItem(userId: string, opportunityId: string, input: { label: unknown; note?: unknown }): ChecklistItem {
    return addChecklistItem(this.store, userId, opportunityId, input, this.clock.now(), this.ids);
  }

  updateChecklistItem(userId: string, itemId: string, input: ChecklistItemPatch): ChecklistItem {
    return updateChecklistItem(this.store, userId, itemId, input, this.clock.now());
  }

  deleteChecklistItem(userId: string, itemId: string): void { deleteChecklistItem(this.store, userId, itemId, this.clock.now()); }

  lists(userId: string, includeArchived = false): CustomList[] { return customListsForUser(this.store, userId, includeArchived); }
  createList(userId: string, input: { name: unknown; description?: unknown; colorToken?: unknown }): CustomList { return createCustomList(this.store, userId, input, this.clock.now(), this.ids); }
  updateList(userId: string, listId: string, input: { name?: unknown; description?: unknown; colorToken?: unknown; archived?: unknown }): CustomList { return updateCustomList(this.store, userId, listId, input, this.clock.now()); }
  deleteList(userId: string, listId: string): void { deleteCustomList(this.store, userId, listId); }
  listMemberships(userId: string, listId?: string): CustomListMembership[] { return this.store.customListMemberships ? [...this.store.customListMemberships.values()].filter((m) => m.userId === userId && (listId === undefined || m.listId === listId)) : []; }
  listsForOpportunity(userId: string, opportunityId: string): CustomList[] { return customListsForOpportunity(this.store, userId, opportunityId); }
  addToList(userId: string, listId: string, opportunityId: string): CustomListMembership { return addToList(this.store, userId, listId, opportunityId, this.clock.now()); }
  removeFromList(userId: string, listId: string, opportunityId: string): void { removeOpportunityFromCustomList(this.store, userId, listId, opportunityId); }
  opportunitiesInList(userId: string, listId: string): Opportunity[] { return opportunitiesForCustomList(this.store, userId, listId); }

  /** Seeding/ops only — there is no self-serve path to platform admin. */
  promoteToAdmin(accountId: string): void {
    const account = this.store.accounts.get(accountId);
    if (!account) throw new Error(`Unknown account: ${accountId}`);
    account.isAdmin = true;
  }

  // ── The tick: full pipeline ──────────────────────────────────────

  /**
   * @param opts.maxSources Cap on how many due sources this call processes.
   *   Sources beyond the cap are left untouched (lastCheckedAt unchanged) and
   *   remain due for the next tick -- this lets a short-lived caller (e.g. a
   *   serverless Cron route with a wall-clock time budget) work through a
   *   large source list a batch at a time instead of timing out. Omitted or
   *   undefined means unlimited (all due sources processed in one call),
   *   which is the default and keeps every existing caller (demo world,
   *   serve.ts's long-running server, existing tests) unchanged.
   */
  async tick(opts?: { maxSources?: number; minRegistryTier?: 0 | 1 | 2 | 3; maxRegistryTier?: 0 | 1 | 2 | 3 }): Promise<TickReport> {
    const now = this.clock.now();
    const report: TickReport = {
      at: now.toISOString(),
      sourcesSelected: 0,
      sourcesFetched: 0,
      successfulFetches: 0,
      failedFetches: 0,
      failedFetchesByReason: {},
      extractionSuccesses: 0,
      extractionFailures: 0,
      extractionFailuresByReason: {},
      sourcesChecked: 0,
      sourcesFailed: 0,
      fetchFailures: 0,
      processingFailures: 0,
      pagesUnchanged: 0,
      pagesChanged: 0,
      opportunitiesCreated: [],
      opportunitiesUpdated: [],
      duplicatesMerged: 0,
      changes: [],
      alerts: [],
      verificationTasksOpened: [],
    };

    const newOpportunities: Opportunity[] = [];

    const due = dueSources(this.store.sources.values(), now).filter((source) => {
      if (opts?.minRegistryTier !== undefined && (source.registryTier ?? 0) < opts.minRegistryTier) return false;
      if (opts?.maxRegistryTier !== undefined && (source.registryTier ?? 0) > opts.maxRegistryTier) return false;
      return true;
    });
    const sourcesToProcess = opts?.maxSources !== undefined ? due.slice(0, opts.maxSources) : due;
    report.sourcesSelected = sourcesToProcess.length;

    const fetchedResults = await fetchSources(sourcesToProcess, this.fetcher);
    for (const [index, source] of sourcesToProcess.entries()) {
      report.sourcesChecked++;
      report.sourcesFetched++;
      source.lastCheckedAt = now.toISOString();
      const result = fetchedResults[index]!;

      if (result.status === 'error') {
        source.lastFetchStatus = 'error';
        source.lastFetchFailureReason = result.failureReason ?? 'unknown';
        source.consecutiveFailures++;
        report.sourcesFailed++;
        report.fetchFailures++;
        report.failedFetches++;
        const reason = result.failureReason ?? 'unknown';
        report.failedFetchesByReason[reason] = (report.failedFetchesByReason[reason] ?? 0) + 1;
        source.nextCheckAt = nextCheckAt(source, now).toISOString();
        continue;
      }
      source.consecutiveFailures = 0;

      if (result.status === 'gone') {
        source.lastFetchStatus = 'gone';
        source.lastFetchFailureReason = undefined;
        source.consecutiveProcessingFailures = 0;
        source.nextCheckAt = nextCheckAt(source, now).toISOString();
        report.pagesChanged++;
        this.handlePageGone(source, report);
        continue;
      }

      report.successfulFetches++;
      source.lastFetchStatus = 'ok';
      source.lastFetchFailureReason = undefined;
      source.firstVerifiedAt ??= now.toISOString();
      source.lastSuccessfulFetchAt = now.toISOString();
      const hash = contentHash(result.content);
      source.lastFetchedContentHash = hash;
      if (hash === source.lastContentHash) {
        source.consecutiveProcessingFailures = 0;
        source.nextCheckAt = nextCheckAt(source, now).toISOString();
        report.pagesUnchanged++;
        this.touchOpportunities(source, now);
        continue;
      }
      report.pagesChanged++;

      try {
        const snapshot: PageSnapshot = {
          id: this.ids.next('snap'),
          sourceId: source.id,
          url: source.url,
          fetchedAt: now.toISOString(),
          status: 'ok',
          contentHash: hash,
          content: result.content,
        };
        this.store.snapshots.set(snapshot.id, snapshot);

        const candidate = await this.extractor.extract(source, snapshot);
        report.extractionSuccesses++;
        if (hasFatalIssues(candidate) || !looksLikeOpportunity(candidate)) {
          source.consecutiveProcessingFailures = (source.consecutiveProcessingFailures ?? 0) + 1;
          report.sourcesFailed++;
          report.processingFailures++;
          report.extractionFailures++;
          report.extractionFailuresByReason.validation = (report.extractionFailuresByReason.validation ?? 0) + 1;
          source.nextCheckAt = nextCheckAt(source, now).toISOString();
          continue;
        }

        if (candidate.discoveryExternalId) {
          // Older URL/title deduplication could attach a distinct official
          // feed record as an alternate source. Detach that stale relation
          // before canonical matching so a replay restores the lost call.
          // Retire conflict evidence created by that exact stale attachment;
          // otherwise the canonical record stays in Needs Verification after
          // the official records have already been separated.
          for (const opportunity of this.store.opportunities.values()) {
            if (opportunity.sourceId === candidate.sourceId) continue;
            if (!opportunity.alternateSourceIds.includes(candidate.sourceId)) continue;
            opportunity.alternateSourceIds = opportunity.alternateSourceIds.filter(
              (sourceId) => sourceId !== candidate.sourceId,
            );
            opportunity.conflicts = opportunity.conflicts.filter(
              (conflict) => !conflict.includes(candidate.url),
            );
            if (opportunity.conflicts.length === 0) {
              if (opportunity.fields.deadline.kind === 'conflicting') {
                opportunity.fields.deadline.kind = opportunity.fields.deadline.date ? 'exact' : 'unknown';
              }
              for (const task of this.store.verificationTasks.values()) {
                if (
                  task.opportunityId === opportunity.id &&
                  task.reason === 'conflicting-data' &&
                  task.status === 'open'
                ) {
                  task.status = 'resolved';
                  task.resolvedAt = now.toISOString();
                  task.resolvedBy = 'system:machine-record-identity-repair';
                }
              }
            }
          }
        }

        const match = findCanonical(candidate, this.store.opportunities.values());
        if (match.kind === 'same-page') {
          const changes = this.applyUpdate(match.opportunity, candidate, now);
          report.changes.push(...changes);
          if (changes.length > 0) report.opportunitiesUpdated.push(match.opportunity.id);
        } else if (match.kind === 'duplicate') {
          report.duplicatesMerged++;
          this.mergeDuplicate(match.opportunity, candidate, source, report);
        } else {
          const opp = this.createOpportunity(candidate, source, now);
          newOpportunities.push(opp);
          report.opportunitiesCreated.push(opp.id);
        }

        source.lastContentHash = hash;
        source.lastProcessedAt = now.toISOString();
        source.consecutiveProcessingFailures = 0;
        source.nextCheckAt = nextCheckAt(source, now).toISOString();
      } catch {
        source.consecutiveProcessingFailures = (source.consecutiveProcessingFailures ?? 0) + 1;
        report.sourcesFailed++;
        report.processingFailures++;
        report.extractionFailures++;
        report.extractionFailuresByReason.extractor = (report.extractionFailuresByReason.extractor ?? 0) + 1;
        source.nextCheckAt = nextCheckAt(source, now).toISOString();
      }
    }

    // Global passes: score → predict → status for every live opportunity.
    for (const opp of this.store.opportunities.values()) {
      this.rescore(opp, now);
    }

    // Matching + alerts.
    const matches = matchProfiles(this.store.radarProfiles.values(), this.store.opportunities.values(), now);
    report.alerts.push(
      ...alertMatches(this.ctx, matches),
      ...alertChanges(this.ctx, report.changes),
      ...alertTimeSensitive(this.ctx),
      ...alertFollowedOrgNewCalls(this.ctx, newOpportunities),
      ...alertClaimInvites(this.ctx),
      ...deadlineReminders(this.ctx),
      ...overdueResponseAlerts(this.ctx),
      ...withdrawalSuggestionAlerts(this.ctx),
    );

    report.verificationTasksOpened.push(...sweepForVerification(this.ctx));
    return report;
  }

  // ── Pipeline internals ───────────────────────────────────────────

  private createOpportunity(candidate: OpportunityCandidate, source: Source, now: Date): Opportunity {
    const fields: OpportunityFields = {
      title: candidate.title!,
      organizationName: candidate.organizationName,
      organizationId: source.organizationId,
      type: candidate.type,
      genres: candidate.genres,
      taxonomyAssignments: candidate.taxonomyAssignments,
      openDate: candidate.openDate,
      deadline: candidate.deadline,
      fee: candidate.fee,
      prize: candidate.prize,
      eligibility: candidate.eligibility,
      requiredMaterials: candidate.requiredMaterials,
      submissionUrl: candidate.submissionUrl,
      guidelinesUrl: candidate.url,
      simultaneousAllowed: candidate.simultaneousAllowed,
      contactEmailPresent: candidate.contactEmailPresent,
    };
    const opp: Opportunity = {
      id: this.ids.next('opp'),
      createdAt: now.toISOString(),
      status: 'discovered',
      fields,
      sourceId: source.id,
      sourceUrl: candidate.url,
      alternateSourceIds: [],
      scores: { freshness: 100, confidence: candidate.extractionConfidence, trust: 0 },
      trustSignals: [],
      lastCheckedAt: now.toISOString(),
      lastChangedAt: now.toISOString(),
      lastExtractionConfidence: candidate.extractionConfidence,
      lastOpenSignal: candidate.openSignals.length > 0,
      lastClosedSignal: candidate.closedSignals.length > 0,
      lastSuspiciousSignals: candidate.suspiciousSignals,
      pastCycles: [],
      conflicts: [],
    };
    if (candidate.openDate) recordCycle(opp, { openedOn: candidate.openDate });
    this.store.opportunities.set(opp.id, opp);
    this.saveVersion(opp, candidate.snapshotId, now);
    return opp;
  }

  /** Field-level diff of an updated page → OpportunityChange records. */
  private applyUpdate(opp: Opportunity, candidate: OpportunityCandidate, now: Date): OpportunityChange[] {
    const changes: OpportunityChange[] = [];
    const record = (kind: ChangeKind, field: string, oldValue?: string, newValue?: string) => {
      const change: OpportunityChange = {
        id: this.ids.next('chg'),
        opportunityId: opp.id,
        at: now.toISOString(),
        kind,
        field,
        oldValue,
        newValue,
        snapshotId: candidate.snapshotId,
      };
      this.store.changes.set(change.id, change);
      changes.push(change);
    };
    const f = opp.fields;
    const overrides = opp.organizationOverrides ?? {};

    // Deadline (org override wins; crawled changes still recorded as conflicts elsewhere).
    if (!('deadline' in overrides) && candidate.deadline.date && candidate.deadline.date !== f.deadline.date) {
      const old = f.deadline.date;
      if (old && candidate.deadline.date > old) {
        record('deadline-extended', 'deadline', old, candidate.deadline.date);
        opp.lastDeadlineExtensionAt = now.toISOString();
      } else {
        record('deadline-changed', 'deadline', old, candidate.deadline.date);
      }
      opp.previousDeadline = old;
      f.deadline = candidate.deadline;
    }

    if (!('fee' in overrides) && candidate.fee.disclosed && candidate.fee.amountCents !== f.fee.amountCents) {
      record(
        'fee-changed',
        'fee',
        f.fee.disclosed ? formatFee(f.fee.amountCents ?? 0) : 'undisclosed',
        formatFee(candidate.fee.amountCents ?? 0),
      );
      f.fee = candidate.fee;
    }

    if (candidate.genres.length > 0 && JSON.stringify(candidate.genres) !== JSON.stringify(f.genres)) {
      record('genres-changed', 'genres', f.genres.join(', '), candidate.genres.join(', '));
      f.genres = candidate.genres;
    }

    if (candidate.taxonomyAssignments?.length) {
      f.taxonomyAssignments = candidate.taxonomyAssignments;
    }

    const oldElig = JSON.stringify(f.eligibility);
    const newElig = JSON.stringify(candidate.eligibility);
    if (candidate.eligibility.length > 0 && newElig !== oldElig) {
      record('eligibility-changed', 'eligibility');
      f.eligibility = candidate.eligibility;
    }

    if (candidate.submissionUrl && candidate.submissionUrl !== f.submissionUrl) {
      record('submission-url-changed', 'submissionUrl', f.submissionUrl, candidate.submissionUrl);
      f.submissionUrl = candidate.submissionUrl;
    }

    const nowClosed = candidate.closedSignals.length > 0;
    if (nowClosed && !opp.lastClosedSignal) {
      record('call-closed', 'status');
      recordCycle(opp, { closedOn: isoDateOf(now) });
    } else if (!nowClosed && opp.lastClosedSignal && candidate.openSignals.length > 0) {
      record('call-reopened', 'status');
      recordCycle(opp, { openedOn: isoDateOf(now) });
    }

    if (candidate.openDate && candidate.openDate !== f.openDate) {
      f.openDate = candidate.openDate;
      recordCycle(opp, { openedOn: candidate.openDate });
    }
    if (candidate.title && !('title' in overrides)) f.title = candidate.title;
    if (candidate.organizationName && !('organizationName' in overrides)) f.organizationName = candidate.organizationName;
    if (candidate.prize) f.prize = candidate.prize;
    if (candidate.requiredMaterials.length > 0) f.requiredMaterials = candidate.requiredMaterials;
    if (candidate.simultaneousAllowed !== undefined) f.simultaneousAllowed = candidate.simultaneousAllowed;
    f.contactEmailPresent = candidate.contactEmailPresent;

    if (changes.length === 0) {
      record('guidelines-updated', 'content');
    }

    opp.lastOpenSignal = candidate.openSignals.length > 0;
    opp.lastClosedSignal = nowClosed;
    opp.lastSuspiciousSignals = candidate.suspiciousSignals;
    opp.lastExtractionConfidence = candidate.extractionConfidence;
    opp.lastCheckedAt = now.toISOString();
    opp.lastChangedAt = now.toISOString();
    this.saveVersion(opp, candidate.snapshotId, now);
    return changes;
  }

  /**
   * A second source describes an existing opportunity: merge as an alternate
   * source. Agreeing data raises nothing; disagreeing deadlines become a
   * conflict → Needs Verification (never silently resolved).
   */
  private mergeDuplicate(canonical: Opportunity, candidate: OpportunityCandidate, source: Source, report: TickReport): void {
    if (!canonical.alternateSourceIds.includes(source.id)) {
      canonical.alternateSourceIds.push(source.id);
    }
    if (
      candidate.deadline.date &&
      canonical.fields.deadline.date &&
      candidate.deadline.date !== canonical.fields.deadline.date &&
      !(canonical.organizationOverrides && 'deadline' in canonical.organizationOverrides)
    ) {
      const conflict = `deadline: ${canonical.sourceUrl} says ${canonical.fields.deadline.date}, ${candidate.url} says ${candidate.deadline.date}`;
      if (!canonical.conflicts.includes(conflict)) {
        canonical.conflicts.push(conflict);
        canonical.fields.deadline.kind = 'conflicting';
      }
    }
    // Fill gaps from the duplicate (never overwrite).
    const f = canonical.fields;
    if (!f.submissionUrl && candidate.submissionUrl) f.submissionUrl = candidate.submissionUrl;
    if (!f.prize && candidate.prize) f.prize = candidate.prize;
    if (f.genres.length === 0) f.genres = candidate.genres;
    if (!f.taxonomyAssignments?.length && candidate.taxonomyAssignments?.length) {
      f.taxonomyAssignments = candidate.taxonomyAssignments;
    }
    report.opportunitiesUpdated.push(canonical.id);
  }

  private handlePageGone(source: Source, report: TickReport): void {
    const now = this.clock.now();
    for (const opp of this.store.opportunities.values()) {
      if (opp.sourceId !== source.id || opp.duplicateOfId) continue;
      const change: OpportunityChange = {
        id: this.ids.next('chg'),
        opportunityId: opp.id,
        at: now.toISOString(),
        kind: 'page-gone',
        field: 'source',
        oldValue: source.url,
      };
      this.store.changes.set(change.id, change);
      report.changes.push(change);
      opp.lastChangedAt = now.toISOString();
      const task = openTask(
        { store: this.store, ids: this.ids, clock: this.clock },
        'page-gone',
        `Source page for "${opp.fields.title}" (${source.url}) is gone; confirm whether the call ended or moved.`,
        opp.id,
      );
      if (task) report.verificationTasksOpened.push(task);
    }
  }

  private touchOpportunities(source: Source, now: Date): void {
    for (const opp of this.store.opportunities.values()) {
      if (opp.sourceId === source.id) opp.lastCheckedAt = now.toISOString();
    }
  }

  private rescore(opp: Opportunity, now: Date): void {
    if (opp.status === 'archived') return;
    const source = this.store.sources.get(opp.sourceId);
    const org = opp.fields.organizationId ? this.store.organizations.get(opp.fields.organizationId) : undefined;
    opp.trustSignals = computeTrustSignals(opp, {
      officialSource: source?.kind === 'organization-website',
      organizationVerified: org?.verified ?? false,
      hasHistory: opp.pastCycles.length > 0,
      suspiciousSignals: opp.lastSuspiciousSignals,
    });
    opp.scores = {
      freshness: freshnessScore(opp, now),
      confidence: confidenceScore(opp, opp.lastExtractionConfidence),
      trust: trustScore(opp.trustSignals),
    };
    opp.prediction = predictNextOpening(opp.pastCycles, now);
    opp.status = deriveStatus(opp, {
      now,
      closedSignalPresent: opp.lastClosedSignal,
      openSignalPresent: opp.lastOpenSignal,
      lastDeadlineExtensionAt: opp.lastDeadlineExtensionAt,
    });
  }

  private saveVersion(opp: Opportunity, snapshotId: string | undefined, now: Date): void {
    const version = {
      id: this.ids.next('ver'),
      opportunityId: opp.id,
      createdAt: now.toISOString(),
      snapshotId,
      fields: structuredClone(opp.fields),
    };
    this.store.versions.set(version.id, version);
  }

  private mustGet(opportunityId: string): Opportunity {
    const opp = this.store.opportunities.get(opportunityId);
    if (!opp) throw new Error(`Unknown opportunity: ${opportunityId}`);
    return opp;
  }

  // ── User-facing API ──────────────────────────────────────────────

  getInboxDigest(userId: string): InboxDigest {
    return buildInboxDigest(this.store, userId);
  }

  fitFor(userId: string, opportunityId: string): FitScore {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`Unknown user: ${userId}`);
    return fitScore(user, this.mustGet(opportunityId), this.clock.now());
  }

  /** This organization's observed response-time distribution, if there's enough history to trust it. */
  responseStats(organizationId: string): ResponseStats | undefined {
    return computeResponseStats(this.store, organizationId);
  }

  /** A subscribable .ics feed of this user's tracked deadlines and expected-response dates. */
  calendarFeed(userId: string): string {
    return buildIcsFeed(this.ctx, userId);
  }

  changeHistory(opportunityId: string): OpportunityChange[] {
    return changesFor(this.store, opportunityId);
  }

  displayStatus(opportunityId: string): string {
    return displayStatus(this.mustGet(opportunityId));
  }

  // ── Organization-facing API ──────────────────────────────────────

  requestClaim(opportunityId: string, organizationId: string, requestedBy: string) {
    const claim = requestClaim(this.ctx, opportunityId, organizationId, requestedBy);
    if (claim.status === 'approved') {
      this.rescore(this.mustGet(opportunityId), this.clock.now());
    }
    return claim;
  }

  approveClaim(claimId: string, decidedBy: string) {
    const claim = approveClaim(this.ctx, claimId, decidedBy);
    const opp = this.mustGet(claim.opportunityId);
    this.rescore(opp, this.clock.now());
    return claim;
  }

  rejectClaim(claimId: string, decidedBy: string, note?: string) {
    return rejectClaim(this.ctx, claimId, decidedBy, note);
  }

  updateClaimedListing(opportunityId: string, organizationId: string, overrides: Partial<OpportunityFields>) {
    const opp = applyOrganizationOverride(this.ctx, opportunityId, organizationId, overrides);
    this.rescore(opp, this.clock.now());
    return opp;
  }

  // ── Admin-facing API ─────────────────────────────────────────────

  verificationQueue() {
    return verificationQueue(this.store);
  }

  resolveVerificationTask(taskId: string, resolvedBy: string, dismiss = false) {
    return resolveTask(this.ctx, taskId, resolvedBy, dismiss);
  }

  resolveConflicts(opportunityId: string) {
    const opp = resolveConflicts(this.ctx, opportunityId);
    this.rescore(opp, this.clock.now());
    return opp;
  }

  stats(): RadarStats {
    const opps = [...this.store.opportunities.values()].filter((o) => !o.duplicateOfId);
    const trustDistribution = { high: 0, medium: 0, low: 0 };
    for (const o of opps) {
      if (o.scores.trust >= 70) trustDistribution.high++;
      else if (o.scores.trust >= 40) trustDistribution.medium++;
      else trustDistribution.low++;
    }
    const openTasks = [...this.store.verificationTasks.values()].filter((t) => t.status === 'open').length;
    const dupCount = [...this.store.opportunities.values()].filter((o) => o.duplicateOfId).length +
      opps.reduce((n, o) => n + o.alternateSourceIds.length, 0);
    return {
      opportunitiesDiscovered: opps.length,
      opportunitiesOpen: opps.filter((o) => ['open', 'closing-soon', 'deadline-extended', 'opening-soon'].includes(o.status)).length,
      opportunitiesClaimed: opps.filter((o) => o.claimedByOrganizationId).length,
      staleListings: opps.filter((o) => o.status === 'uncertain').length,
      duplicateRate: opps.length === 0 ? 0 : dupCount / (opps.length + dupCount),
      openVerificationTasks: openTasks,
      alertsEmitted: this.store.alerts.size,
      trustDistribution,
    };
  }
}
