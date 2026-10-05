import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  calendarProviderMirrorReady,
  creatorCommandEnvelope,
  CreatorCalendarError,
  mirrorCalendarProviderAccount,
  mirrorCalendarProviderEvents,
  PostgresCreatorCalendarRepository,
  PROVIDER_MIRROR_PURPOSES,
} from "../src/index.js";

/**
 * Real-Postgres coverage for the provider export mirror: plan steps, stages,
 * fee-tier closes and forecasts become creator_calendar_events rows with
 * queued sync jobs for connected accounts only, follow their sources, and stay
 * out of the in-app Calendar's event list. Skipped without DATABASE_URL or
 * before migration 0088. Fixtures use a random prefix and are removed
 * afterwards; every pass is scoped to a fixture account.
 */
const databaseUrl = process.env.DATABASE_URL;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

type Fixture = {
  pool: Pool;
  calendar: PostgresCreatorCalendarRepository;
  account: (name: string, connected?: boolean) => Promise<string>;
  track: (account: string, name: string, deadline: string, status?: string) => Promise<{ opportunityId: string; trackedId: string }>;
  mirrored: (account: string) => Promise<Map<string, { title: string; start: string; end: string; revision: number; purpose: string }>>;
  jobs: (account: string) => Promise<Array<{ event_id: string; operation: string; dedupe_key: string }>>;
};

async function withFixtures(t: test.TestContext, run: (fixture: Fixture) => Promise<void>) {
  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  if (!(await calendarProviderMirrorReady(pool)).length) {
    await pool.end();
    t.skip("migration 0088 is not applied to this database");
    return;
  }
  const calendar = new PostgresCreatorCalendarRepository(pool);
  const prefix = `calmirror-${randomBytes(4).toString("hex")}`;
  const source = `${prefix}-source`;
  const accounts: string[] = [];
  await pool.query(
    "insert into opportunity_sources(id,name,url,kind) values($1,'Mirror fixture','https://example.invalid/mirror','organization-website')",
    [source],
  );
  try {
    await run({
      pool,
      calendar,
      account: async (name, connected = true) => {
        const id = `${prefix}-${name}`;
        await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [id, `${id}@example.invalid`]);
        accounts.push(id);
        if (connected)
          await calendar.connectProvider(id, {
            provider: "google",
            providerSubject: `${id}-subject`,
            refreshToken: "refresh",
            calendarId: "primary",
            scopes: ["calendar.events"],
          });
        return id;
      },
      track: async (account, name, deadline, status = "preparing") => {
        const opportunityId = `${prefix}-${name}`;
        const inserted = await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
           values($1,$1,$2,$3,'open','reviewable','residency','exact',$4::date,'https://example.invalid/submit') on conflict (id) do nothing`,
          [opportunityId, `Fixture ${name}`, source, deadline],
        );
        if (inserted.rowCount) {
          await pool.query(
            `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
             values($1,$2,$3,'organization-website','Mirror fixture','https://example.invalid/mirror',now(),now(),true,true)`,
            [`${opportunityId}-evidence`, opportunityId, source],
          );
          await pool.query(
            "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
            [opportunityId],
          );
          await pool.query("update opportunities set publication_state='published' where id=$1", [opportunityId]);
        }
        const trackedId = `${opportunityId}-${account}`;
        await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,$4)", [
          trackedId,
          account,
          opportunityId,
          status,
        ]);
        return { opportunityId, trackedId };
      },
      mirrored: async (account) =>
        new Map(
          (
            await pool.query<{ id: string; title: string; start: string; end: string; revision: number; purpose: string }>(
              `select id,title,to_char(start_at,'YYYY-MM-DD') start,to_char(end_at,'YYYY-MM-DD') "end",revision,purpose
                 from creator_calendar_events where account_id=$1 and purpose=any($2::text[])`,
              [account, [...PROVIDER_MIRROR_PURPOSES]],
            )
          ).rows.map((row) => [row.id, row]),
        ),
      jobs: async (account) =>
        (
          await pool.query<{ event_id: string; operation: string; dedupe_key: string }>(
            `select j.event_id,j.operation,j.dedupe_key from calendar_sync_jobs j
               join calendar_provider_connections c on c.id=j.connection_id where c.account_id=$1 order by j.created_at,j.dedupe_key`,
            [account],
          )
        ).rows,
    });
  } finally {
    for (const account of accounts) await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.query("delete from opportunities where source_id=$1", [source]);
    await pool.query("delete from opportunity_sources where id=$1", [source]);
    await pool.end();
  }
}

async function addStep(pool: Pool, account: string, trackedId: string, opportunityId: string, label: string, dueOn: string) {
  return (
    await pool.query<{ id: string }>(
      `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on)
       values($1,$2,$3,'sub-deadline',$4,$5::date) returning id::text`,
      [account, trackedId, opportunityId, label, dueOn],
    )
  ).rows[0]!.id;
}

test("connected accounts get one mirrored event per step, stage, tier close and forecast, with sync queued", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, account, track, mirrored, jobs }) => {
    const creator = await account("connected");
    const open = await track(creator, "open", day(40));
    const stepId = await addStep(pool, creator, open.trackedId, open.opportunityId, "Write the statement", day(20));
    await pool.query(
      `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on,state)
       values($1,$2,$3,'sub-deadline','Already done',$4::date,'done'),
             ($1,$2,$3,'personal-target','Own target',$4::date,'open')`,
      [creator, open.trackedId, open.opportunityId, day(15)],
    );
    const loi = (
      await pool.query<{ id: string }>(
        "insert into opportunity_stages(opportunity_id,kind,label,due_on) values($1,'letter-of-intent','Letter of intent',$2::date) returning id::text",
        [open.opportunityId, day(10)],
      )
    ).rows[0]!.id;
    const decision = (
      await pool.query<{ id: string }>(
        "insert into opportunity_stages(opportunity_id,kind,label,due_on) values($1,'decision','Decisions announced',$2::date) returning id::text",
        [open.opportunityId, day(90)],
      )
    ).rows[0]!.id;
    const early = (
      await pool.query<{ id: string }>(
        `insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,fee_cents,fee_currency)
         values($1,'early','Early bird',$2::date,2500,'usd') returning id::text`,
        [open.opportunityId, day(12)],
      )
    ).rows[0]!.id;
    // A tier on the final deadline is already the official-deadline event.
    await pool.query(
      "insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on) values($1,'regular','Regular',$2::date)",
      [open.opportunityId, day(40)],
    );
    const closed = await track(creator, "closed", day(20), "submitted");
    // Closing keeps the deadline (the publication gate allows only that change).
    await pool.query("update opportunities set status='closed' where id=$1", [closed.opportunityId]);
    await pool.query(
      `insert into opportunity_cycle_forecasts(opportunity_id,expected_open_start,expected_open_end,expected_close,confidence,based_on_cycles)
       values($1,$2::date,$3::date,$4::date,'medium',3)`,
      [closed.opportunityId, day(300), day(310), day(345)],
    );

    const first = await mirrorCalendarProviderAccount(pool, creator);
    assert.deepEqual(first, { created: 5, updated: 0, deleted: 0 });
    const rows = await mirrored(creator);
    assert.deepEqual([...rows.keys()].sort(), [
      `forecast:${closed.trackedId}`,
      `plan-step:${stepId}`,
      `stage:${open.trackedId}:${decision}`,
      `stage:${open.trackedId}:${loi}`,
      `tier:${open.trackedId}:${early}`,
    ].sort());
    assert.equal(rows.get(`plan-step:${stepId}`)!.title, "Write the statement · Fixture open");
    assert.equal(rows.get(`tier:${open.trackedId}:${early}`)!.title, "Early bird closes · Fixture open");
    const forecast = rows.get(`forecast:${closed.trackedId}`)!;
    assert.equal(forecast.title, "Predicted: Fixture closed next cycle");
    assert.equal(forecast.purpose, "forecast");
    assert.equal(forecast.start, day(300));
    assert.equal(forecast.end, day(346), "the range covers the predicted close day");
    const queued = await jobs(creator);
    assert.equal(queued.filter((job) => job.operation === "upsert" && !job.dedupe_key.startsWith("bootstrap:")).length, 5);

    // A second pass with nothing changed queues nothing.
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 0, updated: 0, deleted: 0 });
    assert.equal((await jobs(creator)).length, queued.length);

    // A moved step is updated in place with a new revision and upsert.
    await pool.query("update creator_obligations set due_on=$2::date where id::text=$1", [stepId, day(22)]);
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 0, updated: 1, deleted: 0 });
    const moved = (await mirrored(creator)).get(`plan-step:${stepId}`)!;
    assert.equal(moved.start, day(22));
    assert.equal(moved.revision, 2);
    assert.ok((await jobs(creator)).some((job) => job.dedupe_key === `upsert:plan-step:${stepId}:2`));

    // Completing the step deletes its event and queues the provider delete.
    await pool.query("update creator_obligations set state='done' where id::text=$1", [stepId]);
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 0, updated: 0, deleted: 1 });
    assert.ok(!(await mirrored(creator)).has(`plan-step:${stepId}`));
    assert.ok((await jobs(creator)).some((job) => job.dedupe_key === `delete:plan-step:${stepId}:3`));

    // Reopened, it comes back past every revision already queued, so the
    // provider receives it again.
    await pool.query("update creator_obligations set state='open' where id::text=$1", [stepId]);
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 1, updated: 0, deleted: 0 });
    assert.equal((await mirrored(creator)).get(`plan-step:${stepId}`)!.revision, 4);
    assert.ok((await jobs(creator)).some((job) => job.dedupe_key === `upsert:plan-step:${stepId}:4`));

    // Submitting drops the tier close and the letter of intent but keeps the
    // decision date the creator is now waiting for.
    await pool.query("update tracked_opportunities set status='submitted' where id=$1", [open.trackedId]);
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 0, updated: 0, deleted: 2 });
    const afterSubmit = await mirrored(creator);
    assert.ok(afterSubmit.has(`stage:${open.trackedId}:${decision}`));
    assert.ok(!afterSubmit.has(`stage:${open.trackedId}:${loi}`));
    assert.ok(!afterSubmit.has(`tier:${open.trackedId}:${early}`));

    // Untracking the closed call removes its forecast.
    await pool.query("delete from tracked_opportunities where id=$1", [closed.trackedId]);
    const tick = await mirrorCalendarProviderEvents(pool, { accountId: creator });
    assert.equal(tick.accounts, 1);
    assert.equal(tick.deleted, 1);
    assert.ok(!(await mirrored(creator)).has(`forecast:${closed.trackedId}`));
    assert.ok((await jobs(creator)).some((job) => job.dedupe_key === `delete:forecast:${closed.trackedId}:2`));
  });
});

test("nothing is mirrored for an account without a calendar connection", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, calendar, account, track, mirrored }) => {
    const creator = await account("unconnected", false);
    const open = await track(creator, "unconnected", day(30));
    await addStep(pool, creator, open.trackedId, open.opportunityId, "Ask referees", day(10));
    await pool.query(
      "insert into opportunity_stages(opportunity_id,kind,label,due_on) values($1,'interview','Interviews',$2::date)",
      [open.opportunityId, day(50)],
    );
    assert.deepEqual(await mirrorCalendarProviderAccount(pool, creator), { created: 0, updated: 0, deleted: 0 });
    const tick = await mirrorCalendarProviderEvents(pool, { accountId: creator });
    assert.equal(tick.accounts, 0);
    assert.equal((await mirrored(creator)).size, 0);

    // A revoked connection's leftovers are cleared by the scheduled pass.
    const connected = await account("revoked");
    const other = await track(connected, "revoked", day(30));
    await addStep(pool, connected, other.trackedId, other.opportunityId, "Draft", day(5));
    assert.equal((await mirrorCalendarProviderAccount(pool, connected)).created, 1);
    await calendar.revokeProvider(connected, "google");
    const cleanup = await mirrorCalendarProviderEvents(pool, { accountId: connected });
    assert.equal(cleanup.disconnectedRemoved, 1);
    assert.equal((await mirrored(connected)).size, 0);
  });
});

test("mirrored events stay out of the Calendar's event list and cannot be edited as personal events", { skip: !databaseUrl }, async (t) => {
  await withFixtures(t, async ({ pool, calendar, account, track }) => {
    const creator = await account("excluded");
    const open = await track(creator, "excluded", day(30));
    const stepId = await addStep(pool, creator, open.trackedId, open.opportunityId, "Record the sample", day(10));
    await mirrorCalendarProviderAccount(pool, creator);
    const eventId = `plan-step:${stepId}`;
    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 60 * 86_400_000);

    // The provider drain still reads the full list.
    assert.ok((await calendar.events(creator, from, to)).some((event) => event.id === eventId));
    // The Calendar route asks for the list without mirrored purposes.
    const shown = await calendar.events(creator, from, to, { excludePurposes: PROVIDER_MIRROR_PURPOSES });
    assert.ok(!shown.some((event) => event.id === eventId));
    assert.ok(!shown.some((event) => (PROVIDER_MIRROR_PURPOSES as readonly string[]).includes(event.purpose ?? "")));

    await assert.rejects(
      calendar.updateEvent(
        creatorCommandEnvelope(creator, "calendar-event.update", `${creator}-edit`, { id: eventId }, 1),
        eventId,
        { title: "Moved", startAt: `${day(11)}T00:00:00Z`, endAt: `${day(12)}T00:00:00Z`, allDay: true },
      ),
      (error: unknown) => error instanceof CreatorCalendarError && /Tracker/.test(error.message),
    );
    await assert.rejects(
      calendar.deleteEvent(creatorCommandEnvelope(creator, "calendar-event.delete", `${creator}-delete`, { id: eventId }, 1), eventId),
      (error: unknown) => error instanceof CreatorCalendarError,
    );
    const row = await pool.query<{ title: string }>("select title from creator_calendar_events where id=$1", [eventId]);
    assert.equal(row.rows[0]!.title, "Record the sample · Fixture excluded");
  });
});
