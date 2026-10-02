/**
 * Plain-language facts about an Opportunity for emails: dates, time left, type,
 * entry fee, award and Tracker status. Every helper returns null rather than a
 * placeholder when Missa does not hold the fact, so an email never prints one.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY = 86_400_000;
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Parse a "YYYY-MM-DD" deadline as a calendar date; anything else is left as written. */
export function calendarDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

/** Whole days from today (UTC) until the deadline date; 0 on the day itself. */
export function daysUntil(date: Date, now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((date.getTime() - today) / DAY));
}

const year = (date: Date, now: Date) => (date.getUTCFullYear() === now.getUTCFullYear() ? '' : ` ${date.getUTCFullYear()}`);

/** "30 November", with the year only when it is not the current one. */
export function dayMonth(date: Date, now = new Date()): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${year(date, now)}`;
}

/** "Wednesday 7 October", with the year only when it is not the current one. */
export function longDate(date: Date, now = new Date()): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${dayMonth(date, now)}`;
}

/** "Wednesday" within the coming week, otherwise "7 October", for sentences. */
export function relativeDay(date: Date, now = new Date()): string {
  const days = daysUntil(date, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return days < 7 ? WEEKDAYS[date.getUTCDay()]! : dayMonth(date, now);
}

export function daysLeftLabel(days: number): string {
  if (days === 0) return 'Closes today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** "one", "two" … "nine", then digits. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
export const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const TYPE_LABELS: Record<string, string> = {
  'open-call': 'Open call',
  magazine: 'Magazine',
  grant: 'Grant',
  award: 'Award',
  fellowship: 'Fellowship',
  residency: 'Residency',
  festival: 'Festival',
  scholarship: 'Scholarship',
  conference: 'Conference',
  rfp: 'Request for proposals',
  contest: 'Contest',
  pitch: 'Pitch',
  exhibition: 'Exhibition',
  commission: 'Commission',
  job: 'Job',
};

export const typeLabel = (type: string | null | undefined) => (type ? TYPE_LABELS[type] ?? null : null);

/** "Free to enter", "$25 to enter", "Entry fee" or null when Missa does not know. */
export function feeLabel(status: string | null | undefined, cents?: number | null, currency?: string | null): string | null {
  if (status === 'no-fee') return 'Free to enter';
  if (status !== 'paid') return null;
  if (cents == null) return 'Entry fee';
  try {
    const amount = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: cents % 100 ? 2 : 0,
    }).format(cents / 100);
    return `${amount} to enter`;
  } catch {
    return 'Entry fee';
  }
}

/** The organisation's own award wording, trimmed to fit a label line. */
export function prizeLabel(prize: string | null | undefined): string | null {
  const value = prize?.replace(/\s+/g, ' ').trim();
  if (!value) return null;
  return value.length > 80 ? `${value.slice(0, 77).trimEnd()}…` : value;
}

const STATUS_LABELS: Record<string, string> = {
  interested: 'interested',
  saved: 'saved',
  preparing: 'preparing',
  'draft-started': 'draft started',
  'ready-to-submit': 'ready to submit',
};

export const trackerStatusLabel = (status: string | null | undefined) => (status ? STATUS_LABELS[status] ?? null : null);

function validZone(zone: string | null | undefined): string | null {
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

/** "New York" for America/New_York; "UTC" stays UTC. */
export function zoneCity(zone: string): string {
  if (zone === 'UTC' || zone === 'Etc/UTC') return 'UTC';
  return (zone.split('/').at(-1) ?? zone).replace(/_/g, ' ');
}

function moment(at: Date, zone: string) {
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: zone }).format(at).replace(',', '');
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone })
    .format(at)
    .replace(/\s/g, '')
    .toLowerCase();
  return { date, time };
}

/**
 * The closing moment in the organisation's timezone and, when it differs, in
 * the creator's own: "Wednesday 7 October at 11:59pm New York time" and
 * "Thursday 8 October at 4:59am for you in Lagos". Null without an exact time.
 */
export function closingMoment(
  deadlineTime: string | null | undefined,
  deadlineZone: string | null | undefined,
  recipientZone: string | null | undefined,
): { official: string; local: string | null } | null {
  if (!deadlineTime) return null;
  const at = new Date(deadlineTime);
  if (Number.isNaN(at.getTime())) return null;
  const source = validZone(deadlineZone) ?? 'UTC';
  const own = validZone(recipientZone);
  const official = moment(at, source);
  const city = zoneCity(source);
  const officialText = `${official.date} at ${official.time} ${city === 'UTC' ? 'UTC' : `${city} time`}`;
  if (!own || own === source) return { official: officialText, local: null };
  const local = moment(at, own);
  if (local.date === official.date && local.time === official.time) return { official: officialText, local: null };
  return { official: officialText, local: `${local.date} at ${local.time} for you in ${zoneCity(own)}` };
}
