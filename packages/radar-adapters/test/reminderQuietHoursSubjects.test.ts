import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { deferRemindersInQuietHours } from "../src/index.js";

/**
 * Quiet hours for the reminder kinds Missa schedules itself. Each is held only
 * until what it announces closes: the call for the deadline-day alarm, the fee
 * tier for a tier ending, the obligation for a milestone. Skipped without
 * DATABASE_URL or migration 0088.
 */
const databaseUrl = process.env.DATABASE_URL;

test("deadline-day, tier and milestone reminders are held in quiet hours only until their own close", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const schema = await pool.query<{ ready: boolean }>(
    `select to_regclass('public.creator_obligations') is not null and to_regclass('public.opportunity_deadline_tiers') is not null as ready`,
  );
  if (!schema.rows[0]!.ready) {
    await pool.end();
    t.skip("migration 0088 is not applied to this database");
    return;
  }
  const prefix = `quiet-subjects-${randomBytes(4).toString("hex")}`;
  const source = `${prefix}-source`;
  const account = `${prefix}-account`;
  const soon = `${prefix}-soon`;
  const later = `${prefix}-later`;
  const now = new Date();
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  const at = (offset: number) => (((minute + offset) % 1440) + 1440) % 1440;
  const snoozed = async (id: string) =>
    (await pool.query<{ snoozed_until: Date | null }>("select snoozed_until from creator_application_reminders where id=$1", [id])).rows[0]!
      .snoozed_until;
  try {
    await pool.query(
      "insert into opportunity_sources(id,name,url,kind) values($1,'Quiet fixture','https://example.invalid/quiet-subjects','organization-website')",
      [source],
    );
    // soon closes in 20 minutes; later closes in ten days.
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,deadline_time) values
        ($1,$1,'Soon',$3,'open','reviewable','grant','exact',current_date,now()+interval '20 minutes'),
        ($2,$2,'Later',$3,'open','reviewable','grant','exact',current_date+10,null)`,
      [soon, later, source],
    );
    await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${account}@example.invalid`]);
    await pool.query("insert into notification_preferences(account_id) values($1) on conflict do nothing", [account]);
    await pool.query(
      "update notification_preferences set timezone='UTC',quiet_hours_start_minute=$2,quiet_hours_end_minute=$3 where account_id=$1",
      [account, at(-60), at(60)],
    );
    const tracked = `${prefix}-tracked`;
    await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')", [tracked, account, later]);
    const tierSoon = (
      await pool.query<{ id: string }>(
        `insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,closes_at,fee_cents) values($1,'early','Early-bird',current_date,now()+interval '15 minutes',1000) returning id`,
        [later],
      )
    ).rows[0]!.id;
    const tierLater = (
      await pool.query<{ id: string }>(
        `insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,fee_cents) values($1,'regular','Regular',current_date+3,2000) returning id`,
        [later],
      )
    ).rows[0]!.id;
    const obligationSoon = (
      await pool.query<{ id: string }>(
        `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on,due_at) values($1,$2,$3,'sub-deadline','Upload',current_date,now()+interval '10 minutes') returning id`,
        [account, tracked, later],
      )
    ).rows[0]!.id;
    const obligationLater = (
      await pool.query<{ id: string }>(
        `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on) values($1,$2,$3,'sub-deadline','Draft',current_date+2) returning id`,
        [account, tracked, later],
      )
    ).rows[0]!.id;
    const reminder = async (opportunity: string, kind: string, subjectKind: string, subjectId: string) =>
      (
        await pool.query<{ id: string }>(
          `insert into creator_application_reminders(account_id,opportunity_id,kind,title,timezone,due_at,subject_kind,subject_id)
           values($1,$2,$3,'Fixture','UTC',now()-interval '1 minute',$4,$5) returning id`,
          [account, opportunity, kind, subjectKind, subjectId],
        )
      ).rows[0]!.id;
    const ids = {
      daySoon: await reminder(soon, "deadline-day", "escalation", "deadline-day:soon"),
      dayLater: await reminder(later, "deadline-day", "escalation", "deadline-day:later"),
      tierSoon: await reminder(later, "tier", "tier", tierSoon),
      tierLater: await reminder(later, "tier", "tier", tierLater),
      milestoneSoon: await reminder(later, "milestone", "obligation", obligationSoon),
      milestoneLater: await reminder(later, "milestone", "obligation", obligationLater),
    };

    const client = await pool.connect();
    try {
      assert.equal(await deferRemindersInQuietHours(client, account), 3);
    } finally {
      client.release();
    }
    assert.equal(await snoozed(ids.daySoon), null, "the call closes before quiet hours end");
    assert.equal(await snoozed(ids.tierSoon), null, "the tier closes before quiet hours end");
    assert.equal(await snoozed(ids.milestoneSoon), null, "the obligation is due before quiet hours end");
    for (const id of [ids.dayLater, ids.tierLater, ids.milestoneLater]) assert.ok(await snoozed(id), "held until the window ends");
  } finally {
    await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.query("delete from opportunities where source_id=$1", [source]);
    await pool.query("delete from opportunity_sources where id=$1", [source]);
    await pool.end();
  }
});
