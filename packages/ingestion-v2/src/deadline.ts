import type { ExtractionResult } from "./contracts.js";
import { parseFee, zonedInstant, type DeadlineTierKind, type ExtractedStage, type OpportunityStageKind, type ParsedFee, type TextDeadlineClock, type TextDeadlineTier } from "./deadlineDetails.js";

export interface ResolvedDeadline {
  date: string | null;
  conflict: boolean;
  values: string[];
  kind: "exact" | "rolling" | "year-round" | "seasonal" | "until-filled" | "unknown";
}

/** A calendar date from text that names a year. Ordinals ("1st") are
 * accepted, and the calendar day is kept as written rather than shifted by
 * the server's time zone. */
export function explicitDate(value: string): string | undefined {
  if (!/\b(?:19|20)\d{2}\b/.test(value)) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const cleaned = value.replace(/(\d)(?:st|nd|rd|th)\b/gi, "$1").replace(/\b([a-z]{3,9})\./gi, "$1");
  const timestamp = Date.parse(cleaned);
  if (!Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function canonicalPage(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return undefined;
  }
}

/** Resolve one explicit deadline from all evidence. Ambiguous dates without a
 * year are ignored, and contradictory explicit dates fail closed. */
export function resolveCurrentDeadline(
  fields: ExtractionResult["fields"],
  authoritativeUrl?: string | null,
  now = new Date(),
): ResolvedDeadline {
  const declaredKinds = fields.flatMap((field) => {
    if (field.fieldName !== "deadlineKind") return [];
    const value = String(field.normalizedValue ?? field.rawValue ?? "").trim().toLowerCase();
    return ["rolling", "year-round", "seasonal", "until-filled"].includes(value) ? [value] : [];
  });
  const candidates = fields.flatMap((field) => {
    if (field.fieldName !== "deadline") return [];
    const value = typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue;
    const date = value ? explicitDate(value) : undefined;
    if (!date) return [];
    return [{
      date,
      deterministic: field.provenance.method !== "deepseek-json-shadow",
      sourcePage: canonicalPage(field.provenance.sourceUrl),
    }];
  });
  const values = [...new Set(candidates.map((candidate) => candidate.date))].sort();
  const deterministicCandidates = candidates.filter((candidate) => candidate.deterministic);
  const sourceCardCandidates = deterministicCandidates.filter((candidate) =>
    fields.some((field) => field.fieldName === "deadline" && field.provenance.method === "html-link-context-deadline" && explicitDate(typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue ?? "") === candidate.date),
  );
  const authoritativePage = canonicalPage(authoritativeUrl);
  const authoritativeCandidates = authoritativePage
    ? deterministicCandidates.filter((candidate) => candidate.sourcePage === authoritativePage)
    : [];
  const preferred = sourceCardCandidates.length
    ? sourceCardCandidates
    : authoritativeCandidates.length
    ? authoritativeCandidates
    : deterministicCandidates.length
      ? deterministicCandidates
      : candidates;
  const preferredValues = [...new Set(preferred.map((candidate) => candidate.date))];
  const today = now.toISOString().slice(0, 10);
  const currentPreferredValues = preferredValues.filter((value) => value >= today).sort();
  const selected = currentPreferredValues[0] ?? null;

  // Multiple deterministic deadline labels on the same authoritative page
  // are phased windows (early, regular, final), not contradictory sources.
  // Model-only disagreement remains a conflict and therefore fails closed.
  const preferredPages = new Set(preferred.map((candidate) => candidate.sourcePage).filter(Boolean));
  const deterministicMultiWindow = preferred.length > 1 && preferred.every((candidate) => candidate.deterministic) && preferredPages.size === 1;
  if (preferredValues.length > 1 && !deterministicMultiWindow) {
    return { date: null, conflict: true, values, kind: "unknown" };
  }
  if (selected) return { date: selected, conflict: false, values, kind: "exact" };
  if (declaredKinds.includes("rolling")) return { date: null, conflict: false, values, kind: "rolling" };
  if (declaredKinds.includes("year-round")) return { date: null, conflict: false, values, kind: "year-round" };
  if (declaredKinds.includes("seasonal")) return { date: null, conflict: false, values, kind: "seasonal" };
  if (declaredKinds.includes("until-filled")) return { date: null, conflict: false, values, kind: "until-filled" };
  return { date: null, conflict: false, values, kind: "unknown" };
}

/** A current exact date or an explicit open-ended intake declaration can
 * enter human review. Unknown dates and conflicts cannot. */
export function hasCurrentDeadlineOrWindow(
  fields: ExtractionResult["fields"],
  authoritativeUrl?: string | null,
  now = new Date(),
): boolean {
  const resolved = resolveCurrentDeadline(fields, authoritativeUrl, now);
  return !resolved.conflict && resolved.kind !== "unknown";
}

export interface ResolvedDeadlineTier {
  tier: DeadlineTierKind;
  label: string;
  closesOn: string;
  closesAt?: string;
  timezone?: string;
  feeCents?: number;
  feeCurrency?: string;
  confidence: "confirmed" | "probable";
}

export interface ResolvedDeadlineClock {
  /** Local time, HH:MM. */
  time: string;
  timezone: string;
  /** The UTC instant of the close on the resolved deadline date. */
  closesAt: string;
}

/** Field confidence at or above this reads as a confirmed fact rather than a probable one. */
const CONFIRMED_CONFIDENCE = 0.8;

function tierValue(value: unknown): TextDeadlineTier | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<TextDeadlineTier>;
  return typeof candidate.tier === "string" && typeof candidate.label === "string" && typeof candidate.date === "string" ? candidate as TextDeadlineTier : undefined;
}

function clockValue(value: unknown): TextDeadlineClock | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<TextDeadlineClock>;
  return typeof candidate.date === "string" && typeof candidate.time === "string" && typeof candidate.timezone === "string" ? candidate as TextDeadlineClock : undefined;
}

const MODEL_METHOD = "deepseek-json-shadow";

function isModelField(field: ExtractionResult["fields"][number]): boolean {
  return field.provenance.method === MODEL_METHOD;
}

function resolvedTier(tier: TextDeadlineTier, closesOn: string, confidence: number): ResolvedDeadlineTier {
  const closesAt = tier.clock ? zonedInstant(closesOn, tier.clock.time, tier.clock.timezone) : undefined;
  return {
    tier: tier.tier,
    label: tier.label,
    closesOn,
    ...(closesAt && tier.clock ? { closesAt, timezone: tier.clock.timezone } : {}),
    ...(tier.fee?.status === "paid" && tier.fee.cents !== undefined ? { feeCents: tier.fee.cents, feeCurrency: tier.fee.currency } : {}),
    ...(tier.fee?.status === "no-fee" ? { feeCents: 0 } : {}),
    confidence: confidence >= CONFIRMED_CONFIDENCE ? "confirmed" : "probable",
  };
}

/** Every date the deterministic rules read as a deadline or a tier close. */
function deterministicDeadlineDates(fields: ExtractionResult["fields"]): string[] {
  return fields.flatMap((field) => {
    if (isModelField(field)) return [];
    if (field.fieldName === "deadline") {
      const date = explicitDate(typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue ?? "");
      return date ? [date] : [];
    }
    if (field.fieldName === "deadlineTier") {
      const tier = tierValue(field.normalizedValue);
      const date = tier ? explicitDate(tier.date) : undefined;
      return date ? [date] : [];
    }
    return [];
  });
}

/**
 * Phased windows (early bird, regular, final) for the current cycle. Tiers
 * are returned only when the page names at least two distinct dates; a single
 * labelled date is just the deadline. Tiers from more than a year before the
 * resolved deadline belong to an earlier cycle and are dropped.
 *
 * Deterministic tiers are read first and always win. A model tier is merged
 * only when it does not contradict them:
 * - same tier and date as a deterministic tier: they agree, the deterministic
 *   tier is kept, and the model only fills a fee or close time it lacks;
 * - same tier on another date, or another tier on the same date: a conflict,
 *   so the deterministic tier is kept and nothing new is recorded;
 * - a new tier and date: added as probable, unless it closes after every
 *   deterministic deadline date, because the final close (the stored
 *   deadline) never moves on model evidence alone.
 */
export function resolveDeadlineTiers(
  fields: ExtractionResult["fields"],
  resolved: ResolvedDeadline,
): ResolvedDeadlineTier[] {
  if (resolved.conflict || !resolved.date) return [];
  const earliest = new Date(`${resolved.date}T00:00:00Z`);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);
  const floor = earliest.toISOString().slice(0, 10);
  const byKey = new Map<string, ResolvedDeadlineTier>();
  const modelTiers: Array<{ tier: TextDeadlineTier; closesOn: string; confidence: number }> = [];
  for (const field of fields) {
    if (field.fieldName !== "deadlineTier") continue;
    const tier = tierValue(field.normalizedValue);
    const closesOn = tier ? explicitDate(tier.date) : undefined;
    if (!tier || !closesOn || closesOn < floor) continue;
    if (isModelField(field)) {
      modelTiers.push({ tier, closesOn, confidence: field.confidence });
      continue;
    }
    const key = `${tier.tier}|${closesOn}`;
    if (byKey.has(key)) continue;
    byKey.set(key, resolvedTier(tier, closesOn, field.confidence));
  }
  const deterministicDates = deterministicDeadlineDates(fields);
  const ceiling = deterministicDates.length
    ? deterministicDates.reduce((latest, date) => (date > latest ? date : latest))
    : resolved.date;
  const deterministic = [...byKey.values()];
  for (const { tier, closesOn, confidence } of modelTiers) {
    const agreeing = deterministic.find((candidate) => candidate.tier === tier.tier && candidate.closesOn === closesOn);
    if (agreeing) {
      const model = resolvedTier(tier, closesOn, confidence);
      if (agreeing.feeCents === undefined && model.feeCents !== undefined) {
        agreeing.feeCents = model.feeCents;
        if (model.feeCurrency) agreeing.feeCurrency = model.feeCurrency;
      }
      if (!agreeing.closesAt && model.closesAt && model.timezone) {
        agreeing.closesAt = model.closesAt;
        agreeing.timezone = model.timezone;
      }
      continue;
    }
    const conflicting = deterministic.some((candidate) => (candidate.tier === tier.tier && tier.tier !== "other") || candidate.closesOn === closesOn);
    if (conflicting || closesOn > ceiling) continue;
    if ([...byKey.values()].some((candidate) => candidate.closesOn === closesOn)) continue;
    byKey.set(`${tier.tier}|${closesOn}`, resolvedTier(tier, closesOn, Math.min(confidence, CONFIRMED_CONFIDENCE - 0.01)));
  }
  const tiers = [...byKey.values()].sort((a, b) => a.closesOn.localeCompare(b.closesOn));
  return new Set(tiers.map((tier) => tier.closesOn)).size >= 2 ? tiers : [];
}

export interface ResolvedStage {
  kind: OpportunityStageKind;
  label: string;
  dueOn: string;
  confidence: "confirmed" | "probable";
}

function stageValue(value: unknown): ExtractedStage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ExtractedStage>;
  return typeof candidate.kind === "string" && typeof candidate.label === "string" && typeof candidate.dueOn === "string" ? candidate as ExtractedStage : undefined;
}

/** The most stages one call keeps, matching the admin and organization editors. */
const MAX_STAGES = 12;

/**
 * Dated stages of the current cycle (letter of intent, shortlist,
 * notification and so on). Only extraction proposes stages today, so there
 * is no deterministic evidence to merge, and model stages stay probable.
 * Stages are kept only within the current cycle: from a year before the
 * resolved deadline to two years after it, or around today for a call
 * without an exact date. A conflicting deadline yields no stages.
 */
export function resolveStages(
  fields: ExtractionResult["fields"],
  resolved: ResolvedDeadline,
  now = new Date(),
): ResolvedStage[] {
  if (resolved.conflict) return [];
  const anchor = resolved.date ?? now.toISOString().slice(0, 10);
  const shift = (years: number) => {
    const date = new Date(`${anchor}T00:00:00Z`);
    date.setUTCFullYear(date.getUTCFullYear() + years);
    return date.toISOString().slice(0, 10);
  };
  const floor = shift(-1);
  const ceiling = shift(2);
  const byKey = new Map<string, ResolvedStage>();
  for (const field of fields) {
    if (field.fieldName !== "deadlineStage") continue;
    const stage = stageValue(field.normalizedValue);
    const dueOn = stage ? explicitDate(stage.dueOn) : undefined;
    if (!stage || !dueOn || dueOn < floor || dueOn > ceiling) continue;
    const key = `${stage.kind}|${dueOn}`;
    if (byKey.has(key)) continue;
    const confirmed = field.confidence >= CONFIRMED_CONFIDENCE && !isModelField(field);
    byKey.set(key, { kind: stage.kind, label: stage.label, dueOn, confidence: confirmed ? "confirmed" : "probable" });
  }
  return [...byKey.values()].sort((a, b) => a.dueOn.localeCompare(b.dueOn)).slice(0, MAX_STAGES);
}

/**
 * The opportunity's own deadline is the final close. With phased windows the
 * current deadline resolves to the earliest upcoming date (often the early
 * bird), so when two or more tiers are known the deadline becomes the latest
 * tier's close; the earlier dates stay as tiers. Without tiers the resolved
 * deadline is returned unchanged.
 */
export function finalCloseDeadline(resolved: ResolvedDeadline, tiers: ResolvedDeadlineTier[]): ResolvedDeadline {
  if (resolved.conflict || !resolved.date || tiers.length < 2) return resolved;
  const latest = tiers.reduce((last, tier) => (tier.closesOn > last ? tier.closesOn : last), resolved.date);
  return latest === resolved.date ? resolved : { ...resolved, date: latest };
}

/**
 * The close time for the resolved deadline date, only when every stated time
 * for that date agrees on one time and zone. Disagreement is ambiguous and
 * yields nothing. Deterministic times are preferred over model times.
 */
export function resolveDeadlineClock(
  fields: ExtractionResult["fields"],
  resolved: ResolvedDeadline,
): ResolvedDeadlineClock | undefined {
  if (resolved.conflict || !resolved.date) return undefined;
  const deterministic = new Map<string, { time: string; timezone: string }>();
  const model = new Map<string, { time: string; timezone: string }>();
  for (const field of fields) {
    let clock: TextDeadlineClock | undefined;
    if (field.fieldName === "deadlineClock") clock = clockValue(field.normalizedValue);
    else if (field.fieldName === "deadlineTier") {
      const tier = tierValue(field.normalizedValue);
      clock = tier?.clock ? { date: tier.date, ...tier.clock } : undefined;
    }
    if (!clock || explicitDate(clock.date) !== resolved.date) continue;
    (isModelField(field) ? model : deterministic).set(`${clock.time}|${clock.timezone}`, { time: clock.time, timezone: clock.timezone });
  }
  // A deterministic time always wins; a model time that disagrees with it is
  // ignored. The model's time is used only when the rules found none.
  const candidates = deterministic.size ? deterministic : model;
  if (candidates.size !== 1) return undefined;
  const clock = [...candidates.values()][0]!;
  const closesAt = zonedInstant(resolved.date, clock.time, clock.timezone);
  return closesAt ? { ...clock, closesAt } : undefined;
}

/**
 * The entry fee to record on the opportunity. An explicit entry-fee field
 * wins; otherwise the fee of the tier that closes on the resolved deadline.
 * Returns undefined when no fee is stated, so the record stays "unknown".
 */
export function resolveEntryFee(
  fields: ExtractionResult["fields"],
  tiers: ResolvedDeadlineTier[],
  resolved: ResolvedDeadline,
): ParsedFee | undefined {
  for (const field of [...fields].reverse()) {
    if (field.fieldName !== "entry_fee" && field.fieldName !== "entryFee" && field.fieldName !== "fee") continue;
    const value = typeof field.normalizedValue === "string" ? field.normalizedValue : field.rawValue;
    const fee = parseFee(value);
    if (fee) return fee;
  }
  const tier = tiers.find((candidate) => candidate.closesOn === resolved.date && candidate.feeCents !== undefined);
  if (!tier || tier.feeCents === undefined) return undefined;
  return tier.feeCents === 0 ? { status: "no-fee" } : { status: "paid", cents: tier.feeCents, currency: tier.feeCurrency };
}
