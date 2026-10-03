import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  CALENDAR_SYNC_MAX_ATTEMPTS,
  PostgresCreatorCalendarRepository,
} from "../src/index.js";

/**
 * Real-Postgres coverage for calendar provider sync leasing: abandoned leases
 * are recovered, retries stop at the attempt cap, a rejected grant parks the
 * connection for reconnect, and rotated refresh tokens are persisted
 * encrypted. Runs in CI's target-schema job; skipped without DATABASE_URL or
 * when the creator schema is absent. Fixtures use a random prefix and are
 * removed afterwards. Every lease is scoped to the fixture account so a shared
 * database's other jobs are never touched.
 */
const databaseUrl = process.env.DATABASE_URL;

async function withFixture(
  t: test.TestContext,
  run: (fixture: {
    pool: Pool;
    calendar: PostgresCreatorCalendarRepository;
    account: string;
    connectionId: string;
    job: (eventId: string) => Promise<string>;
    jobRow: (id: string) => Promise<{
      status: string;
      attempt_count: number;
      last_error_code: string | null;
      next_attempt_at: Date | null;
    }>;
    expireLease: (id: string) => Promise<void>;
    makeDue: (id: string) => Promise<void>;
  }) => Promise<void>,
) {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const schema = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.calendar_sync_jobs') is not null as ready",
  );
  if (!schema.rows[0]!.ready) {
    await pool.end();
    t.skip("creator target schema is not applied to this database");
    return;
  }
  const calendar = new PostgresCreatorCalendarRepository(pool);
  const prefix = `calsync-${randomBytes(4).toString("hex")}`;
  const account = `${prefix}-account`;
  try {
    await pool.query(
      "insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)",
      [account, `${prefix}@example.invalid`],
    );
    await calendar.connectProvider(account, {
      provider: "microsoft",
      providerSubject: `${prefix}-subject`,
      refreshToken: "refresh-original",
      calendarId: "calendar-1",
      scopes: ["Calendars.ReadWrite"],
    });
    const connectionId = (
      await pool.query<{ id: string }>(
        "select id from calendar_provider_connections where account_id=$1",
        [account],
      )
    ).rows[0]!.id;
    let sequence = 0;
    await run({
      pool,
      calendar,
      account,
      connectionId,
      job: async (eventId) => {
        sequence++;
        await pool.query(
          `insert into creator_calendar_events(id,account_id,title,start_at,end_at)
           values($1,$2,'Fixture',now()+interval '1 day',now()+interval '1 day 1 hour')
           on conflict (id) do nothing`,
          [eventId, account],
        );
        return (
          await pool.query<{ id: string }>(
            `insert into calendar_sync_jobs(connection_id,event_id,operation,dedupe_key,created_at)
             values($1,$2,'upsert',$3,now()-make_interval(secs => $4)) returning id`,
            [connectionId, eventId, `fixture:${eventId}:${sequence}`, 1000 - sequence],
          )
        ).rows[0]!.id;
      },
      jobRow: async (id) =>
        (
          await pool.query(
            "select status,attempt_count,last_error_code,next_attempt_at from calendar_sync_jobs where id=$1",
            [id],
          )
        ).rows[0],
      expireLease: async (id) => {
        await pool.query(
          "update calendar_sync_jobs set lease_until=now()-interval '1 second' where id=$1",
          [id],
        );
      },
      makeDue: async (id) => {
        await pool.query(
          "update calendar_sync_jobs set next_attempt_at=now()-interval '1 second' where id=$1",
          [id],
        );
      },
    });
  } finally {
    await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.end();
  }
}

test(
  "an abandoned running job is leased again once its lease expires",
  { skip: !databaseUrl },
  async (t) => {
    await withFixture(t, async ({ calendar, account, job, jobRow, expireLease }) => {
      const id = await job(`${account}-event-a`);
      const first = await calendar.leaseSyncJob(account);
      assert.equal(first?.jobId, id);
      assert.equal(first?.attempt, 1);
      assert.equal(first?.accountId, account);
      assert.equal(first?.event?.id, `${account}-event-a`);
      // The worker is killed mid-delivery: the job stays running and is not
      // leasable while the lease is still live.
      assert.equal(await calendar.leaseSyncJob(account), undefined);
      await expireLease(id);
      const second = await calendar.leaseSyncJob(account);
      assert.equal(second?.jobId, id);
      assert.equal(second?.attempt, 2);
      await calendar.completeSyncJob(second!, "provider-event-1");
      assert.equal((await jobRow(id)).status, "succeeded");
    });
  },
);

test(
  "retries stop at the attempt cap and the event reports the failure",
  { skip: !databaseUrl },
  async (t) => {
    await withFixture(t, async ({ calendar, account, job, jobRow, makeDue }) => {
      const eventId = `${account}-event-b`;
      const id = await job(eventId);
      for (let attempt = 1; attempt <= CALENDAR_SYNC_MAX_ATTEMPTS; attempt++) {
        const lease = await calendar.leaseSyncJob(account);
        assert.equal(lease?.jobId, id, `attempt ${attempt} leases the job`);
        const { terminal } = await calendar.failSyncJob(id, "provider_http_500");
        assert.equal(terminal, attempt === CALENDAR_SYNC_MAX_ATTEMPTS);
        const row = await jobRow(id);
        assert.equal(row.status, "failed");
        if (!terminal) {
          assert.ok(row.next_attempt_at, "a retryable failure is scheduled");
          assert.equal(await calendar.leaseSyncJob(account), undefined, "backoff is respected");
          await makeDue(id);
        } else assert.equal(row.next_attempt_at, null);
      }
      await makeDue(id);
      assert.equal(await calendar.leaseSyncJob(account), undefined, "an exhausted job is not retried");
      const event = (
        await calendar.events(account, new Date("2000-01-01"), new Date("2100-01-01"))
      ).find((item) => item.id === eventId);
      assert.equal(event?.syncStatus, "failed");
      assert.equal(event?.syncError, "provider_http_500");
      // The creator's explicit Retry grants a fresh set of attempts.
      assert.deepEqual(await calendar.retryCalendarSync(account, eventId), { queued: true });
      assert.equal((await jobRow(id)).attempt_count, 0);
      assert.equal((await calendar.leaseSyncJob(account))?.jobId, id);
    });
  },
);

test(
  "an abandoned final attempt is closed out as failed",
  { skip: !databaseUrl },
  async (t) => {
    await withFixture(t, async ({ pool, calendar, account, job, jobRow, expireLease }) => {
      const id = await job(`${account}-event-c`);
      await pool.query(
        "update calendar_sync_jobs set attempt_count=$2-1 where id=$1",
        [id, CALENDAR_SYNC_MAX_ATTEMPTS],
      );
      assert.equal((await calendar.leaseSyncJob(account))?.attempt, CALENDAR_SYNC_MAX_ATTEMPTS);
      await expireLease(id);
      assert.equal(await calendar.leaseSyncJob(account), undefined);
      const row = await jobRow(id);
      assert.equal(row.status, "failed");
      assert.equal(row.last_error_code, "lease_expired");
    });
  },
);

test(
  "a rejected grant parks the connection for reconnect without spending an attempt",
  { skip: !databaseUrl },
  async (t) => {
    await withFixture(t, async ({ calendar, account, job, jobRow }) => {
      const id = await job(`${account}-event-d`);
      const lease = await calendar.leaseSyncJob(account);
      assert.equal(lease?.jobId, id);
      await calendar.requireCalendarReconnect(lease!);
      assert.equal((await calendar.connections(account))[0]?.status, "error");
      const row = await jobRow(id);
      assert.equal(row.status, "queued");
      assert.equal(row.attempt_count, 0);
      assert.equal(row.last_error_code, "reconnect_required");
      assert.equal(await calendar.leaseSyncJob(account), undefined, "an errored connection is not used");
      await calendar.connectProvider(account, {
        provider: "microsoft",
        providerSubject: "reconnected",
        refreshToken: "refresh-after-reconnect",
        calendarId: "calendar-1",
        scopes: ["Calendars.ReadWrite"],
      });
      assert.equal((await calendar.connections(account))[0]?.status, "active");
      const resumed = await calendar.leaseSyncJob(account);
      assert.equal(resumed?.jobId, id);
      assert.equal(resumed?.refreshToken, "refresh-after-reconnect");
    });
  },
);

test(
  "a rotated refresh token is persisted encrypted and used by the next lease",
  { skip: !databaseUrl },
  async (t) => {
    await withFixture(t, async ({ pool, calendar, account, connectionId, job }) => {
      await job(`${account}-event-e`);
      const before = await calendar.leaseSyncJob(account);
      assert.equal(before?.refreshToken, "refresh-original");
      assert.deepEqual(
        await calendar.rotateCalendarRefreshToken(connectionId, "refresh-rotated"),
        { rotated: true },
      );
      const stored = (
        await pool.query<{ refresh_token_ciphertext: string }>(
          "select refresh_token_ciphertext from calendar_provider_connections where id=$1",
          [connectionId],
        )
      ).rows[0]!.refresh_token_ciphertext;
      assert.ok(!stored.includes("refresh-rotated"), "the token is not stored in plaintext");
      assert.match(stored, /^v\d+\./);
      await job(`${account}-event-f`);
      const after = await calendar.leaseSyncJob(account);
      assert.equal(after?.refreshToken, "refresh-rotated");
      await calendar.revokeProvider(account, "microsoft");
      assert.deepEqual(
        await calendar.rotateCalendarRefreshToken(connectionId, "refresh-too-late"),
        { rotated: false },
        "a revoked connection is never given a credential again",
      );
    });
  },
);
