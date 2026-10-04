/**
 * Planning arithmetic shared by the Tracker, Calendar, Season page, reminders
 * and the obligation ledger. Everything here is pure and works on ISO calendar
 * dates (YYYY-MM-DD) so the rules can be tested without a database.
 *
 * Offsets are signed whole days from the anchor: -7 is a week before the
 * deadline, +30 is a month after acceptance.
 */
import { addDays, daysBetween } from "./deadline-moment";

export type BufferPolicy = "keep" | "absorb" | "ignore";

export type ChainItem = {
  id: string;
  dueOn: string;
  /** Signed days from the anchor; null for items that are not anchored. */
  offsetDays: number | null;
  bufferPolicy: BufferPolicy;
  state?: "open" | "done" | "skipped";
};

export type ChainMove = { id: string; from: string; to: string };

/** The due date for an offset from an anchor date. */
export function resolveDueDate(anchorOn: string, offsetDays: number): string {
  return addDays(anchorOn, offsetDays);
}

/**
 * Move anchored, open items after their anchor (usually the official
 * deadline) changes. Done and skipped items never move.
 * - keep: the item keeps its distance from the anchor.
 * - absorb: an extension becomes extra slack, so the item stays put; an
 *   earlier deadline pulls the item earlier by the same amount.
 * - ignore: the item never moves on its own.
 */
export function recalculateChain(items: readonly ChainItem[], oldAnchor: string, newAnchor: string): ChainMove[] {
  const delta = daysBetween(oldAnchor, newAnchor);
  if (!delta) return [];
  const moves: ChainMove[] = [];
  for (const item of items) {
    if (item.state && item.state !== "open") continue;
    if (item.offsetDays === null || item.bufferPolicy === "ignore") continue;
    let to: string;
    if (item.bufferPolicy === "keep") to = resolveDueDate(newAnchor, item.offsetDays);
    else if (delta > 0) continue;
    else to = addDays(item.dueOn, delta);
    if (to !== item.dueOn) moves.push({ id: item.id, from: item.dueOn, to });
  }
  return moves;
}

export type StartByInput = {
  /** Estimated hours of work still to do. */
  effortHours: number;
  /** Hours a week the creator can give applications. */
  weeklyHours: number;
  /** The date to finish by: the deadline or a personal target. */
  finishOn: string;
  /** Days of slack to keep before `finishOn`. */
  bufferDays: number;
  /** Today in the creator's zone. */
  today: string;
};

export type StartBy = {
  startOn: string;
  workingDays: number;
  /** True when starting today still leaves the buffer intact. */
  feasible: boolean;
  /** Plain explanation shown next to the date. */
  reason: string;
};

function hoursLabel(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
}

/** The latest sensible start date for a piece of work, with its reasoning. */
export function startBy(input: StartByInput): StartBy {
  const perDay = Math.max(input.weeklyHours, 0.5) / 7;
  const workingDays = Math.max(1, Math.ceil(input.effortHours / perDay));
  const startOn = addDays(input.finishOn, -(workingDays + Math.max(0, input.bufferDays)));
  const feasible = (daysBetween(input.today, startOn) ?? 0) >= 0;
  const slack = input.bufferDays > 0 ? ` and ${input.bufferDays} ${input.bufferDays === 1 ? "day" : "days"} of slack` : "";
  const reason = `About ${hoursLabel(input.effortHours)} of work at ${hoursLabel(input.weeklyHours)} a week takes ${workingDays} ${workingDays === 1 ? "day" : "days"}${slack}.`;
  return { startOn, workingDays, feasible, reason };
}

export type CushionInput = {
  id: string;
  title: string;
  /** The date the work must be finished by. */
  finishOn: string;
  /** Remaining hours of work. */
  effortHours: number;
};

export type CushionStatus = "fits" | "tight" | "does-not-fit";

export type CushionResult = {
  id: string;
  title: string;
  finishOn: string;
  status: CushionStatus;
  /** Hours available from today until `finishOn`. */
  availableHours: number;
  /** Hours needed for this item and everything due before it. */
  neededHours: number;
  /** availableHours - neededHours; negative when it does not fit. */
  slackHours: number;
  /** Earlier items that take the time this one needs. */
  competingIds: string[];
  /** Plain explanation and the fix Missa suggests. */
  cause: string;
  suggestion: "none" | "start-now" | "move-target" | "add-hours" | "drop-or-defer";
};

/**
 * Shovel-style feasibility: work through calls in deadline order and compare
 * the hours each needs, plus everything due before it, with the hours
 * available until its finish date. "Tight" means less than a fifth of the
 * needed time is spare.
 */
export function cushion(items: readonly CushionInput[], weeklyHours: number, today: string): CushionResult[] {
  const perDay = Math.max(weeklyHours, 0) / 7;
  const ordered = [...items].sort((a, b) => a.finishOn.localeCompare(b.finishOn) || a.id.localeCompare(b.id));
  const results: CushionResult[] = [];
  let cumulative = 0;
  const before: CushionInput[] = [];
  for (const item of ordered) {
    const days = Math.max(0, daysBetween(today, item.finishOn) ?? 0);
    const availableHours = Math.round(days * perDay * 10) / 10;
    cumulative += Math.max(0, item.effortHours);
    const neededHours = Math.round(cumulative * 10) / 10;
    const slackHours = Math.round((availableHours - neededHours) * 10) / 10;
    const competingIds = before.filter((other) => other.effortHours > 0).map((other) => other.id);
    let status: CushionStatus;
    let cause: string;
    let suggestion: CushionResult["suggestion"];
    if (slackHours < 0) {
      status = "does-not-fit";
      if (competingIds.length > 0 && item.effortHours <= availableHours) {
        cause = `${hoursLabel(neededHours - item.effortHours)} of earlier work is due first, leaving ${hoursLabel(Math.max(0, availableHours - (neededHours - item.effortHours)))} for this.`;
        suggestion = "drop-or-defer";
      } else if (weeklyHours <= 0) {
        cause = "No weekly hours are set yet.";
        suggestion = "add-hours";
      } else {
        cause = `It needs ${hoursLabel(item.effortHours)} but only ${hoursLabel(availableHours)} remain before ${item.finishOn}.`;
        suggestion = "move-target";
      }
    } else if (slackHours < neededHours * 0.2) {
      status = "tight";
      cause = `Only ${hoursLabel(slackHours)} to spare.`;
      suggestion = "start-now";
    } else {
      status = "fits";
      cause = `${hoursLabel(slackHours)} to spare.`;
      suggestion = "none";
    }
    results.push({ id: item.id, title: item.title, finishOn: item.finishOn, status, availableHours, neededHours, slackHours, competingIds, cause, suggestion });
    before.push(item);
  }
  return results;
}

export type TriageBucket = "act-now" | "develop" | "plan-ahead" | "later" | "undated" | "closed";

/** GrantStation-style triage: act now within 30 days, develop within 90, plan within 180. */
export function triageBucket(daysLeft: number | null | undefined): TriageBucket {
  if (daysLeft === null || daysLeft === undefined) return "undated";
  if (daysLeft < 0) return "closed";
  if (daysLeft <= 30) return "act-now";
  if (daysLeft <= 90) return "develop";
  if (daysLeft <= 180) return "plan-ahead";
  return "later";
}

export const TRIAGE_LABELS: Record<TriageBucket, string> = {
  "act-now": "Act now",
  develop: "Develop",
  "plan-ahead": "Plan ahead",
  later: "Later",
  undated: "Rolling or undated",
  closed: "Closed",
};

export type CrunchWeek = {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string;
  count: number;
  ids: string[];
  /** Three or more deadlines in one week. */
  crunch: boolean;
};

/** Monday on or before a date. */
export function weekStartOf(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** Deadlines per week for the next `weeks` weeks, starting with this week. */
export function crunchWeeks(
  deadlines: readonly { id: string; date: string }[],
  today: string,
  weeks = 26,
  crunchAt = 3,
): CrunchWeek[] {
  const first = weekStartOf(today);
  const rows: CrunchWeek[] = Array.from({ length: weeks }, (_, index) => ({
    weekStart: addDays(first, index * 7),
    count: 0,
    ids: [],
    crunch: false,
  }));
  for (const deadline of deadlines) {
    if (deadline.date < today) continue;
    const index = Math.floor((daysBetween(first, deadline.date) ?? -1) / 7);
    if (index < 0 || index >= weeks) continue;
    rows[index].count += 1;
    rows[index].ids.push(deadline.id);
  }
  for (const row of rows) row.crunch = row.count >= crunchAt;
  return rows;
}
