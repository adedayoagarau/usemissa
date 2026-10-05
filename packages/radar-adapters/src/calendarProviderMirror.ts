import type { Pool, PoolClient } from "pg";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";
import {
  PROVIDER_MIRROR_PURPOSES,
  queueCalendarSync,
  type ProviderMirrorPurpose,
} from "./creatorCalendarRepository.js";

/**
 * Google and Microsoft export for plan steps, stages, fee-tier closes and
 * forecasts.
 *
 * The provider export (calendar_sync_jobs, drained by the creator tick) only
 * delivers creator_calendar_events rows. For a creator with an active
 * calendar connection this keeps one row per dated source, with an id derived
 * from the source so every pass converges on the same set:
 *
 * - `plan-step:<obligationId>`: each open plan step (personal targets have
 *   their own row, mirrored from the Tracker by mirrorPersonalTarget).
 * - `stage:<trackedId>:<stageId>`: every stage while the application is being
 *   prepared; after submission only the stages that still lie ahead for the
 *   creator (shortlist, interview, notification, decision, event).
 * - `tier:<trackedId>:<tierId>`: each fee-tier close before the final
 *   deadline while the application is being prepared.
 * - `forecast:<trackedId>`: the predicted next cycle of a closed call, as one
 *   all-day range titled "Predicted: …".
 *
 * A changed date or title bumps the revision and queues an upsert; a source
 * that disappears, completes, is skipped or stops applying is deleted and
 * queues a delete. Rows that already exist are kept after their date passes,
 * so the provider copy is not removed just for being in the past; new rows
 * are only created for recent and upcoming dates.
 *
 * The in-app Calendar and the calendar feed read these sources directly and
 * leave the mirrored purposes out (PROVIDER_MIRROR_PURPOSES).
 */

type Db = Pool | PoolClient;

const PRE_SUBMISSION_SQL = "('interested','saved','preparing','draft-started','ready-to-submit')";
const AWAITING_SQL =
  "('submitted','received','in-review','longlisted','shortlisted','finalist','waitlisted','revision-requested')";
const AFTER_SUBMISSION_STAGES_SQL = "('shortlist','interview','notification','decision','event')";
const SOURCE_TABLES = {
  "plan-step": "creator_obligations",
  stage: "opportunity_stages",
  "tier-close": "opportunity_deadline_tiers",
  forecast: "opportunity_cycle_forecasts",
} as const satisfies Record<ProviderMirrorPurpose, string>;

type DesiredRow = {
  id: string;
  purpose: ProviderMirrorPurpose;
  title: string;
  description: string;
  /** First all-day date, YYYY-MM-DD. */
  startOn: string;
  /** Exclusive end date, YYYY-MM-DD (the day after the last day). */
  endOn: string;
  opportunityId: string | null;
  color: string;
};

export type CalendarMirrorAccountResult = {
  created: number;
  updated: number;
  deleted: number;
};

export type CalendarMirrorTickResult = CalendarMirrorAccountResult & {
  accounts: number;
  /** Mirrored rows removed for accounts whose connections are all revoked. */
  disconnectedRemoved: number;
  /** True when the account or time budget ran out first. */
  truncated: boolean;
  /** Set when the database does not have the mirror purposes yet (before 0088). */
  skipped?: "schema";
};

const EMPTY: CalendarMirrorAccountResult = { created: 0, updated: 0, deleted: 0 };
const title = (value: string) => (value.length > 200 ? `${value.slice(0, 199)}…` : value);
const withCall = (label: string, call: string | null) => title(call ? `${label} · ${call}` : label);

/**
 * The purposes this database can store and source, or an empty list when the
 * purpose check predates the mirror (migration 0088 not applied).
 */
export async function calendarProviderMirrorReady(db: Db): Promise<ProviderMirrorPurpose[]> {
  const result = await db.query<{ check_ready: boolean; connections: boolean; tables: string[] }>(
    `select coalesce((select bool_or(pg_get_constraintdef(c.oid) like '%plan-step%')
                        from pg_constraint c
                       where c.conrelid=to_regclass('public.creator_calendar_events')
                         and c.conname='creator_calendar_events_purpose_check'),false) check_ready,
            to_regclass('public.calendar_provider_connections') is not null connections,
            array(select name from unnest($1::text[]) as t(name) where to_regclass('public.'||name) is not null) tables`,
    [Object.values(SOURCE_TABLES)],
  );
  const row = result.rows[0];
  if (!row?.check_ready || !row.connections) return [];
  const tables = new Set(row.tables);
  return PROVIDER_MIRROR_PURPOSES.filter((purpose) => tables.has(SOURCE_TABLES[purpose]));
}

function money(cents: number, currency: string | null) {
  const amount = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return currency ? `${amount} ${currency.toUpperCase()}` : amount;
}

async function desiredRows(
  client: PoolClient,
  accountId: string,
  purposes: readonly ProviderMirrorPurpose[],
): Promise<DesiredRow[]> {
  const rows: DesiredRow[] = [];
  // An existing mirror row keeps its source in the set after the date passes.
  const mirrored = (idSql: string) =>
    `exists (select 1 from creator_calendar_events m where m.account_id=$1 and m.id=${idSql})`;
  if (purposes.includes("plan-step")) {
    const steps = await client.query<{
      id: string; label: string; call: string | null; opportunity_id: string | null; due_on: string; end_on: string;
    }>(
      `select 'plan-step:'||ob.id::text id,ob.label,o.title call,coalesce(ob.opportunity_id,t.opportunity_id) opportunity_id,
              ob.due_on::text due_on,(ob.due_on+1)::text end_on
         from creator_obligations ob
         left join tracked_opportunities t on t.id=ob.tracked_opportunity_id
         left join opportunities o on o.id=coalesce(ob.opportunity_id,t.opportunity_id)
        where ob.account_id=$1 and ob.state='open' and ob.kind<>'personal-target'
          and (ob.due_on>=current_date-30 or ${mirrored("'plan-step:'||ob.id::text")})`,
      [accountId],
    );
    for (const row of steps.rows)
      rows.push({
        id: row.id,
        purpose: "plan-step",
        title: withCall(row.label, row.call),
        description: "A step in your Missa plan. Change or complete it in your Tracker.",
        startOn: row.due_on,
        endOn: row.end_on,
        opportunityId: row.opportunity_id,
        color: "sage",
      });
  }
  if (purposes.includes("stage")) {
    const stages = await client.query<{
      id: string; label: string; call: string; opportunity_id: string; due_on: string; end_on: string; confidence: string;
    }>(
      `select 'stage:'||t.id||':'||s.id::text id,s.label,o.title call,t.opportunity_id,s.due_on::text due_on,
              (s.due_on+1)::text end_on,s.confidence
         from tracked_opportunities t
         join opportunities o on o.id=t.opportunity_id
         join opportunity_stages s on s.opportunity_id=o.id
        where t.account_id=$1 and ${canonicalPublicOpportunityPredicate("o")}
          and (t.status in ${PRE_SUBMISSION_SQL} or (t.status in ${AWAITING_SQL} and s.kind in ${AFTER_SUBMISSION_STAGES_SQL}))
          and (s.due_on>=current_date-30 or ${mirrored("'stage:'||t.id||':'||s.id::text")})`,
      [accountId],
    );
    for (const row of stages.rows)
      rows.push({
        id: row.id,
        purpose: "stage",
        title: withCall(row.label, row.call),
        description:
          row.confidence === "confirmed"
            ? "A stage of this call, from the official source."
            : "A stage of this call. The date is probable, so check the official page before relying on it.",
        startOn: row.due_on,
        endOn: row.end_on,
        opportunityId: row.opportunity_id,
        color: "blue",
      });
  }
  if (purposes.includes("tier-close")) {
    const tiers = await client.query<{
      id: string; label: string; call: string; opportunity_id: string; closes_on: string; end_on: string;
      fee_cents: number | null; fee_currency: string | null;
    }>(
      `select 'tier:'||t.id||':'||d.id::text id,d.label,o.title call,t.opportunity_id,d.closes_on::text closes_on,
              (d.closes_on+1)::text end_on,d.fee_cents,d.fee_currency
         from tracked_opportunities t
         join opportunities o on o.id=t.opportunity_id
         join opportunity_deadline_tiers d on d.opportunity_id=o.id
        where t.account_id=$1 and ${canonicalPublicOpportunityPredicate("o")} and t.status in ${PRE_SUBMISSION_SQL}
          and (o.deadline_date is null or d.closes_on<>o.deadline_date)
          and (d.closes_on>=current_date or ${mirrored("'tier:'||t.id||':'||d.id::text")})`,
      [accountId],
    );
    for (const row of tiers.rows)
      rows.push({
        id: row.id,
        purpose: "tier-close",
        title: withCall(`${row.label} closes`, row.call),
        description:
          row.fee_cents === null
            ? "The last day of this entry tier."
            : `The last day of this entry tier. Entry fee: ${money(row.fee_cents, row.fee_currency)}.`,
        startOn: row.closes_on,
        endOn: row.end_on,
        opportunityId: row.opportunity_id,
        color: "ochre",
      });
  }
  if (purposes.includes("forecast")) {
    const forecasts = await client.query<{
      id: string; call: string; opportunity_id: string; start_on: string; end_on: string;
      open_start: string | null; open_end: string | null; close: string | null; based_on_cycles: number;
    }>(
      `select 'forecast:'||t.id id,o.title call,t.opportunity_id,
              coalesce(f.expected_open_start,f.expected_close)::text start_on,
              (greatest(f.expected_open_start,f.expected_open_end,f.expected_close)+1)::text end_on,
              f.expected_open_start::text open_start,f.expected_open_end::text open_end,f.expected_close::text close,
              f.based_on_cycles
         from tracked_opportunities t
         join opportunities o on o.id=t.opportunity_id
         join opportunity_cycle_forecasts f on f.opportunity_id=o.id
        where t.account_id=$1 and ${canonicalPublicOpportunityPredicate("o")} and t.status<>'archived'
          and f.confirmed_at is null
          and (o.status in ('closed','archived') or o.deadline_date<current_date)
          and coalesce(f.expected_open_start,f.expected_close) is not null
          and (greatest(f.expected_open_start,f.expected_open_end,f.expected_close)>=current_date
               or ${mirrored("'forecast:'||t.id")})`,
      [accountId],
    );
    for (const row of forecasts.rows) {
      const parts = [
        row.open_start
          ? row.open_end && row.open_end > row.open_start
            ? `opening between ${row.open_start} and ${row.open_end}`
            : `opening around ${row.open_start}`
          : null,
        row.close ? `closing around ${row.close}` : null,
      ].filter(Boolean);
      rows.push({
        id: row.id,
        purpose: "forecast",
        title: title(`Predicted: ${row.call} next cycle`),
        description: `Predicted from ${row.based_on_cycles} past cycles: ${parts.join(", ")}. Missa shows this as predicted until the source confirms the dates.`,
        startOn: row.start_on,
        endOn: row.end_on,
        opportunityId: row.opportunity_id,
        color: "ink",
      });
    }
  }
  return rows;
}

/**
 * Brings one account's mirrored rows in line with their sources and queues
 * provider sync for every change. Does nothing for an account without an
 * active calendar connection. `purposes` narrows the pass (an obligation
 * edit only needs plan steps); rows of other purposes are left alone.
 */
export async function mirrorCalendarProviderAccount(
  pool: Pool,
  accountId: string,
  options: { purposes?: readonly ProviderMirrorPurpose[]; ready?: readonly ProviderMirrorPurpose[] } = {},
): Promise<CalendarMirrorAccountResult> {
  const ready = options.ready ?? (await calendarProviderMirrorReady(pool));
  const purposes = ready.filter((purpose) => !options.purposes || options.purposes.includes(purpose));
  if (!purposes.length) return { ...EMPTY };
  const client = await pool.connect();
  try {
    await client.query("begin");
    // One pass per account at a time: the tick and an obligation edit can race.
    await client.query("select pg_advisory_xact_lock(hashtext('calendar-provider-mirror:'||$1))", [accountId]);
    const connected = await client.query(
      "select 1 from calendar_provider_connections where account_id=$1 and status='active' limit 1",
      [accountId],
    );
    if (!connected.rowCount) {
      await client.query("commit");
      return { ...EMPTY };
    }
    const desired = await desiredRows(client, accountId, purposes);
    const result: CalendarMirrorAccountResult = { ...EMPTY };
    for (const row of desired) {
      // A recreated row continues past every revision already queued for its
      // id, so its upsert is not mistaken for an earlier one and dropped.
      const saved = await client.query<{ revision: number; inserted: boolean }>(
        `insert into creator_calendar_events
           (id,account_id,title,description,start_at,end_at,all_day,color,opportunity_id,purpose,revision)
         values ($1,$2,$3,$4,$5::date,$6::date,true,$7,$8,$9,
           1+coalesce((select max((regexp_match(j.dedupe_key,':([0-9]+)$'))[1]::int)
                         from calendar_sync_jobs j join calendar_provider_connections c on c.id=j.connection_id
                        where c.account_id=$2 and j.event_id=$1),0))
         on conflict (id) do update set title=excluded.title,description=excluded.description,
           start_at=excluded.start_at,end_at=excluded.end_at,color=excluded.color,opportunity_id=excluded.opportunity_id,
           revision=creator_calendar_events.revision+1,updated_at=now()
         where creator_calendar_events.account_id=excluded.account_id
           and creator_calendar_events.purpose=excluded.purpose
           and (creator_calendar_events.title,creator_calendar_events.description,creator_calendar_events.start_at,creator_calendar_events.end_at)
               is distinct from (excluded.title,excluded.description,excluded.start_at,excluded.end_at)
         returning revision,(xmax=0) inserted`,
        [row.id, accountId, row.title, row.description, row.startOn, row.endOn, row.color, row.opportunityId, row.purpose],
      );
      const changed = saved.rows[0];
      if (!changed) continue;
      await queueCalendarSync(client, accountId, row.id, "upsert", changed.revision);
      if (changed.inserted) result.created++;
      else result.updated++;
    }
    const removed = await client.query<{ id: string; revision: number }>(
      `delete from creator_calendar_events
        where account_id=$1 and purpose=any($2::text[]) and not (id=any($3::text[]))
        returning id,revision`,
      [accountId, purposes, desired.map((row) => row.id)],
    );
    for (const row of removed.rows) {
      await queueCalendarSync(client, accountId, row.id, "delete", row.revision + 1);
      result.deleted++;
    }
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The scheduled pass: mirrors up to `maxAccounts` connected accounts (a
 * different sample each minute, so every account is reached even when there
 * are more than the batch), stopping early when `timeBudgetMs` runs out, and
 * removes mirrored rows left behind by accounts that disconnected. Runs right
 * before the provider drain so this pass's changes go out in the same tick.
 */
export async function mirrorCalendarProviderEvents(
  pool: Pool,
  options: { accountId?: string; maxAccounts?: number; timeBudgetMs?: number; now?: () => number } = {},
): Promise<CalendarMirrorTickResult> {
  const now = options.now ?? Date.now;
  const deadline = options.timeBudgetMs === undefined ? Number.POSITIVE_INFINITY : now() + options.timeBudgetMs;
  const result: CalendarMirrorTickResult = { ...EMPTY, accounts: 0, disconnectedRemoved: 0, truncated: false };
  const ready = await calendarProviderMirrorReady(pool);
  if (!ready.length) return { ...result, skipped: "schema" };
  // A revoked (or removed) connection exports nothing and cannot delete, so
  // the rows are only clutter; a later connection mirrors afresh. A
  // connection waiting for reconnect keeps its rows so the provider copies can
  // still be updated or deleted once it is back.
  const stale = await pool.query(
    `delete from creator_calendar_events e
      where e.id in (
        select s.id from creator_calendar_events s
         where s.purpose=any($1::text[]) and ($2::text is null or s.account_id=$2)
           and not exists (select 1 from calendar_provider_connections c where c.account_id=s.account_id and c.status<>'revoked')
         limit 500)`,
    [[...PROVIDER_MIRROR_PURPOSES], options.accountId ?? null],
  );
  result.disconnectedRemoved = stale.rowCount ?? 0;
  const accounts = await pool.query<{ account_id: string }>(
    `select account_id from calendar_provider_connections
      where status='active' and ($1::text is null or account_id=$1)
      group by account_id
      order by md5(account_id||to_char(now(),'YYYYMMDDHH24MI'))
      limit $2`,
    [options.accountId ?? null, options.maxAccounts ?? 200],
  );
  for (const { account_id } of accounts.rows) {
    if (now() >= deadline) {
      result.truncated = true;
      break;
    }
    const pass = await mirrorCalendarProviderAccount(pool, account_id, { ready });
    result.accounts++;
    result.created += pass.created;
    result.updated += pass.updated;
    result.deleted += pass.deleted;
  }
  return result;
}
