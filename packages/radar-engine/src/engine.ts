import type {
  Account,
  Alert,
  AuditEntry,
  ChangeKind,
  FitScore,
  MatchCriteria,
  MyStatus,
  TrackedOpportunity,
  Opportunity,
  OpportunityChange,
  OpportunityCandidate,
  OpportunityCycle,
  OpportunityFields,
  Organization,
  OrgMembership,
  OrgRole,
  PageSnapshot,
  Piece,
  RadarProfile,
  Source,
  SourceKind,
  UserAttributes,
  UserProfile,
  VerificationTask,
} from './domain/types.js';
import type { Clock, Extractor, Fetcher, IdGenerator } from './ports.js';
import { sequentialIds, systemClock } from './ports.js';
import { createStore, type RadarStore, changesFor } from './store/store.js';
import { grantOrgMembership, isOrgMember, logIn, membershipsFor, signUp } from './auth/accounts.js';
import { recordAudit } from './auth/audit.js';
import { dueSources } from './ingestion/scheduler.js';
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
import { addPiece, deadlineReminders, overdueResponseAlerts, piecesFor, setMyStatus, track, trackerView, withdrawalSuggestionAlerts, type TrackerView } from './tracker/tracker.js';
import { computeResponseStats, type ResponseStats } from './tracker/responseStats.js';
import { buildIcsFeed } from './tracker/calendarFeed.js';
import { isoDateOf } from './extraction/dates.js';

export interface TickReport {
  at: string;
  sourcesChecked: number;
  sourcesFailed: number;
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
    this.ids = opts.ids ?? sequentialIds();
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
    checkIntervalHours?: number;
  }): Source {
    const source: Source = {
      id: this.ids.next('src'),
      name: input.name,
      url: input.url,
      kind: input.kind,
      organizationId: input.organizationId,
      checkIntervalHours: input.checkIntervalHours ?? 24,
      active: true,
      consecutiveFailures: 0,
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

  trackOpportunity(userId: string, opportunityId: string, notify = true, pieceId?: string): TrackedOpportunity {
    return track(this.ctx, userId, opportunityId, notify, pieceId);
  }

  /** Register a piece/manuscript so future tracking can say which piece a submission is. */
  addPiece(userId: string, title: string, genre?: string, wordCount?: number): Piece {
    return addPiece(this.ctx, userId, title, genre, wordCount);
  }

  piecesFor(userId: string): Piece[] {
    return piecesFor(this.store, userId);
  }

  /** Move an opportunity through the user's pipeline (Saved → Submitted → Accepted…). */
  setMyStatus(userId: string, opportunityId: string, status: MyStatus, opts?: { note?: string; source?: 'user' | 'radar' }) {
    return setMyStatus(this.ctx, userId, opportunityId, status, opts ?? {});
  }

  /** Pipeline + deadline views and personal stats for the tracker UI. */
  getTracker(userId: string): TrackerView {
    return trackerView(this.ctx, userId);
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

  grantOrgMembership(accountId: string, organizationId: string, role: OrgRole): OrgMembership {
    return grantOrgMembership(this.ctx, accountId, organizationId, role);
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

  /** Seeding/ops only — there is no self-serve path to platform admin. */
  promoteToAdmin(accountId: string): void {
    const account = this.store.accounts.get(accountId);
    if (!account) throw new Error(`Unknown account: ${accountId}`);
    account.isAdmin = true;
  }

  // ── The tick: full pipeline ──────────────────────────────────────

  async tick(): Promise<TickReport> {
    const now = this.clock.now();
    const report: TickReport = {
      at: now.toISOString(),
      sourcesChecked: 0,
      sourcesFailed: 0,
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

    for (const source of dueSources(this.store.sources.values(), now)) {
      report.sourcesChecked++;
      const result = await this.fetcher.fetch(source);
      source.lastCheckedAt = now.toISOString();

      if (result.status === 'error') {
        source.consecutiveFailures++;
        report.sourcesFailed++;
        continue;
      }
      source.consecutiveFailures = 0;

      if (result.status === 'gone') {
        report.pagesChanged++;
        this.handlePageGone(source, report);
        continue;
      }

      const hash = contentHash(result.content);
      if (hash === source.lastContentHash) {
        report.pagesUnchanged++;
        this.touchOpportunities(source, now);
        continue;
      }
      source.lastContentHash = hash;
      report.pagesChanged++;

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
      if (hasFatalIssues(candidate) || !looksLikeOpportunity(candidate)) continue;

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
