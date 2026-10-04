import { calendarDateIn, daysBetween, describeDeadline } from "./deadline-moment";

/**
 * Compatibility wrappers over `describeDeadline` for older callers. New code
 * should call `describeDeadline` directly so exact close times and time zones
 * are honoured.
 */

export interface DeadlineLabel {
  label: string;
  urgent: boolean;
}

function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Calendar-day distance between an Opportunity deadline date and "today".
 *
 * Deadlines are date-only values, so the comparison is made between calendar
 * days (not instants). That keeps a deadline from reading as "today" simply
 * because the viewer is west of UTC in the evening.
 */
export function calendarDaysUntil(isoDate: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return daysBetween(calendarDateIn(now, runtimeTimeZone()), isoDate);
}

export function formatDeadlineLabel(
  isoDate: string,
  now = new Date(),
): DeadlineLabel | null {
  if (calendarDaysUntil(isoDate, now) === null) return null;
  const moment = describeDeadline({ kind: "exact", date: isoDate }, { now });
  return { label: moment.label, urgent: moment.urgent };
}
