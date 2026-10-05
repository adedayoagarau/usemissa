import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";
import { DEFAULT_PLANNING_PREFERENCES } from "./creatorPlanningPreferences.js";
import { expectedResponse } from "./trackerResponseDates.js";

/**
 * Read-only source for the private calendar feed (ICS): every dated thing a
 * creator's subscription can show, loaded for the account that owns a feed
 * token. Tables added by the deadline-management migration are read only when
 * they exist, so the feed keeps working on a database that has not caught up.
 */

type Db = Pool | PoolClient;

const PRE_SUBMISSION = ["interested", "saved", "preparing", "draft-started", "ready-to-submit"];

export type CalendarFeedTracked = {
  trackedId: string;
  opportunityId: string;
  title: string;
  organizationName: string | null;
  myStatus: string;
  oppStatus: string;
  openDate: string | null;
  /** The official deadline while the application is still being prepared. */
  deadline: string | null;
  deadlineKind: string | null;
  /** Exact closing moment, ISO 8601, when the organisation published one. */
  deadlineTime: string | null;
  deadlineTimezone: string | null;
  /** The creator's own finish-by date for this application. */
  personalTargetOn: string | null;
  expectedResponseBy: string | null;
};

export type CalendarFeedStage = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  kind: string;
  label: string;
  dueOn: string;
  dueAt: string | null;
  timezone: string | null;
  confidence: string;
};

export type CalendarFeedTier = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  tier: string;
  label: string;
  closesOn: string;
  closesAt: string | null;
  timezone: string | null;
  feeCents: number | null;
  feeCurrency: string | null;
};

export type CalendarFeedObligation = {
  id: string;
  opportunityId: string | null;
  opportunityTitle: string | null;
  kind: string;
  label: string;
  dueOn: string;
  dueAt: string | null;
  timezone: string | null;
};

export type CalendarFeedForecast = {
  opportunityId: string;
  opportunityTitle: string;
  expectedOpenStart: string | null;
  expectedOpenEnd: string | null;
  expectedClose: string | null;
  confidence: string;
  basedOnCycles: number;
};

export type CalendarFeedData = {
  accountId: string;
  /** Days before a date that calendar alarms fire, from planning preferences. */
  alarmOffsets: number[];
  tracked: CalendarFeedTracked[];
  stages: CalendarFeedStage[];
  tiers: CalendarFeedTier[];
  obligations: CalendarFeedObligation[];
  forecasts: CalendarFeedForecast[];
};

const iso = (value: Date | string | null): string | null => (value ? new Date(value).toISOString() : null);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function existing(db: Db, tables: string[]): Promise<Set<string>> {
  const result = await db.query<{ name: string }>(
    "select name from unnest($1::text[]) as t(name) where to_regclass('public.' || name) is not null",
    [tables],
  );
  return new Set(result.rows.map((row) => row.name));
}

async function hasColumn(db: Db, table: string, column: string): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    `select count(*) = 1 as ready from information_schema.columns
      where table_schema=current_schema() and table_name=$1 and column_name=$2`,
    [table, column],
  );
  return Boolean(result.rows[0]?.ready);
}

/**
 * The account behind an active feed token for this user, checked the same way
 * as the calendar repository: the SHA-256 of the token must match an active
 * row owned by the profile's account. Never writes.
 */
export async function calendarFeedAccountForToken(db: Db, userId: string, token: string): Promise<string | undefined> {
  if (!token) return undefined;
  const owner = await db.query<{ account_id: string }>(
    `select t.account_id from calendar_feed_tokens t join creator_profiles p on p.account_id=t.account_id
      where t.token_hash=$1 and t.status='active' and p.user_id=$2 limit 1`,
    [hashToken(token), userId],
  );
  return owner.rows[0]?.account_id;
}

/** Everything the feed shows for one account. Past items older than 30 days are left out. */
export async function calendarFeedItemsForAccount(db: Db, accountId: string): Promise<CalendarFeedData> {
  const tables = await existing(db, [
    "opportunity_stages",
    "opportunity_deadline_tiers",
    "creator_obligations",
    "opportunity_cycle_forecasts",
    "creator_planning_preferences",
  ]);
  const targetColumn = await hasColumn(db, "tracked_opportunities", "personal_target_on");

  const trackedRows = await db.query<{
    tracked_id: string;
    opportunity_id: string;
    title: string;
    organization_name: string | null;
    status: string;
    opp_status: string;
    open_date: string | null;
    deadline_date: string | null;
    deadline_kind: string | null;
    deadline_time: Date | string | null;
    deadline_timezone: string | null;
    personal_target_on: string | null;
    submitted_at: Date | string | null;
    response_time_days: number | null;
  }>(
    `select t.id tracked_id,t.opportunity_id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,
            t.status,o.status opp_status,o.open_date::text open_date,o.deadline_date::text deadline_date,o.deadline_kind,
            o.deadline_time,o.deadline_timezone,${targetColumn ? "t.personal_target_on::text" : "null::text"} personal_target_on,
            t.submitted_at,cp.response_time_days
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join opportunity_call_profiles cp on cp.opportunity_id=o.id
      where t.account_id=$1 and ${canonicalPublicOpportunityPredicate("o")}
      order by t.updated_at desc`,
    [accountId],
  );
  const tracked: CalendarFeedTracked[] = trackedRows.rows.map((row) => {
    const preparing = PRE_SUBMISSION.includes(row.status);
    return {
      trackedId: row.tracked_id,
      opportunityId: row.opportunity_id,
      title: row.title,
      organizationName: row.organization_name,
      myStatus: row.status,
      oppStatus: row.opp_status,
      openDate: row.open_date,
      deadline: preparing ? row.deadline_date : null,
      deadlineKind: row.deadline_kind,
      deadlineTime: iso(row.deadline_time),
      deadlineTimezone: row.deadline_timezone,
      personalTargetOn: preparing ? row.personal_target_on : null,
      expectedResponseBy: expectedResponse(row.status, row.submitted_at, row.response_time_days)?.expectedResponseBy ?? null,
    };
  });
  const trackedIds = tracked.map((item) => item.opportunityId);
  const preparingIds = tracked.filter((item) => PRE_SUBMISSION.includes(item.myStatus)).map((item) => item.opportunityId);

  const stages = tables.has("opportunity_stages") && trackedIds.length
    ? (
        await db.query<{
          id: string; opportunity_id: string; title: string; kind: string; label: string; due_on: string;
          due_at: Date | string | null; timezone: string | null; confidence: string;
        }>(
          `select s.id::text id,s.opportunity_id,o.title,s.kind,s.label,s.due_on::text due_on,s.due_at,s.timezone,s.confidence
             from opportunity_stages s join opportunities o on o.id=s.opportunity_id
            where s.opportunity_id=any($1::text[]) and s.due_on >= current_date-30
            order by s.due_on,s.position,s.id`,
          [trackedIds],
        )
      ).rows.map((row) => ({
        id: row.id,
        opportunityId: row.opportunity_id,
        opportunityTitle: row.title,
        kind: row.kind,
        label: row.label,
        dueOn: row.due_on,
        dueAt: iso(row.due_at),
        timezone: row.timezone,
        confidence: row.confidence,
      }))
    : [];

  const tiers = tables.has("opportunity_deadline_tiers") && preparingIds.length
    ? (
        await db.query<{
          id: string; opportunity_id: string; title: string; tier: string; label: string; closes_on: string;
          closes_at: Date | string | null; timezone: string | null; fee_cents: number | null; fee_currency: string | null;
        }>(
          `select d.id::text id,d.opportunity_id,o.title,d.tier,d.label,d.closes_on::text closes_on,d.closes_at,d.timezone,
                  d.fee_cents,d.fee_currency
             from opportunity_deadline_tiers d join opportunities o on o.id=d.opportunity_id
            where d.opportunity_id=any($1::text[]) and d.closes_on >= current_date
              and (o.deadline_date is null or d.closes_on <> o.deadline_date)
            order by d.closes_on,d.position,d.id`,
          [preparingIds],
        )
      ).rows.map((row) => ({
        id: row.id,
        opportunityId: row.opportunity_id,
        opportunityTitle: row.title,
        tier: row.tier,
        label: row.label,
        closesOn: row.closes_on,
        closesAt: iso(row.closes_at),
        timezone: row.timezone,
        feeCents: row.fee_cents,
        feeCurrency: row.fee_currency,
      }))
    : [];

  const obligations = tables.has("creator_obligations")
    ? (
        await db.query<{
          id: string; opportunity_id: string | null; title: string | null; kind: string; label: string; due_on: string;
          due_at: Date | string | null; timezone: string | null;
        }>(
          `select ob.id::text id,coalesce(ob.opportunity_id,t.opportunity_id) opportunity_id,o.title,ob.kind,ob.label,
                  ob.due_on::text due_on,ob.due_at,ob.timezone
             from creator_obligations ob
             left join tracked_opportunities t on t.id=ob.tracked_opportunity_id
             left join opportunities o on o.id=coalesce(ob.opportunity_id,t.opportunity_id)
            where ob.account_id=$1 and ob.state='open' and ob.due_on >= current_date-30
              and ob.kind <> 'personal-target'
            order by ob.due_on,ob.position,ob.id`,
          [accountId],
        )
      ).rows.map((row) => ({
        id: row.id,
        opportunityId: row.opportunity_id,
        opportunityTitle: row.title,
        kind: row.kind,
        label: row.label,
        dueOn: row.due_on,
        dueAt: iso(row.due_at),
        timezone: row.timezone,
      }))
    : [];

  const forecasts = tables.has("opportunity_cycle_forecasts") && trackedIds.length
    ? (
        await db.query<{
          opportunity_id: string; title: string; expected_open_start: string | null; expected_open_end: string | null;
          expected_close: string | null; confidence: string; based_on_cycles: number;
        }>(
          `select f.opportunity_id,o.title,f.expected_open_start::text expected_open_start,f.expected_open_end::text expected_open_end,
                  f.expected_close::text expected_close,f.confidence,f.based_on_cycles
             from opportunity_cycle_forecasts f join opportunities o on o.id=f.opportunity_id
            where f.opportunity_id=any($1::text[]) and f.confirmed_at is null
              and greatest(f.expected_open_start,f.expected_open_end,f.expected_close) >= current_date
            order by coalesce(f.expected_open_start,f.expected_close),f.opportunity_id`,
          [trackedIds],
        )
      ).rows.map((row) => ({
        opportunityId: row.opportunity_id,
        opportunityTitle: row.title,
        expectedOpenStart: row.expected_open_start,
        expectedOpenEnd: row.expected_open_end,
        expectedClose: row.expected_close,
        confidence: row.confidence,
        basedOnCycles: row.based_on_cycles,
      }))
    : [];

  let alarmOffsets: number[] = [...DEFAULT_PLANNING_PREFERENCES.defaultDeadlineOffsets];
  if (tables.has("creator_planning_preferences")) {
    const preferences = await db.query<{ offsets: number[] }>(
      "select default_deadline_offsets offsets from creator_planning_preferences where account_id=$1",
      [accountId],
    );
    if (preferences.rows[0]) alarmOffsets = preferences.rows[0].offsets.map(Number);
  }

  return { accountId, alarmOffsets, tracked, stages, tiers, obligations, forecasts };
}

/** The feed for a user's token, or undefined when the token is not active for that user. */
export async function calendarFeedForToken(db: Db, userId: string, token: string): Promise<CalendarFeedData | undefined> {
  const accountId = await calendarFeedAccountForToken(db, userId, token);
  return accountId ? calendarFeedItemsForAccount(db, accountId) : undefined;
}
