import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { buildWeeklyDigest, weeklyDigestKey, weeklyDigestRecipients } from "../src/index.js";

/**
 * Real-Postgres coverage for weekly digest selection. Runs in CI's
 * target-schema job; skipped without DATABASE_URL or the creator schema.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "weekly digest matches preferences, honours exclusions and separates saved deadlines",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const schema = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.account_taxonomy_preferences') is not null and to_regclass('public.platform_message_effects') is not null as ready",
    );
    if (!schema.rows[0]!.ready) {
      await pool.end();
      t.skip("creator target schema is not applied to this database");
      return;
    }
    const p = `digest-${randomBytes(4).toString("hex")}`;
    const account = `${p}-account`;
    const source = `${p}-source`;
    const term = (name: string) => `${p}-${name}`;
    const opp = (name: string) => `${p}-${name}`;
    try {
      await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${p}@example.invalid`]);
      await pool.query("insert into taxonomy_schemes(id,key,label,description) values($1,$1,'Fixture','Fixture')", [`${p}-scheme`]);
      await pool.query(
        `insert into taxonomy_facets(id,scheme_id,key,label,description) values
           ($1,$3,'discipline','Discipline','Fixture'),($2,$3,'genre','Genre','Fixture')`,
        [`${p}-discipline`, `${p}-genre`, `${p}-scheme`],
      );
      await pool.query(
        `insert into taxonomy_terms(id,facet_id,slug,preferred_label) values
           ($1,$5,$1,'Poetry'),($2,$6,$2,'Haiku'),($3,$5,$3,'Fiction'),($4,$6,$4,'Erotica')`,
        [term("poetry"), term("haiku"), term("fiction"), term("erotica"), `${p}-discipline`, `${p}-genre`],
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
        "insert into opportunity_sources(id,name,url,kind) values($1,'Digest fixture','https://example.invalid/digest','organization-website')",
        [source],
      );
      const publish = async (name: string, deadlineDays: number, createdDaysAgo: number, terms: string[]) => {
        const id = opp(name);
        await pool.query(
          `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,deadline_date,submission_url,created_at)
           values($1,$1,$2,$3,'open','reviewable','grant','exact',current_date+$4::int,'https://example.invalid/submit',now()-make_interval(days=>$5::int))`,
          [id, `Fixture ${name}`, source, deadlineDays, createdDaysAgo],
        );
        await pool.query(
          `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
           values($1,$2,$3,'organization-website','Digest fixture','https://example.invalid/digest',now(),now(),true,true)`,
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
      await publish("new-haiku", 30, 0, ["haiku"]);
      await publish("excluded", 30, 0, ["poetry", "erotica"]);
      await publish("closing", 5, 30, ["poetry"]);
      await publish("fiction", 5, 0, ["fiction"]);
      await publish("saved", 10, 30, ["poetry"]);
      await pool.query(
        "insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'preparing')",
        [`${p}-tracked`, account, opp("saved")],
      );

      const digest = await buildWeeklyDigest(pool, account);
      assert.deepEqual(digest.newForYou.map((row) => row.opportunityId), [opp("new-haiku")]);
      assert.equal(digest.newForYou[0]!.reason, "Because you chose Poetry", "narrower terms match the chosen term");
      assert.deepEqual(digest.closingSoon.map((row) => row.opportunityId), [opp("closing")]);
      assert.deepEqual(digest.yourDeadlines.map((row) => row.opportunityId), [opp("saved")]);
      const everywhere = [...digest.newForYou, ...digest.closingSoon].map((row) => row.opportunityId);
      assert.ok(!everywhere.includes(opp("excluded")), "an exclusion always wins");
      assert.ok(!everywhere.includes(opp("fiction")), "unmatched practice is left out");
      assert.ok(!everywhere.includes(opp("saved")), "saved items are not rediscovered");

      // Delivery timing: Sunday 18:00 or later in the account's timezone.
      const timing = await pool.query<{ ready: boolean }>(
        "select count(*) = 1 as ready from information_schema.columns where table_name='notification_preferences' and column_name='timezone'",
      );
      if (timing.rows[0]!.ready) {
        const zones = await pool.query<{ due: string | null; notDue: string | null }>(
          `select (select name from pg_timezone_names where extract(isodow from now() at time zone name)=7 and extract(hour from now() at time zone name)>=18 order by name limit 1) due,
                  (select name from pg_timezone_names where not (extract(isodow from now() at time zone name)=7 and extract(hour from now() at time zone name)>=18) order by name limit 1) "notDue"`,
        );
        await pool.query(
          "insert into notification_preferences(account_id,email_enabled,digest_cadence,timezone) values($1,true,'weekly',$2)",
          [account, zones.rows[0]!.notDue],
        );
        const mine = async () => (await weeklyDigestRecipients(pool, 10_000)).filter((row) => row.accountId === account);
        assert.equal((await mine()).length, 0, "not due outside Sunday evening");
        if (zones.rows[0]!.due) {
          await pool.query("update notification_preferences set timezone=$2 where account_id=$1", [account, zones.rows[0]!.due]);
          const due = await mine();
          assert.equal(due.length, 1, "due on Sunday evening in the account timezone");
          assert.equal(due[0]!.idempotencyKey, weeklyDigestKey(account, due[0]!.isoWeek));
          await pool.query(
            `insert into platform_message_effects(id,kind,provider,idempotency_key,status,tenant_key,template_key,template_version,recipient_account_id)
             values($1,'weekly-digest','resend',$2,'accepted','platform','weekly-digest','weekly.v1',$3)`,
            [`${p}-effect`, due[0]!.idempotencyKey, account],
          );
          assert.equal((await mine()).length, 0, "one digest per ISO week");
        }
      }
    } finally {
      await pool.query("delete from platform_message_effects where id=$1", [`${p}-effect`]);
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
