export interface DeadlineLabel {
  label: string;
  urgent: boolean;
}

function parseCalendarDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

/**
 * Calendar-day distance between an Opportunity deadline date and "today".
 *
 * Deadlines are date-only values, so the comparison is made between calendar
 * days (not instants). That keeps a deadline from reading as "today" simply
 * because the viewer is west of UTC in the evening.
 */
export function calendarDaysUntil(isoDate: string, now = new Date()): number | null {
  const parsed = parseCalendarDate(isoDate);
  if (!parsed) return null;
  const target = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function formatDeadlineLabel(
  isoDate: string,
  now = new Date(),
): DeadlineLabel | null {
  const parsed = parseCalendarDate(isoDate);
  const days = calendarDaysUntil(isoDate, now);
  if (!parsed || days === null) return null;
  const formatted = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));

  if (days < 0) return { label: `Closed ${formatted}`, urgent: false };
  if (days === 0) return { label: "Closes today", urgent: true };
  if (days === 1) return { label: "Closes tomorrow", urgent: true };
  if (days <= 30) {
    return { label: `Closes ${formatted} · ${days} days left`, urgent: days <= 7 };
  }
  return { label: `Closes ${formatted}`, urgent: false };
}
