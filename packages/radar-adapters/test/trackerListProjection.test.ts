import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { listCanonicalTrackedOpportunities, trackerListItem } from "../src/index.js";

/**
 * The Tracker list projection carries the dates deadline planning needs:
 * closing time and zone, personal target, last activity and the cycle.
 * Real-Postgres coverage; skipped without DATABASE_URL.
 */
const databaseUrl = process.env.DATABASE_URL;

test("list rows map planning dates and omit what is not recorded", () => {
  const base = {
    id: "tracked-1",
    account_id: "account",
    opportunity_id: "opp-1",
    status: "preparing",
    tracked_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
    revision: 3,
    notify: true,
    work_id: null,
    submitted_at: null,
    title: "Call",
    organization_name: "Org",
    opportunity_status: "open",
    opportunity_type: "residency",
    deadline_date: "2026-11-01",
    deadline_kind: "exact",
    response_time_days: null,
    responded_on: null,
  };
  const full = trackerListItem({
    ...base,
    list_deadline_time: "2026-11-01T23:59:00-04:00",
    list_deadline_timezone: "America/New_York",
    list_personal_target_on: "2026-10-25",
    list_last_activity_at: "2026-09-10T10:00:00+00:00",
    list_cycle_label: "2026",
    list_carried_from_tracked_id: "tracked-0",
  });
  assert.equal(full.trackedId, "tracked-1");
  assert.equal(full.opportunityType, "residency");
  assert.equal(full.deadlineTime, "2026-11-02T03:59:00.000Z");
  assert.equal(full.deadlineTimezone, "America/New_York");
  assert.equal(full.personalTargetOn, "2026-10-25");
  assert.equal(full.lastActivityAt, "2026-09-10T10:00:00.000Z");
  assert.equal(full.cycleLabel, "2026");
  assert.equal(full.carriedFromTrackedId, "tracked-0");

  const bare = trackerListItem({
    ...base,
    list_deadline_time: null,
    list_deadline_timezone: null,
    list_personal_target_on: null,
    list_last_activity_at: null,
    list_cycle_label: null,
    list_carried_from_tracked_id: null,
  });
  for (const key of ["deadlineTime", "deadlineTimezone", "personalTargetOn", "lastActivityAt", "cycleLabel", "carriedFromTrackedId"])
    assert.equal(key in bare, false, `${key} is omitted when not recorded`);
});

test("listCanonicalTrackedOpportunities returns the planning projection", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const schema = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.tracked_opportunities') is not null and to_regclass('public.creator_obligations') is not null as ready",
  );
  if (!schema.rows[0]!.ready) {
    await pool.end();
    t.skip("deadline management schema is not applied to this database");
    return;
  }
  const p = `tlist-${randomBytes(4).toString("hex")}`;
  const account = `${p}-account`;
  const source = `${p}-source`;
  const opportunity = `${p}-call`;
  try {
    await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${p}@example.invalid`]);
    await pool.query(
      "insert into opportunity_sources(id,name,url,kind) values($1,'List fixture','https://example.invalid/list','organization-website')",
      [source],
    );
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,deadline_time,deadline_timezone,submission_url)
       values($1,$1,$1,$2,'open','reviewable','residency','exact',current_date+40,(current_date+40)::timestamp at time zone 'America/New_York' + interval '23 hours 59 minutes','America/New_York','https://example.invalid/submit')`,
      [opportunity, source],
    );
    await pool.query(
      `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
       values($1,$2,$3,'organization-website','List fixture','https://example.invalid/list',now(),now(),true,true)`,
      [`${opportunity}-evidence`, opportunity, source],
    );
    await pool.query(
      "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
      [opportunity],
    );
    await pool.query("update opportunities set publication_state='published' where id=$1", [opportunity]);
    await pool.query(
      `insert into tracked_opportunities(id,account_id,opportunity_id,status,personal_target_on,cycle_label,last_activity_at)
       values($1,$2,$3,'preparing',current_date+30,'2026',now() - interval '30 days')`,
      [`${p}-tracked`, account, opportunity],
    );
    const items = await listCanonicalTrackedOpportunities(databaseUrl!, account);
    assert.equal(items.length, 1);
    const item = items[0]!;
    assert.equal(item.trackedId, `${p}-tracked`);
    assert.equal(item.type, "residency");
    assert.equal(item.deadlineTimezone, "America/New_York");
    assert.ok(item.deadlineTime && !Number.isNaN(Date.parse(item.deadlineTime)));
    assert.match(item.personalTargetOn ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(item.cycleLabel, "2026");
    assert.ok(item.lastActivityAt && Date.now() - Date.parse(item.lastActivityAt) > 29 * 86_400_000);
    assert.equal(item.carriedFromTrackedId, undefined);
  } finally {
    await pool.query("delete from tracked_opportunities where account_id=$1", [account]).catch(() => undefined);
    await pool.query("delete from opportunity_contents where opportunity_id=$1", [opportunity]).catch(() => undefined);
    await pool.query("delete from opportunity_source_evidence where opportunity_id=$1", [opportunity]).catch(() => undefined);
    await pool.query("delete from opportunities where id=$1", [opportunity]).catch(() => undefined);
    await pool.query("delete from opportunity_sources where id=$1", [source]).catch(() => undefined);
    await pool.query("delete from radar_accounts where id=$1", [account]).catch(() => undefined);
    await pool.end();
  }
});
