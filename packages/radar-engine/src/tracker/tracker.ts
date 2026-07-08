import type {
  Alert,
  FitScore,
  MyStatus,
  Opportunity,
  OpportunityType,
  Piece,
  TrackedOpportunity,
  UserProfile,
} from '../domain/types.js';
import { PRE_SUBMISSION_STATUSES } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { addDays, daysBetween, isoDateOf } from '../extraction/dates.js';
import { fitScore } from '../matching/fit.js';
import { confidenceTier, displayStatus } from '../status/statusEngine.js';
import { expectedResponseWindowDays } from './responseStats.js';

export interface TrackerContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

const ALL_STATUSES: readonly MyStatus[] = [
  'interested', 'saved', 'preparing', 'draft-started', 'ready-to-submit',
  'submitted', 'received', 'in-review', 'longlisted', 'shortlisted', 'finalist',
  'accepted', 'declined', 'waitlisted', 'revision-requested',
  'withdrawn', 'partially-withdrawn', 'delivered', 'archived',
];

export function isMyStatus(value: string): value is MyStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

function findTracked(store: RadarStore, userId: string, opportunityId: string): TrackedOpportunity | undefined {
  return store.tracked.find((t) => t.userId === userId && t.opportunityId === opportunityId);
}

export function track(ctx: TrackerContext, userId: string, opportunityId: string, notify = true, pieceId?: string): TrackedOpportunity {
  const existing = findTracked(ctx.store, userId, opportunityId);
  if (existing) return existing;
  if (!ctx.store.opportunities.has(opportunityId)) throw new Error(`Unknown opportunity: ${opportunityId}`);
  if (pieceId) {
    const piece = ctx.store.pieces.get(pieceId);
    if (!piece || piece.userId !== userId) throw new Error(`Unknown piece: ${pieceId}`);
  }
  const now = ctx.clock.now().toISOString();
  const tracked: TrackedOpportunity = {
    userId,
    opportunityId,
    trackedAt: now,
    notify,
    myStatus: 'saved',
    events: [{ at: now, to: 'saved', source: 'user' }],
    pieceId,
  };
  ctx.store.tracked.push(tracked);
  return tracked;
}

export function addPiece(ctx: TrackerContext, userId: string, title: string, genre?: string, wordCount?: number): Piece {
  const piece: Piece = { id: ctx.ids.next('piece'), userId, title, genre, wordCount, createdAt: ctx.clock.now().toISOString() };
  ctx.store.pieces.set(piece.id, piece);
  return piece;
}

export function piecesFor(store: RadarStore, userId: string): Piece[] {
  return [...store.pieces.values()].filter((p) => p.userId === userId);
}

/**
 * The core loop action: the user (or Radar, via email/host detection later)
 * moves an opportunity through their pipeline. Every transition is a recorded
 * StatusEvent; setting a status on an untracked opportunity tracks it first.
 */
export function setMyStatus(
  ctx: TrackerContext,
  userId: string,
  opportunityId: string,
  status: MyStatus,
  opts: { note?: string; source?: 'user' | 'radar' } = {},
): TrackedOpportunity {
  const tracked = track(ctx, userId, opportunityId);
  if (tracked.myStatus === status) return tracked;
  const now = ctx.clock.now().toISOString();
  tracked.events.push({ at: now, from: tracked.myStatus, to: status, source: opts.source ?? 'user', note: opts.note });
  tracked.myStatus = status;
  if (status === 'submitted' && !tracked.submittedAt) tracked.submittedAt = now;
  return tracked;
}

export interface TrackerItem {
  opportunityId: string;
  title: string;
  organizationName?: string;
  /** Added for apps/web's Tracker "Type" view (Story 3.5) -- organizationName
   * and deadline were already here for the Organization/Deadline views, type
   * was missing. */
  type: OpportunityType;
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
  daysToDeadline?: number;
  fit: FitScore;
  trust: number;
  events: TrackedOpportunity['events'];
  /** Only set once submitted: this organization's typical response-by date and whether it's passed. */
  expectedResponseBy?: string;
  daysOverdue?: number;
}

export type PipelineStage = 'planning' | 'submitted' | 'in-progress' | 'outcome' | 'archived';

const STAGE_OF: Record<MyStatus, PipelineStage> = {
  'interested': 'planning', 'saved': 'planning', 'preparing': 'planning',
  'draft-started': 'planning', 'ready-to-submit': 'planning',
  'submitted': 'submitted', 'received': 'submitted',
  'in-review': 'in-progress', 'longlisted': 'in-progress', 'shortlisted': 'in-progress',
  'finalist': 'in-progress', 'waitlisted': 'in-progress', 'revision-requested': 'in-progress',
  'accepted': 'outcome', 'declined': 'outcome', 'withdrawn': 'outcome',
  'partially-withdrawn': 'outcome', 'delivered': 'outcome',
  'archived': 'archived',
};

export interface TrackerView {
  userId: string;
  /** Pipeline view: planning → submitted → in-progress → outcome. */
  pipeline: Record<PipelineStage, TrackerItem[]>;
  /** Deadline view: pre-submission items sorted by soonest deadline. */
  deadlines: TrackerItem[];
  stats: UserTrackerStats;
}

export interface UserTrackerStats {
  tracked: number;
  planning: number;
  submitted: number;
  awaitingResponse: number;
  accepted: number;
  declined: number;
  acceptanceRate?: number;
}

function toItem(ctx: TrackerContext, user: UserProfile, tracked: TrackedOpportunity, opp: Opportunity): TrackerItem {
  const today = isoDateOf(ctx.clock.now());
  const deadline = opp.fields.deadline;
  let expectedResponseBy: string | undefined;
  let daysOverdue: number | undefined;
  if (tracked.myStatus === 'submitted' && tracked.submittedAt) {
    const windowDays = expectedResponseWindowDays(ctx.store, opp.fields.organizationId);
    expectedResponseBy = addDays(isoDateOf(new Date(tracked.submittedAt)), windowDays);
    const overdue = daysBetween(expectedResponseBy, today);
    if (overdue > 0) daysOverdue = overdue;
  }
  return {
    opportunityId: opp.id,
    title: opp.fields.title,
    organizationName: opp.fields.organizationName,
    type: opp.fields.type,
    opportunityStatus: displayStatus(opp),
    myStatus: tracked.myStatus,
    deadline: deadline.date,
    deadlineKind: deadline.kind,
    daysToDeadline: deadline.date ? daysBetween(today, deadline.date) : undefined,
    fit: fitScore(user, opp, ctx.clock.now()),
    trust: opp.scores.trust,
    events: tracked.events,
    expectedResponseBy,
    daysOverdue,
  };
}

export function trackerView(ctx: TrackerContext, userId: string): TrackerView {
  const user = ctx.store.users.get(userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  const pipeline: TrackerView['pipeline'] = { planning: [], submitted: [], 'in-progress': [], outcome: [], archived: [] };
  const items: TrackerItem[] = [];
  for (const t of ctx.store.tracked) {
    if (t.userId !== userId) continue;
    const opp = ctx.store.opportunities.get(t.opportunityId);
    if (!opp) continue;
    const item = toItem(ctx, user, t, opp);
    items.push(item);
    pipeline[STAGE_OF[t.myStatus]].push(item);
  }
  const deadlines = items
    .filter((i) => PRE_SUBMISSION_STATUSES.includes(i.myStatus) && i.daysToDeadline !== undefined && i.daysToDeadline >= 0)
    .sort((a, b) => a.daysToDeadline! - b.daysToDeadline!);

  const accepted = items.filter((i) => ['accepted', 'delivered'].includes(i.myStatus)).length;
  const declined = items.filter((i) => i.myStatus === 'declined').length;
  const stats: UserTrackerStats = {
    tracked: items.length,
    planning: pipeline.planning.length,
    submitted: pipeline.submitted.length,
    awaitingResponse: pipeline.submitted.length + pipeline['in-progress'].length,
    accepted,
    declined,
    acceptanceRate: accepted + declined > 0 ? accepted / (accepted + declined) : undefined,
  };
  return { userId, pipeline, deadlines, stats };
}

/** Reminder ladder from the strategy's "Reminders and Nudges": 7, 3, and 1 day out. */
export const REMINDER_DAYS = [7, 3, 1] as const;

/**
 * Deadline reminders for tracked, not-yet-submitted opportunities. Each rung
 * of the ladder fires once per deadline (dedup includes the deadline date, so
 * an extended deadline re-arms the ladder).
 */
export function deadlineReminders(ctx: TrackerContext): Alert[] {
  const out: Alert[] = [];
  const today = isoDateOf(ctx.clock.now());
  for (const t of ctx.store.tracked) {
    if (!t.notify || !PRE_SUBMISSION_STATUSES.includes(t.myStatus)) continue;
    const opp = ctx.store.opportunities.get(t.opportunityId);
    const deadline = opp?.fields.deadline.date;
    if (!opp || !deadline || opp.duplicateOfId) continue;
    const days = daysBetween(today, deadline);
    if (days < 0) continue;
    // Smallest rung that covers today, so each rung of the ladder fires once.
    const rung = [...REMINDER_DAYS].sort((a, b) => a - b).find((d) => days <= d);
    if (rung === undefined) continue;

    // Confidence gate: never fire the same-day hard alert on data we don't trust yet.
    const tier = confidenceTier(opp);
    if (tier === 'uncertain' && days === 0) continue;

    const key = `remind:${t.userId}:${opp.id}:${deadline}:${rung}`;
    if (ctx.store.emittedAlertKeys.has(key)) continue;
    ctx.store.emittedAlertKeys.add(key);
    const unconfirmed = tier === 'uncertain';
    const alert: Alert = {
      id: ctx.ids.next('alert'),
      audience: 'user',
      userId: t.userId,
      kind: 'deadline-reminder',
      opportunityId: opp.id,
      title:
        days === 0
          ? `Today is the deadline for ${opp.fields.title}`
          : `${days} day${days === 1 ? '' : 's'} left${unconfirmed ? ' (unconfirmed)' : ''}: ${opp.fields.title} ${unconfirmed ? 'may close' : 'closes'} ${deadline}`,
      body: unconfirmed
        ? `Your status is still "${t.myStatus}". This deadline is low-confidence — worth double-checking on their site.`
        : `Your status is still "${t.myStatus}".`,
      reason: 'you track this opportunity and have not submitted yet',
      createdAt: ctx.clock.now().toISOString(),
      read: false,
    };
    ctx.store.alerts.set(alert.id, alert);
    out.push(alert);
  }
  return out;
}

/**
 * When one tracked opportunity is accepted, suggest withdrawing the user's
 * other still-active submissions — the "acceptance orchestration" pattern:
 * simultaneous submitters usually withdraw everywhere else once one venue
 * says yes. This is scoped to "other active tracked opportunities" rather
 * than "the same piece," since Missa doesn't yet model discrete
 * pieces/manuscripts as their own trackable entity — a real modeling gap for
 * writers who submit different pieces to different venues at once, but a
 * meaningful nudge either way. Never auto-withdraws anything; withdrawal is
 * a real, external action a human should confirm.
 */
export function withdrawalSuggestionAlerts(ctx: TrackerContext): Alert[] {
  const out: Alert[] = [];
  for (const t of ctx.store.tracked) {
    if (t.myStatus !== 'accepted') continue;
    const opp = ctx.store.opportunities.get(t.opportunityId);
    if (!opp) continue;

    const key = `withdraw-suggest:${t.userId}:${t.opportunityId}`;
    if (ctx.store.emittedAlertKeys.has(key)) continue;
    ctx.store.emittedAlertKeys.add(key); // mark now so a later tick never re-suggests, even if `others` is empty today

    const active = ctx.store.tracked.filter(
      (o) => o.userId === t.userId && o.opportunityId !== t.opportunityId && ['submitted', 'in-progress'].includes(STAGE_OF[o.myStatus]),
    );
    // If we know which piece was accepted, only suggest withdrawing that
    // same piece elsewhere — precise, not a blanket "withdraw everything."
    // Falls back to "all other active submissions" when no piece is set.
    const others = t.pieceId ? active.filter((o) => o.pieceId === t.pieceId) : active;
    if (others.length === 0) continue;

    const names = others
      .map((o) => ctx.store.opportunities.get(o.opportunityId)?.fields.title)
      .filter((title): title is string => !!title);
    const piece = t.pieceId ? ctx.store.pieces.get(t.pieceId) : undefined;
    const alert: Alert = {
      id: ctx.ids.next('alert'),
      audience: 'user',
      userId: t.userId,
      kind: 'withdrawal-suggested',
      opportunityId: t.opportunityId,
      title: `Accepted at ${opp.fields.organizationName ?? opp.fields.title} — withdraw elsewhere?`,
      body: piece
        ? `"${piece.title}" is also active at ${others.length} other place${others.length === 1 ? '' : 's'} (${names.join(', ')}). Most venues expect you to withdraw the same piece once one accepts.`
        : `You have ${others.length} other active submission${others.length === 1 ? '' : 's'}${names.length ? ` (${names.join(', ')})` : ''}. If any is the same piece, most venues expect you to withdraw it once one accepts.`,
      reason: `${opp.fields.title} just accepted your submission`,
      createdAt: ctx.clock.now().toISOString(),
      read: false,
    };
    ctx.store.alerts.set(alert.id, alert);
    out.push(alert);
  }
  return out;
}

/**
 * "It's been 90 days, want to follow up or mark it withdrawn?" — the
 * proactive counterpart to the tracker's manual "Never responded" status.
 * Fires once per (user, opportunity, submittedAt) the first time the
 * organization's typical response window has passed with no update.
 */
export function overdueResponseAlerts(ctx: TrackerContext): Alert[] {
  const out: Alert[] = [];
  const today = isoDateOf(ctx.clock.now());
  for (const t of ctx.store.tracked) {
    if (t.myStatus !== 'submitted' || !t.submittedAt) continue;
    const opp = ctx.store.opportunities.get(t.opportunityId);
    if (!opp) continue;
    const windowDays = expectedResponseWindowDays(ctx.store, opp.fields.organizationId);
    const responseBy = addDays(isoDateOf(new Date(t.submittedAt)), windowDays);
    if (daysBetween(responseBy, today) <= 0) continue;

    const key = `overdue:${t.userId}:${opp.id}:${t.submittedAt}`;
    if (ctx.store.emittedAlertKeys.has(key)) continue;
    ctx.store.emittedAlertKeys.add(key);
    const alert: Alert = {
      id: ctx.ids.next('alert'),
      audience: 'user',
      userId: t.userId,
      kind: 'response-overdue',
      opportunityId: opp.id,
      title: `No word yet from ${opp.fields.organizationName ?? opp.fields.title}`,
      body: `It's past their typical response window (~${windowDays}d) since you submitted on ${isoDateOf(new Date(t.submittedAt))}. Consider following up, or marking it withdrawn.`,
      reason: `you submitted this and ${windowDays} days is longer than ${opp.fields.organizationName ?? 'this organization'} usually takes to respond`,
      createdAt: ctx.clock.now().toISOString(),
      read: false,
    };
    ctx.store.alerts.set(alert.id, alert);
    out.push(alert);
  }
  return out;
}
