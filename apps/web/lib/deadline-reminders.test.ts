import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { creatorPoolFor } from '@missa/radar-adapters';
import { CreatorReminderRepository, tickCreatorReminders } from './creator-reminders';
import { applyDefaultReminders, tickDeadlineReminders } from './deadline-reminders';

/**
 * Real-Postgres coverage for status-aware deadline reminders. Skipped without
 * DATABASE_URL or migration 0088. Dates are built from the database's UTC day
 * and every account uses UTC, so results do not depend on the wall clock
 * beyond the day boundary.
 */
const databaseUrl = process.env.DATABASE_URL;
const prefix = `d1-${randomBytes(4).toString('hex')}`;
const source = `${prefix}-source`;
let ready = false;
let counter = 0;

const pool = () => creatorPoolFor(databaseUrl!);
const q = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool().query<T>(sql, params)).rows;

before(async () => {
  if (!databaseUrl) return;
  const schema = await q<{ ready: boolean }>(`select to_regclass('public.creator_planning_preferences') is not null as ready`);
  ready = Boolean(schema[0]?.ready);
  if (!ready) return;
  await q(`insert into opportunity_sources(id,name,url,kind) values($1,'D1 fixture','https://example.invalid/d1','organization-website')`, [source]);
});

after(async () => {
  if (!databaseUrl) return;
  if (ready) {
    await q(`delete from workspace_command_receipts where actor_account_id like $1`, [`${prefix}%`]);
    await q(`delete from radar_accounts where id like $1`, [`${prefix}%`]);
    await q(`delete from opportunities where source_id=$1`, [source]);
    await q(`delete from opportunity_sources where id=$1`, [source]);
  }
  await pool().end();
});

/** A database test that skips at run time when the schema is missing. */
function dbTest(name: string, body: () => Promise<void>) {
  test(name, { skip: !databaseUrl }, async t => {
    if (!ready) { t.skip('migration 0088 is not applied to this database'); return; }
    await body();
  });
}

async function account(options: { plan?: 'plus' | 'pro'; cap?: number; quietDays?: number } = {}) {
  const id = `${prefix}-acct-${++counter}`;
  await q(`insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)`, [id, `${id}@example.invalid`]);
  await q(`insert into notification_preferences(account_id) values($1) on conflict do nothing`, [id]);
  await q(`update notification_preferences set timezone='UTC' where account_id=$1`, [id]);
  if (options.plan) await q(`insert into creator_plans(account_id,plan,source) values($1,$2,'grant')`, [id, options.plan]);
  if (options.cap || options.quietDays)
    await q(`insert into creator_planning_preferences(account_id,daily_notice_cap,gone_quiet_days) values($1,$2,$3)`, [id, options.cap ?? 3, options.quietDays ?? 21]);
  return id;
}

/** A published call with a confirmed deadline `days` from today (UTC). */
async function call(days: number | null, title = 'Fixture call') {
  const id = `${prefix}-opp-${++counter}`;
  // Publication gates need source evidence and reviewed content; the fixture
  // skips them within its own transaction (the test role is a superuser).
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query(`set local session_replication_role = replica`);
    await client.query(`insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
      values($1,$1,$2,$3,'open','published','grant',$4,case when $5::int is null then null else (now() at time zone 'UTC')::date+$5::int end)`,
      [id, title, source, days === null ? 'rolling' : 'exact', days]);
    await client.query('commit');
  } finally { client.release(); }
  return id;
}

async function track(accountId: string, opportunityId: string, status: string, extra: { lastActivityDaysAgo?: number; submittedDaysAgo?: number } = {}) {
  const id = `${prefix}-trk-${++counter}`;
  await q(`insert into tracked_opportunities(id,account_id,opportunity_id,status,last_activity_at,submitted_at)
    values($1,$2,$3,$4,now()-make_interval(days=>$5::int),case when $6::int is null then null else now()-make_interval(days=>$6::int) end)`,
    [id, accountId, opportunityId, status, extra.lastActivityDaysAgo ?? 0, extra.submittedDaysAgo ?? null]);
  return id;
}

const reminders = (accountId: string) => q<{ id: string; kind: string; subject_kind: string | null; subject_id: string | null; state: string; title: string; deadline_offset_days: number | null }>(
  `select id,kind,subject_kind,subject_id,state,title,deadline_offset_days from creator_application_reminders where account_id=$1 order by kind,subject_id`, [accountId]);
const alerts = (accountId: string) => q<{ kind: string; title: string; body: string; dedupe_key: string }>(
  `select kind,title,body,dedupe_key from creator_inbox_alerts where account_id=$1 order by created_at,kind`, [accountId]);
const makeDue = (accountId: string, kind: string) => q(`update creator_application_reminders set due_at=now()-interval '1 minute',snoozed_until=null where account_id=$1 and kind=$2 and state='scheduled'`, [accountId, kind]);

dbTest('saving a call in preparation adds the default deadline reminders once', async () => {
  const a = await account();
  const opp = await call(30);
  await track(a, opp, 'preparing');
  assert.deepEqual(await applyDefaultReminders(a, opp), { created: 2 });
  const rows = await reminders(a);
  assert.deepEqual(rows.map(r => [r.kind, r.subject_kind, r.subject_id, r.deadline_offset_days, r.title]), [
    ['deadline', null, 'offset:1', 1, 'Closes tomorrow'],
    ['deadline', null, 'offset:7', 7, 'Closes in a week'],
  ]);
  assert.deepEqual(await applyDefaultReminders(a, opp), { created: 0 }, 'a second save adds nothing');

  // The creator's own deadline reminder is still available alongside the defaults,
  // and replaces the default on the same day.
  const repository = new CreatorReminderRepository();
  await repository.create({ accountId: a, commandType: 'application-reminder.create', idempotencyKey: randomUUID(), expectedRevision: 0, requestHash: randomUUID(), correlationId: randomUUID() },
    { opportunityId: opp, kind: 'deadline', offsetDays: 7, timeOfDay: '10:00', timezone: 'UTC' });
  const after = await reminders(a);
  assert.equal(after.find(r => r.subject_id === null)?.state, 'scheduled');
  assert.equal(after.find(r => r.subject_id === 'offset:7')?.state, 'cancelled');
  assert.equal(after.find(r => r.subject_id === 'offset:1')?.state, 'scheduled');
  // A cancelled default stays cancelled on the next save.
  assert.deepEqual(await applyDefaultReminders(a, opp), { created: 0 });
});

dbTest('defaults skip offsets already past and calls without a confirmed deadline', async () => {
  const a = await account();
  const soon = await call(3);
  await track(a, soon, 'saved');
  assert.deepEqual(await applyDefaultReminders(a, soon), { created: 1 }, 'only the day-before reminder is still ahead');
  const rolling = await call(null);
  await track(a, rolling, 'saved');
  assert.equal((await applyDefaultReminders(a, rolling)).skipped, 'no-confirmed-deadline');
});

dbTest('submitted applications get no default reminders and lose the ones they had', async () => {
  const a = await account({ plan: 'plus' });
  const submitted = await call(30);
  await track(a, submitted, 'submitted');
  assert.deepEqual(await applyDefaultReminders(a, submitted), { created: 0, skipped: 'not-preparing' });

  const opp = await call(0);
  const tracked = await track(a, opp, 'preparing');
  await tickDeadlineReminders(a);
  assert.ok((await reminders(a)).some(r => r.kind === 'deadline-day' && r.state === 'scheduled'));
  await q(`update tracked_opportunities set status='submitted' where id=$1`, [tracked]);
  await tickDeadlineReminders(a);
  await tickCreatorReminders(a);
  assert.deepEqual((await reminders(a)).filter(r => r.state !== 'cancelled'), [], 'every reminder for the submitted call is cancelled');
  assert.deepEqual(await alerts(a), []);
});

dbTest('the deadline-day alarm follows the plan and the preference', async () => {
  const plus = await account({ plan: 'plus' });
  const free = await account();
  const off = await account({ plan: 'pro' });
  await q(`insert into creator_planning_preferences(account_id,deadline_day_alarm) values($1,false)`, [off]);
  const opp = await call(0, 'Closing grant');
  for (const a of [plus, free, off]) await track(a, opp, 'ready-to-submit');
  for (const a of [plus, free, off]) await tickDeadlineReminders(a);

  const rows = await reminders(plus);
  const alarm = rows.find(r => r.kind === 'deadline-day');
  assert.ok(alarm);
  assert.equal(alarm.subject_kind, 'escalation');
  assert.match(alarm.subject_id ?? '', /^deadline-day:\d{4}-\d{2}-\d{2}$/);
  assert.equal((await reminders(free)).length, 0, 'Free plans do not include the alarm');
  assert.equal((await reminders(off)).length, 0, 'the creator switched it off');

  await makeDue(plus, 'deadline-day');
  await tickCreatorReminders(plus);
  const delivered = await alerts(plus);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0]!.kind, 'deadline-day');
  assert.equal(delivered[0]!.title, 'Closes today');
  assert.equal(delivered[0]!.body, 'Closing grant');
  assert.match(delivered[0]!.dedupe_key, /^deadline-day:deadline-day:/);
  await tickDeadlineReminders(plus);
  assert.equal((await reminders(plus)).filter(r => r.kind === 'deadline-day').length, 1, 'one alarm per deadline day');
});

dbTest('a fee tier ending three days out is announced with the saving', async () => {
  const plus = await account({ plan: 'plus' });
  const free = await account();
  const opp = await call(40);
  await q(`insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,fee_cents,fee_currency,position) values
    ($1,'early','Early-bird',(now() at time zone 'UTC')::date+3,2500,'USD',0),
    ($1,'regular','Regular',(now() at time zone 'UTC')::date+40,4000,'USD',1)`, [opp]);
  await track(plus, opp, 'preparing');
  await track(free, opp, 'preparing');
  await tickDeadlineReminders(plus);
  await tickDeadlineReminders(free);
  const tier = (await reminders(plus)).find(r => r.kind === 'tier');
  assert.ok(tier);
  assert.equal(tier.subject_kind, 'tier');
  assert.match(tier.title, /^Early-bird closes [A-Z][a-z]+day, \$15 less than the regular fee$/);
  assert.equal((await reminders(free)).length, 0);

  await makeDue(plus, 'tier');
  await tickCreatorReminders(plus);
  const delivered = await alerts(plus);
  assert.deepEqual(delivered.map(a => a.kind), ['tier-ending']);
  assert.equal(delivered[0]!.title, tier.title);
});

dbTest('an obligation due tomorrow becomes a milestone reminder and stops when done', async () => {
  const a = await account();
  const opp = await call(30);
  const tracked = await track(a, opp, 'preparing');
  const [obligation] = await q<{ id: string }>(`insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on)
    values($1,$2,$3,'sub-deadline','Final draft',(now() at time zone 'UTC')::date+1) returning id`, [a, tracked, opp]);
  await tickDeadlineReminders(a);
  const milestone = (await reminders(a)).find(r => r.kind === 'milestone');
  assert.ok(milestone);
  assert.equal(milestone.subject_id, obligation!.id);
  assert.equal(milestone.title, 'Final draft is due tomorrow');

  await makeDue(a, 'milestone');
  await tickCreatorReminders(a);
  assert.deepEqual((await alerts(a)).map(x => x.kind), ['milestone-due']);

  const [second] = await q<{ id: string }>(`insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on)
    values($1,$2,$3,'sub-deadline','References',(now() at time zone 'UTC')::date) returning id`, [a, tracked, opp]);
  await tickDeadlineReminders(a);
  assert.equal((await reminders(a)).find(r => r.subject_id === second!.id)?.title, 'References is due today');
  await q(`update creator_obligations set state='done' where id=$1`, [second!.id]);
  await tickDeadlineReminders(a);
  assert.equal((await reminders(a)).find(r => r.subject_id === second!.id)?.state, 'cancelled');
});

dbTest('a quiet application gets one calm nudge per quiet period', async () => {
  const a = await account();
  const opp = await call(20, 'Quiet residency');
  await track(a, opp, 'preparing', { lastActivityDaysAgo: 25 });
  const active = await call(20);
  await track(a, active, 'preparing', { lastActivityDaysAgo: 2 });
  const first = await tickDeadlineReminders(a);
  assert.equal(first.goneQuiet, 1);
  const notices = await alerts(a);
  assert.equal(notices.length, 1);
  assert.equal(notices[0]!.kind, 'gone-quiet');
  assert.equal(notices[0]!.title, 'No activity in 3 weeks');
  assert.match(notices[0]!.body, /^Quiet residency closes [A-Z][a-z]{2} \d{1,2}(, \d{4})?\. Pick it up again when you're ready\.$/);
  const second = await tickDeadlineReminders(a);
  assert.equal(second.goneQuiet, 0);
  assert.equal((await alerts(a)).length, 1, 'no second nudge in the same period');
});

dbTest('the daily cap holds back extra notices; the deadline-day alarm is exempt', async () => {
  const a = await account({ plan: 'plus', cap: 1 });
  for (let i = 0; i < 3; i += 1) await track(a, await call(20), 'preparing', { lastActivityDaysAgo: 30 });
  const closing = await call(0);
  await track(a, closing, 'preparing');
  const result = await tickDeadlineReminders(a);
  assert.equal(result.goneQuiet, 1);
  assert.equal(result.capped, 2);
  await makeDue(a, 'deadline-day');
  await tickCreatorReminders(a);
  const kinds = (await alerts(a)).map(x => x.kind).sort();
  assert.deepEqual(kinds, ['deadline-day', 'gone-quiet']);
});

dbTest('a capped milestone waits for the next morning', async () => {
  const a = await account({ cap: 1 });
  const opp = await call(30);
  const tracked = await track(a, opp, 'preparing');
  await q(`insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on)
    values($1,$2,$3,'sub-deadline','Budget',(now() at time zone 'UTC')::date+1)`, [a, tracked, opp]);
  // The milestone reserves today's only slot, so the nudge waits.
  await tickDeadlineReminders(a);
  await makeDue(a, 'milestone');
  await q(`update tracked_opportunities set last_activity_at=now()-interval '30 days' where id=$1`, [tracked]);
  const reserved = await tickDeadlineReminders(a);
  assert.equal(reserved.goneQuiet, 0);
  await tickCreatorReminders(a);
  assert.deepEqual((await alerts(a)).map(x => x.kind), ['milestone-due']);

  // A second milestone the same day is held until tomorrow at 09:00.
  await q(`insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on)
    values($1,$2,$3,'sub-deadline','Letters',(now() at time zone 'UTC')::date+1)`, [a, tracked, opp]);
  await tickDeadlineReminders(a);
  await makeDue(a, 'milestone');
  const delivery = await tickCreatorReminders(a);
  assert.equal(delivery.capped, 1);
  const [held] = await q<{ snoozed_until: Date; state: string }>(`select snoozed_until,state from creator_application_reminders where account_id=$1 and title like 'Letters%'`, [a]);
  assert.equal(held!.state, 'scheduled');
  assert.equal(held!.snoozed_until.toISOString().slice(11, 16), '09:00');
});

dbTest('time to follow up uses only stated windows with known confidence', async () => {
  const a = await account();
  const stated = await call(null, 'Stated magazine');
  await q(`insert into opportunity_call_profiles(opportunity_id,response_time_days,confidence,source_url) values($1,30,'confirmed','https://example.invalid')`, [stated]);
  await track(a, stated, 'submitted', { submittedDaysAgo: 40 });
  const fabricated = await call(null, 'Unknown magazine');
  await q(`insert into opportunity_call_profiles(opportunity_id,response_time_days,confidence,source_url) values($1,10,'unknown','https://example.invalid')`, [fabricated]);
  await track(a, fabricated, 'submitted', { submittedDaysAgo: 40 });
  const result = await tickDeadlineReminders(a);
  assert.equal(result.timeToQuery, 1);
  const notices = await alerts(a);
  assert.equal(notices.length, 1);
  assert.equal(notices[0]!.kind, 'time-to-query');
  assert.equal(notices[0]!.title, 'Past the stated response time');
  assert.match(notices[0]!.body, /^You sent Stated magazine 40 days ago\./);
  assert.equal((await tickDeadlineReminders(a)).timeToQuery, 0, 'one notice per submission state');
});
