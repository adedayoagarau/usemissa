import type { OpportunityDeadlineFactsRecord } from "@missa/radar-adapters";

/**
 * Form state for the deadline-facts editor shared by the platform admin panel
 * and the organization Opportunity builder. Inputs stay strings while the
 * person types; `draftToBody` turns them into the PUT body.
 */

export const TIER_OPTIONS = [
  ["early", "Early"],
  ["regular", "Regular"],
  ["late", "Late"],
  ["extended", "Extended"],
  ["final", "Final"],
  ["other", "Other"],
] as const;

export const STAGE_OPTIONS = [
  ["letter-of-intent", "Letter of intent"],
  ["full-application", "Full application"],
  ["shortlist", "Shortlist"],
  ["interview", "Interviews"],
  ["notification", "Notification"],
  ["decision", "Decision"],
  ["event", "Event"],
  ["other", "Other"],
] as const;

export const COMMON_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;

export type TierDraft = {
  key: string;
  /** The stored tier this row edits; kept so saving does not replace it. */
  id?: string;
  tier: (typeof TIER_OPTIONS)[number][0];
  label: string;
  closesOn: string;
  closesTime: string;
  timezone: string;
  /** Major units as typed, e.g. "25" or "12.50". Empty when unknown. */
  fee: string;
  currency: string;
  confidence: "confirmed" | "probable";
};

export type StageDraft = {
  key: string;
  /** The stored stage this row edits; kept so plan steps stay attached. */
  id?: string;
  kind: (typeof STAGE_OPTIONS)[number][0];
  label: string;
  dueOn: string;
  dueTime: string;
  timezone: string;
  confidence: "confirmed" | "probable";
};

export type DeadlineFactsDraft = {
  deadlineDate: string;
  deadlineTime: string;
  deadlineTimezone: string;
  tiers: TierDraft[];
  stages: StageDraft[];
  sourceUrl: string;
  revision?: string;
  /**
   * The closing time as loaded. The time is sent only when it changed, so a
   * stored time the editor cannot show (one without a time zone) survives a
   * save that only touches tiers or stages.
   */
  loadedDeadline?: { date: string; time: string; timezone: string };
};

let keySeed = 0;
function nextKey(prefix: string): string {
  keySeed += 1;
  return `${prefix}-${keySeed}`;
}

function wallTime(instant: string | undefined, timeZone: string | undefined): string {
  if (!instant || !timeZone) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(instant));
    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "";
    return hour && minute ? `${hour.padStart(2, "0")}:${minute}` : "";
  } catch {
    return "";
  }
}

function majorUnits(cents: number | undefined): string {
  if (cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function emptyTier(defaults: Partial<TierDraft> = {}): TierDraft {
  return { key: nextKey("tier"), tier: "regular", label: "", closesOn: "", closesTime: "", timezone: "", fee: "", currency: "USD", confidence: "confirmed", ...defaults };
}

export function emptyStage(defaults: Partial<StageDraft> = {}): StageDraft {
  return { key: nextKey("stage"), kind: "notification", label: "", dueOn: "", dueTime: "", timezone: "", confidence: "confirmed", ...defaults };
}

export function recordToDraft(record: OpportunityDeadlineFactsRecord | null | undefined): DeadlineFactsDraft {
  return {
    deadlineDate: record?.deadlineDate ?? "",
    deadlineTime: record?.deadlineTime ?? "",
    deadlineTimezone: record?.deadlineTimezone ?? "",
    tiers: (record?.tiers ?? []).map((tier) => emptyTier({
      id: tier.id,
      tier: tier.tier,
      label: tier.label,
      closesOn: tier.closesOn,
      closesTime: wallTime(tier.closesAt, tier.timezone),
      timezone: tier.timezone ?? "",
      fee: majorUnits(tier.feeCents),
      currency: tier.feeCurrency ?? "USD",
      confidence: tier.confidence,
    })),
    stages: (record?.stages ?? []).map((stage) => emptyStage({
      id: stage.id,
      kind: stage.kind,
      label: stage.label,
      dueOn: stage.dueOn,
      dueTime: wallTime(stage.dueAt, stage.timezone),
      timezone: stage.timezone ?? "",
      confidence: stage.confidence,
    })),
    sourceUrl: "",
    ...(record?.revision ? { revision: record.revision } : {}),
    ...(record
      ? { loadedDeadline: { date: record.deadlineDate ?? "", time: record.deadlineTime ?? "", timezone: record.deadlineTimezone ?? "" } }
      : {}),
  };
}

/** Parse a typed fee into cents. Returns null for empty, undefined for unreadable input. */
export function feeToCents(value: string): number | null | undefined {
  const trimmed = value.replace(/[,\s]/gu, "").replace(/^[$£€]/u, "");
  if (!trimmed) return null;
  if (!/^\d{1,6}(?:\.\d{1,2})?$/u.test(trimmed)) return undefined;
  return Math.round(Number(trimmed) * 100);
}

export type DraftBody = {
  tiers: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
  deadline: { date: string | null; time?: string | null; timezone?: string | null };
  sourceUrl?: string;
  expectedRevision?: string;
};

/** Build the PUT body, or return the first problem in customer language. */
export function draftToBody(draft: DeadlineFactsDraft): { body: DraftBody } | { error: string } {
  const tiers: DraftBody["tiers"] = [];
  for (const [index, tier] of draft.tiers.entries()) {
    if (!tier.closesOn) return { error: `Fee tier ${index + 1} needs a closing date.` };
    const cents = feeToCents(tier.fee);
    if (cents === undefined) return { error: `Fee tier ${index + 1} needs a fee written as a number, like 25 or 12.50.` };
    tiers.push({
      ...(tier.id ? { id: tier.id } : {}),
      tier: tier.tier,
      label: tier.label.trim(),
      closesOn: tier.closesOn,
      closesTime: tier.closesTime || null,
      timezone: tier.timezone || null,
      feeCents: cents,
      feeCurrency: cents ? tier.currency.trim().toUpperCase() || null : null,
      confidence: tier.confidence,
    });
  }
  const stages: DraftBody["stages"] = [];
  for (const [index, stage] of draft.stages.entries()) {
    if (!stage.dueOn) return { error: `Stage ${index + 1} needs a date.` };
    stages.push({
      ...(stage.id ? { id: stage.id } : {}),
      kind: stage.kind,
      label: stage.label.trim(),
      dueOn: stage.dueOn,
      dueTime: stage.dueTime || null,
      timezone: stage.timezone || null,
      confidence: stage.confidence,
    });
  }
  if (draft.deadlineTime && !draft.deadlineDate) return { error: "Add the deadline date before its time." };
  const loaded = draft.loadedDeadline ?? { date: "", time: "", timezone: "" };
  const clockChanged =
    draft.deadlineTime !== loaded.time ||
    draft.deadlineTimezone !== loaded.timezone ||
    (Boolean(draft.deadlineTime) && draft.deadlineDate !== loaded.date);
  return {
    body: {
      tiers,
      stages,
      deadline: {
        date: draft.deadlineDate || null,
        ...(clockChanged
          ? { time: draft.deadlineTime || null, timezone: draft.deadlineTimezone || null }
          : {}),
      },
      ...(draft.sourceUrl.trim() ? { sourceUrl: draft.sourceUrl.trim() } : {}),
      ...(draft.revision ? { expectedRevision: draft.revision } : {}),
    },
  };
}
