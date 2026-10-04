import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  OpportunityDeadlineTier,
  OpportunityStage,
  OpportunityStageKind,
} from "@missa/radar-engine";
import { deadlineFactsAvailable, stageFromRow, tierFromRow } from "./deadlineFacts.js";

type Db = Pool | PoolClient;

export type DeadlineFactsSource = "admin" | "organization";

export const DEADLINE_TIER_KINDS = ["early", "regular", "late", "extended", "final", "other"] as const;
export const OPPORTUNITY_STAGE_KINDS: readonly OpportunityStageKind[] = [
  "letter-of-intent", "full-application", "shortlist", "interview", "notification", "decision", "event", "other",
];
export const MAX_DEADLINE_TIERS = 8;
export const MAX_OPPORTUNITY_STAGES = 12;

export interface DeadlineTierInput {
  /** The stored tier this row edits, as read; omitted for a new tier. */
  id?: string | null;
  tier: OpportunityDeadlineTier["tier"];
  label: string;
  closesOn: string;
  /** Local close time, HH:MM, read in `timezone`. */
  closesTime?: string | null;
  timezone?: string | null;
  feeCents?: number | null;
  feeCurrency?: string | null;
  confidence?: "confirmed" | "probable";
}

export interface OpportunityStageInput {
  /** The stored stage this row edits, as read; omitted for a new stage. */
  id?: string | null;
  kind: OpportunityStageKind;
  label: string;
  dueOn: string;
  /** Local time, HH:MM, read in `timezone`. */
  dueTime?: string | null;
  timezone?: string | null;
  confidence?: "confirmed" | "probable";
}

export interface DeadlineFactsDeadlineInput {
  /** The main deadline date. Null clears it; omitted leaves it unchanged. */
  date?: string | null;
  /** Local close time, HH:MM. Null clears it. */
  time?: string | null;
  timezone?: string | null;
}

export interface ReplaceDeadlineFactsInput {
  opportunityId: string;
  source: DeadlineFactsSource;
  tiers: DeadlineTierInput[];
  stages: OpportunityStageInput[];
  deadline?: DeadlineFactsDeadlineInput;
  sourceUrl?: string | null;
  /** The revision the editor loaded; a mismatch is a conflict. */
  expectedRevision?: string;
  actorAccountId?: string;
  idempotencyKey?: string;
}

export interface OpportunityDeadlineFactsRecord {
  opportunityId: string;
  deadlineDate?: string;
  /** Local close time, HH:MM, in `deadlineTimezone`. */
  deadlineTime?: string;
  deadlineTimezone?: string;
  tiers: OpportunityDeadlineTier[];
  stages: OpportunityStage[];
  /** Fingerprint of the editable facts, used for optimistic concurrency. */
  revision: string;
}

export interface ReplaceDeadlineFactsResult {
  status: "updated" | "replayed";
  facts: OpportunityDeadlineFactsRecord;
  deadlineChanged: boolean;
  previousDeadlineDate?: string;
}

export class DeadlineFactsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DeadlineFactsConflictError extends Error {
  constructor(readonly current: OpportunityDeadlineFactsRecord) {
    super("These dates were changed by someone else. Review the latest version and try again.");
    this.name = "ConflictError";
  }
}

export class DeadlineFactsNotFoundError extends Error {
  constructor() {
    super("Opportunity not found");
    this.name = "NotFoundError";
  }
}

export class DeadlineFactsUnavailableError extends Error {
  constructor() {
    super("Deadline details are not available yet");
    this.name = "UnavailableError";
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour") % 24, part("minute"), part("second")) - instant;
}

/** The UTC instant of a wall-clock date and time in an IANA zone. */
export function wallTimeToInstant(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wall - zoneOffsetMs(wall, timeZone);
  instant = wall - zoneOffsetMs(instant, timeZone);
  return new Date(instant).toISOString();
}

/** The wall-clock HH:MM of an instant in an IANA zone. */
export function instantToWallTime(instant: string, timeZone: string): string | undefined {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return undefined;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    return `${hour.padStart(2, "0")}:${minute}`;
  } catch {
    return undefined;
  }
}

function cleanLabel(value: unknown, fallback: string): string {
  const label = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (label.length > 120) throw new DeadlineFactsValidationError("Keep each label under 120 characters.");
  return label || fallback;
}

function clock(time: unknown, timezone: unknown, what: string): { time?: string; timezone?: string } {
  const zone = typeof timezone === "string" && timezone.trim() ? timezone.trim() : undefined;
  if (zone && !validZone(zone)) throw new DeadlineFactsValidationError(`${what} has a time zone Missa does not recognise.`);
  if (time === undefined || time === null || time === "") return zone ? { timezone: zone } : {};
  if (typeof time !== "string" || !TIME.test(time)) throw new DeadlineFactsValidationError(`${what} needs a time like 23:59.`);
  if (!zone) throw new DeadlineFactsValidationError(`${what} needs a time zone with its time.`);
  return { time, timezone: zone };
}

const TIER_FALLBACK_LABELS: Record<OpportunityDeadlineTier["tier"], string> = {
  early: "Early deadline", regular: "Regular deadline", late: "Late deadline", extended: "Extended deadline", final: "Final deadline", other: "Deadline",
};
const STAGE_FALLBACK_LABELS: Record<OpportunityStageKind, string> = {
  "letter-of-intent": "Letter of intent", "full-application": "Full application", shortlist: "Shortlist", interview: "Interviews",
  notification: "Notification", decision: "Decision", event: "Event", other: "Stage",
};

/** Validate and normalise editor input. Throws DeadlineFactsValidationError with customer-facing copy. */
export function normalizeDeadlineFactsInput(input: Pick<ReplaceDeadlineFactsInput, "tiers" | "stages" | "deadline">): {
  tiers: Array<Required<Pick<DeadlineTierInput, "tier" | "label" | "closesOn">> & { id?: string; closesAt?: string; timezone?: string; feeCents?: number; feeCurrency?: string; confidence: "confirmed" | "probable" }>;
  stages: Array<Required<Pick<OpportunityStageInput, "kind" | "label" | "dueOn">> & { id?: string; dueAt?: string; timezone?: string; confidence: "confirmed" | "probable" }>;
  deadline?: { date?: string | null; closesAt?: string | null; timezone?: string | null };
} {
  if (!Array.isArray(input.tiers) || !Array.isArray(input.stages)) throw new DeadlineFactsValidationError("Send tiers and stages as lists.");
  if (input.tiers.length > MAX_DEADLINE_TIERS) throw new DeadlineFactsValidationError(`Add up to ${MAX_DEADLINE_TIERS} fee tiers.`);
  if (input.stages.length > MAX_OPPORTUNITY_STAGES) throw new DeadlineFactsValidationError(`Add up to ${MAX_OPPORTUNITY_STAGES} stages.`);
  const tiers = input.tiers.map((tier, index) => {
    const what = `Fee tier ${index + 1}`;
    if (!DEADLINE_TIER_KINDS.includes(tier?.tier)) throw new DeadlineFactsValidationError(`${what} needs a tier type.`);
    if (!validDate(tier.closesOn)) throw new DeadlineFactsValidationError(`${what} needs a closing date.`);
    const parsed = clock(tier.closesTime, tier.timezone, what);
    let feeCents: number | undefined;
    if (tier.feeCents !== undefined && tier.feeCents !== null) {
      if (!Number.isSafeInteger(tier.feeCents) || tier.feeCents < 0) throw new DeadlineFactsValidationError(`${what} needs a fee of zero or more.`);
      feeCents = tier.feeCents;
    }
    const currency = typeof tier.feeCurrency === "string" && tier.feeCurrency.trim() ? tier.feeCurrency.trim().toUpperCase() : undefined;
    if (currency && !/^[A-Z]{3}$/.test(currency)) throw new DeadlineFactsValidationError(`${what} needs a three-letter currency code, like USD.`);
    if (feeCents && !currency) throw new DeadlineFactsValidationError(`${what} needs a currency with its fee.`);
    return {
      ...(typeof tier.id === "string" && tier.id ? { id: tier.id } : {}),
      tier: tier.tier,
      label: cleanLabel(tier.label, TIER_FALLBACK_LABELS[tier.tier]),
      closesOn: tier.closesOn,
      ...(parsed.time && parsed.timezone ? { closesAt: wallTimeToInstant(tier.closesOn, parsed.time, parsed.timezone) } : {}),
      ...(parsed.timezone ? { timezone: parsed.timezone } : {}),
      ...(feeCents !== undefined ? { feeCents } : {}),
      ...(feeCents && currency ? { feeCurrency: currency } : {}),
      confidence: tier.confidence === "probable" ? "probable" as const : "confirmed" as const,
    };
  });
  const stages = input.stages.map((stage, index) => {
    const what = `Stage ${index + 1}`;
    if (!OPPORTUNITY_STAGE_KINDS.includes(stage?.kind)) throw new DeadlineFactsValidationError(`${what} needs a stage type.`);
    if (!validDate(stage.dueOn)) throw new DeadlineFactsValidationError(`${what} needs a date.`);
    const parsed = clock(stage.dueTime, stage.timezone, what);
    return {
      ...(typeof stage.id === "string" && stage.id ? { id: stage.id } : {}),
      kind: stage.kind,
      label: cleanLabel(stage.label, STAGE_FALLBACK_LABELS[stage.kind]),
      dueOn: stage.dueOn,
      ...(parsed.time && parsed.timezone ? { dueAt: wallTimeToInstant(stage.dueOn, parsed.time, parsed.timezone) } : {}),
      ...(parsed.timezone ? { timezone: parsed.timezone } : {}),
      confidence: stage.confidence === "probable" ? "probable" as const : "confirmed" as const,
    };
  });
  let deadline: { date?: string | null; closesAt?: string | null; timezone?: string | null } | undefined;
  if (input.deadline) {
    deadline = {};
    if (input.deadline.date !== undefined) {
      if (input.deadline.date !== null && !validDate(input.deadline.date)) throw new DeadlineFactsValidationError("The deadline needs a valid date.");
      deadline.date = input.deadline.date;
    }
    if (input.deadline.time !== undefined || input.deadline.timezone !== undefined) {
      const parsed = clock(input.deadline.time, input.deadline.timezone, "The deadline");
      const date = deadline.date;
      if (parsed.time && !date) throw new DeadlineFactsValidationError("The deadline needs a date with its time.");
      deadline.closesAt = parsed.time && parsed.timezone && date ? wallTimeToInstant(date, parsed.time, parsed.timezone) : null;
      deadline.timezone = parsed.timezone ?? null;
    }
  }
  return { tiers, stages, ...(deadline ? { deadline } : {}) };
}

function fingerprint(record: Omit<OpportunityDeadlineFactsRecord, "revision">): string {
  const stable = {
    d: record.deadlineDate ?? null,
    t: record.deadlineTime ?? null,
    z: record.deadlineTimezone ?? null,
    tiers: record.tiers.map(({ id: _id, ...rest }) => rest),
    stages: record.stages.map(({ id: _id, ...rest }) => rest),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 16);
}

/** The editable deadline facts for one opportunity, or null when it does not exist. */
export async function readOpportunityDeadlineFacts(db: Db, opportunityId: string): Promise<OpportunityDeadlineFactsRecord | null> {
  const base = await db.query<{ id: string; deadline_date: string | null; deadline_time: Date | string | null; deadline_timezone: string | null }>(
    "select id, deadline_date::text, deadline_time, deadline_timezone from opportunities where id = $1",
    [opportunityId],
  );
  const row = base.rows[0];
  if (!row) return null;
  const ready = await deadlineFactsAvailable(db);
  const [tiers, stages] = ready
    ? await Promise.all([
        db.query(
          `select id, opportunity_id, tier, label, closes_on::text as closes_on, closes_at, timezone, fee_cents, fee_currency, confidence
             from opportunity_deadline_tiers where opportunity_id = $1 order by closes_on, position`,
          [opportunityId],
        ),
        db.query(
          `select id, opportunity_id, kind, label, due_on::text as due_on, due_at, timezone, confidence
             from opportunity_stages where opportunity_id = $1 order by due_on, position`,
          [opportunityId],
        ),
      ])
    : [{ rows: [] }, { rows: [] }];
  const deadlineTime = row.deadline_time && row.deadline_timezone
    ? instantToWallTime(new Date(row.deadline_time).toISOString(), row.deadline_timezone)
    : undefined;
  const record = {
    opportunityId: row.id,
    ...(row.deadline_date ? { deadlineDate: row.deadline_date } : {}),
    ...(deadlineTime ? { deadlineTime } : {}),
    ...(row.deadline_timezone ? { deadlineTimezone: row.deadline_timezone } : {}),
    tiers: tiers.rows.map((tier) => tierFromRow(tier as Parameters<typeof tierFromRow>[0])),
    stages: stages.rows.map((stage) => stageFromRow(stage as Parameters<typeof stageFromRow>[0])),
  };
  return { ...record, revision: fingerprint(record) };
}

/**
 * Pair each incoming row with the stored row it edits, so saving keeps the
 * stored ids. Stage-anchored plan steps and tier reminders point at those
 * ids; recreating every row would detach the steps and send a reminder twice.
 * An id the editor sent wins; otherwise the same kind and date, then the same
 * kind and label, then the first unclaimed stored row of the same kind (a
 * moved date). Returns the stored id per incoming index, or undefined for a
 * new row; stored rows left unclaimed were removed.
 */
export function matchStoredRows<
  Stored extends { id?: string; kind: string; date: string; label: string },
  Incoming extends { id?: string; kind: string; date: string; label: string },
>(stored: readonly Stored[], incoming: readonly Incoming[]): Array<string | undefined> {
  const claimed = new Set<string>();
  const result: Array<string | undefined> = incoming.map(() => undefined);
  const claim = (index: number, test: (row: Stored) => boolean) => {
    if (result[index] !== undefined) return;
    const found = stored.find((row) => row.id && !claimed.has(row.id) && test(row));
    if (found?.id) {
      claimed.add(found.id);
      result[index] = found.id;
    }
  };
  incoming.forEach((row, index) => row.id && claim(index, (candidate) => candidate.id === row.id));
  incoming.forEach((row, index) => claim(index, (candidate) => candidate.kind === row.kind && candidate.date === row.date));
  incoming.forEach((row, index) => claim(index, (candidate) => candidate.kind === row.kind && candidate.label === row.label));
  incoming.forEach((row, index) => claim(index, (candidate) => candidate.kind === row.kind));
  return result;
}

async function auditPresent(db: Db): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>("select to_regclass('public.audit_events') is not null as ready");
  return result.rows[0]?.ready === true;
}

const AUDIT_ACTION: Record<DeadlineFactsSource, string> = {
  admin: "platform_admin.opportunity_deadline_facts_replaced",
  organization: "organization.opportunity_deadline_facts_replaced",
};

/**
 * Replace the tiers and stages for an opportunity with the given lists, and
 * optionally correct the main deadline. Rows that match a stored row keep its
 * id (see matchStoredRows). A changed deadline date is recorded
 * in `opportunity_changes` as a verified correction, so the public record
 * shows it as changed with the previous date.
 */
export async function replaceOpportunityDeadlineFacts(pool: Pool, input: ReplaceDeadlineFactsInput): Promise<ReplaceDeadlineFactsResult> {
  const normalized = normalizeDeadlineFactsInput(input);
  if (!(await deadlineFactsAvailable(pool))) throw new DeadlineFactsUnavailableError();
  const audit = Boolean(input.actorAccountId) && (await auditPresent(pool));
  const client = await pool.connect();
  try {
    await client.query("begin");
    const locked = await client.query<{ deadline_date: string | null }>(
      "select deadline_date::text from opportunities where id = $1 for update",
      [input.opportunityId],
    );
    if (!locked.rows[0]) throw new DeadlineFactsNotFoundError();

    if (audit && input.idempotencyKey) {
      const replay = await client.query<{ detail: { deadlineChanged?: boolean; previousDeadlineDate?: string } | null }>(
        `select detail from audit_events
          where account_id = $1 and action = $2 and target_type = 'opportunity' and target_id = $3
            and detail->>'idempotencyKey' = $4
          order by created_at desc limit 1`,
        [input.actorAccountId, AUDIT_ACTION[input.source], input.opportunityId, input.idempotencyKey],
      );
      if (replay.rows[0]) {
        const facts = (await readOpportunityDeadlineFacts(client, input.opportunityId))!;
        await client.query("commit");
        const detail = replay.rows[0].detail ?? {};
        return {
          status: "replayed",
          facts,
          deadlineChanged: Boolean(detail.deadlineChanged),
          ...(detail.previousDeadlineDate ? { previousDeadlineDate: detail.previousDeadlineDate } : {}),
        };
      }
    }

    const before = (await readOpportunityDeadlineFacts(client, input.opportunityId))!;
    if (input.expectedRevision && input.expectedRevision !== before.revision) throw new DeadlineFactsConflictError(before);

    // Update matched rows in place so their ids survive; delete only rows
    // that were removed and insert only new ones.
    const tierIds = matchStoredRows(
      before.tiers.map((tier) => ({ id: tier.id, kind: tier.tier, date: tier.closesOn, label: tier.label })),
      normalized.tiers.map((tier) => ({ id: tier.id, kind: tier.tier, date: tier.closesOn, label: tier.label })),
    );
    const keptTiers = tierIds.filter((id): id is string => Boolean(id));
    await client.query(
      "delete from opportunity_deadline_tiers where opportunity_id = $1 and not (id::text = any($2::text[]))",
      [input.opportunityId, keptTiers],
    );
    for (const [position, tier] of normalized.tiers.entries()) {
      const values = [input.opportunityId, tier.tier, tier.label, tier.closesOn, tier.closesAt ?? null, tier.timezone ?? null, tier.feeCents ?? null, tier.feeCurrency ?? null, position, tier.confidence, input.source, input.sourceUrl ?? null];
      const id = tierIds[position];
      if (id) {
        await client.query(
          `update opportunity_deadline_tiers
              set tier=$2,label=$3,closes_on=$4::date,closes_at=$5::timestamptz,timezone=$6,fee_cents=$7,fee_currency=$8,
                  position=$9,confidence=$10,source=$11,source_url=$12,updated_at=now()
            where opportunity_id=$1 and id::text=$13`,
          [...values, id],
        );
      } else {
        await client.query(
          `insert into opportunity_deadline_tiers (opportunity_id,tier,label,closes_on,closes_at,timezone,fee_cents,fee_currency,position,confidence,source,source_url,updated_at)
           values ($1,$2,$3,$4::date,$5::timestamptz,$6,$7,$8,$9,$10,$11,$12,now())`,
          values,
        );
      }
    }
    const stageIds = matchStoredRows(
      before.stages.map((stage) => ({ id: stage.id, kind: stage.kind, date: stage.dueOn, label: stage.label })),
      normalized.stages.map((stage) => ({ id: stage.id, kind: stage.kind, date: stage.dueOn, label: stage.label })),
    );
    const keptStages = stageIds.filter((id): id is string => Boolean(id));
    await client.query(
      "delete from opportunity_stages where opportunity_id = $1 and not (id::text = any($2::text[]))",
      [input.opportunityId, keptStages],
    );
    for (const [position, stage] of normalized.stages.entries()) {
      const values = [input.opportunityId, stage.kind, stage.label, stage.dueOn, stage.dueAt ?? null, stage.timezone ?? null, position, stage.confidence, input.source, input.sourceUrl ?? null];
      const id = stageIds[position];
      if (id) {
        await client.query(
          `update opportunity_stages
              set kind=$2,label=$3,due_on=$4::date,due_at=$5::timestamptz,timezone=$6,position=$7,confidence=$8,source=$9,source_url=$10,updated_at=now()
            where opportunity_id=$1 and id::text=$11`,
          [...values, id],
        );
      } else {
        await client.query(
          `insert into opportunity_stages (opportunity_id,kind,label,due_on,due_at,timezone,position,confidence,source,source_url,updated_at)
           values ($1,$2,$3,$4::date,$5::timestamptz,$6,$7,$8,$9,$10,now())`,
          values,
        );
      }
    }

    const previousDeadlineDate = locked.rows[0].deadline_date ?? undefined;
    let deadlineChanged = false;
    const deadline = normalized.deadline;
    if (deadline && deadline.date !== undefined && (deadline.date ?? undefined) !== previousDeadlineDate) {
      deadlineChanged = true;
      await client.query(
        `update opportunities
            set deadline_date = $2::date,
                deadline_kind = case when $2::date is not null and deadline_kind in ('unknown', 'inferred', 'conflicting') then 'exact' else deadline_kind end,
                last_changed_at = now(), updated_at = now()
          where id = $1`,
        [input.opportunityId, deadline.date],
      );
      await client.query(
        `insert into opportunity_changes (id,opportunity_id,kind,field,old_value,new_value,created_at)
         values ($1,$2,'verified-correction','deadline_date',$3,$4,now())`,
        [randomUUID(), input.opportunityId, previousDeadlineDate ?? null, deadline.date],
      );
    }
    if (deadline && deadline.closesAt !== undefined) {
      await client.query(
        "update opportunities set deadline_time = $2::timestamptz, deadline_timezone = $3, updated_at = now() where id = $1",
        [input.opportunityId, deadline.closesAt, deadline.timezone ?? null],
      );
    }

    if (audit) {
      await client.query(
        `insert into audit_events (account_id, action, target_type, target_id, detail)
         values ($1, $2, 'opportunity', $3, $4::jsonb)`,
        [input.actorAccountId, AUDIT_ACTION[input.source], input.opportunityId, JSON.stringify({
          idempotencyKey: input.idempotencyKey ?? null,
          tiers: normalized.tiers.length,
          stages: normalized.stages.length,
          deadlineChanged,
          ...(deadlineChanged ? { previousDeadlineDate: previousDeadlineDate ?? null, deadlineDate: deadline?.date ?? null } : {}),
        })],
      );
    }
    const facts = (await readOpportunityDeadlineFacts(client, input.opportunityId))!;
    await client.query("commit");
    return { status: "updated", facts, deadlineChanged, ...(deadlineChanged && previousDeadlineDate ? { previousDeadlineDate } : {}) };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
