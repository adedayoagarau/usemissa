import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { creatorCommandEnvelope, PostgresCreatorNotificationRepository } from "../src/index.js";

/**
 * Real-Postgres coverage for email defaults and the one-time email question.
 * Runs in CI's target-schema job; skipped without DATABASE_URL or migration 0079.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "new accounts get email by default and earlier accounts are asked once",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      `select count(*) = 1 as ready from information_schema.columns
        where table_name='notification_preferences' and column_name='email_choice_at'`,
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("email choice schema is not applied to this database");
      return;
    }
    const p = `email-choice-${randomBytes(4).toString("hex")}`;
    const accounts = { fresh: `${p}-fresh`, accept: `${p}-accept`, decline: `${p}-decline` };
    const repository = new PostgresCreatorNotificationRepository(pool);
    const choose = async (accountId: string, accept: boolean) => {
      const current = await repository.preferences(accountId);
      return repository.recordEmailChoice(
        creatorCommandEnvelope(accountId, "notification-preferences.email-choice", randomUUID(), { accept }, current.revision),
        accept,
      );
    };
    try {
      for (const account of Object.values(accounts)) {
        await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${account}@example.invalid`]);
        await pool.query("insert into notification_preferences(account_id) values($1)", [account]);
      }
      const fresh = await repository.preferences(accounts.fresh);
      assert.equal(fresh.emailEnabled, true, "email is on for a new account");
      assert.equal(fresh.digestCadence, "weekly", "the weekly digest is on for a new account");
      assert.equal(fresh.reminderEnabled, true);
      assert.equal(fresh.emailChoiceNeeded, false, "a new account chose at signup");

      // Accounts from before 0079: email off and no recorded choice.
      await pool.query(
        "update notification_preferences set email_enabled=false,digest_cadence='off',email_choice_at=null where account_id=any($1)",
        [[accounts.accept, accounts.decline]],
      );
      assert.equal((await repository.preferences(accounts.accept)).emailChoiceNeeded, true);

      await choose(accounts.accept, true);
      const accepted = await repository.preferences(accounts.accept);
      assert.equal(accepted.emailEnabled, true);
      assert.equal(accepted.digestCadence, "weekly");
      assert.equal(accepted.emailChoiceNeeded, false);

      await choose(accounts.decline, false);
      const declined = await repository.preferences(accounts.decline);
      assert.equal(declined.emailEnabled, false, "declining keeps email off");
      assert.equal(declined.digestCadence, "off");
      assert.equal(declined.emailChoiceNeeded, false, "declining also stops the question");
    } finally {
      const ids = Object.values(accounts);
      await pool.query("delete from outbox_events where aggregate_id=any($1)", [ids]).catch(() => undefined);
      await pool.query("delete from audit_events where account_id=any($1)", [ids]).catch(() => undefined);
      await pool.query("delete from workspace_command_receipts where actor_account_id=any($1)", [ids]);
      await pool.query("delete from radar_accounts where id=any($1)", [Object.values(accounts)]);
      await pool.end();
    }
  },
);
