import { calendarDaysUntil } from "./deadlineLabel.ts";

export type DeadlineCountdown = { days: number; label: string; urgent: boolean };

/**
 * Days left before a date-only deadline, in creator language. Rolling and
 * missing deadlines return null rather than a made-up countdown.
 */
export function deadlineCountdown(
  deadline: string | null | undefined,
  deadlineKind: string,
  now = new Date(),
): DeadlineCountdown | null {
  if (!deadline || deadlineKind === "rolling") return null;
  const days = calendarDaysUntil(deadline.slice(0, 10), now);
  if (days === null) return null;
  if (days < 0) return { days, label: "Deadline passed", urgent: false };
  if (days === 0) return { days, label: "Due today", urgent: true };
  if (days === 1) return { days, label: "Due tomorrow", urgent: true };
  return { days, label: `${days} days left`, urgent: days <= 7 };
}

function timeIn(iso: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en", { ...options, ...(timeZone ? { timeZone } : {}) }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(iso));
  }
}

/**
 * The provider's stated closing time, in the provider's timezone, plus the
 * same instant in the creator's own timezone when the two differ.
 */
export function closingTimeLabel(
  deadlineTime: string,
  providerTimezone: string | null,
  viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): { provider: string; local?: string } {
  const provider = timeIn(deadlineTime, providerTimezone ?? "UTC");
  const local = timeIn(deadlineTime, viewerTimezone);
  const localDay = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: viewerTimezone }).format(new Date(deadlineTime));
  const providerDay = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: providerTimezone ?? "UTC" }).format(new Date(deadlineTime));
  if (local === provider) return { provider };
  return { provider, local: localDay === providerDay ? local : `${local}, ${localDay}` };
}
