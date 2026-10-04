/**
 * Deterministic parsing of the details that sit next to a published deadline:
 * the phase label (early bird, regular, final), an adjacent entry fee, and a
 * close time with its time zone ("11:59 pm ET"). Everything here is pure so
 * the ingestion rules stay testable without fetching pages.
 */

export type DeadlineTierKind = "early" | "regular" | "late" | "extended" | "final" | "other";

export interface ParsedFee {
  status: "no-fee" | "paid";
  cents?: number;
  currency?: string;
}

export interface ParsedClock {
  /** 24-hour local time, HH:MM. */
  time: string;
  /** IANA time zone. */
  timezone: string;
}

export interface TextDeadlineTier {
  tier: DeadlineTierKind;
  label: string;
  /** The date exactly as written on the page. */
  date: string;
  fee?: ParsedFee;
  clock?: ParsedClock;
}

export interface TextDeadlineClock extends ParsedClock {
  /** The date exactly as written on the page. */
  date: string;
}

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}`;
const PHASE = "early[ -]?bird|early|regular|standard|general|late|extended|final";
const PHASE_DEADLINE = new RegExp(`\\b(${PHASE})\\s+(?:entry\\s+|submission\\s+|application\\s+)?deadline\\b\\s*(?:is|of|on)?\\s*[:\\-–—]?\\s*(?:\\w+day,?\\s+)?(${DATE})`, "gi");
const DATE_PHASE = new RegExp(`(${DATE})\\s*[:\\-–—]?\\s*\\(?\\b(${PHASE})\\s+(?:entry\\s+|submission\\s+)?deadline\\b`, "gi");
const ANY_DEADLINE_DATE = new RegExp(`deadline\\b[^.!?]{0,40}?(${DATE})`, "gi");

/** The common US/UK abbreviations creators see next to a close time. */
const ZONES: Record<string, string> = {
  et: "America/New_York", est: "America/New_York", edt: "America/New_York", eastern: "America/New_York",
  ct: "America/Chicago", cst: "America/Chicago", cdt: "America/Chicago", central: "America/Chicago",
  mt: "America/Denver", mst: "America/Denver", mdt: "America/Denver", mountain: "America/Denver",
  pt: "America/Los_Angeles", pst: "America/Los_Angeles", pdt: "America/Los_Angeles", pacific: "America/Los_Angeles",
  gmt: "UTC", utc: "UTC", bst: "Europe/London", uk: "Europe/London",
  cet: "Europe/Paris", cest: "Europe/Paris",
  aest: "Australia/Sydney", aedt: "Australia/Sydney",
  aoe: "Etc/GMT+12", "anywhere on earth": "Etc/GMT+12",
};
const ZONE_PATTERN = "anywhere on earth|eastern|central|mountain|pacific|aest|aedt|cest|est|edt|cst|cdt|mst|mdt|pst|pdt|gmt|utc|bst|cet|aoe|et|ct|mt|pt|uk";
const CLOCK_12 = new RegExp(`\\b(1[0-2]|0?[1-9])(?:[:.]([0-5]\\d))?\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)\\s*\\(?\\s*(${ZONE_PATTERN})\\b(?:\\s+time)?`, "i");
const CLOCK_24 = new RegExp(`\\b([01]\\d|2[0-3])[:.]([0-5]\\d)\\s*(?:hrs?\\s*)?\\(?\\s*(${ZONE_PATTERN})\\b`, "i");
const CLOCK_NOON = new RegExp(`\\b(noon|midday)\\s*\\(?\\s*(${ZONE_PATTERN})\\b`, "i");

function phaseTier(phase: string): DeadlineTierKind {
  const value = phase.toLowerCase().replace(/[^a-z]/g, "");
  if (value.startsWith("early")) return "early";
  if (value === "regular" || value === "standard" || value === "general") return "regular";
  if (value === "late") return "late";
  if (value === "extended") return "extended";
  if (value === "final") return "final";
  return "other";
}

function phaseLabel(phase: string): string {
  const value = phase.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  const words = value === "earlybird" ? "early bird" : value;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} deadline`;
}

const CURRENCY_SYMBOLS: Record<string, string> = { $: "USD", "£": "GBP", "€": "EUR" };

/** Read an entry fee from free text. Returns undefined when nothing is stated. */
export function parseFee(value: string | null | undefined): ParsedFee | undefined {
  if (!value) return undefined;
  const textValue = value.replace(/\s+/g, " ").trim();
  if (/\b(?:no (?:entry |submission |reading |application )?fee|free (?:to (?:enter|submit|apply)|entry|submissions?)|fee[- ]free|without (?:a )?fee)\b/i.test(textValue)) return { status: "no-fee" };
  if (/^(?:free|none|n\/a|\$?0(?:\.00)?)$/i.test(textValue)) return { status: "no-fee" };
  const symbol = /(?:(US|CA|AU|NZ)\s?)?([$£€])\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/i.exec(textValue);
  if (symbol) {
    const prefix = symbol[1]?.toUpperCase();
    const currency = symbol[2] === "$" && prefix ? `${prefix === "US" ? "USD" : `${prefix}D`}` : CURRENCY_SYMBOLS[symbol[2]!]!;
    const cents = Math.round(Number(symbol[3]!.replace(/,/g, "")) * 100);
    return cents === 0 ? { status: "no-fee" } : { status: "paid", cents, currency };
  }
  const code = /(\d{1,4}(?:\.\d{2})?)\s?(USD|GBP|EUR|CAD|AUD|NZD)\b|\b(USD|GBP|EUR|CAD|AUD|NZD)\s?(\d{1,4}(?:\.\d{2})?)/i.exec(textValue);
  if (code) {
    const amount = Number(code[1] ?? code[4]);
    const currency = (code[2] ?? code[3])!.toUpperCase();
    const cents = Math.round(amount * 100);
    return cents === 0 ? { status: "no-fee" } : { status: "paid", cents, currency };
  }
  return undefined;
}

/** Read a close time with an explicit zone ("11:59 pm ET", "23:59 GMT"). A time without a zone is ambiguous and ignored. */
export function parseDeadlineClock(value: string | null | undefined): ParsedClock | undefined {
  if (!value) return undefined;
  const twelve = CLOCK_12.exec(value);
  if (twelve) {
    const hour12 = Number(twelve[1]);
    const minutes = twelve[2] ?? "00";
    const pm = /^p/i.test(twelve[3]!);
    const hour = (hour12 % 12) + (pm ? 12 : 0);
    const timezone = ZONES[twelve[4]!.toLowerCase()];
    if (timezone) return { time: `${String(hour).padStart(2, "0")}:${minutes}`, timezone };
  }
  const noon = CLOCK_NOON.exec(value);
  if (noon) {
    const timezone = ZONES[noon[2]!.toLowerCase()];
    if (timezone) return { time: "12:00", timezone };
  }
  const twentyFour = CLOCK_24.exec(value);
  if (twentyFour) {
    const timezone = ZONES[twentyFour[3]!.toLowerCase()];
    if (timezone) return { time: `${twentyFour[1]}:${twentyFour[2]}`, timezone };
  }
  return undefined;
}

/** Text after a match, up to the next deadline mention, used to find the adjacent fee and time. */
function trailingWindow(visible: string, from: number): string {
  const rest = visible.slice(from, from + 120);
  const next = rest.search(/\b(?:early[ -]?bird|early|regular|standard|general|late|extended|final)?\s*(?:entry\s+|submission\s+)?deadline\b/i);
  return next > 0 ? rest.slice(0, next) : rest;
}

/**
 * Phase-labelled deadlines in visible text ("Early bird deadline: March 1, 2027
 * ($15)"), keeping the label and any fee or close time stated right after it.
 */
export function deadlineTiersFromText(visible: string): TextDeadlineTier[] {
  const tiers: TextDeadlineTier[] = [];
  const seen = new Set<string>();
  const push = (phase: string, date: string, windowText: string) => {
    const tier = phaseTier(phase);
    const key = `${tier}|${date.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const fee = parseFee(windowText);
    const clock = parseDeadlineClock(windowText);
    tiers.push({ tier, label: phaseLabel(phase), date: date.trim(), ...(fee ? { fee } : {}), ...(clock ? { clock } : {}) });
  };
  for (const match of visible.matchAll(PHASE_DEADLINE)) {
    push(match[1]!, match[2]!, trailingWindow(visible, match.index! + match[0].length));
  }
  for (const match of visible.matchAll(DATE_PHASE)) {
    push(match[2]!, match[1]!, trailingWindow(visible, match.index! + match[0].length));
  }
  return tiers;
}

/** Every deadline date that has an explicit close time and zone written right after it. */
export function deadlineClocksFromText(visible: string): TextDeadlineClock[] {
  const clocks: TextDeadlineClock[] = [];
  for (const match of visible.matchAll(ANY_DEADLINE_DATE)) {
    const clock = parseDeadlineClock(visible.slice(match.index! + match[0].length, match.index! + match[0].length + 40));
    if (clock) clocks.push({ date: match[1]!.trim(), ...clock });
  }
  return clocks;
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  const asUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour") % 24, part("minute"), part("second"));
  return asUtc - instant;
}

/** The UTC instant of a local date and time in an IANA zone, or undefined when the zone is unknown. */
export function zonedInstant(date: string, time: string, timeZone: string): string | undefined {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return undefined;
  try {
    const wall = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
    let instant = wall - zoneOffsetMs(wall, timeZone);
    instant = wall - zoneOffsetMs(instant, timeZone);
    return new Date(instant).toISOString();
  } catch {
    return undefined;
  }
}
