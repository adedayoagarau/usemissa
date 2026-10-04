/**
 * Pure rules and wording for the deadline reminders Missa schedules itself.
 * Kept free of the database so the copy and the dedupe keys can be tested on
 * their own and shared by the reminder tick and the deadline tick.
 *
 * Reminder row scheme (creator_application_reminders):
 * - The creator's own reminders: kind preparation/deadline/response with no
 *   subject. One per kind per call; CreatorReminderRepository.create only
 *   looks at this row.
 * - Default deadline offsets: kind 'deadline', subject_kind null,
 *   subject_id 'offset:N' (N days before). Same rescheduling, review and
 *   delivery as the creator's own deadline reminder.
 * - Deadline-day alarm: kind 'deadline-day', subject_kind 'escalation',
 *   subject_id 'deadline-day:YYYY-MM-DD'.
 * - Fee tier ending: kind 'tier', subject_kind 'tier', subject_id the tier id.
 * - Milestone: kind 'milestone', subject_kind 'obligation', subject_id the
 *   obligation id.
 * Tier and milestone rows store the subject's date in source_deadline.
 */
import { daysBetween, formatShortDate } from "./deadline-moment";
import type { ResponseClock } from "./response-clock";

/** Tracker statuses before submission. */
export const PRE_SUBMISSION_STATUSES = ["interested", "saved", "preparing", "draft-started", "ready-to-submit"] as const;
/** Statuses where an application is being worked on, for the gone-quiet nudge. */
export const PREPARING_STATUSES = ["preparing", "draft-started", "ready-to-submit"] as const;
/** Submitted and waiting for a reply, for the time-to-follow-up notice. */
export const AWAITING_STATUSES = ["submitted", "received", "in-review"] as const;
/** Statuses where obligations after acceptance still apply. */
export const CLOSED_STATUSES = ["declined", "withdrawn", "partially-withdrawn", "archived"] as const;

/** Inbox kinds counted against the creator's daily notice cap. The deadline-day alarm is exempt. */
export const DAILY_CAPPED_NOTICE_KINDS = ["tier-ending", "milestone-due", "gone-quiet", "time-to-query"] as const;

/** Reminder kind to the Inbox kind its notice uses. */
export function reminderInboxKind(kind: string): string {
  switch (kind) {
    case "response":
      return "response-overdue";
    case "deadline-day":
      return "deadline-day";
    case "tier":
      return "tier-ending";
    case "milestone":
      return "milestone-due";
    default:
      return "deadline-reminder";
  }
}

export const defaultOffsetSubject = (offsetDays: number) => `offset:${offsetDays}`;

/** Title of a default deadline reminder, read in the Inbox as the notice title. */
export function defaultOffsetTitle(offsetDays: number): string {
  switch (offsetDays) {
    case 0:
      return "Closes today";
    case 1:
      return "Closes tomorrow";
    case 7:
      return "Closes in a week";
    case 14:
      return "Closes in two weeks";
    default:
      return `Closes in ${offsetDays} days`;
  }
}

/** "today", "tomorrow", a weekday within the week, or "Oct 10". */
export function relativeDay(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days !== null && days > 1 && days < 7) {
    const [y, m, d] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, d!)));
  }
  return `on ${formatShortDate(date)}`;
}

export function formatMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** "Early-bird closes Friday, $15 less than the regular fee". */
export function tierEndingTitle(input: {
  label: string;
  closesOn: string;
  today: string;
  feeCents: number;
  nextLabel: string;
  nextFeeCents: number;
  currency?: string | null;
}): string {
  const saving = formatMoney(input.nextFeeCents - input.feeCents, input.currency ?? "USD");
  const next = input.nextLabel.trim().replace(/\s+fee$/iu, "").toLowerCase() || "next";
  return `${input.label.trim()} closes ${relativeDay(input.closesOn, input.today)}, ${saving} less than the ${next} fee`;
}

/** "Final draft is due tomorrow". */
export function milestoneTitle(label: string, dueOn: string, today: string): string {
  return `${label.trim()} is due ${relativeDay(dueOn, today)}`;
}

/** Inbox body for a delivered reminder row: the application title, as the existing deadline reminders use. */
export function reminderNoticeBody(applicationTitle: string): string {
  return applicationTitle;
}

/** Why the creator is seeing a delivered reminder notice. */
export function reminderNoticeReason(kind: string, subjectId: string | null): string {
  switch (kind) {
    case "deadline-day":
      return "Your deadline-day alarm is on.";
    case "tier":
      return "A cheaper fee ends soon on a call you saved.";
    case "milestone":
      return "A step in your plan is due.";
    default:
      return subjectId?.startsWith("offset:") ? "Missa adds deadline reminders when you save a call." : "You scheduled this reminder.";
  }
}

/**
 * Dedupe key for a delivered reminder notice. The creator's own reminders keep
 * their existing key; Missa's kinds use {inbox kind}:{subject}:{date} so one
 * subject on one date is announced once even if its row is recreated.
 */
export function reminderNoticeDedupeKey(row: {
  id: string;
  kind: string;
  subject_id: string | null;
  opportunity_id: string;
  source_deadline: string | Date | null;
  effective_due: string | Date;
}): string {
  const date = row.source_deadline instanceof Date ? row.source_deadline.toISOString().slice(0, 10) : row.source_deadline;
  if (row.kind === "deadline-day" || row.kind === "tier" || row.kind === "milestone")
    return `${reminderInboxKind(row.kind)}:${row.subject_id ?? row.opportunity_id}:${date ?? "undated"}`;
  return `application-reminder:${row.id}:${new Date(row.effective_due).toISOString()}`;
}

function quietPeriodLabel(days: number): string {
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? "a week" : `${weeks} weeks`;
  }
  return `${days} days`;
}

/** One gone-quiet notice per call per quiet period since the last activity. */
export function goneQuietDedupeKey(trackedId: string, lastActivityOn: string, quietDays: number, periodDays: number): string {
  return `gone-quiet:${trackedId}:${lastActivityOn}:${Math.floor(quietDays / Math.max(1, periodDays))}`;
}

export function goneQuietCopy(input: { applicationTitle: string; periodDays: number; deadline: string }) {
  return {
    title: `No activity in ${quietPeriodLabel(input.periodDays)}`,
    body: `${input.applicationTitle} closes ${formatShortDate(input.deadline)}. Pick it up again when you're ready.`,
    reason: "Based on the last change in your Tracker.",
  };
}

/** Only these response-clock states send a notice. */
export function shouldNotifyResponseClock(clock: ResponseClock): boolean {
  return clock.state === "time-to-query" || clock.state === "past-stated";
}

export function timeToQueryDedupeKey(trackedId: string, status: string, submittedOn: string, state: string): string {
  return `time-to-query:${trackedId}:${status}:${submittedOn}:${state}`;
}

export function timeToQueryCopy(input: { applicationTitle: string; organizationName: string; clock: ResponseClock }) {
  const waited = `${input.clock.waitedDays} ${input.clock.waitedDays === 1 ? "day" : "days"}`;
  if (input.clock.state === "past-stated")
    return {
      title: "Past the stated response time",
      body: `You sent ${input.applicationTitle} ${waited} ago. ${input.organizationName} says to expect a reply within ${input.clock.statedDays} days. A short, polite note is reasonable.`,
      reason: "Stated by the organization.",
    };
  return {
    title: "Time to follow up",
    body: `You sent ${input.applicationTitle} ${waited} ago. Nine in ten Missa creators heard back within ${input.clock.typicalDays} days.`,
    reason: input.clock.basis ? `${input.clock.basis}.` : "Observed from Missa creators.",
  };
}
