import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { countSeasonMatchingOpenCalls } from "../src/index.js";
import { PREFERENCE_MATCH_CTE, preferenceMatchPredicate } from "../src/weeklyDigest.js";

test("preference matching is one shared fragment with a checked alias", () => {
  assert.match(PREFERENCE_MATCH_CTE, /^with recursive expanded/);
  assert.match(PREFERENCE_MATCH_CTE, /account_taxonomy_preferences where account_id=\$1/);
  assert.match(preferenceMatchPredicate("x"), /m\.opportunity_id=x\.id and m\.preference in \('include','prefer'\)/);
  assert.match(preferenceMatchPredicate("x"), /m\.preference='exclude'/);
  assert.throws(() => preferenceMatchPredicate("o; drop table opportunities"));
});

/**
 * Real-Postgres coverage for the Season page's matching open calls. Skipped
 * without DATABASE_URL or the creator schema.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "season counts matching open calls by deadline, leaving out tracked, hidden, excluded and undated calls",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.account_taxonomy_preferences') is not null and to_regclass('public.creator_recommendation_feedback') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const p = `seasonmatch-${randomBytes(4).toString("hex")}`;
    const account = `${p}-account`;
    const source = `${p}-source`;
    const term = (name: string) => `${p}-${name}`;
    const opp = (name: string) => `${p}-${name}`;
    try {
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${p}@example.invalid`]);
      const range = (
        await pool.query<{ from: string; to: string; soon: string; later: string }>(
          "select current_date::text as from, (current_date+60)::text as to, (current_date+10)::text as soon, (current_date+20)::text as later",
        )
      ).rows[0]!;

      // No preferences yet: nothing can match.
      assert.deepEqual(await countSeasonMatchingOpenCalls(pool, account, range), { hasPreferences: false, deadlines: [] });

      await pool.query("insert into taxonomy_schemes(id,key,label,description) values($1,$1,'Fixture','Fixture')", [`${p}-scheme`]);
      await pool.query(
        `insert into taxonomy_facets(id,scheme_id,key,label,description) values
           ($1,$3,'discipline','Discipline','Fixture'),($2,$3,'genre','Genre','Fixture')`,
        [`${p}-discipline`, `${p}-genre`, `${p}-scheme`],
      );
      await pool.query(
        `insert into taxonomy_terms(id,facet_id,slug,preferred_label) values
           ($1,$4,$1,'Poetry'),($2,$5,$2,'Haiku'),($3,$5,$3,'Erotica')`,
        [term("poetry"), term("haiku"), term("erotica"), `${p}-discipline`, `${p}-genre`],
      );
      await pool.query(
        "insert into taxonomy_term_relations(subject_term_id,object_term_id,relation_type) values($1,$2,'broader')",
        [term("haiku"), term("poetry")],
      );
      await pool.query(
        `insert into account_taxonomy_preferences(account_id,term_id,preference) values
           ($1,$2,'include'),($1,$3,'exclude')`,
        [account, term("poetry"), term("erotica")],
      );
      await pool.query(
        "insert into opportunity_sources(id,name,url,kind) values($1,'Season fixture','https://example.invalid/season','organization-website')",
        [source],
      );
      const publish = async (name: string, deadlineDays: number, terms: string[], kind = "exact") => {
        const id = opp(name);
        await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url)
           values($1,$1,$2,$3,'open','reviewable','grant',$5,case when $5='exact' then current_date+$4::int end,'https://example.invalid/submit')`,
          [id, `Fixture ${name}`, source, deadlineDays, kind],
        );
        await pool.query(
          `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
           values($1,$2,$3,'organization-website','Season fixture','https://example.invalid/season',now(),now(),true,true)`,
          [`${id}-evidence`, id, source],
        );
        await pool.query(
          "insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status) values($1,'x','x','{}'::jsonb,'approved')",
          [id],
        );
        await pool.query("update opportunities set publication_state='published' where id=$1", [id]);
        for (const name of terms)
          await pool.query(
            "insert into opportunity_taxonomy_terms(opportunity_id,term_id,assignment_origin,certainty) values($1,$2,'reviewer','confirmed')",
            [id, term(name)],
          );
      };
      await publish("soon-a", 10, ["haiku"]);
      await publish("soon-b", 10, ["poetry"]);
      await publish("later", 20, ["poetry"]);
      await publish("beyond", 90, ["poetry"]);
      await publish("excluded", 10, ["poetry", "erotica"]);
      await publish("tracked", 10, ["poetry"]);
      await publish("hidden", 20, ["poetry"]);
      await publish("rolling", 0, ["poetry"], "rolling");
      await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')", [
        `${p}-tracked`,
        account,
        opp("tracked"),
      ]);
      await pool.query(
        "insert into creator_recommendation_feedback(account_id,opportunity_id,context_key,hidden,reason) values($1,$2,'[null,null]',true,'not-relevant')",
        [account, opp("hidden")],
      );

      const result = await countSeasonMatchingOpenCalls(pool, account, range);
      assert.equal(result.hasPreferences, true);
      assert.deepEqual(result.deadlines, [
        { date: range.soon, count: 2 },
        { date: range.later, count: 1 },
      ]);
    } finally {
      await pool.query("delete from radar_accounts where id=$1", [account]);
      await pool.query("delete from opportunities where source_id=$1", [source]);
      await pool.query("delete from opportunity_sources where id=$1", [source]);
      await pool.query("delete from taxonomy_term_relations where subject_term_id like $1", [`${p}-%`]);
      await pool.query("delete from taxonomy_terms where id like $1", [`${p}-%`]);
      await pool.query("delete from taxonomy_facets where scheme_id=$1", [`${p}-scheme`]);
      await pool.query("delete from taxonomy_schemes where id=$1", [`${p}-scheme`]);
      await pool.end();
    }
  },
);
