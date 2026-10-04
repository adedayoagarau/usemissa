import { plansIncluding } from "./creatorEntitlements.js";
import {
  dateWindowLabel,
  insertCycleNotice,
  isoDay,
  opportunityHref,
  relationsReady,
  shiftIsoDate,
  shortDate,
  trackerHref,
  type CycleDb,
} from "./cycleNotices.js";

/**
 * Opens-soon and it-opened alerts, kept as `creator_opportunity_alerts` rows.
 *
 * - `ensureDefaultOpeningAlerts` gives eligible accounts two rows per call:
 *   `days_before_open` (14 days ahead of the forecast window) and `on_open`.
 *   Calls qualify when the account tracks them and they are closed with a
 *   forecast, or when the account follows the organization and the call has an
 *   upcoming forecast. Row ids are deterministic, so this is idempotent.
 * - `fireOpeningAlerts` sends `opens-soon` when the lead time is reached and
 *   `call-reopened` once the call is open again, sets `triggered_at`, and
 *   re-arms rows once the call has closed and an unconfirmed forecast points
 *   at a later cycle.
 * - `suggestCycleCarries` sends `cycle-carry-suggested` when a tracked call
 *   closed before it was submitted, or was declined. This one is on every plan.
 *
 * Opening alerts need a plan that includes `openingAlerts` and are skipped
 * when the creator turned `opening_alerts` off in planning preferences.
 */

export const DEFAULT_OPENS_SOON_LEAD_DAYS = 14;
const OPEN_STATUSES = "'open','closing-soon','deadline-extended'";
const PRE_SUBMISSION = "'interested','saved','preparing','draft-started','ready-to-submit'";
/** Only recent closures and decisions prompt a carry suggestion. */
const CARRY_LOOKBACK_DAYS = 30;
/** A forecast this much later than the last trigger is a new cycle. */
const REARM_AFTER_DAYS = 60;

type Scope = { accountId?: string; now?: Date };

/**
 * Alert rows stay after the creator stops tracking a call, mutes it or
 * unfollows its organization; firing checks the reason still holds.
 * `a` is the alert row and `o` its opportunity.
 */
const STILL_TRACKED_SQL = `exists (select 1 from tracked_opportunities t
  where t.account_id = a.account_id and t.opportunity_id = a.opportunity_id
    and t.notify and t.status not in ('archived', 'withdrawn'))`;
const STILL_FOLLOWED_SQL = `exists (select 1 from organization_follows fo
  where fo.account_id = a.account_id and fo.organization_id = o.organization_id)`;

/**
 * SQL for accounts whose plan includes opening alerts and who have not turned
 * them off. Parameters: $1 plans, $2 account id or null.
 */
function eligibleAccountsSql(hasPlans: boolean): string {
  if (!hasPlans) return "select null::text as account_id where false";
  return `select p.account_id from creator_plans p
           where p.plan = any($1::text[]) and (p.expires_at is null or p.expires_at > now())
             and ($2::text is null or p.account_id = $2)
             and not exists (
               select 1 from creator_planning_preferences pp
                where pp.account_id = p.account_id and pp.opening_alerts = false)`;
}

async function readiness(db: CycleDb): Promise<{ ready: boolean; hasPlans: boolean }> {
  const ready = await relationsReady(db, [
    "creator_opportunity_alerts",
    "opportunity_cycle_forecasts",
    "creator_planning_preferences",
    "creator_inbox_alerts",
  ]);
  const hasPlans = ready && (await relationsReady(db, ["creator_plans"]));
  return { ready, hasPlans };
}

function closedSql(alias: string, today: string): string {
  return `(${alias}.status in ('closed','archived','forecasted','opening-soon','paused')
           or (${alias}.deadline_date is not null and ${alias}.deadline_date < '${today}'::date))`;
}

export function openingAlertId(accountId: string, opportunityId: string, trigger: "days_before_open" | "on_open"): string {
  return `opening:${accountId}:${opportunityId}:${trigger}`;
}

/** Creates the default opening alert rows; returns how many were added. */
export async function ensureDefaultOpeningAlerts(db: CycleDb, scope: Scope = {}): Promise<number> {
  const { ready, hasPlans } = await readiness(db);
  if (!ready || !hasPlans) return 0;
  const today = isoDay(scope.now ?? new Date());
  const result = await db.query(
    `with eligible as (${eligibleAccountsSql(true)}),
     targets as (
       select t.account_id, t.opportunity_id
         from tracked_opportunities t
         join eligible e on e.account_id = t.account_id
         join opportunities o on o.id = t.opportunity_id
         join opportunity_cycle_forecasts f on f.opportunity_id = o.id
        where t.status not in ('archived', 'withdrawn') and t.notify
          and ${closedSql("o", today)}
          and coalesce(f.expected_open_end, f.expected_close) >= $3::date
       union
       select fo.account_id, o.id as opportunity_id
         from organization_follows fo
         join eligible e on e.account_id = fo.account_id
         join opportunities o on o.organization_id = fo.organization_id
         join opportunity_cycle_forecasts f on f.opportunity_id = o.id
        where o.publication_state = 'published'
          and ${closedSql("o", today)}
          and f.expected_open_start is not null and f.expected_open_end >= $3::date
     )
     insert into creator_opportunity_alerts (id, account_id, opportunity_id, trigger_kind, lead_days)
     select 'opening:' || t.account_id || ':' || t.opportunity_id || ':' || k.trigger_kind, t.account_id, t.opportunity_id, k.trigger_kind, k.lead_days
       from targets t
      cross join (values ('days_before_open', $4::int), ('on_open', 0)) as k(trigger_kind, lead_days)
     on conflict (id) do nothing`,
    [plansIncluding("openingAlerts"), scope.accountId ?? null, today, DEFAULT_OPENS_SOON_LEAD_DAYS],
  );
  return result.rowCount ?? 0;
}

export type OpeningAlertFireResult = { rearmed: number; opensSoon: number; reopened: number; notices: number };

/** Sends due opens-soon and it-opened notices. */
export async function fireOpeningAlerts(db: CycleDb, scope: Scope = {}): Promise<OpeningAlertFireResult> {
  const result: OpeningAlertFireResult = { rearmed: 0, opensSoon: 0, reopened: 0, notices: 0 };
  const { ready, hasPlans } = await readiness(db);
  if (!ready) return result;
  const now = scope.now ?? new Date();
  const today = isoDay(now);

  const rearmed = await db.query(
    `update creator_opportunity_alerts a set triggered_at = null
       from opportunity_cycle_forecasts f, opportunities o
      where f.opportunity_id = a.opportunity_id and o.id = a.opportunity_id
        and a.triggered_at is not null and f.confirmed_at is null
        and a.trigger_kind in ('days_before_open', 'on_open')
        and ($1::text is null or a.account_id = $1)
        and not (o.status in (${OPEN_STATUSES}) and (o.deadline_date is null or o.deadline_date >= $3::date))
        and coalesce(f.expected_open_start, f.expected_close) > (a.triggered_at at time zone 'UTC')::date + $2::int`,
    [scope.accountId ?? null, REARM_AFTER_DAYS, today],
  );
  result.rearmed = rearmed.rowCount ?? 0;
  if (!hasPlans) return result;
  const params = [plansIncluding("openingAlerts"), scope.accountId ?? null, today];

  const soon = await db.query<{
    id: string;
    account_id: string;
    opportunity_id: string;
    title: string;
    open_date: string | null;
    expected_open_start: string;
    expected_open_end: string | null;
    based_on_cycles: number;
    confirmed: boolean;
    tracked: boolean;
  }>(
    `with eligible as (${eligibleAccountsSql(true)})
     select a.id, a.account_id, a.opportunity_id, o.title, o.open_date::text as open_date,
            f.expected_open_start::text as expected_open_start, f.expected_open_end::text as expected_open_end,
            f.based_on_cycles, f.confirmed_at is not null as confirmed,
            ${STILL_TRACKED_SQL} as tracked
       from creator_opportunity_alerts a
       join eligible e on e.account_id = a.account_id
       join opportunities o on o.id = a.opportunity_id
       join opportunity_cycle_forecasts f on f.opportunity_id = a.opportunity_id
      where a.trigger_kind = 'days_before_open' and a.triggered_at is null
        and f.expected_open_start is not null
        and f.expected_open_start - a.lead_days <= $3::date
        and coalesce(f.expected_open_end, f.expected_open_start) >= $3::date
        and o.status not in (${OPEN_STATUSES})
        and (${STILL_TRACKED_SQL} or ${STILL_FOLLOWED_SQL})`,
    params,
  );
  for (const row of soon.rows) {
    const copy = opensSoonCopy(row, now);
    result.notices += await insertCycleNotice(db, {
      accountId: row.account_id,
      opportunityId: row.opportunity_id,
      kind: "opens-soon",
      title: copy.title,
      body: copy.body,
      reason: row.tracked ? "You saved this opportunity." : "You follow this organization.",
      dedupeKey: `opens-soon:${row.opportunity_id}:${row.expected_open_start}`,
      actionHref: opportunityHref(row.opportunity_id),
    });
    await db.query("update creator_opportunity_alerts set triggered_at = $2 where id = $1", [row.id, now.toISOString()]);
    result.opensSoon += 1;
  }

  const reopened = await db.query<{
    id: string;
    account_id: string;
    opportunity_id: string;
    title: string;
    open_date: string | null;
    deadline_date: string | null;
    tracked: boolean;
  }>(
    `with eligible as (${eligibleAccountsSql(true)})
     select a.id, a.account_id, a.opportunity_id, o.title, o.open_date::text as open_date, o.deadline_date::text as deadline_date,
            ${STILL_TRACKED_SQL} as tracked
       from creator_opportunity_alerts a
       join eligible e on e.account_id = a.account_id
       join opportunities o on o.id = a.opportunity_id
      where a.trigger_kind = 'on_open' and a.triggered_at is null
        and o.status in (${OPEN_STATUSES})
        and (o.open_date is null or o.open_date <= $3::date)
        and (o.deadline_date is null or o.deadline_date >= $3::date)
        and (${STILL_TRACKED_SQL} or ${STILL_FOLLOWED_SQL})`,
    params,
  );
  for (const row of reopened.rows) {
    const deadline = row.deadline_date ? shortDate(row.deadline_date, now) : null;
    result.notices += await insertCycleNotice(db, {
      accountId: row.account_id,
      opportunityId: row.opportunity_id,
      kind: "call-reopened",
      title: `${row.title} is open again`,
      body: deadline ? `Applications are open. The deadline is ${deadline}.` : "Applications are open.",
      reason: row.tracked ? "You saved this opportunity." : "You follow this organization.",
      dedupeKey: `call-reopened:${row.opportunity_id}:${row.deadline_date ?? row.open_date ?? today}`,
      actionHref: row.tracked ? trackerHref(row.opportunity_id) : opportunityHref(row.opportunity_id),
    });
    await db.query("update creator_opportunity_alerts set triggered_at = $2 where id = $1", [row.id, now.toISOString()]);
    result.reopened += 1;
  }
  return result;
}

export function opensSoonCopy(
  row: { title: string; open_date: string | null; expected_open_start: string; expected_open_end: string | null; based_on_cycles: number; confirmed: boolean },
  now = new Date(),
): { title: string; body: string } {
  const today = isoDay(now);
  if (row.confirmed && row.open_date && row.open_date >= today) {
    return {
      title: `${row.title} opens on ${shortDate(row.open_date, now)}`,
      body: "The source has confirmed the opening date.",
    };
  }
  const window = dateWindowLabel(row.expected_open_start, row.expected_open_end, now);
  return {
    title: `${row.title} may open soon`,
    body: `Based on ${row.based_on_cycles} past cycles, Missa expects it to open ${window}. This is a prediction until the source confirms the dates.`,
  };
}

export type CarrySuggestionResult = { notices: number };

/** Suggests carrying a call to its next cycle after it closed unsubmitted or was declined. */
export async function suggestCycleCarries(db: CycleDb, scope: Scope = {}): Promise<CarrySuggestionResult> {
  const result: CarrySuggestionResult = { notices: 0 };
  if (!(await relationsReady(db, ["creator_inbox_alerts", "opportunity_cycle_forecasts"]))) return result;
  const now = scope.now ?? new Date();
  const today = isoDay(now);
  const since = shiftIsoDate(today, -CARRY_LOOKBACK_DAYS);
  const rows = await db.query<{
    id: string;
    account_id: string;
    opportunity_id: string;
    status: string;
    title: string;
    deadline_date: string | null;
    expected_open_start: string | null;
    expected_open_end: string | null;
  }>(
    `select t.id, t.account_id, t.opportunity_id, t.status, o.title, o.deadline_date::text as deadline_date,
            f.expected_open_start::text as expected_open_start, f.expected_open_end::text as expected_open_end
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join opportunity_cycle_forecasts f on f.opportunity_id = o.id
      where ($1::text is null or t.account_id = $1)
        and (
          (t.status in (${PRE_SUBMISSION}) and o.deadline_date < $2::date and o.deadline_date >= $3::date)
          or (t.status = 'declined' and t.updated_at >= $3::date)
        )`,
    [scope.accountId ?? null, today, since],
  );
  for (const row of rows.rows) {
    const copy = carrySuggestionCopy(row, now);
    const dedupeKey =
      row.status === "declined"
        ? `cycle-carry-suggested:${row.id}:declined:${row.deadline_date ?? today.slice(0, 4)}`
        : `cycle-carry-suggested:${row.id}:${row.deadline_date}`;
    result.notices += await insertCycleNotice(db, {
      accountId: row.account_id,
      opportunityId: row.opportunity_id,
      kind: "cycle-carry-suggested",
      title: copy.title,
      body: copy.body,
      reason: "You saved this opportunity.",
      dedupeKey,
      actionHref: trackerHref(row.opportunity_id),
    });
  }
  return result;
}

export function carrySuggestionCopy(
  row: { status: string; title: string; deadline_date: string | null; expected_open_start: string | null; expected_open_end: string | null },
  now = new Date(),
): { title: string; body: string } {
  const window = dateWindowLabel(row.expected_open_start, row.expected_open_end, now);
  const next = window ? ` Missa expects the next round to open ${window}.` : "";
  if (row.status === "declined") {
    return {
      title: `Try ${row.title} again next cycle`,
      body: `You can carry your checklist and plan forward to the next cycle.${next}`,
    };
  }
  const passed = row.deadline_date ? ` on ${shortDate(row.deadline_date, now)}` : "";
  return {
    title: `Carry ${row.title} to the next cycle`,
    body: `The deadline passed${passed} before this was submitted. You can carry your checklist and plan forward.${next}`,
  };
}
