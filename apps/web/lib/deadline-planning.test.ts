import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";

import { applyDefaultPlan, recalculateObligationChains } from "./deadline-planning.ts";

/**
 * The default plan on save, against a real database. Skipped without
 * DATABASE_URL or before migration 0088; fixtures are removed afterwards.
 */
const databaseUrl = process.env.DATABASE_URL;

test("a default plan is added once, on plans with start-by planning only", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.creator_obligations') is not null and to_regclass('public.creator_plans') is not null as ready",
  );
  if (!ready.rows[0]!.ready) {
    await pool.end();
    t.skip("migration 0088 is not applied to this database");
    return;
  }
  const prefix = `plan-${randomBytes(4).toString("hex")}`;
  const source = `${prefix}-source`;
  const opportunityId = `${prefix}-call`;
  const plus = `${prefix}-plus`;
  const free = `${prefix}-free`;
  try {
    await pool.query("insert into opportunity_sources(id,name,url,kind) values($1,'Plan fixture','https://example.invalid/plan','organization-website')", [source]);
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date)
       values($1,$1,'Fixture residency',$2,'open','reviewable','residency','exact',current_date+40)`,
      [opportunityId, source],
    );
    for (const account of [plus, free]) {
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${account}@example.invalid`]);
      await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'saved')", [`${account}-t`, account, opportunityId]);
    }
    await pool.query("insert into creator_plans(account_id,plan,source) values($1,'plus','grant')", [plus]);
    await pool.query(
      `insert into creator_planning_preferences(account_id,weekly_hours_available) values($1,7)`,
      [plus],
    );

    assert.deepEqual(await applyDefaultPlan(free, opportunityId), { created: 0, skipped: "plan" });
    const first = await applyDefaultPlan(plus, opportunityId);
    assert.equal(first.created, 5, "four residency steps and a start-by step");
    const keys = (await pool.query<{ template_key: string }>(
      "select template_key from creator_obligations where account_id=$1 order by due_on", [plus],
    )).rows.map((row) => row.template_key);
    // Ten hours at seven a week, plus two days of slack: start twelve days out.
    assert.deepEqual(keys, ["before:references", "before:work-samples", "before:start-by", "before:statement", "before:upload"]);
    assert.deepEqual(await applyDefaultPlan(plus, opportunityId), { created: 0, skipped: "has-plan" });
    assert.deepEqual(await applyDefaultPlan(plus, `${prefix}-missing`), { created: 0, skipped: "not-tracked" });

    // The tick pass is idempotent when nothing moved.
    const chains = await recalculateObligationChains(plus);
    assert.equal(chains.moved, 0);
  } finally {
    await pool.query("delete from radar_accounts where id=any($1)", [[plus, free]]);
    await pool.query("delete from opportunities where source_id=$1", [source]);
    await pool.query("delete from opportunity_sources where id=$1", [source]);
    await pool.end();
  }
});
