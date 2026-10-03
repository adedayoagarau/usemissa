import type { Pool, PoolClient } from "pg";
import type {
  OpportunityCycleForecast,
  OpportunityDeadlineFacts,
  OpportunityDeadlineProvenance,
  OpportunityDeadlineTier,
  OpportunityStage,
  OpportunityStageKind,
} from "@missa/radar-engine";

type Db = Pool | PoolClient;

/** Change kinds and fields that mean the source moved the deadline. */
const DEADLINE_CHANGE_SQL = `(c.kind in ('deadline-changed', 'deadline-extended') or (c.kind = 'verified-correction' and c.field = 'deadline_date'))`;

function isoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().slice(0, 10);
}

function isoTime(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

type TierRow = {
  id: string;
  opportunity_id: string;
  tier: OpportunityDeadlineTier["tier"];
  label: string;
  closes_on: Date | string;
  closes_at: Date | string | null;
  timezone: string | null;
  fee_cents: number | null;
  fee_currency: string | null;
  confidence: "confirmed" | "probable";
};

type StageRow = {
  id: string;
  opportunity_id: string;
  kind: OpportunityStageKind;
  label: string;
  due_on: Date | string;
  due_at: Date | string | null;
  timezone: string | null;
  confidence: "confirmed" | "probable";
};

type BaseRow = {
  id: string;
  deadline_date: Date | string | null;
  deadline_kind: string | null;
  status: string | null;
  source_checked_at: Date | string | null;
  last_evidence_at: Date | string | null;
  change_old: string | null;
  change_new: string | null;
  change_at: Date | string | null;
  expected_open_start: Date | string | null;
  expected_open_end: Date | string | null;
  expected_close: Date | string | null;
  forecast_confidence: "high" | "medium" | "low" | null;
  based_on_cycles: number | null;
  confirmed_at: Date | string | null;
  confirmed_delta_days: number | null;
};

export function tierFromRow(row: TierRow): OpportunityDeadlineTier {
  return {
    id: row.id,
    tier: row.tier,
    label: row.label,
    closesOn: isoDate(row.closes_on)!,
    closesAt: isoTime(row.closes_at),
    timezone: row.timezone ?? undefined,
    feeCents: row.fee_cents ?? undefined,
    feeCurrency: row.fee_currency ?? undefined,
    confidence: row.confidence,
  };
}

export function stageFromRow(row: StageRow): OpportunityStage {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    dueOn: isoDate(row.due_on)!,
    dueAt: isoTime(row.due_at),
    timezone: row.timezone ?? undefined,
    confidence: row.confidence,
  };
}

/**
 * Decide how a deadline should be labelled. Pure so the rules are testable:
 * - predicted: no published date, but a forecast from past cycles exists;
 * - needs-checking: the record is uncertain or the date is inferred/conflicting;
 * - changed: the source moved the date and the current date is that new value;
 * - confirmed: otherwise.
 */
export function deadlineProvenance(input: {
  deadlineDate?: string;
  deadlineKind?: string | null;
  status?: string | null;
  lastCheckedAt?: string;
  change?: { oldValue?: string; newValue?: string; at?: string };
  hasForecast: boolean;
}): OpportunityDeadlineProvenance {
  const lastCheckedAt = input.lastCheckedAt;
  if (!input.deadlineDate) {
    return input.hasForecast
      ? { state: "predicted", lastCheckedAt }
      : {
          state: input.status === "uncertain" ? "needs-checking" : "confirmed",
          lastCheckedAt,
        };
  }
  if (
    input.status === "uncertain" ||
    input.deadlineKind === "inferred" ||
    input.deadlineKind === "conflicting"
  ) {
    return { state: "needs-checking", lastCheckedAt };
  }
  const changedTo = isoDate(input.change?.newValue);
  const changedFrom = isoDate(input.change?.oldValue);
  if (
    changedTo &&
    changedTo === input.deadlineDate &&
    changedFrom &&
    changedFrom !== changedTo
  ) {
    return {
      state: "changed",
      lastCheckedAt,
      previousDate: changedFrom,
      changedAt: input.change?.at,
    };
  }
  return { state: "confirmed", lastCheckedAt };
}

function forecastFromRow(row: BaseRow): OpportunityCycleForecast | undefined {
  if (!row.forecast_confidence || !row.based_on_cycles) return undefined;
  return {
    expectedOpenStart: isoDate(row.expected_open_start),
    expectedOpenEnd: isoDate(row.expected_open_end),
    expectedClose: isoDate(row.expected_close),
    confidence: row.forecast_confidence,
    basedOnCycles: row.based_on_cycles,
    confirmedAt: isoTime(row.confirmed_at),
    confirmedDeltaDays: row.confirmed_delta_days ?? undefined,
  };
}

/** True once migration 0088 has been applied; callers degrade to no facts before then. */
export async function deadlineFactsAvailable(db: Db): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    "select to_regclass('public.opportunity_deadline_tiers') is not null as ready",
  );
  return Boolean(result.rows[0]?.ready);
}

/**
 * Tiers, stages, provenance and forecast for each opportunity, keyed by id.
 * Opportunities that do not exist are omitted. Returns an empty map when the
 * deadline-management migration has not been applied yet.
 */
export async function loadDeadlineFacts(
  db: Db,
  opportunityIds: readonly string[],
): Promise<Map<string, OpportunityDeadlineFacts>> {
  const facts = new Map<string, OpportunityDeadlineFacts>();
  const ids = [...new Set(opportunityIds)].filter(Boolean);
  if (ids.length === 0 || !(await deadlineFactsAvailable(db))) return facts;

  const [base, tiers, stages] = await Promise.all([
    db.query<BaseRow>(
      `select o.id, o.deadline_date, o.deadline_kind, o.status, o.source_checked_at,
              ev.last_evidence_at, ch.old_value as change_old, ch.new_value as change_new, ch.created_at as change_at,
              f.expected_open_start, f.expected_open_end, f.expected_close, f.confidence as forecast_confidence,
              f.based_on_cycles, f.confirmed_at, f.confirmed_delta_days
         from opportunities o
         left join lateral (
           select max(e.fetched_at) as last_evidence_at
             from opportunity_lifecycle_evidence e
            where e.opportunity_id = o.id
         ) ev on true
         left join lateral (
           select c.old_value, c.new_value, c.created_at
             from opportunity_changes c
            where c.opportunity_id = o.id and ${DEADLINE_CHANGE_SQL}
            order by c.created_at desc
            limit 1
         ) ch on true
         left join opportunity_cycle_forecasts f on f.opportunity_id = o.id
        where o.id = any($1::text[])`,
      [ids],
    ),
    db.query<TierRow>(
      `select id, opportunity_id, tier, label, closes_on, closes_at, timezone, fee_cents, fee_currency, confidence
         from opportunity_deadline_tiers
        where opportunity_id = any($1::text[])
        order by opportunity_id, closes_on, position`,
      [ids],
    ),
    db.query<StageRow>(
      `select id, opportunity_id, kind, label, due_on, due_at, timezone, confidence
         from opportunity_stages
        where opportunity_id = any($1::text[])
        order by opportunity_id, due_on, position`,
      [ids],
    ),
  ]);

  for (const row of base.rows) {
    const forecast = forecastFromRow(row);
    const checked = [
      isoTime(row.source_checked_at),
      isoTime(row.last_evidence_at),
    ]
      .filter(Boolean)
      .sort()
      .pop();
    facts.set(row.id, {
      tiers: [],
      stages: [],
      provenance: deadlineProvenance({
        deadlineDate: isoDate(row.deadline_date),
        deadlineKind: row.deadline_kind,
        status: row.status,
        lastCheckedAt: checked,
        change: row.change_new
          ? {
              oldValue: row.change_old ?? undefined,
              newValue: row.change_new,
              at: isoTime(row.change_at),
            }
          : undefined,
        hasForecast: Boolean(forecast),
      }),
      forecast,
    });
  }
  for (const row of tiers.rows)
    facts.get(row.opportunity_id)?.tiers.push(tierFromRow(row));
  for (const row of stages.rows)
    facts.get(row.opportunity_id)?.stages.push(stageFromRow(row));
  return facts;
}
