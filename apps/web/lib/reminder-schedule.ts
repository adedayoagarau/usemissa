/**
 * Reminder scheduling helpers shared by the reminder dialog and the calendar's
 * one-click deadline reminder.
 *
 * These are client-side conveniences only. The server remains the authority for
 * delivery time and for whether a reminder still falls before the deadline
 * closes, so every value produced here is still validated on submit.
 */

export const DEADLINE_REMINDER_OFFSETS = [14, 7, 3, 1, 0] as const;
export const DEFAULT_REMINDER_TIME = "09:00";
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;
const LAST_TIME_OF_DAY = "23:59";

export function isTimeOfDay(value: string): boolean {
  return TIME_OF_DAY.test(value);
}

/** Calendar date for `deadlineDate` shifted back by `offsetDays`. */
export function reminderDateForOffset(
  deadlineDate: string,
  offsetDays: number,
): string {
  const [year, month, day] = deadlineDate.slice(0, 10).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() - offsetDays);
  return shifted.toISOString().slice(0, 10);
}

/** Instant for a calendar date and time of day in the viewer's own timezone. */
export function reminderInstant(date: string, timeOfDay: string): Date | null {
  if (!isTimeOfDay(timeOfDay)) return null;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const [hour, minute] = timeOfDay.split(":").map(Number);
  if (!year || !month || !day) return null;
  const instant = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function isAhead(date: string, timeOfDay: string, now: Date): boolean {
  const instant = reminderInstant(date, timeOfDay);
  return instant !== null && instant.getTime() > now.getTime();
}

/** Whether a proposed reminder instant precedes a provider-stated close. */
export function isBeforeDeadlineClose(
  date: string,
  timeOfDay: string,
  closesAt?: string | null,
): boolean {
  if (!closesAt) return true;
  const instant = reminderInstant(date, timeOfDay);
  const close = new Date(closesAt);
  return (
    instant !== null &&
    Number.isFinite(close.getTime()) &&
    instant.getTime() < close.getTime()
  );
}

function localDay(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Next half hour at least 30 minutes out, so a same-day reminder is actionable. */
function laterToday(now: Date): string {
  const candidate = new Date(now.getTime() + 30 * 60_000);
  candidate.setMinutes(candidate.getMinutes() >= 30 ? 60 : 30, 0, 0);
  if (candidate.getDate() !== now.getDate()) return LAST_TIME_OF_DAY;
  return [
    String(candidate.getHours()).padStart(2, "0"),
    String(candidate.getMinutes()).padStart(2, "0"),
  ].join(":");
}

/**
 * Time of day that is still ahead on `date`. The morning default is kept
 * whenever it is still ahead; a deadline day that has already passed 9am falls
 * back to a time later today instead of refusing the reminder outright.
 */
export function viableTimeOfDay(
  date: string,
  now: Date,
  fallback: string = DEFAULT_REMINDER_TIME,
): string {
  if (isAhead(date, fallback, now)) return fallback;
  return date === localDay(now) ? laterToday(now) : fallback;
}

/**
 * First schedule in `offsets` whose reminder instant is still ahead, in the
 * order given. Returns null when the deadline day has already ended.
 */
export function firstViableDeadlineSchedule(
  deadlineDate: string,
  now: Date,
  offsets: readonly number[] = DEADLINE_REMINDER_OFFSETS,
  closesAt?: string | null,
): { offsetDays: number; timeOfDay: string } | null {
  for (const offsetDays of offsets) {
    const date = reminderDateForOffset(deadlineDate, offsetDays);
    const timeOfDay = viableTimeOfDay(date, now);
    if (
      isAhead(date, timeOfDay, now) &&
      isBeforeDeadlineClose(date, timeOfDay, closesAt)
    )
      return { offsetDays, timeOfDay };

    // When the next rounded half-hour would miss a stated close, retain a
    // useful final minute inside the provider's window instead of rolling the
    // reminder past it.
    if (offsetDays === 0 && closesAt) {
      const close = new Date(closesAt);
      const lastMinute = new Date(close);
      lastMinute.setSeconds(0, 0);
      if (lastMinute.getTime() >= close.getTime())
        lastMinute.setMinutes(lastMinute.getMinutes() - 1);
      if (
        Number.isFinite(lastMinute.getTime()) &&
        localDay(lastMinute) === date &&
        lastMinute.getTime() > now.getTime()
      ) {
        const boundedTime = [
          String(lastMinute.getHours()).padStart(2, "0"),
          String(lastMinute.getMinutes()).padStart(2, "0"),
        ].join(":");
        return { offsetDays, timeOfDay: boundedTime };
      }
    }
  }
  return null;
}
