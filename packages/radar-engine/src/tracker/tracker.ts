import type {
  Alert,
  FitScore,
  MyStatus,
  Opportunity,
  TrackedOpportunity,
  UserProfile,
} from '../domain/types.js';
import { PRE_SUBMISSION_STATUSES } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';
import { fitScore } from '../matching/fit.js';
import { displayStatus } from '../status/statusEngine.js';

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

export function track(ctx: TrackerContext, userId: string, opportunityId: string, notify = true): TrackedOpportunity {
  const existing = findTracked(ctx.store, userId, opportunityId);
  if (existing) return existing;
  if (!ctx.store.opportunities.has(opportunityId)) throw new Error(`Unknown opportunity: ${opportunityId}`);
  const now = ctx.clock.now().toISOString();
  const tracked: TrackedOpportunity = {
    userId,
    opportunityId,
    trackedAt: now,
    notify,
    myStatus: 'saved',
    events: [{ at: now, to: 'saved', source: 'user' }],
  };
  ctx.store.tracked.push(tracked);
  return tracked;
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
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
  daysToDeadline?: number;
  fit: FitScore;
  trust: number;
  events: TrackedOpportunity['events'];
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
  return {
    opportunityId: opp.id,
    title: opp.fields.title,
    organizationName: opp.fields.organizationName,
    opportunityStatus: displayStatus(opp),
    myStatus: tracked.myStatus,
    deadline: deadline.date,
    deadlineKind: deadline.kind,
    daysToDeadline: deadline.date ? daysBetween(today, deadline.date) : undefined,
    fit: fitScore(user, opp, ctx.clock.now()),
    trust: opp.scores.trust,
    events: tracked.events,
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
    const key = `remind:${t.userId}:${opp.id}:${deadline}:${rung}`;
    if (ctx.store.emittedAlertKeys.has(key)) continue;
    ctx.store.emittedAlertKeys.add(key);
    const alert: Alert = {
      id: ctx.ids.next('alert'),
      audience: 'user',
      userId: t.userId,
      kind: 'deadline-reminder',
      opportunityId: opp.id,
      title:
        days === 0
          ? `Today is the deadline for ${opp.fields.title}`
          : `${days} day${days === 1 ? '' : 's'} left: ${opp.fields.title} closes ${deadline}`,
      body: `Your status is still "${t.myStatus}".`,
      reason: 'you track this opportunity and have not submitted yet',
      createdAt: ctx.clock.now().toISOString(),
      read: false,
    };
    ctx.store.alerts.set(alert.id, alert);
    out.push(alert);
  }
  return out;
}
