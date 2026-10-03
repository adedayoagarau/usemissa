import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  creatorEntitlements,
  FREE_ACTIVE_TRACKED_LIMIT,
  saveCanonicalOpportunityToTracker,
  TrackingLimitReachedError,
} from "../src/index.js";

/**
 * Real-Postgres coverage for the Free tracking limit. Runs in CI's
 * target-schema job; skipped without DATABASE_URL or migration 0080.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "Free tracks a limited number of calls in progress; submitted, lapsed and paid plans are not limited",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.creator_plans') is not null and to_regclass('public.tracked_opportunities') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator plan schema is not applied to this database");
      return;
    }
    const p = `plan-${randomBytes(4).toString("hex")}`;
    const account = `${p}-account`;
    const source = `${p}-source`;
    const limit = FREE_ACTIVE_TRACKED_LIMIT;
    const publish = async (name: string, deadlineDays: number) => {
      const id = `${p}-${name}`;
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
         values($1,$1,$1,$2,'open','reviewable','grant','exact',current_date+$3::int,'https://example.invalid/submit')`,
        [id, source, deadlineDays],
      );
      await pool.query(
        `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
         values($1,$2,$3,'organization-website','Plan fixture','https://example.invalid/plan',now(),now(),true,true)`,
        [`${id}-evidence`, id, source],
      );
      await pool.query(
        "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
        [id],
      );
      // The publication gate refuses a past deadline, so a lapsed fixture stays unpublished.
      if (deadlineDays > 0) await pool.query("update opportunities set publication_state='published' where id=$1", [id]);
      return id;
    };
    const save = (id: string) => saveCanonicalOpportunityToTracker(databaseUrl!, account, id);
    try {
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${p}@example.invalid`]);
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Plan fixture','https://example.invalid/plan','organization-website')",
        [source],
      );
      const calls: string[] = [];
      for (let index = 0; index <= limit; index += 1) calls.push(await publish(`call-${index}`, 30));
      const lapsed = await publish("lapsed", -3);

      for (const id of calls.slice(0, limit)) assert.equal((await save(id))?.status, "created");
      const full = await creatorEntitlements(pool, account);
      assert.deepEqual(full, { plan: "free", activeTrackedLimit: limit, activeTracked: limit });

      await assert.rejects(save(calls[limit]!), (error: unknown) =>
        error instanceof TrackingLimitReachedError && error.limit === limit && error.active === limit);
      assert.equal((await save(calls[0]!))?.status, "already-present", "re-saving a tracked call is always allowed");

      {
        await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')", [`${p}-lapsed`, account, lapsed]);
        assert.equal((await creatorEntitlements(pool, account)).activeTracked, limit, "a call past its deadline does not count");
      }

      await pool.query("update tracked_opportunities set status='submitted' where account_id=$1 and opportunity_id=$2", [account, calls[1]]);
      assert.equal((await save(calls[limit]!))?.status, "created", "submitting one frees a place");

      const extra = await publish("extra", 30);
      await assert.rejects(save(extra), TrackingLimitReachedError);
      await pool.query("insert into creator_plans(account_id,plan,source) values($1,'plus','grant')", [account]);
      assert.equal((await creatorEntitlements(pool, account)).activeTrackedLimit, null);
      assert.equal((await save(extra))?.status, "created", "Plus has no tracking limit");

      await pool.query("update creator_plans set expires_at=now()-interval '1 day' where account_id=$1", [account]);
      assert.equal((await creatorEntitlements(pool, account)).plan, "free", "an expired plan falls back to Free");
    } finally {
      await pool.query("delete from tracked_status_events where account_id=$1", [account]).catch(() => undefined);
      await pool.query("delete from radar_accounts where id=$1", [account]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);
