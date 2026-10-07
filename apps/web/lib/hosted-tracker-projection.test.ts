import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import { creatorPoolFor } from '@missa/radar-adapters';
import { projectHostedStatusToTracker } from './hosted-tracker-projection';

/**
 * Real-Postgres coverage for projecting Missa-hosted events onto the canonical
 * Tracker. Skipped without DATABASE_URL. Relational authority is switched on
 * for the duration of each test and restored afterwards.
 */
const databaseUrl = process.env.DATABASE_URL;
const prefix = `htp-${randomBytes(4).toString('hex')}`;
const source = `${prefix}-source`;
let counter = 0;

const pool = () => creatorPoolFor(databaseUrl!);
const q = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool().query<T>(sql, params)).rows;

before(async () => {
  if (!databaseUrl) return;
  await q(`insert into opportunity_sources(id,name,url,kind) values($1,'HTP fixture','https://example.invalid/htp','organization-website')`, [source]);
});

after(async () => {
  if (!databaseUrl) return;
  await q(`delete from workspace_command_receipts where actor_account_id like $1`, [`${prefix}%`]);
  await q(`delete from radar_accounts where id like $1`, [`${prefix}%`]);
  await q(`delete from opportunities where source_id=$1`, [source]);
  await q(`delete from opportunity_sources where id=$1`, [source]);
  await pool().end();
});

async function account() {
  const id = `${prefix}-acct-${++counter}`;
  await q(`insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)`, [id, `${id}@example.invalid`]);
  return id;
}

/** A published call, written outside the publication gates as the fixtures do. */
async function call() {
  const id = `${prefix}-opp-${++counter}`;
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query(`set local session_replication_role = replica`);
    await client.query(`insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
      values($1,$1,'Hosted call',$2,'open','published','grant','exact',(now() at time zone 'UTC')::date+30)`, [id, source]);
    await client.query('commit');
  } finally { client.release(); }
  return id;
}

const tracked = (accountId: string, opportunityId: string) => q<{ status: string; submitted_at: Date | null }>(
  `select status,submitted_at from tracked_opportunities where account_id=$1 and opportunity_id=$2`, [accountId, opportunityId]);
const events = (accountId: string) => q<{ to_status: string; source: string; note: string | null }>(
  `select to_status,source,note from tracked_status_events where account_id=$1 order by created_at`, [accountId]);

function withRelationalAuthority<T>(body: () => Promise<T>): Promise<T> {
  const previous = process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY;
  process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY = '1';
  return body().finally(() => {
    if (previous === undefined) delete process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY;
    else process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY = previous;
  });
}

test('a hosted submission reaches the canonical Tracker, saving the call first when needed', { skip: !databaseUrl }, () => withRelationalAuthority(async () => {
  const a = await account();
  const opp = await call();
  const submit = { accountId: a, opportunityId: opp, status: 'submitted' as const, source: 'user' as const, note: 'Missa submission sub-1', idempotencyKey: 'hosted-submission:sub-1:submitted' };
  assert.equal(await projectHostedStatusToTracker(submit), 'saved-and-updated');
  const [row] = await tracked(a, opp);
  assert.equal(row?.status, 'submitted');
  assert.ok(row?.submitted_at, 'submission sets submitted_at');

  // The save and the submission are two recorded events; the same hosted
  // event replayed records nothing new.
  assert.equal(await projectHostedStatusToTracker(submit), 'updated');
  assert.deepEqual((await events(a)).map(e => [e.to_status, e.source, e.note]), [
    ['interested', 'user', null],
    ['submitted', 'user', 'Missa submission sub-1'],
  ]);

  // A later decision on the same submission follows.
  assert.equal(await projectHostedStatusToTracker({ accountId: a, opportunityId: opp, status: 'declined', source: 'radar', note: 'Organization decision for Work w-1', idempotencyKey: 'hosted-decision:d-1' }), 'updated');
  assert.equal((await tracked(a, opp))[0]?.status, 'declined');
  assert.equal((await events(a)).length, 3);
}));

test('a call the creator already tracks is updated in place', { skip: !databaseUrl }, () => withRelationalAuthority(async () => {
  const a = await account();
  const opp = await call();
  await q(`insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')`, [`${prefix}-trk-${++counter}`, a, opp]);
  assert.equal(await projectHostedStatusToTracker({ accountId: a, opportunityId: opp, status: 'withdrawn', source: 'user', note: 'Missa submission sub-2', idempotencyKey: 'hosted-submission:sub-2:withdrawn' }), 'updated');
  assert.equal((await tracked(a, opp))[0]?.status, 'withdrawn');
}));

test('without relational authority the legacy store stays authoritative', { skip: !databaseUrl }, async () => {
  const previous = process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY;
  delete process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY;
  try {
    assert.equal(await projectHostedStatusToTracker({ accountId: 'nobody', opportunityId: 'nothing', status: 'submitted', source: 'user', note: 'x', idempotencyKey: 'x' }), 'skipped');
  } finally {
    if (previous !== undefined) process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY = previous;
  }
});
