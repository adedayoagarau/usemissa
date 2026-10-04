import type { Pool, PoolClient } from "pg";
import type { OpportunityCycleForecast } from "@missa/radar-engine";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";
import { OPEN_STATUS_SQL, PREFERENCE_MATCH_CTE, preferenceMatchPredicate } from "./weeklyDigest.js";

type Db = Pool | PoolClient;

function isoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function isoTime(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * One tracked call as the Season page and Calendar need it: the tracked
 * record's revision (for personal-target writes), the official deadline with
 * its close time, the published entry fee and the creator's personal target.
 */
export type SeasonTrackedCall = {
  trackedId: string;
  opportunityId: string;
  title: string;
  organizationName?: string;
  type: string;
  opportunityStatus: string;
  myStatus: string;
  revision: number;
  deadline?: string;
  deadlineKind: string;
  deadlineTime?: string;
  deadlineTimezone?: string;
  openDate?: string;
  feeStatus: "no-fee" | "paid" | "unknown";
  feeCents?: number;
  feeCurrency?: string;
  personalTargetOn?: string;
};

type SeasonRow = {
  id: string;
  opportunity_id: string;
  status: string;
  revision: number;
  title: string;
  organization_name: string | null;
  type: string | null;
  opportunity_status: string | null;
  deadline_date: string | null;
  deadline_kind: string | null;
  deadline_time: Date | string | null;
  deadline_timezone: string | null;
  open_date: string | null;
  fee_status: string | null;
  fee_cents: number | null;
  fee_currency: string | null;
  personal_target_on: Date | string | null;
};

function feeStatus(value: string | null): SeasonTrackedCall["feeStatus"] {
  if (value === "no-fee" || value === "free") return "no-fee";
  if (value === "paid" || value === "fee") return "paid";
  return "unknown";
}

export function seasonCallFromRow(row: SeasonRow): SeasonTrackedCall {
  return {
    trackedId: row.id,
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? undefined,
    type: row.type ?? "other",
    opportunityStatus: row.opportunity_status ?? "unknown",
    myStatus: row.status,
    revision: row.revision,
    deadline: row.deadline_date ?? undefined,
    deadlineKind: row.deadline_kind === "fixed" ? "exact" : row.deadline_kind || "unknown",
    deadlineTime: isoTime(row.deadline_time),
    deadlineTimezone: row.deadline_timezone ?? undefined,
    openDate: row.open_date ?? undefined,
    feeStatus: feeStatus(row.fee_status),
    feeCents: row.fee_cents ?? undefined,
    feeCurrency: row.fee_currency ?? undefined,
    personalTargetOn: isoDate(row.personal_target_on),
  };
}

async function hasPersonalTarget(db: Db): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    `select exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'tracked_opportunities' and column_name = 'personal_target_on'
     ) as ready`,
  );
  return Boolean(result.rows[0]?.ready);
}

/** Every published call the creator tracks, soonest deadline first. */
export async function listSeasonTrackedCalls(db: Db, accountId: string): Promise<SeasonTrackedCall[]> {
  const target = (await hasPersonalTarget(db)) ? "t.personal_target_on::text as personal_target_on" : "null::date as personal_target_on";
  const result = await db.query<SeasonRow>(
    `select t.id, t.opportunity_id, t.status, t.revision, ${target},
            o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.type,
            o.status as opportunity_status, o.deadline_date::text as deadline_date, o.deadline_kind,
            o.deadline_time, o.deadline_timezone, o.open_date::text as open_date,
            o.fee_status, o.fee_cents, o.fee_currency
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
      where t.account_id = $1 and ${canonicalPublicOpportunityPredicate("o")}
      order by o.deadline_date asc nulls last, t.id`,
    [accountId],
  );
  return result.rows.map(seasonCallFromRow);
}

/** A predicted next cycle for a call the creator tracks or whose organization they follow. */
export type WatchedForecast = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  opportunityStatus: string;
  /** The current published deadline, if any; a forecast matters once it has passed. */
  deadline?: string;
  relation: "tracked" | "following";
  forecast: OpportunityCycleForecast;
};

type ForecastRow = {
  opportunity_id: string;
  title: string;
  organization_name: string | null;
  opportunity_status: string | null;
  deadline_date: string | null;
  tracked: boolean;
  expected_open_start: Date | string | null;
  expected_open_end: Date | string | null;
  expected_close: Date | string | null;
  confidence: OpportunityCycleForecast["confidence"];
  based_on_cycles: number;
  confirmed_at: Date | string | null;
  confirmed_delta_days: number | null;
};

export function watchedForecastFromRow(row: ForecastRow): WatchedForecast {
  return {
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? undefined,
    opportunityStatus: row.opportunity_status ?? "unknown",
    deadline: row.deadline_date ?? undefined,
    relation: row.tracked ? "tracked" : "following",
    forecast: {
      expectedOpenStart: isoDate(row.expected_open_start),
      expectedOpenEnd: isoDate(row.expected_open_end),
      expectedClose: isoDate(row.expected_close),
      confidence: row.confidence,
      basedOnCycles: row.based_on_cycles,
      confirmedAt: isoTime(row.confirmed_at),
      confirmedDeltaDays: row.confirmed_delta_days ?? undefined,
    },
  };
}

/**
 * Forecasts for calls the creator tracks or whose organization they follow.
 * Empty before migration 0088. Forecasts already confirmed by a published
 * date are left out: the published date is the one to show.
 */
export async function listWatchedForecasts(db: Db, accountId: string, limit = 60): Promise<WatchedForecast[]> {
  const ready = await db.query<{ ready: boolean }>(
    "select to_regclass('public.opportunity_cycle_forecasts') is not null as ready",
  );
  if (!ready.rows[0]?.ready) return [];
  const result = await db.query<ForecastRow>(
    `select o.id as opportunity_id, o.title, coalesce(org.data->>'name', o.organization_id) as organization_name,
            o.status as opportunity_status, o.deadline_date::text as deadline_date,
            exists (select 1 from tracked_opportunities t where t.account_id = $1 and t.opportunity_id = o.id) as tracked,
            f.expected_open_start::text as expected_open_start, f.expected_open_end::text as expected_open_end,
            f.expected_close::text as expected_close, f.confidence, f.based_on_cycles,
            f.confirmed_at, f.confirmed_delta_days
       from opportunity_cycle_forecasts f
       join opportunities o on o.id = f.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
      where ${canonicalPublicOpportunityPredicate("o")}
        and f.confirmed_at is null
        and (
          exists (select 1 from tracked_opportunities t where t.account_id = $1 and t.opportunity_id = o.id)
          or exists (select 1 from organization_follows fo where fo.account_id = $1 and fo.organization_id = o.organization_id)
        )
      order by coalesce(f.expected_open_start, f.expected_close) asc nulls last, o.id
      limit $2`,
    [accountId, limit],
  );
  return result.rows.map(watchedForecastFromRow);
}

/** Open calls that match the creator's preferences, counted per deadline date. */
export type SeasonMatchingOpenCalls = {
  /** False when the creator has not chosen any discipline or genre to include. */
  hasPreferences: boolean;
  /** One row per date with at least one matching call, soonest first. */
  deadlines: Array<{ date: string; count: number }>;
};

/**
 * Published, open calls with an exact deadline between `from` and `to`
 * (inclusive, ISO dates) that match the creator's preferences, using the same
 * matching as the weekly digest. Calls the creator already tracks or has
 * hidden from recommendations are left out.
 */
export async function countSeasonMatchingOpenCalls(
  db: Db,
  accountId: string,
  range: { from: string; to: string },
): Promise<SeasonMatchingOpenCalls> {
  const preferences = await db.query<{ ready: boolean }>(
    `select exists (
       select 1 from account_taxonomy_preferences where account_id=$1 and preference in ('include','prefer')
     ) as ready`,
    [accountId],
  );
  if (!preferences.rows[0]?.ready) return { hasPreferences: false, deadlines: [] };
  const result = await db.query<{ date: string; count: number }>(
    `${PREFERENCE_MATCH_CTE}
     select o.deadline_date::text as date, count(*)::int as count
       from opportunities o
      where ${canonicalPublicOpportunityPredicate("o")} and o.status in (${OPEN_STATUS_SQL})
        and o.deadline_kind in ('exact','fixed')
        and o.deadline_date between $2::date and $3::date
        and ${preferenceMatchPredicate("o")}
        and not exists (select 1 from tracked_opportunities t where t.account_id=$1 and t.opportunity_id=o.id)
        and not exists (
          select 1 from creator_recommendation_feedback f
           where f.account_id=$1 and f.opportunity_id=o.id and f.hidden
        )
      group by o.deadline_date
      order by o.deadline_date`,
    [accountId, range.from, range.to],
  );
  return { hasPreferences: true, deadlines: result.rows.map((row) => ({ date: row.date, count: Number(row.count) })) };
}
