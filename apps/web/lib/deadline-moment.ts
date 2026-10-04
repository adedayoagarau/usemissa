/**
 * One description of a deadline for every surface: Opportunity pages, Tracker
 * rows, Calendar details and emails. It replaces the separate countdowns that
 * used to live in each component.
 *
 * Date-only deadlines stay date-only: they are compared as calendar days in the
 * viewer's own day, so a deadline never reads as "today" just because the
 * viewer is west of UTC in the evening. When the source gives an exact closing
 * time, the closing moment is shown in the source's time zone and, when it
 * differs, in the viewer's.
 */

export type DeadlineMomentKind =
  | "exact"
  | "fixed"
  | "inferred"
  | "rolling"
  | "until-filled"
  | "year-round"
  | "seasonal"
  | "conflicting"
  | "unknown";

export type DeadlineMomentInput = {
  kind?: DeadlineMomentKind | string | null;
  /** ISO calendar date (YYYY-MM-DD). */
  date?: string | null;
  /** ISO instant of the exact close, when the source states one. */
  time?: string | null;
  /** IANA time zone the source states the deadline in. */
  timezone?: string | null;
};

export type DeadlineMomentState =
  | "open"
  | "closed"
  | "rolling"
  | "until-filled"
  | "year-round"
  | "seasonal"
  | "needs-review"
  | "unlisted";

export type DeadlineMoment = {
  state: DeadlineMomentState;
  /** Full customer label, e.g. "Closes Mar 3 · 5 days left". */
  label: string;
  /** Short label for compact rows, e.g. "5 days left" or "Mar 3". */
  shortLabel: string;
  /** Calendar days from the viewer's today; negative once closed; null without a date. */
  daysLeft: number | null;
  /** Within seven days and still open. Shown with the ochre urgency treatment. */
  urgent: boolean;
  /** "11:59 pm EDT, Mar 3" in the source's zone when an exact time is known. */
  closesSource?: string;
  /** The same moment in the viewer's zone, only when the zones differ. */
  closesLocal?: string;
  /** ISO date the call closes on, in the viewer's day when a time is known. */
  closesOn?: string;
};

export type DeadlineMomentOptions = {
  now?: Date;
  /** Viewer IANA time zone; defaults to the runtime's zone. */
  viewerTimeZone?: string;
};

const DAY_MS = 86_400_000;
export const URGENT_DAYS = 7;
export const COUNTDOWN_DAYS = 30;

function parseCalendarDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function validTimeZone(zone: string | null | undefined): string | undefined {
  if (!zone) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The calendar date of an instant in a time zone, as YYYY-MM-DD. */
export function calendarDateIn(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Whole calendar days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number | null {
  const a = parseCalendarDate(from);
  const b = parseCalendarDate(to);
  if (!a || !b) return null;
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS);
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(isoDate: string, days: number): string {
  const parsed = parseCalendarDate(isoDate);
  if (!parsed) return isoDate;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days)).toISOString().slice(0, 10);
}

/** "Mar 3", or "Mar 3, 2027" when the year differs from `now`'s. */
export function formatShortDate(isoDate: string, now = new Date()): string {
  const parsed = parseCalendarDate(isoDate);
  if (!parsed) return isoDate;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(parsed.year !== now.getFullYear() ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

function formatMoment(instant: Date, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  })
    .format(instant)
    .replace(/\s?AM/u, " am")
    .replace(/\s?PM/u, " pm");
  const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone }).format(instant);
  return `${time}, ${day}`;
}

function undatedMoment(kind: string | null | undefined): DeadlineMoment {
  switch (kind) {
    case "rolling":
      return { state: "rolling", label: "Rolling deadline", shortLabel: "Rolling", daysLeft: null, urgent: false };
    case "until-filled":
      return { state: "until-filled", label: "Open until filled", shortLabel: "Until filled", daysLeft: null, urgent: false };
    case "year-round":
      return { state: "year-round", label: "Open all year", shortLabel: "Year-round", daysLeft: null, urgent: false };
    case "seasonal":
      return { state: "seasonal", label: "Opens in reading periods", shortLabel: "Seasonal", daysLeft: null, urgent: false };
    case "conflicting":
      return { state: "needs-review", label: "Deadline needs checking", shortLabel: "Needs checking", daysLeft: null, urgent: false };
    default:
      return { state: "unlisted", label: "Deadline not listed", shortLabel: "Not listed", daysLeft: null, urgent: false };
  }
}

/** Describe a deadline for the viewer. Pure; pass `now` and `viewerTimeZone` in tests. */
export function describeDeadline(input: DeadlineMomentInput, options: DeadlineMomentOptions = {}): DeadlineMoment {
  const now = options.now ?? new Date();
  const viewerZone = validTimeZone(options.viewerTimeZone) ?? runtimeTimeZone();
  const sourceZone = validTimeZone(input.timezone);
  const instant = input.time ? new Date(input.time) : null;
  const hasInstant = instant !== null && !Number.isNaN(instant.getTime());

  if (!input.date && !hasInstant) return undatedMoment(input.kind);
  if (input.kind === "conflicting") return undatedMoment("conflicting");

  const today = calendarDateIn(now, viewerZone);
  const closesOn = hasInstant ? calendarDateIn(instant!, viewerZone) : (input.date as string);
  const daysLeft = daysBetween(today, closesOn);
  if (daysLeft === null) return undatedMoment(input.kind);

  const closesSource = hasInstant ? formatMoment(instant!, sourceZone ?? viewerZone) : undefined;
  const closesLocal =
    hasInstant && sourceZone && sourceZone !== viewerZone && formatMoment(instant!, viewerZone) !== closesSource
      ? formatMoment(instant!, viewerZone)
      : undefined;
  const closed = hasInstant ? instant!.getTime() <= now.getTime() : daysLeft < 0;
  const dateLabel = formatShortDate(closesOn, now);

  if (closed) {
    return { state: "closed", label: `Closed ${dateLabel}`, shortLabel: `Closed ${dateLabel}`, daysLeft, urgent: false, closesSource, closesLocal, closesOn };
  }
  const base = { state: "open" as const, daysLeft, closesSource, closesLocal, closesOn };
  if (daysLeft === 0) return { ...base, label: "Closes today", shortLabel: "Today", urgent: true };
  if (daysLeft === 1) return { ...base, label: "Closes tomorrow", shortLabel: "Tomorrow", urgent: true };
  if (daysLeft <= COUNTDOWN_DAYS) {
    return {
      ...base,
      label: `Closes ${dateLabel} · ${daysLeft} days left`,
      shortLabel: `${daysLeft} days left`,
      urgent: daysLeft <= URGENT_DAYS,
    };
  }
  return { ...base, label: `Closes ${dateLabel}`, shortLabel: dateLabel, urgent: false };
}
