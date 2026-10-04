/**
 * Strict normalisation of the deadline facts a language model proposes in the
 * existing extraction call: fee tiers, dated stages, and the exact close time
 * and time zone. Model output is untrusted text. Every value is checked
 * against a closed vocabulary or a strict format, and anything that does not
 * pass is dropped rather than repaired. The result is shaped like the
 * deterministic HTML evidence so the resolver can merge both
 * (see `resolveDeadlineTiers`, `resolveDeadlineClock` and `resolveStages`).
 */
import { normalizeTimeZone, type DeadlineTierKind, type ExtractedStage, type OpportunityStageKind, type ParsedClock, type ParsedFee, type TextDeadlineClock, type TextDeadlineTier } from "./deadlineDetails.js";

export const MODEL_TIER_KINDS: readonly DeadlineTierKind[] = ["early", "regular", "late", "extended", "final", "other"];
export const MODEL_STAGE_KINDS: readonly OpportunityStageKind[] = ["letter-of-intent", "full-application", "shortlist", "interview", "notification", "decision", "event", "other"];
/** The same caps the admin and organization editors apply. */
export const MAX_MODEL_TIERS = 8;
export const MAX_MODEL_STAGES = 12;
/** An entry fee above this is not a believable fee for a creative call. */
export const MAX_MODEL_FEE_MAJOR_UNITS = 5_000;
const MAX_LABEL_LENGTH = 120;
/**
 * Currencies whose major unit is close enough to a dollar for the single fee
 * ceiling to hold. A code outside this list is treated as unreadable, so the
 * tier is dropped rather than stored with a misleading amount.
 */
const CURRENCIES = new Set(["USD", "GBP", "EUR", "CAD", "AUD", "NZD", "CHF", "SGD"]);
const CURRENCY_SYMBOLS: Record<string, string> = { $: "USD", "US$": "USD", "£": "GBP", "€": "EUR", "CA$": "CAD", "A$": "AUD", "NZ$": "NZD" };
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const TIER_LABELS: Record<DeadlineTierKind, string> = {
  early: "Early deadline", regular: "Regular deadline", late: "Late deadline", extended: "Extended deadline", final: "Final deadline", other: "Deadline",
};
const STAGE_LABELS: Record<OpportunityStageKind, string> = {
  "letter-of-intent": "Letter of intent", "full-application": "Full application", shortlist: "Shortlist", interview: "Interviews",
  notification: "Notification", decision: "Decision", event: "Event", other: "Stage",
};

/** The raw keys the extraction prompt asks for. Every value is unknown until checked. */
export interface ModelDeadlineFactsInput {
  deadlineDate?: unknown;
  deadlineTime?: unknown;
  deadlineTimezone?: unknown;
  deadlineTiers?: unknown;
  stages?: unknown;
}

export interface ModelDeadlineFacts {
  /** Tiers in the shape of the deterministic evidence; `date` is an ISO date. */
  tiers: TextDeadlineTier[];
  stages: ExtractedStage[];
  /** The close time of the model's own deadline date, when both are valid. */
  clock?: TextDeadlineClock;
}

/** A real calendar date in a plausible range, YYYY-MM-DD. */
export function strictIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const match = ISO_DATE.exec(trimmed);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (year < 2000 || year > 2100) return undefined;
  const date = new Date(`${trimmed}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === trimmed ? trimmed : undefined;
}

/** A 24-hour local time, HH:MM. "24:00" and seconds are rejected. */
export function strictTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return TIME.test(trimmed) ? trimmed : undefined;
}

/** A time is only meaningful with its zone; either alone is dropped. */
function modelClock(time: unknown, timezone: unknown): ParsedClock | undefined {
  const parsedTime = strictTime(time);
  const zone = normalizeTimeZone(timezone);
  return parsedTime && zone ? { time: parsedTime, timezone: zone } : undefined;
}

/** Plain text only: markup, control characters and runs of whitespace are removed. */
function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > MAX_LABEL_LENGTH || /https?:\/\/|javascript:/i.test(cleaned)) return fallback;
  return cleaned;
}

function currencyCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const symbol = CURRENCY_SYMBOLS[trimmed.toUpperCase()] ?? CURRENCY_SYMBOLS[trimmed];
  if (symbol) return symbol;
  const code = trimmed.toUpperCase();
  return /^[A-Z]{3}$/.test(code) && CURRENCIES.has(code) ? code : undefined;
}

/**
 * The fee for one tier. A number (or a plain numeric string) in major units
 * with at most two decimals, zero or more and no more than
 * MAX_MODEL_FEE_MAJOR_UNITS. Returns null for an amount that is present but
 * malformed or absurd, so the caller drops the whole tier. A paid amount
 * without a readable currency keeps the tier but leaves its fee unknown.
 */
function modelFee(amount: unknown, currency: unknown): ParsedFee | undefined | null {
  if (amount === undefined || amount === null || amount === "") return undefined;
  let value: number;
  if (typeof amount === "number") value = amount;
  else if (typeof amount === "string" && /^\d{1,5}(?:\.\d{1,2})?$/.test(amount.trim())) value = Number(amount.trim());
  else return null;
  if (!Number.isFinite(value) || value < 0 || value > MAX_MODEL_FEE_MAJOR_UNITS) return null;
  const cents = Math.round(value * 100);
  if (Math.abs(cents - value * 100) > 1e-6) return null;
  if (cents === 0) return { status: "no-fee" };
  const code = currencyCode(currency);
  return code ? { status: "paid", cents, currency: code } : undefined;
}

function records(value: unknown, max: number): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .slice(0, max);
}

/** Validate one model tier. Unknown kinds, invalid dates and malformed or absurd fees reject the whole tier. */
export function normalizeModelTier(item: Record<string, unknown>): TextDeadlineTier | undefined {
  const tier = typeof item.tier === "string" ? item.tier.trim().toLowerCase() as DeadlineTierKind : undefined;
  if (!tier || !MODEL_TIER_KINDS.includes(tier)) return undefined;
  const date = strictIsoDate(item.closesOn);
  if (!date) return undefined;
  const fee = modelFee(item.feeAmount, item.feeCurrency);
  if (fee === null) return undefined;
  const clock = modelClock(item.closesTime, item.timezone);
  return { tier, label: cleanLabel(item.label, TIER_LABELS[tier]), date, ...(fee ? { fee } : {}), ...(clock ? { clock } : {}) };
}

/** Validate one model stage. Unknown kinds and invalid dates reject it. */
export function normalizeModelStage(item: Record<string, unknown>): ExtractedStage | undefined {
  const kind = typeof item.kind === "string" ? item.kind.trim().toLowerCase() as OpportunityStageKind : undefined;
  if (!kind || !MODEL_STAGE_KINDS.includes(kind)) return undefined;
  const dueOn = strictIsoDate(item.dueOn);
  if (!dueOn) return undefined;
  return { kind, label: cleanLabel(item.label, STAGE_LABELS[kind]), dueOn };
}

/** Normalise the deadline facts in one model response. Never throws. */
export function normalizeModelDeadlineFacts(input: ModelDeadlineFactsInput | null | undefined): ModelDeadlineFacts {
  if (!input || typeof input !== "object") return { tiers: [], stages: [] };
  const tierKeys = new Set<string>();
  const tiers: TextDeadlineTier[] = [];
  for (const item of records(input.deadlineTiers, MAX_MODEL_TIERS)) {
    const tier = normalizeModelTier(item);
    if (!tier || tierKeys.has(`${tier.tier}|${tier.date}`)) continue;
    tierKeys.add(`${tier.tier}|${tier.date}`);
    tiers.push(tier);
  }
  const stageKeys = new Set<string>();
  const stages: ExtractedStage[] = [];
  for (const item of records(input.stages, MAX_MODEL_STAGES)) {
    const stage = normalizeModelStage(item);
    if (!stage || stageKeys.has(`${stage.kind}|${stage.dueOn}`)) continue;
    stageKeys.add(`${stage.kind}|${stage.dueOn}`);
    stages.push(stage);
  }
  const deadline = strictIsoDate(input.deadlineDate);
  const clock = deadline ? modelClock(input.deadlineTime, input.deadlineTimezone) : undefined;
  return { tiers, stages, ...(deadline && clock ? { clock: { date: deadline, ...clock } } : {}) };
}
