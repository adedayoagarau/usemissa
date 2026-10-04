import type { ExtractionResult } from "./contracts.js";
import { parseFee, zonedInstant, type DeadlineTierKind, type ParsedFee, type TextDeadlineClock, type TextDeadlineTier } from "./deadlineDetails.js";

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

/**
 * Phased windows (early bird, regular, final) for the current cycle. Tiers
 * are returned only when the page names at least two distinct dates; a single
 * labelled date is just the deadline. Tiers from more than a year before the
 * resolved deadline belong to an earlier cycle and are dropped.
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
  for (const field of fields) {
    if (field.fieldName !== "deadlineTier") continue;
    const tier = tierValue(field.normalizedValue);
    const closesOn = tier ? explicitDate(tier.date) : undefined;
    if (!tier || !closesOn || closesOn < floor) continue;
    const key = `${tier.tier}|${closesOn}`;
    if (byKey.has(key)) continue;
    const closesAt = tier.clock ? zonedInstant(closesOn, tier.clock.time, tier.clock.timezone) : undefined;
    byKey.set(key, {
      tier: tier.tier,
      label: tier.label,
      closesOn,
      ...(closesAt && tier.clock ? { closesAt, timezone: tier.clock.timezone } : {}),
      ...(tier.fee?.status === "paid" && tier.fee.cents !== undefined ? { feeCents: tier.fee.cents, feeCurrency: tier.fee.currency } : {}),
      ...(tier.fee?.status === "no-fee" ? { feeCents: 0 } : {}),
      confidence: field.confidence >= CONFIRMED_CONFIDENCE ? "confirmed" : "probable",
    });
  }
  const tiers = [...byKey.values()].sort((a, b) => a.closesOn.localeCompare(b.closesOn));
  return new Set(tiers.map((tier) => tier.closesOn)).size >= 2 ? tiers : [];
}

/**
 * The close time for the resolved deadline date, only when every stated time
 * for that date agrees on one time and zone. Disagreement is ambiguous and
 * yields nothing.
 */
export function resolveDeadlineClock(
  fields: ExtractionResult["fields"],
  resolved: ResolvedDeadline,
): ResolvedDeadlineClock | undefined {
  if (resolved.conflict || !resolved.date) return undefined;
  const candidates = new Map<string, { time: string; timezone: string }>();
  for (const field of fields) {
    let clock: TextDeadlineClock | undefined;
    if (field.fieldName === "deadlineClock") clock = clockValue(field.normalizedValue);
    else if (field.fieldName === "deadlineTier") {
      const tier = tierValue(field.normalizedValue);
      clock = tier?.clock ? { date: tier.date, ...tier.clock } : undefined;
    }
    if (!clock || explicitDate(clock.date) !== resolved.date) continue;
    candidates.set(`${clock.time}|${clock.timezone}`, { time: clock.time, timezone: clock.timezone });
  }
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
