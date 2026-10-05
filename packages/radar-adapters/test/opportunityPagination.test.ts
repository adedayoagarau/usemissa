import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { buildOpportunityCandidateQuery, PostgresOpportunityRepository } from "../src/index.js";

const baseQuery = {
  category: "all",
  types: [],
  disciplines: [],
  genres: [],
  locations: [],
  openNow: true,
  verifiedOnly: false,
  sort: "soonest-deadline" as const,
  limit: 3,
};

test("the candidate query for a later page starts after the cursor", () => {
  const cursor = Buffer.from(JSON.stringify({ sort: "soonest-deadline", key: "2026-10-04", id: "opp_b" }), "utf8").toString("base64url");
  const built = buildOpportunityCandidateQuery({ ...baseQuery, cursor });
  assert.match(built.text, /o\.deadline_date > \$\d+::date or \(o\.deadline_date = \$\d+::date and o\.id > \$\d+\)/);
  assert.ok(built.values.includes("2026-10-04"));
  assert.ok(built.values.includes("opp_b"));
});

/**
 * Real-Postgres walk through every page. Runs in CI's target-schema job;
 * skipped without DATABASE_URL.
 */
const databaseUrl = process.env.DATABASE_URL;

test("browse pages through every matching call exactly once", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const schema = await pool.query<{ ready: boolean }>(
    "select to_regclass('public.opportunity_contents') is not null and to_regclass('public.opportunity_source_evidence') is not null as ready",
  );
  if (!schema.rows[0]!.ready) {
    await pool.end();
    t.skip("opportunity target schema is not applied to this database");
    return;
  }
  const p = `opp_page${randomBytes(4).toString("hex")}`;
  const source = `${p}-source`;
  const ids: string[] = [];
  try {
    await pool.query(
      "insert into opportunity_sources(id,name,url,kind) values($1,'Pagination fixture','https://example.invalid/page','organization-website')",
      [source],
    );
    // Seven calls over four deadlines, so pages break inside a shared deadline.
    for (const [index, days] of [10, 10, 10, 11, 11, 12, 13].entries()) {
      const id = `${p}-${index}`;
      ids.push(id);
      await pool.query(
        `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
         values($1,$1,$1,$2,'open','reviewable','grant','exact',current_date+$3::int,'https://example.invalid/submit')`,
        [id, source, days],
      );
      await pool.query(
        `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
         values($1,$2,$3,'organization-website','Pagination fixture','https://example.invalid/page',now(),now(),true,true)`,
        [`${id}-evidence`, id, source],
      );
      await pool.query(
        "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
        [id],
      );
      await pool.query("update opportunities set publication_state='published' where id=$1", [id]);
    }

    const repository = new PostgresOpportunityRepository(pool);
    const seen: string[] = [];
    const sizes: number[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const result = await repository.browse({ ...baseQuery, ids, cursor });
      seen.push(...result.items.map((item) => item.id));
      sizes.push(result.items.length);
      assert.equal(result.total, ids.length);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    assert.deepEqual(sizes, [3, 3, 1]);
    assert.deepEqual(seen, ids);
  } finally {
    await pool.query("delete from opportunity_contents where opportunity_id = any($1::text[])", [ids]);
    await pool.query("delete from opportunity_source_evidence where opportunity_id = any($1::text[])", [ids]);
    await pool.query("delete from opportunities where id = any($1::text[])", [ids]);
    await pool.query("delete from opportunity_sources where id = $1", [source]);
    await pool.end();
  }
});
