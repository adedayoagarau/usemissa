import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { creatorReminderEmailKey, pendingCreatorReminderEmails } from "../src/index.js";

/**
 * Real-Postgres coverage for selecting reminder notices that still need an
 * email. Runs in CI's target-schema job; skipped without the creator schema.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "only opted-in, unsent, upcoming deadline reminders are selected for email",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.platform_message_effects') is not null and to_regclass('public.creator_application_reminders') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const prefix = `remail-${randomBytes(4).toString("hex")}`;
    const source = `${prefix}-source`;
    const upcoming = `${prefix}-upcoming`;
    const passed = `${prefix}-passed`;
    const optedIn = `${prefix}-in`;
    const optedOut = `${prefix}-out`;
    const mine = async () =>
      (await pendingCreatorReminderEmails(pool, 1000)).filter((row) => row.accountId.startsWith(prefix));
    const notice = async (account: string, opportunity: string) => {
      const reminder = await pool.query<{ id: string }>(
        `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,state)
         values($1,$2,'deadline','Application deadline','UTC','delivered') returning id`,
        [account, opportunity],
      );
      const id = `${prefix}-${randomBytes(4).toString("hex")}`;
      await pool.query(
        `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,dedupe_key,reminder_id)
         values($1,$2,$3,'deadline-reminder','Application deadline','Fixture',$1,$4)`,
        [id, account, opportunity, reminder.rows[0]!.id],
      );
      return id;
    };
    try {
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Email fixture','https://example.invalid/email','organization-website')",
        [source],
      );
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date) values
           ($1,$1,'Upcoming fixture',$3,'open','reviewable','grant','exact',current_date+7),
           ($2,$2,'Passed fixture',$3,'open','reviewable','grant','exact',current_date-1)`,
        [upcoming, passed, source],
      );
      for (const account of [optedIn, optedOut]) {
        await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [
          account,
          `${account}@example.invalid`,
        ]);
        await pool.query("insert into notification_preferences(account_id,email_enabled) values($1,$2)", [
          account,
          account === optedIn,
        ]);
      }
      const due = await notice(optedIn, upcoming);
      await notice(optedIn, passed);
      await notice(optedOut, upcoming);

      const first = await mine();
      assert.deepEqual(first.map((row) => row.alertId), [due]);
      assert.equal(first[0]!.idempotencyKey, creatorReminderEmailKey(due));
      assert.equal(first[0]!.email, `${optedIn}@example.invalid`);

      const effect = async (status: string) =>
        pool.query(
          `insert into platform_message_effects(id,kind,provider,idempotency_key,status,tenant_key,template_key,template_version,recipient_account_id)
           values($1,'deadline-reminder','resend',$2,$3,'platform','deadline-reminder','deadline.v1',$4)
           on conflict (tenant_key,idempotency_key) do update set status=excluded.status`,
          [`${prefix}-effect`, creatorReminderEmailKey(due), status, optedIn],
        );
      // A failed send is retried; an accepted one is not.
      await effect("failed");
      assert.equal((await mine()).length, 1);
      await effect("accepted");
      assert.equal((await mine()).length, 0);
    } finally {
      await pool.query("delete from platform_message_effects where id=$1", [`${prefix}-effect`]);
      await pool.query("delete from radar_accounts where id=any($1)", [[optedIn, optedOut]]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);
