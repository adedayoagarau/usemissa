/**
 * Deadline reminders that follow the application's status: default reminders
 * on save, the deadline-day alarm, fee-tier endings, obligation milestones,
 * the gone-quiet nudge and the time-to-follow-up notice.
 *
 * Reminder rows (deadline offsets, deadline-day, tier, milestone) are only
 * scheduled here; tickCreatorReminders delivers them through quiet hours and
 * the daily cap like every other reminder. Gone-quiet and time-to-follow-up
 * have no reminder kind, so this tick writes their Inbox notices directly,
 * outside quiet hours and within the same daily cap. The row scheme is
 * documented in deadline-reminder-copy.ts.
 */
import type { PoolClient } from 'pg';
import { creatorPoolFor, getPlanningPreferences, plansIncluding, type CreatorFeature } from '@missa/radar-adapters';
import { randomUUID } from 'node:crypto';
import { calendarDateIn, daysBetween } from './deadline-moment';
import { responseClock } from './response-clock';
import {
  AWAITING_STATUSES, CLOSED_STATUSES, DAILY_CAPPED_NOTICE_KINDS, PREPARING_STATUSES, PRE_SUBMISSION_STATUSES,
  defaultOffsetSubject, defaultOffsetTitle, goneQuietCopy, goneQuietDedupeKey, milestoneTitle, shouldNotifyResponseClock,
  tierEndingTitle, timeToQueryCopy, timeToQueryDedupeKey,
} from './deadline-reminder-copy';

export type DefaultRemindersResult = { created: number; skipped?: string };
export type DeadlineReminderTickResult = {
  processed: number;
  cancelled?: number;
  deadlineDay?: number;
  tiers?: number;
  milestones?: number;
  goneQuiet?: number;
  timeToQuery?: number;
  capped?: number;
  skipped?: string;
};

const list = (values: readonly string[]) => `(${values.map(v => `'${v}'`).join(',')})`;
const PRE = list(PRE_SUBMISSION_STATUSES);
const CLOSED = list(CLOSED_STATUSES);
/** The creator's zone from notification preferences, else UTC. Needs `p` joined (may be null). */
const ACCOUNT_TZ = `case when exists(select 1 from pg_timezone_names z where z.name=to_jsonb(p)->>'timezone') then to_jsonb(p)->>'timezone' else 'UTC' end`;
const UPSERT_TARGET = `(account_id,opportunity_id,kind,coalesce(subject_kind,''),coalesce(subject_id,''))`;

type Schema = { ready: boolean; plans: boolean; tiers: boolean; obligations: boolean; telemetry: boolean };

/** Deploys can reach a database before migration 0088; every step checks what exists. */
async function readSchema(client: PoolClient): Promise<Schema> {
  const row = (await client.query<Schema>(`select
      (to_regclass('public.creator_planning_preferences') is not null and exists(select 1 from information_schema.columns
        where table_schema=current_schema() and table_name='creator_application_reminders' and column_name='subject_id')) as ready,
      to_regclass('public.creator_plans') is not null as plans,
      to_regclass('public.opportunity_deadline_tiers') is not null as tiers,
      to_regclass('public.creator_obligations') is not null as obligations,
      (to_regclass('public.missa_submission_telemetry') is not null and to_regclass('public.opportunity_profile_links') is not null) as telemetry`)).rows[0];
  return row ?? { ready: false, plans: false, tiers: false, obligations: false, telemetry: false };
}

/** SQL that is true when the account behind `accountColumn` has a plan including `feature`; `$param` holds the plan list. */
function planFilter(schema: Schema, accountColumn: string, param: string): string {
  return schema.plans
    ? `coalesce((select cp.plan from creator_plans cp where cp.account_id=${accountColumn} and (cp.expires_at is null or cp.expires_at>now())),'free') = any(${param}::text[])`
    : `'free' = any(${param}::text[])`;
}
const plans = (feature: CreatorFeature) => plansIncluding(feature) as string[];

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || undefined;
}

/**
 * Called after a call is saved to the Tracker. While the application is
 * before submission and the call has a published, confirmed deadline, adds
 * one deadline reminder per default offset (creator_planning_preferences,
 * default 7 and 1 days before) at 09:00 in the creator's zone, skipping any
 * that would land in the past or after the call closes. A default the creator
 * cancelled stays cancelled; one that was already delivered is re-armed only
 * for a new deadline date. Never throws for missing data.
 */
export async function applyDefaultReminders(accountId: string, opportunityId: string): Promise<DefaultRemindersResult> {
  const url = databaseUrl();
  if (!url) return { created: 0, skipped: 'no-database' };
  const client = await creatorPoolFor(url).connect();
  try {
    const schema = await readSchema(client);
    if (!schema.ready) return { created: 0, skipped: 'schema' };
    await client.query('begin');
    const row = (await client.query<{ status: string; deadline: string | null; deadline_kind: string; publication_state: string; deadline_time: Date | null; deadline_timezone: string | null; tz: string }>(
      `select t.status,o.deadline_date::text as deadline,o.deadline_kind,o.publication_state,o.deadline_time,o.deadline_timezone,${ACCOUNT_TZ} as tz
         from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
         left join notification_preferences p on p.account_id=t.account_id
        where t.account_id=$1 and t.opportunity_id=$2 for update of t`, [accountId, opportunityId])).rows[0];
    const skip = async (reason: string) => { await client.query('rollback'); return { created: 0, skipped: reason }; };
    if (!row) return await skip('not-tracked');
    if (!(PRE_SUBMISSION_STATUSES as readonly string[]).includes(row.status)) return await skip('not-preparing');
    if (!row.deadline || !['fixed', 'exact'].includes(row.deadline_kind) || row.publication_state !== 'published') return await skip('no-confirmed-deadline');
    const preferences = await getPlanningPreferences(client, accountId);
    const own = (await client.query<{ offset: number | null }>(
      `select deadline_offset_days as offset from creator_application_reminders
        where account_id=$1 and opportunity_id=$2 and kind='deadline' and subject_kind is null and subject_id is null and state in ('scheduled','needs-review')`,
      [accountId, opportunityId])).rows[0];
    let created = 0;
    for (const offset of preferences.defaultDeadlineOffsets) {
      if (own && own.offset === offset) continue;
      const inserted = await client.query(
        `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,deadline_offset_days,source_deadline,subject_id)
         select $1,$2,'deadline',$3,$4,d.due,$5,$6::date,$7
           from (select ((($6::date-$5::int)::timestamp+time '09:00') at time zone $4) as due) d
          where d.due > now() and d.due < coalesce($8::timestamptz,(($6::date+1)::timestamp at time zone coalesce($9::text,$4)))
         on conflict ${UPSERT_TARGET} do update set due_at=excluded.due_at,title=excluded.title,timezone=excluded.timezone,
           source_deadline=excluded.source_deadline,deadline_offset_days=excluded.deadline_offset_days,state='scheduled',snoozed_until=null,
           revision=creator_application_reminders.revision+1,updated_at=now()
          where creator_application_reminders.state in ('delivered','expired','suppressed')
            and creator_application_reminders.source_deadline is distinct from excluded.source_deadline
         returning id`,
        [accountId, opportunityId, defaultOffsetTitle(offset), row.tz, offset, row.deadline, defaultOffsetSubject(offset), row.deadline_time, row.deadline_timezone]);
      created += inserted.rowCount ?? 0;
    }
    await client.query('commit');
    return { created };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    console.error('[deadline-reminders] default reminders failed', error instanceof Error ? error.message : error);
    return { created: 0, skipped: 'failed' };
  } finally {
    client.release();
  }
}

/**
 * Capped notices the account may still receive today in its own zone: the
 * daily cap (default 3) less tier-ending, milestone, gone-quiet and
 * time-to-follow-up notices already created today. With `reservePending`,
 * tier and milestone reminders already due also count, so they keep priority
 * over the nudges this tick writes directly.
 */
export async function dailyNoticeBudget(client: Pick<PoolClient, 'query'>, accountId: string, timezone: string, reservePending = false): Promise<number> {
  const row = (await client.query<{ left: number }>(
    `select coalesce((select daily_notice_cap from creator_planning_preferences where account_id=$1),3)
          - (select count(*)::int from creator_inbox_alerts where account_id=$1 and kind=any($3::text[])
              and created_at >= ((now() at time zone $2)::date)::timestamp at time zone $2)
          - case when $4::boolean then (select count(*)::int from creator_application_reminders where account_id=$1 and state='scheduled'
              and kind in ('tier','milestone') and coalesce(snoozed_until,due_at)<=now()) else 0 end as left`,
    [accountId, timezone, DAILY_CAPPED_NOTICE_KINDS, reservePending])).rows[0];
  return row?.left ?? 0;
}

type AccountContext = { tz: string; today: string; allowed: boolean; quiet: boolean; budget: number };

async function accountContext(client: PoolClient, accountId: string): Promise<AccountContext | undefined> {
  const row = (await client.query<Omit<AccountContext, 'budget'>>(
    `select x.tz,(now() at time zone x.tz)::date::text as today,coalesce(p.in_app_enabled and p.reminder_enabled,false) as allowed,
            case when q.qs is null or q.qe is null then false when q.qs<q.qe then q.m>=q.qs and q.m<q.qe else q.m>=q.qs or q.m<q.qe end as quiet
       from radar_accounts a left join notification_preferences p on p.account_id=a.id
       cross join lateral (select ${ACCOUNT_TZ} as tz) x
       cross join lateral (select (to_jsonb(p)->>'quiet_hours_start_minute')::int as qs,(to_jsonb(p)->>'quiet_hours_end_minute')::int as qe,
            (extract(hour from now() at time zone x.tz)*60+extract(minute from now() at time zone x.tz))::int as m) q
      where a.id=$1`, [accountId])).rows[0];
  if (!row) return undefined;
  return { ...row, budget: await dailyNoticeBudget(client, accountId, row.tz, true) };
}

async function insertNotice(client: PoolClient, notice: { accountId: string; opportunityId: string; kind: string; title: string; body: string; reason: string; dedupeKey: string; href: string }): Promise<boolean> {
  const inserted = await client.query(
    `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
     values($1,$2,$3,$4,$5,$6,$7,$8,'in-app',$9) on conflict do nothing returning id`,
    [randomUUID(), notice.accountId, notice.opportunityId, notice.kind, notice.title, notice.body, notice.reason, notice.dedupeKey, notice.href]);
  return Boolean(inserted.rowCount);
}

async function noticeExists(client: PoolClient, accountId: string, dedupeKey: string): Promise<boolean> {
  return Boolean((await client.query('select 1 from creator_inbox_alerts where account_id=$1 and dedupe_key=$2', [accountId, dedupeKey])).rowCount);
}

/** Cancels Missa's reminder rows that no longer apply. */
async function cancelInapplicable(client: PoolClient, schema: Schema, accountId: string | null): Promise<number> {
  const cancel = `update creator_application_reminders r set state='cancelled',due_at=null,snoozed_until=null,revision=r.revision+1,updated_at=now()`;
  let cancelled = 0;
  // The application moved on (submitted, decided, removed), the call lost its
  // confirmed deadline, or the deadline moved to another day.
  cancelled += (await client.query(`${cancel}
      where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and r.kind in ('deadline-day','tier')
        and not exists(select 1 from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
          where t.account_id=r.account_id and t.opportunity_id=r.opportunity_id and t.status in ${PRE} and o.publication_state='published'
            and (r.kind<>'deadline-day' or (o.deadline_kind in ('fixed','exact') and o.deadline_date=r.source_deadline)))`, [accountId])).rowCount ?? 0;
  // The deadline-day alarm was switched off or the plan no longer includes it.
  cancelled += (await client.query(`${cancel}
      where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and r.kind='deadline-day'
        and (exists(select 1 from creator_planning_preferences pp where pp.account_id=r.account_id and not pp.deadline_day_alarm)
          or not (${planFilter(schema, 'r.account_id', '$2')}))`, [accountId, plans('deadlineDayAlarm')])).rowCount ?? 0;
  cancelled += (await client.query(`${cancel}
      where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and r.kind='tier'
        and not (${planFilter(schema, 'r.account_id', '$2')})`, [accountId, plans('feeTierAlerts')])).rowCount ?? 0;
  if (schema.tiers)
    cancelled += (await client.query(`${cancel}
        where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and r.kind='tier'
          and not exists(select 1 from opportunity_deadline_tiers d where d.id::text=r.subject_id and d.closes_on=r.source_deadline)`, [accountId])).rowCount ?? 0;
  if (schema.obligations)
    // Pre-submission steps stop with submission; obligations after acceptance
    // continue unless the application closed. A done, skipped or moved
    // obligation cancels its reminder; a new date re-arms it on the next pass.
    cancelled += (await client.query(`${cancel}
        where ($1::text is null or r.account_id=$1) and r.state in ('scheduled','needs-review') and r.kind='milestone'
          and not exists(select 1 from creator_obligations ob join tracked_opportunities t on t.account_id=ob.account_id and t.id=ob.tracked_opportunity_id
            where ob.id::text=r.subject_id and ob.state='open' and ob.due_on=r.source_deadline
              and (t.status in ${PRE} or (ob.kind='obligation' and t.status not in ${CLOSED})))`, [accountId])).rowCount ?? 0;
  return cancelled;
}

/** Deadline-day alarm (Plus): 08:00 on the deadline day in the creator's zone, ahead of the close. */
async function scheduleDeadlineDay(client: PoolClient, schema: Schema, accountId: string | null): Promise<number> {
  const result = await client.query(
    `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,source_deadline,subject_kind,subject_id)
     select t.account_id,t.opportunity_id,'deadline-day','Closes today',x.tz,
            least(((o.deadline_date::timestamp+time '08:00') at time zone x.tz), c.closes_at-interval '3 hours'),
            o.deadline_date,'escalation','deadline-day:'||o.deadline_date::text
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join notification_preferences p on p.account_id=t.account_id
       left join creator_planning_preferences pp on pp.account_id=t.account_id
       cross join lateral (select ${ACCOUNT_TZ} as tz) x
       cross join lateral (select coalesce(o.deadline_time,((o.deadline_date+1)::timestamp at time zone coalesce(o.deadline_timezone,x.tz))) as closes_at) c
      where ($1::text is null or t.account_id=$1) and t.status in ${PRE}
        and o.publication_state='published' and o.deadline_kind in ('fixed','exact') and o.deadline_date is not null
        and o.deadline_date-(now() at time zone x.tz)::date between 0 and 1
        and c.closes_at > now() and coalesce(pp.deadline_day_alarm,true)
        and ${planFilter(schema, 't.account_id', '$2')}
     on conflict ${UPSERT_TARGET} do nothing`, [accountId, plans('deadlineDayAlarm')]);
  return result.rowCount ?? 0;
}

/** Fee tier ending (Plus): three days before a tier closes when a later tier costs more. */
async function scheduleTierEndings(client: PoolClient, schema: Schema, accountId: string | null): Promise<number> {
  if (!schema.tiers) return 0;
  const candidates = await client.query<{ account_id: string; opportunity_id: string; tier_id: string; label: string; closes_on: string; fee_cents: number; currency: string; next_label: string; next_fee: number; tz: string; today: string }>(
    `select t.account_id,t.opportunity_id,d.id::text as tier_id,d.label,d.closes_on::text as closes_on,d.fee_cents,coalesce(d.fee_currency,'USD') as currency,
            n.label as next_label,n.fee_cents as next_fee,x.tz,(now() at time zone x.tz)::date::text as today
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       join opportunity_deadline_tiers d on d.opportunity_id=t.opportunity_id
       left join notification_preferences p on p.account_id=t.account_id
       cross join lateral (select ${ACCOUNT_TZ} as tz) x
       join lateral (select d2.label,d2.fee_cents from opportunity_deadline_tiers d2
          where d2.opportunity_id=d.opportunity_id and d2.closes_on>d.closes_on and d2.fee_cents>d.fee_cents
            and coalesce(d2.fee_currency,'USD')=coalesce(d.fee_currency,'USD')
          order by d2.closes_on,d2.position limit 1) n on true
      where ($1::text is null or t.account_id=$1) and t.status in ${PRE} and o.publication_state='published'
        and d.fee_cents is not null and d.closes_on-(now() at time zone x.tz)::date between 0 and 3
        and coalesce(d.closes_at,((d.closes_on+1)::timestamp at time zone coalesce(d.timezone,o.deadline_timezone,x.tz))) > now()
        and ${planFilter(schema, 't.account_id', '$2')}
      limit 500`, [accountId, plans('feeTierAlerts')]);
  let scheduled = 0;
  for (const c of candidates.rows) {
    const title = tierEndingTitle({ label: c.label, closesOn: c.closes_on, today: c.today, feeCents: c.fee_cents, nextLabel: c.next_label, nextFeeCents: c.next_fee, currency: c.currency });
    const inserted = await client.query(
      `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,source_deadline,subject_kind,subject_id)
       values($1,$2,'tier',$3,$4,((($5::date-3)::timestamp+time '09:00') at time zone $4),$5::date,'tier',$6)
       on conflict ${UPSERT_TARGET} do update set title=excluded.title,due_at=excluded.due_at,source_deadline=excluded.source_deadline,timezone=excluded.timezone,
         state='scheduled',snoozed_until=null,revision=creator_application_reminders.revision+1,updated_at=now()
        where creator_application_reminders.source_deadline is distinct from excluded.source_deadline
       returning id`, [c.account_id, c.opportunity_id, title, c.tz, c.closes_on, c.tier_id]);
    scheduled += inserted.rowCount ?? 0;
  }
  return scheduled;
}

/** Milestones: an open obligation due tomorrow or today, announced at 09:00 the day before. */
async function scheduleMilestones(client: PoolClient, schema: Schema, accountId: string | null): Promise<number> {
  if (!schema.obligations) return 0;
  const candidates = await client.query<{ account_id: string; opportunity_id: string; obligation_id: string; label: string; due_on: string; tz: string; today: string }>(
    `select ob.account_id,t.opportunity_id,ob.id::text as obligation_id,ob.label,ob.due_on::text as due_on,x.tz,(now() at time zone x.tz)::date::text as today
       from creator_obligations ob join tracked_opportunities t on t.account_id=ob.account_id and t.id=ob.tracked_opportunity_id
       left join notification_preferences p on p.account_id=ob.account_id
       cross join lateral (select ${ACCOUNT_TZ} as tz) x
      where ($1::text is null or ob.account_id=$1) and ob.state='open'
        and (t.status in ${PRE} or (ob.kind='obligation' and t.status not in ${CLOSED}))
        and ob.due_on-(now() at time zone x.tz)::date between 0 and 1
        and coalesce(ob.due_at,((ob.due_on+1)::timestamp at time zone coalesce(ob.timezone,x.tz))) > now()
      limit 500`, [accountId]);
  let scheduled = 0;
  for (const c of candidates.rows) {
    const inserted = await client.query(
      `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,source_deadline,subject_kind,subject_id)
       values($1,$2,'milestone',$3,$4,((($5::date-1)::timestamp+time '09:00') at time zone $4),$5::date,'obligation',$6)
       on conflict ${UPSERT_TARGET} do update set title=excluded.title,due_at=excluded.due_at,source_deadline=excluded.source_deadline,timezone=excluded.timezone,
         state='scheduled',snoozed_until=null,revision=creator_application_reminders.revision+1,updated_at=now()
        where creator_application_reminders.source_deadline is distinct from excluded.source_deadline
       returning id`, [c.account_id, c.opportunity_id, milestoneTitle(c.label, c.due_on, c.today), c.tz, c.due_on, c.obligation_id]);
    scheduled += inserted.rowCount ?? 0;
  }
  return scheduled;
}

class Accounts {
  private readonly cache = new Map<string, AccountContext | undefined>();
  capped = 0;
  constructor(private readonly client: PoolClient) {}
  async get(accountId: string) {
    if (!this.cache.has(accountId)) this.cache.set(accountId, await accountContext(this.client, accountId));
    return this.cache.get(accountId);
  }
  /** True when a capped notice may go out now; otherwise it waits for a later pass. */
  async admit(accountId: string) {
    const account = await this.get(accountId);
    if (!account || !account.allowed || account.quiet) return undefined;
    if (account.budget <= 0) { this.capped += 1; return undefined; }
    return account;
  }
}

/** Gone quiet: no Tracker activity for gone_quiet_days while preparing, with the deadline still ahead. */
async function tickGoneQuiet(client: PoolClient, accounts: Accounts, accountId: string | null): Promise<number> {
  const candidates = await client.query<{ tracked_id: string; account_id: string; opportunity_id: string; title: string; deadline: string; last_activity_at: Date; period: number }>(
    `select t.id as tracked_id,t.account_id,t.opportunity_id,o.title,o.deadline_date::text as deadline,t.last_activity_at,coalesce(pp.gone_quiet_days,21)::int as period
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join creator_planning_preferences pp on pp.account_id=t.account_id
      where ($1::text is null or t.account_id=$1) and t.status in ${list(PREPARING_STATUSES)}
        and t.last_activity_at < now()-make_interval(days=>coalesce(pp.gone_quiet_days,21)::int)
        and o.deadline_date is not null and o.deadline_date >= current_date-1
      order by t.last_activity_at limit 500`, [accountId]);
  let sent = 0;
  for (const c of candidates.rows) {
    const known = await accounts.get(c.account_id);
    if (!known || (daysBetween(known.today, c.deadline) ?? -1) < 0) continue;
    const lastOn = calendarDateIn(new Date(c.last_activity_at), known.tz);
    const quietDays = daysBetween(lastOn, known.today) ?? 0;
    const dedupeKey = goneQuietDedupeKey(c.tracked_id, lastOn, quietDays, c.period);
    if (await noticeExists(client, c.account_id, dedupeKey)) continue;
    const account = await accounts.admit(c.account_id);
    if (!account) continue;
    const copy = goneQuietCopy({ applicationTitle: c.title, periodDays: c.period, deadline: c.deadline });
    if (await insertNotice(client, { accountId: c.account_id, opportunityId: c.opportunity_id, kind: 'gone-quiet', ...copy,
      dedupeKey, href: `/tracker?view=saved&application=${encodeURIComponent(c.opportunity_id)}` })) {
      account.budget -= 1; sent += 1;
    }
  }
  return sent;
}

/**
 * Time to follow up: submitted applications past the organization's stated
 * response window (only from call profiles with known confidence) or past
 * what at least five Missa creators observed. One notice per submission and
 * status and clock state.
 */
async function tickTimeToQuery(client: PoolClient, schema: Schema, accounts: Accounts, accountId: string | null): Promise<number> {
  const observed = schema.telemetry
    ? `left join lateral (select count(*)::int as n,percentile_cont(0.5) within group (order by m.response_days) as p50,
          percentile_cont(0.9) within group (order by m.response_days) as p90
         from missa_submission_telemetry m join opportunity_profile_links l on l.profile_id=m.profile_id
        where l.opportunity_id=o.id and l.status='confirmed' and m.response_days is not null and m.response_days>=0) obs on true`
    : `left join lateral (select 0 as n,null::float8 as p50,null::float8 as p90) obs on true`;
  const candidates = await client.query<{ tracked_id: string; account_id: string; opportunity_id: string; status: string; title: string; organization_name: string; submitted_at: Date; stated: number | null; n: number; p50: number | null; p90: number | null }>(
    `select t.id as tracked_id,t.account_id,t.opportunity_id,t.status,o.title,coalesce(org.data->>'name','the organization') as organization_name,
            t.submitted_at,cprof.response_time_days as stated,obs.n,obs.p50,obs.p90
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join opportunity_call_profiles cprof on cprof.opportunity_id=o.id and cprof.confidence<>'unknown' and cprof.response_time_days>0
       ${observed}
      where ($1::text is null or t.account_id=$1) and t.status in ${list(AWAITING_STATUSES)} and t.submitted_at is not null
        and (cprof.response_time_days is not null or obs.n>=5)
      order by t.submitted_at limit 500`, [accountId]);
  let sent = 0;
  for (const c of candidates.rows) {
    const account = await accounts.get(c.account_id);
    if (!account) continue;
    const submittedOn = calendarDateIn(new Date(c.submitted_at), account.tz);
    const clock = responseClock({
      submittedOn,
      today: account.today,
      statedDays: c.stated,
      observed: c.n >= 5 && c.p50 !== null && c.p90 !== null ? { p50Days: Math.round(c.p50), p90Days: Math.round(c.p90), sampleSize: c.n } : null,
    });
    if (!shouldNotifyResponseClock(clock)) continue;
    const dedupeKey = timeToQueryDedupeKey(c.tracked_id, c.status, submittedOn, clock.state);
    if (await noticeExists(client, c.account_id, dedupeKey)) continue;
    if (!(await accounts.admit(c.account_id))) continue;
    const copy = timeToQueryCopy({ applicationTitle: c.title, organizationName: c.organization_name, clock });
    if (await insertNotice(client, { accountId: c.account_id, opportunityId: c.opportunity_id, kind: 'time-to-query', ...copy,
      dedupeKey, href: `/tracker?view=awaiting&application=${encodeURIComponent(c.opportunity_id)}` })) {
      account.budget -= 1; sent += 1;
    }
  }
  return sent;
}

/**
 * One pass over deadline reminders, before the reminder delivery tick:
 * cancel rows that no longer apply, schedule the deadline-day alarm, fee-tier
 * endings and milestones, then write gone-quiet and time-to-follow-up notices.
 */
export async function tickDeadlineReminders(accountId?: string): Promise<DeadlineReminderTickResult> {
  const url = databaseUrl();
  if (!url) return { processed: 0, skipped: 'no-database' };
  const client = await creatorPoolFor(url).connect();
  try {
    const schema = await readSchema(client);
    if (!schema.ready) return { processed: 0, skipped: 'schema' };
    const account = accountId ?? null;
    await client.query('begin');
    const cancelled = await cancelInapplicable(client, schema, account);
    const deadlineDay = await scheduleDeadlineDay(client, schema, account);
    const tiers = await scheduleTierEndings(client, schema, account);
    const milestones = await scheduleMilestones(client, schema, account);
    const accounts = new Accounts(client);
    const goneQuiet = await tickGoneQuiet(client, accounts, account);
    const timeToQuery = await tickTimeToQuery(client, schema, accounts, account);
    await client.query('commit');
    return {
      processed: deadlineDay + tiers + milestones + goneQuiet + timeToQuery,
      cancelled, deadlineDay, tiers, milestones, goneQuiet, timeToQuery, capped: accounts.capped,
    };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
