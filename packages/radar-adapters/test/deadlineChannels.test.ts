import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { calendarFeedForToken, pendingCreatorReminderEmails, weeklyDigestPlanning } from "../src/index.js";

/**
 * Real-Postgres coverage for the deadline-management channels: the calendar
 * feed items loader, which notices are emailed under which preference, and
 * the planning data behind The Sunday List. Skipped without DATABASE_URL or
 * without the deadline-management tables. Fixtures use a random prefix and
 * are removed afterwards.
 */
const databaseUrl = process.env.DATABASE_URL;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function ready(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ ready: boolean }>(
    `select to_regclass('public.creator_obligations') is not null and to_regclass('public.opportunity_stages') is not null
        and to_regclass('public.calendar_feed_tokens') is not null and to_regclass('public.platform_message_effects') is not null as ready`,
  );
  return Boolean(result.rows[0]?.ready);
}

async function seed(pool: Pool, prefix: string) {
  const account = `${prefix}-account`;
  const source = `${prefix}-source`;
  await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${prefix}@example.invalid`]);
  await pool.query("insert into creator_profiles(account_id,user_id,display_name) values($1,$2,'Fixture')", [account, `${prefix}-user`]);
  await pool.query(
    "insert into opportunity_sources(id,name,url,kind) values($1,'Channels fixture','https://example.invalid/channels','organization-website')",
    [source],
  );
  const call = async (name: string, status: string, deadline: string | null, extra: { time?: string; zone?: string } = {}) => {
    const id = `${prefix}-${name}`;
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,deadline_time,deadline_timezone,submission_url)
       values($1,$1,$2,$3,'open','reviewable','grant',$4,$5::date,$6::timestamptz,$7,'https://example.invalid/submit')`,
      [id, `Fixture ${name}`, source, deadline ? "exact" : "rolling", deadline, extra.time ?? null, extra.zone ?? null],
    );
    // Publishing passes the publication gate only with evidence and approved content.
    await pool.query(
      `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
       values($1,$2,$3,'organization-website','Channels fixture','https://example.invalid/channels',now(),now(),true,true)`,
      [`${id}-evidence`, id, source],
    );
    await pool.query(
      "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
      [id],
    );
    await pool.query("update opportunities set publication_state='published' where id=$1", [id]);
    await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,$4)", [
      `${id}-tracked`,
      account,
      id,
      status,
    ]);
    return id;
  };
  return { account, source, call };
}

async function cleanup(pool: Pool, prefix: string) {
  await pool.query("delete from platform_message_effects where idempotency_key like $1", [`creator-reminder:${prefix}%`]);
  await pool.query("delete from radar_accounts where id like $1", [`${prefix}%`]);
  await pool.query("delete from opportunities where source_id=$1", [`${prefix}-source`]);
  await pool.query("delete from opportunity_sources where id=$1", [`${prefix}-source`]);
}

test("the calendar feed loads tracked items, stages, tiers, obligations, targets and forecasts for the token's account", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  if (!(await ready(pool))) {
    await pool.end();
    t.skip("deadline-management schema is not applied to this database");
    return;
  }
  const prefix = `feed-${randomBytes(4).toString("hex")}`;
  const token = `${prefix}-token`;
  try {
    const { account, call } = await seed(pool, prefix);
    const timed = await call("timed", "preparing", day(10), { time: `${day(11)}T03:59:00Z`, zone: "America/New_York" });
    const sent = await call("sent", "submitted", day(10));
    await pool.query("update tracked_opportunities set personal_target_on=$2::date where id=$1", [`${timed}-tracked`, day(7)]);
    await pool.query(
      "insert into calendar_feed_tokens(account_id,token_hash,status,version) values($1,$2,'active',1)",
      [account, createHash("sha256").update(token).digest("hex")],
    );
    await pool.query(
      "insert into opportunity_stages(opportunity_id,kind,label,due_on,confidence) values($1,'notification','Decisions announced',$2::date,'probable')",
      [timed, day(60)],
    );
    await pool.query(
      `insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,fee_cents,fee_currency) values
         ($1,'early','Early-bird',$2::date,1500,'USD'),($1,'final','Final',$3::date,3000,'USD'),($4,'early','Early-bird',$2::date,1000,'USD')`,
      [timed, day(3), day(10), sent],
    );
    await pool.query(
      `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on,state) values
         ($1,$2,$3,'sub-deadline','Ask for references',$4::date,'open'),
         ($1,$2,$3,'sub-deadline','Already done',$4::date,'done')`,
      [account, `${timed}-tracked`, timed, day(2)],
    );
    await pool.query(
      `insert into opportunity_cycle_forecasts(opportunity_id,expected_open_start,expected_open_end,confidence,based_on_cycles)
       values($1,$2::date,$3::date,'medium',3)`,
      [sent, day(300), day(314)],
    );
    await pool.query(
      `insert into creator_planning_preferences(account_id,default_deadline_offsets) values($1,array[14,3]::smallint[])`,
      [account],
    );

    assert.equal(await calendarFeedForToken(pool, `${prefix}-user`, "wrong-token"), undefined);
    assert.equal(await calendarFeedForToken(pool, "someone-else", token), undefined);
    const feed = await calendarFeedForToken(pool, `${prefix}-user`, token);
    assert.ok(feed);
    assert.equal(feed.accountId, account);
    assert.deepEqual(feed.alarmOffsets, [14, 3]);
    const timedItem = feed.tracked.find((item) => item.opportunityId === timed)!;
    assert.equal(timedItem.deadline, day(10));
    assert.equal(timedItem.deadlineTimezone, "America/New_York");
    assert.ok(timedItem.deadlineTime?.endsWith("03:59:00.000Z"));
    assert.equal(timedItem.personalTargetOn, day(7));
    assert.equal(feed.tracked.find((item) => item.opportunityId === sent)!.deadline, null, "submitted work has no deadline");
    assert.deepEqual(feed.stages.map((stage) => stage.label), ["Decisions announced"]);
    assert.deepEqual(
      feed.tiers.map((tier) => `${tier.opportunityId}:${tier.label}`),
      [`${timed}:Early-bird`],
      "the final tier repeats the deadline and submitted work has no tiers",
    );
    assert.deepEqual(feed.obligations.map((item) => item.label), ["Ask for references"]);
    assert.deepEqual(feed.forecasts.map((item) => item.opportunityId), [sent]);
  } finally {
    await cleanup(pool, prefix);
    await pool.end();
  }
});

test("deadline notices are emailed under reminders, opening notices under following", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  if (!(await ready(pool))) {
    await pool.end();
    t.skip("deadline-management schema is not applied to this database");
    return;
  }
  const prefix = `dnotice-${randomBytes(4).toString("hex")}`;
  const mine = async () =>
    (await pendingCreatorReminderEmails(pool, 1000)).filter((row) => row.accountId.startsWith(prefix)).map((row) => row.kind).sort();
  try {
    const { account, call } = await seed(pool, prefix);
    await pool.query("insert into notification_preferences(account_id,email_enabled) values($1,true)", [account]);
    const preparing = await call("preparing", "preparing", day(5));
    const submitted = await call("submitted", "submitted", day(5));
    const alert = async (kind: string, opportunityId: string, title: string, body: string) =>
      pool.query(
        `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,dedupe_key,action_href)
         values($1,$2,$3,$4,$5,$6,$1,'/tracker')`,
        [`${prefix}-${kind}-${opportunityId.slice(-4)}`, account, opportunityId, kind, title, body],
      );
    await alert("deadline-day", preparing, "Fixture preparing closes today", "It closes today.");
    await alert("deadline-day", submitted, "Fixture submitted closes today", "It closes today.");
    await alert("obligations-moved", preparing, "Your plan moved", "The deadline moved from Oct 3 to Oct 10.");
    await alert("opens-soon", preparing, "May open soon", "Based on 3 past cycles.");

    assert.deepEqual(await mine(), ["deadline-day", "obligations-moved", "opens-soon"], "the deadline-day alarm skips submitted work");
    const moved = (await pendingCreatorReminderEmails(pool, 1000)).find((row) => row.accountId === account && row.kind === "obligations-moved")!;
    assert.equal(moved.noticeBody, "The deadline moved from Oct 3 to Oct 10.");
    assert.equal(moved.actionHref, "/tracker");

    await pool.query("update notification_preferences set follow_enabled=false where account_id=$1", [account]);
    assert.deepEqual(await mine(), ["deadline-day", "obligations-moved"]);
    await pool.query("update notification_preferences set follow_enabled=true,reminder_enabled=false where account_id=$1", [account]);
    assert.deepEqual(await mine(), ["opens-soon"]);
  } finally {
    await cleanup(pool, prefix);
    await pool.end();
  }
});

test("the Sunday List planning data lists open steps and deadlines across saved applications", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  if (!(await ready(pool))) {
    await pool.end();
    t.skip("deadline-management schema is not applied to this database");
    return;
  }
  const prefix = `dplan-${randomBytes(4).toString("hex")}`;
  try {
    const { account, call } = await seed(pool, prefix);
    assert.equal(await weeklyDigestPlanning(pool, account), undefined, "no saved applications, no planning section");
    const first = await call("first", "preparing", day(9));
    await call("rolling", "saved", null);
    await call("sent", "submitted", day(4));
    await pool.query(
      `insert into creator_obligations(account_id,tracked_opportunity_id,opportunity_id,kind,label,due_on,state) values
         ($1,$2,$3,'sub-deadline','Final draft',$4::date,'open'),
         ($1,$2,$3,'sub-deadline','Skipped step',$4::date,'skipped')`,
      [account, `${first}-tracked`, first, day(2)],
    );
    const planning = await weeklyDigestPlanning(pool, account);
    assert.ok(planning);
    assert.deepEqual(
      planning.upcoming.map((item) => `${item.kind}:${item.label}:${item.dueOn}`),
      [`obligation:Final draft:${day(2)}`, `deadline:Application deadline:${day(9)}`],
    );
    assert.deepEqual(
      planning.applications.map((item) => [item.title, item.deadline]),
      [["Fixture first", day(9)], ["Fixture rolling", null]],
    );
  } finally {
    await cleanup(pool, prefix);
    await pool.end();
  }
});
