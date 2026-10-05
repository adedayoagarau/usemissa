import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { listSeasonTrackedCalls, listWatchedForecasts, seasonCallFromRow } from "../src/index.js";

test("season rows map fees, close times and personal targets", () => {
  const call = seasonCallFromRow({
    id: "t1",
    opportunity_id: "o1",
    status: "preparing",
    revision: 3,
    title: "Fixture",
    organization_name: null,
    type: null,
    opportunity_status: "open",
    deadline_date: "2099-03-01",
    deadline_kind: "fixed",
    deadline_time: "2099-03-01T23:59:00Z",
    deadline_timezone: "America/New_York",
    open_date: null,
    fee_status: "fee",
    fee_cents: 2500,
    fee_currency: "USD",
    personal_target_on: "2099-02-20",
  });
  assert.equal(call.deadlineKind, "exact");
  assert.equal(call.feeStatus, "paid");
  assert.equal(call.feeCents, 2500);
  assert.equal(call.type, "other");
  assert.equal(call.personalTargetOn, "2099-02-20");
  assert.equal(call.deadlineTime, "2099-03-01T23:59:00.000Z");
});

const databaseUrl = process.env.DATABASE_URL;

test("season reads tracked calls and forecasts for tracked and followed calls", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.opportunity_cycle_forecasts') is not null as ready",
  );
  if (!ready.rows[0]!.ready) {
    await pool.end();
    t.skip("deadline-management schema is not applied to this database");
    return;
  }
  const prefix = `season-${randomBytes(4).toString("hex")}`;
  const account = `${prefix}-account`;
  const source = `${prefix}-source`;
  const org = `${prefix}-org`;
  const opp = (name: string) => `${prefix}-${name}`;
  try {
    await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${prefix}@example.invalid`]);
    await pool.query(
      "insert into opportunity_sources(id,name,url,kind) values($1,'Season fixture','https://example.invalid/season','organization-website')",
      [source],
    );
    await pool.query(`insert into radar_organizations(id,data) values($1,'{"name":"Season Press"}'::jsonb)`, [org]);
    const seed = async (name: string, status: "open" | "closed", organization: string | null) => {
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,fee_status,fee_cents,fee_currency,organization_id,submission_url)
         values($1,$1,$2,$3,'open','reviewable','grant','exact','2099-12-01'::date,'paid',1500,'USD',$4,'https://example.invalid/submit')`,
        [opp(name), `Fixture ${name}`, source, organization],
      );
      await pool.query(
        `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
         values($1,$2,$3,'organization-website','Season fixture','https://example.invalid/season',now(),now(),true,true)`,
        [`${opp(name)}-evidence`, opp(name), source],
      );
      await pool.query(
        `insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status)
         values($1,'fixture','fixture','{}'::jsonb,'approved')`,
        [opp(name)],
      );
      await pool.query("update opportunities set publication_state='published' where id=$1", [opp(name)]);
      // Closing keeps the deadline (the publication gate allows only that change).
      if (status === "closed") await pool.query("update opportunities set status='closed' where id=$1", [opp(name)]);
    };
    await seed("tracked", "open", null);
    await seed("closed", "closed", null);
    await seed("followed", "closed", org);
    await seed("stranger", "closed", null);
    await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing'),($4,$2,$5,'declined')", [
      `${opp("tracked")}-t`,
      account,
      opp("tracked"),
      `${opp("closed")}-t`,
      opp("closed"),
    ]);
    await pool.query("update tracked_opportunities set personal_target_on='2099-04-20' where id=$1", [`${opp("tracked")}-t`]);
    await pool.query("insert into organization_follows(account_id,organization_id) values($1,$2)", [account, org]);
    for (const name of ["closed", "followed", "stranger"])
      await pool.query(
        `insert into opportunity_cycle_forecasts(opportunity_id,expected_open_start,expected_open_end,expected_close,confidence,based_on_cycles)
         values($1,'2099-01-10','2099-01-20','2099-03-01','medium',3)`,
        [opp(name)],
      );

    const calls = await listSeasonTrackedCalls(pool, account);
    assert.deepEqual(
      calls.map((call) => call.opportunityId).sort(),
      [opp("closed"), opp("tracked")].sort(),
    );
    const tracked = calls.find((call) => call.opportunityId === opp("tracked"))!;
    assert.equal(tracked.personalTargetOn, "2099-04-20");
    assert.equal(tracked.feeCents, 1500);
    assert.equal(tracked.revision, 1);

    const forecasts = await listWatchedForecasts(pool, account);
    assert.deepEqual(
      forecasts.map((item) => [item.opportunityId, item.relation]).sort(),
      [
        [opp("closed"), "tracked"],
        [opp("followed"), "following"],
      ],
    );
    assert.equal(forecasts[0]!.forecast.expectedOpenStart, "2099-01-10");
    assert.equal(forecasts[0]!.forecast.basedOnCycles, 3);
  } finally {
    await pool.query("delete from tracked_opportunities where account_id=$1", [account]);
    await pool.query("delete from organization_follows where account_id=$1", [account]);
    await pool.query("delete from opportunity_contents where opportunity_id like $1", [`${prefix}-%`]);
    await pool.query("delete from opportunity_source_evidence where opportunity_id like $1", [`${prefix}-%`]);
    await pool.query("delete from opportunities where id like $1", [`${prefix}-%`]);
    await pool.query("delete from radar_organizations where id=$1", [org]);
    await pool.query("delete from opportunity_sources where id=$1", [source]);
    await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.end();
  }
});
