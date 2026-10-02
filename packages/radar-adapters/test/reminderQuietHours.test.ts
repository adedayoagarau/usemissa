import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { deferRemindersInQuietHours, quietHoursMinute } from "../src/index.js";

test("quiet hours parse as minutes after midnight", () => {
  assert.equal(quietHoursMinute("00:00"), 0);
  assert.equal(quietHoursMinute("21:30"), 1290);
  assert.equal(quietHoursMinute("23:59"), 1439);
  assert.equal(quietHoursMinute("24:00"), null);
  assert.equal(quietHoursMinute("9:00"), null);
  assert.equal(quietHoursMinute(null), null);
});

/**
 * Real-Postgres coverage for quiet-hours deferral. Runs in CI's target-schema
 * job; skipped without DATABASE_URL or the creator schema. Windows are built
 * around the current UTC minute so the test does not depend on wall-clock time.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "reminders inside quiet hours wait for the window to end unless a deadline closes first",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      `select count(*) = 2 as ready from information_schema.columns
        where table_name='notification_preferences' and column_name in ('quiet_hours_start_minute','quiet_hours_end_minute')`,
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("quiet-hours schema is not applied to this database");
      return;
    }
    const prefix = `quiet-${randomBytes(4).toString("hex")}`;
    const source = `${prefix}-source`;
    const opportunity = `${prefix}-opportunity`;
    const accounts = { quiet: `${prefix}-quiet`, outside: `${prefix}-outside`, none: `${prefix}-none` };
    const now = new Date();
    const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const at = (offset: number) => (((minute + offset) % 1440) + 1440) % 1440;
    const snoozed = async (id: string) =>
      (
        await pool.query<{ snoozed_until: Date | null }>(
          "select snoozed_until from creator_application_reminders where id=$1",
          [id],
        )
      ).rows[0]!.snoozed_until;
    try {
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Quiet fixture','https://example.invalid/quiet','organization-website')",
        [source],
      );
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,deadline_time)
         values($1,$1,'Quiet fixture',$2,'open','reviewable','grant','exact',current_date,now()+interval '20 minutes')`,
        [opportunity, source],
      );
      const reminders: Record<string, string> = {};
      for (const [name, account] of Object.entries(accounts)) {
        await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [
          account,
          `${account}@example.invalid`,
        ]);
        await pool.query("insert into notification_preferences(account_id) values($1) on conflict do nothing", [account]);
        for (const kind of ["preparation", "deadline"] as const) {
          const row = await pool.query<{ id: string }>(
            `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,deadline_offset_days)
             values($1,$2,$3,'Fixture reminder','UTC',now()-interval '1 minute',$4) returning id`,
            [account, opportunity, kind, kind === "deadline" ? 0 : null],
          );
          reminders[`${name}-${kind}`] = row.rows[0]!.id;
        }
      }
      await pool.query(
        "update notification_preferences set timezone='UTC',quiet_hours_start_minute=$2,quiet_hours_end_minute=$3 where account_id=$1",
        [accounts.quiet, at(-60), at(60)],
      );
      await pool.query(
        "update notification_preferences set timezone='UTC',quiet_hours_start_minute=$2,quiet_hours_end_minute=$3 where account_id=$1",
        [accounts.outside, at(120), at(180)],
      );

      const client = await pool.connect();
      try {
        for (const account of Object.values(accounts)) await deferRemindersInQuietHours(client, account);
      } finally {
        client.release();
      }

      const held = await snoozed(reminders["quiet-preparation"]!);
      assert.ok(held, "a preparation reminder inside quiet hours is held");
      const waitMinutes = (held!.getTime() - Date.now()) / 60_000;
      assert.ok(waitMinutes > 55 && waitMinutes <= 61, `held until the window ends, got ${waitMinutes} minutes`);
      assert.equal(await snoozed(reminders["quiet-deadline"]!), null, "a deadline closing before the window ends is not held");
      assert.equal(await snoozed(reminders["outside-preparation"]!), null, "outside the window is delivered");
      assert.equal(await snoozed(reminders["none-preparation"]!), null, "no quiet hours, no deferral");

      // Held reminders are no longer due, so a second pass does nothing.
      const again = await pool.connect();
      try {
        assert.equal(await deferRemindersInQuietHours(again, accounts.quiet), 0);
      } finally {
        again.release();
      }
    } finally {
      await pool.query("delete from radar_accounts where id=any($1)", [Object.values(accounts)]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);
