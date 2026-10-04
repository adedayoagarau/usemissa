import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { trackedDeadlineFacts } from "./tracker-facts";

/** Real-Postgres coverage for the Tracker sheet's deadline facts; skipped without DATABASE_URL. */
const databaseUrl = process.env.DATABASE_URL;

test("Tracker sheet facts are scoped to the creator's own Tracker", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const schema = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.opportunity_deadline_tiers') is not null and to_regclass('public.tracked_opportunities') is not null as ready",
  );
  if (!schema.rows[0]!.ready) {
    await pool.end();
    t.skip("deadline management schema is not applied to this database");
    return;
  }
  const p = `tfacts-${randomBytes(4).toString("hex")}`;
  const account = `${p}-account`;
  const other = `${p}-other`;
  const source = `${p}-source`;
  const call = `${p}-call`;
  try {
    for (const id of [account, other])
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [id, `${id}@example.invalid`]);
    await pool.query(
      "insert into opportunity_sources(id,name,url,kind) values($1,'Facts fixture','https://example.invalid/facts','organization-website')",
      [source],
    );
    await pool.query(
      `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
       values($1,$1,$1,$2,'open','reviewable','contest','exact',current_date+40,'https://example.invalid/submit')`,
      [call, source],
    );
    await pool.query(
      `insert into opportunity_deadline_tiers(opportunity_id,tier,label,closes_on,fee_cents,fee_currency,confidence,position)
       values($1,'early','Early entry',current_date+10,1500,'USD','confirmed',0),
             ($1,'regular','Regular entry',current_date+40,2500,'USD','confirmed',1)`,
      [call],
    );
    await pool.query(
      `insert into opportunity_stages(opportunity_id,kind,label,due_on,confidence,position)
       values($1,'notification','Results announced',current_date+90,'probable',0)`,
      [call],
    );
    await pool.query(
      "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'saved')",
      [`${p}-tracked`, account, call],
    );

    const facts = await trackedDeadlineFacts(pool, account, call);
    assert.ok(facts);
    assert.deepEqual(facts.tiers.map((tier) => [tier.label, tier.feeCents]), [["Early entry", 1500], ["Regular entry", 2500]]);
    assert.deepEqual(facts.stages.map((stage) => [stage.label, stage.confidence]), [["Results announced", "probable"]]);
    assert.equal(facts.provenance.state, "confirmed");

    assert.equal(await trackedDeadlineFacts(pool, other, call), undefined, "another account cannot read it");
    assert.equal(await trackedDeadlineFacts(pool, account, `${p}-missing`), undefined);
  } finally {
    await pool.query("delete from tracked_opportunities where opportunity_id=$1", [call]).catch(() => undefined);
    await pool.query("delete from opportunity_stages where opportunity_id=$1", [call]).catch(() => undefined);
    await pool.query("delete from opportunity_deadline_tiers where opportunity_id=$1", [call]).catch(() => undefined);
    await pool.query("delete from opportunities where id=$1", [call]).catch(() => undefined);
    await pool.query("delete from opportunity_sources where id=$1", [source]).catch(() => undefined);
    await pool.query("delete from radar_accounts where id = any($1::text[])", [[account, other]]).catch(() => undefined);
    await pool.end();
  }
});
