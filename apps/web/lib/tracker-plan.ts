/**
 * Pure helpers behind the Tracker rows, the Plan view, the item sheet and the
 * Needs attention list. Everything works on ISO dates so the rules can be
 * tested without a browser; components pass the viewer's clock in.
 */
import {
  addDays,
  calendarDateIn,
  daysBetween,
  describeDeadline,
  type DeadlineMoment,
} from "./deadline-moment";
import {
  startBy,
  triageBucket,
  TRIAGE_LABELS,
  type StartBy,
  type TriageBucket,
} from "./deadline-chain";
import { responseClock, type ResponseClock } from "./response-clock";
import { preparationTemplates, templateEffort } from "./obligation-templates";

export const PRE_SUBMISSION_STATUSES: ReadonlySet<string> = new Set([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
]);

/** Submitted and still waiting for a decision. */
export const AWAITING_DECISION_STATUSES: ReadonlySet<string> = new Set([
  "submitted",
  "received",
  "in-review",
  "longlisted",
  "shortlisted",
  "finalist",
  "waitlisted",
  "revision-requested",
  "partially-withdrawn",
]);

/** Days without activity before a call in preparation reads as quiet. */
export const QUIET_AFTER_DAYS = 21;

export type ViewerClock = {
  now: Date;
  /** Viewer IANA time zone; the runtime's zone when omitted. */
  timeZone?: string;
};

export type TrackerDeadlineFields = {
  deadline?: string;
  deadlineKind: string;
  deadlineTime?: string;
  deadlineTimezone?: string;
};

/** Today's date for the viewer, YYYY-MM-DD. */
export function viewerToday(clock: ViewerClock): string {
  try {
    return calendarDateIn(clock.now, clock.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  } catch {
    return clock.now.toISOString().slice(0, 10);
  }
}

/** One deadline description for a Tracker row, sheet and attention list. */
export function rowDeadline(item: TrackerDeadlineFields, clock: ViewerClock): DeadlineMoment {
  return describeDeadline(
    {
      kind: item.deadlineKind,
      date: item.deadline ?? null,
      time: item.deadlineTime ?? null,
      timezone: item.deadlineTimezone ?? null,
    },
    { now: clock.now, viewerTimeZone: clock.timeZone },
  );
}

/**
 * "No activity in 3 weeks" for a call still in preparation that nobody has
 * touched for at least three weeks. Null otherwise, including when Missa has
 * no record of the last activity.
 */
export function quietLabel(
  item: { myStatus: string; lastActivityAt?: string },
  clock: ViewerClock,
): string | null {
  if (!PRE_SUBMISSION_STATUSES.has(item.myStatus) || !item.lastActivityAt) return null;
  const last = new Date(item.lastActivityAt);
  if (Number.isNaN(last.getTime())) return null;
  const days = Math.floor((clock.now.getTime() - last.getTime()) / 86_400_000);
  if (days < QUIET_AFTER_DAYS) return null;
  const weeks = Math.floor(days / 7);
  return `No activity in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/**
 * The response clock for a submitted row. The stated window is used only when
 * the call profile gives one (expectedResponseBy); otherwise the label says
 * how long the creator has waited and nothing more.
 */
export function rowResponseClock(
  item: {
    myStatus: string;
    submittedAt?: string;
    expectedResponseBy?: string;
  },
  clock: ViewerClock,
): ResponseClock | null {
  if (!AWAITING_DECISION_STATUSES.has(item.myStatus) || !item.submittedAt) return null;
  const submittedOn = item.submittedAt.slice(0, 10);
  const stated = item.expectedResponseBy ? daysBetween(submittedOn, item.expectedResponseBy.slice(0, 10)) : null;
  return responseClock({
    submittedOn,
    today: viewerToday(clock),
    statedDays: stated !== null && stated > 0 ? stated : null,
  });
}

export type PlanBucketKey = TriageBucket;

export type PlanBucket<T> = {
  key: PlanBucketKey;
  label: string;
  items: T[];
};

const BUCKET_ORDER: PlanBucketKey[] = ["act-now", "develop", "plan-ahead", "later", "undated", "closed"];

/**
 * Group calls still in preparation by how soon they close: Act now (30 days),
 * Develop (90), Plan ahead (180), Later, then rolling or undated calls. Calls
 * whose deadline has passed are listed last so they can be carried forward.
 * Empty buckets are left out except the four dated ones, which always show so
 * the view keeps its shape.
 */
export function planBuckets<T extends TrackerDeadlineFields & { myStatus: string; title: string }>(
  items: readonly T[],
  clock: ViewerClock,
): PlanBucket<T>[] {
  const grouped = new Map<PlanBucketKey, Array<{ item: T; days: number | null }>>();
  for (const item of items) {
    if (!PRE_SUBMISSION_STATUSES.has(item.myStatus)) continue;
    const moment = rowDeadline(item, clock);
    const bucket = moment.state === "closed" ? "closed" : triageBucket(moment.daysLeft);
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), { item, days: moment.daysLeft }]);
  }
  return BUCKET_ORDER.flatMap((key) => {
    const entries = grouped.get(key) ?? [];
    if (!entries.length && (key === "undated" || key === "closed")) return [];
    entries.sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || a.item.title.localeCompare(b.item.title));
    return [{ key, label: TRIAGE_LABELS[key], items: entries.map((entry) => entry.item) }];
  });
}

export type AttentionObligation = {
  id: string;
  label: string;
  dueOn: string;
  state: string;
  opportunityId: string | null;
  opportunityTitle: string | null;
};

/**
 * Open plan steps due within the next week, soonest first, for the Needs
 * attention list. Steps for calls no longer in the Tracker are left out.
 */
export function attentionObligations<T extends AttentionObligation>(
  obligations: readonly T[],
  trackedIds: ReadonlySet<string>,
  today: string,
  withinDays = 7,
): T[] {
  const until = addDays(today, withinDays);
  return obligations
    .filter(
      (step) =>
        step.state === "open" &&
        step.dueOn <= until &&
        (!step.opportunityId || trackedIds.has(step.opportunityId)),
    )
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.label.localeCompare(b.label));
}

/** "Due today", "Due tomorrow", "Due Mar 3" or "Was due Mar 1". */
export function dueLabel(dueOn: string, today: string, format: (iso: string) => string): string {
  const days = daysBetween(today, dueOn);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days !== null && days < 0) return `Was due ${format(dueOn)}`;
  return `Due ${format(dueOn)}`;
}

export type PlanStep = {
  kind: string;
  state: string;
  effortHours: number | null;
};

export type StartByPlan =
  | { status: "ready"; finishOn: string; finishLabel: "target" | "deadline"; result: StartBy }
  | { status: "needs-hours" }
  | { status: "no-date" };

/**
 * The start-by date for one call. Work is the open preparation steps' effort,
 * or the usual template effort for the call's type when no steps carry an
 * estimate. The finish date is the personal target when set, else the
 * deadline. Weekly hours must be known; Missa never guesses them.
 */
export function startByForPlan(input: {
  steps: readonly PlanStep[];
  type?: string;
  weeklyHours: number | null | undefined;
  bufferDays: number;
  materialEffort?: Record<string, number>;
  deadline?: string;
  personalTargetOn?: string;
  today: string;
}): StartByPlan {
  const finishOn = input.personalTargetOn ?? input.deadline;
  if (!finishOn) return { status: "no-date" };
  if (input.weeklyHours === null || input.weeklyHours === undefined || input.weeklyHours <= 0)
    return { status: "needs-hours" };
  const open = input.steps.filter((step) => step.state === "open" && step.kind !== "obligation");
  let effort = open.reduce((sum, step) => sum + Math.max(0, step.effortHours ?? 0), 0);
  if (effort <= 0) {
    effort = preparationTemplates(input.type).reduce(
      (sum, template) => sum + (templateEffort(template, input.materialEffort) ?? 0),
      0,
    );
  }
  return {
    status: "ready",
    finishOn,
    finishLabel: input.personalTargetOn ? "target" : "deadline",
    result: startBy({
      effortHours: Math.max(effort, 0.5),
      weeklyHours: input.weeklyHours,
      finishOn,
      bufferDays: input.bufferDays,
      today: input.today,
    }),
  };
}

const CARRY_STATUSES: ReadonlySet<string> = new Set(["declined", "withdrawn"]);

/**
 * Whether "Carry to next cycle" applies: the call was declined or withdrawn,
 * or it closed before the creator submitted.
 */
export function canCarry(item: {
  myStatus: string;
  opportunityStatus?: string;
  deadlineState?: DeadlineMoment["state"];
  isManual?: boolean;
}): boolean {
  if (item.isManual) return false;
  if (CARRY_STATUSES.has(item.myStatus)) return true;
  if (!PRE_SUBMISSION_STATUSES.has(item.myStatus) && item.myStatus !== "archived") return false;
  return item.deadlineState === "closed" || item.opportunityStatus === "closed";
}
