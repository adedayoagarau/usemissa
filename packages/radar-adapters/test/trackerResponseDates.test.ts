import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  listCanonicalTrackedOpportunities,
  updateCanonicalTrackerStatus,
} from "../src/index.js";
import { expectedResponse } from "../src/trackerResponseDates.js";

test("expected response needs an awaiting status, a submission date and a stated window", () => {
  assert.deepEqual(expectedResponse("submitted", "2026-09-01T00:00:00.000Z", 30), {
    expectedResponseBy: "2026-10-01",
    expectedResponseBasis: "call-profile",
  });
  assert.equal(expectedResponse("in-review", "2026-09-01", 14)?.expectedResponseBy, "2026-09-15");
  assert.equal(expectedResponse("saved", "2026-09-01", 30), undefined);
  assert.equal(expectedResponse("accepted", "2026-09-01", 30), undefined);
  assert.equal(expectedResponse("submitted", null, 30), undefined);
  assert.equal(expectedResponse("submitted", "2026-09-01", null), undefined);
  assert.equal(expectedResponse("submitted", "2026-09-01", 0), undefined);
  assert.equal(expectedResponse("submitted", "not a date", 30), undefined);
});

/**
 * Real-Postgres coverage for the canonical Tracker projection. Runs in CI's
 * target-schema job; skipped without DATABASE_URL or the creator schema.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "canonical tracker carries submission, response and expected response dates",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.tracked_status_events') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const prefix = `responses-${randomBytes(4).toString("hex")}`;
    const account = `${prefix}-account`;
    const source = `${prefix}-source`;
    const opportunity = `${prefix}-opportunity`;
    const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const item = async () =>
      (await listCanonicalTrackedOpportunities(databaseUrl!, account)).find(
        (row) => row.opportunityId === opportunity,
      )!;
    try {
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [
        account,
        `${prefix}@example.invalid`,
      ]);
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Response fixture','https://example.invalid/responses','organization-website')",
        [source],
      );
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
         values($1,$1,'Response fixture',$2,'open','reviewable','grant','exact',$3::date,'https://example.invalid/submit')`,
        [opportunity, source, deadline],
      );
      await pool.query(
        `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
         values($1,$2,$3,'organization-website','Response fixture','https://example.invalid/responses',now(),now(),true,true)`,
        [`${prefix}-evidence`, opportunity, source],
      );
      await pool.query(
        `insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status)
         values($1,'fixture','fixture','{}'::jsonb,'approved')`,
        [opportunity],
      );
      await pool.query("update opportunities set publication_state='published' where id=$1", [opportunity]);
      await pool.query(
        "insert into opportunity_call_profiles(opportunity_id,source_url,response_time_days) values($1,'https://example.invalid/responses',45)",
        [opportunity],
      );
      await pool.query(
        "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')",
        [`${prefix}-tracked`, account, opportunity],
      );

      const preparing = await item();
      assert.equal(preparing.submittedAt, undefined);
      assert.equal(preparing.expectedResponseBy, undefined);

      const submitted = await updateCanonicalTrackerStatus(databaseUrl!, account, opportunity, "submitted", {
        occurredOn: "2026-09-01",
      });
      assert.equal(submitted?.tracked.submittedAt, "2026-09-01");
      assert.equal(submitted?.tracked.expectedResponseBy, "2026-10-16");
      assert.equal(submitted?.tracked.expectedResponseBasis, "call-profile");

      // An acknowledgement is not a response.
      await updateCanonicalTrackerStatus(databaseUrl!, account, opportunity, "received", { occurredOn: "2026-09-03" });
      const received = await item();
      assert.equal(received.respondedAt, undefined);
      assert.equal(received.expectedResponseBy, "2026-10-16");

      const declined = await updateCanonicalTrackerStatus(databaseUrl!, account, opportunity, "declined", {
        occurredOn: "2026-09-20",
      });
      assert.equal(declined?.tracked.respondedAt, "2026-09-20");
      assert.equal(declined?.tracked.expectedResponseBy, undefined);
      const listed = await item();
      assert.equal(listed.submittedAt, "2026-09-01");
      assert.equal(listed.respondedAt, "2026-09-20");
    } finally {
      await pool.query("delete from radar_accounts where id=$1", [account]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.end();
    }
  },
);
