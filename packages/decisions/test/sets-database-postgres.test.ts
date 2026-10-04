import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import {
  COUNTRY_QUESTION_KEY,
  applyDatabaseDecisions,
  databaseApplyTargets,
} from "../src/index.js";

// Runs against a database with the target schema through 0091, e.g.
// DATABASE_URL=postgres://missa:missa@localhost:5432/missa_schema_check
const databaseUrl = process.env.DATABASE_URL;

async function schemaReady(pool: pg.Pool): Promise<boolean> {
  const result = await pool.query(
    `select count(*)::int as n from information_schema.columns
      where table_name = 'data_decisions' and column_name = 'applied_from'`,
  );
  return result.rows[0].n === 1;
}

test(
  "apply writes approved live decisions once, cites them, and never overwrites",
  { skip: databaseUrl ? false : "DATABASE_URL is not set" },
  async (t) => {
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
    if (!(await schemaReady(pool))) {
      await pool.end();
      t.skip("Schema through 0091 is not applied");
      return;
    }
    const prefix = `database-test-${randomUUID()}`;
    const sourceId = `${prefix}:source`;
    const empty = `${prefix}:opp-empty`;
    const stated = `${prefix}:opp-stated`;
    const shadow = `${prefix}:opp-shadow`;
    const mediaId = `${prefix}:media`;
    const decision = (name: string) => `dec_${prefix}_${name}`;
    const cleanup = async () => {
      await pool.query(`delete from data_decisions where subject_id like $1`, [
        `${prefix}%`,
      ]);
      await pool.query(`delete from opportunities where id like $1`, [
        `${prefix}%`,
      ]);
      await pool.query(`delete from opportunity_sources where id = $1`, [
        sourceId,
      ]);
    };

    try {
      await pool.query(
        `insert into opportunity_sources (id, name, url, kind) values ($1, $2, $3, 'organization')`,
        [sourceId, `${prefix} source`, `https://example.invalid/${prefix}`],
      );
      for (const [id, country] of [
        [empty, null],
        [stated, "FR"],
        [shadow, null],
      ] as const) {
        await pool.query(
          `insert into opportunities
             (id, slug, title, source_id, status, publication_state, type, deadline_kind, fee_status, country_code)
           values ($1, $1, $1, $2, 'open', 'reviewable', 'grant', 'rolling', 'unknown', $3)`,
          [id, sourceId, country],
        );
      }
      await pool.query(
        `insert into opportunity_media_candidates
           (id, opportunity_id, original_url, resolved_url, page_url, source_role,
            candidate_kind, extraction_method, parser_version)
         values ($1, $2, 'https://example.invalid/a.png', 'https://example.invalid/a.png',
                 'https://example.invalid/page', 'official-opportunity-page', 'unknown', 'test', 'test')`,
        [mediaId, empty],
      );
      const insert = async (
        id: string,
        subjectType: string,
        subjectId: string,
        questionKey: string,
        answer: string,
        mode: "live" | "shadow",
      ) =>
        pool.query(
          `insert into data_decisions
             (id, subject_type, subject_id, question_key, question_version, question_kind,
              input_hash, answer, probability, route, mode, decider_kind, decider)
           values ($1, $2, $3, $4, 1, 'choice', $5, $6, 0.95, 'apply', $7, 'jev', 'jev')`,
          [id, subjectType, subjectId, questionKey, `hash-${id}`, answer, mode],
        );
      await insert(
        decision("empty"),
        "opportunity",
        empty,
        COUNTRY_QUESTION_KEY,
        "NG",
        "live",
      );
      await insert(
        decision("stated"),
        "opportunity",
        stated,
        COUNTRY_QUESTION_KEY,
        "NG",
        "live",
      );
      await insert(
        decision("shadow"),
        "opportunity",
        shadow,
        COUNTRY_QUESTION_KEY,
        "NG",
        "shadow",
      );
      await insert(
        decision("media"),
        "opportunity_media_candidate",
        mediaId,
        "media_candidate.candidate_kind",
        "venue-place",
        "live",
      );

      const targets = databaseApplyTargets({
        countryName: (code) => (code === "NG" ? "Nigeria" : null),
      });
      const questionKeys = [
        COUNTRY_QUESTION_KEY,
        "media_candidate.candidate_kind",
      ];
      const subjectIds = [empty, stated, shadow, mediaId];
      const ours = (ids: string[]) => ids.filter((id) => id.includes(prefix));

      const client = await pool.connect();
      try {
        const dry = await applyDatabaseDecisions(client, {
          targets,
          questionKeys,
          dryRun: true,
          subjectIds,
        });
        assert.deepEqual(
          ours(dry.applied.map((result) => result.decisionId)).sort(),
          [decision("empty"), decision("media")].sort(),
        );
        const untouched = await pool.query(
          `select country_code from opportunities where id = $1`,
          [empty],
        );
        assert.equal(
          untouched.rows[0].country_code,
          null,
          "dry run writes nothing",
        );

        const report = await applyDatabaseDecisions(client, {
          targets,
          questionKeys,
          dryRun: false,
          subjectIds,
        });
        assert.deepEqual(
          ours(report.applied.map((result) => result.decisionId)).sort(),
          [decision("empty"), decision("media")].sort(),
        );
        assert.ok(
          report.skipped.some(
            (skip) =>
              skip.decisionId === decision("stated") &&
              /already holds/.test(skip.reason),
          ),
        );

        const again = await applyDatabaseDecisions(client, {
          targets,
          questionKeys,
          dryRun: false,
          subjectIds,
        });
        assert.deepEqual(
          ours(again.applied.map((result) => result.decisionId)),
          [],
        );
      } finally {
        client.release();
      }

      const opportunities = await pool.query(
        `select id, country_code, country from opportunities where id like $1 order by id`,
        [`${prefix}%`],
      );
      const byId = Object.fromEntries(
        opportunities.rows.map((row) => [row.id, row]),
      );
      assert.equal(byId[empty].country_code, "NG");
      assert.equal(byId[empty].country, "Nigeria");
      assert.equal(
        byId[stated].country_code,
        "FR",
        "a stated value is never overwritten",
      );
      assert.equal(
        byId[shadow].country_code,
        null,
        "shadow decisions are never applied",
      );

      const media = await pool.query(
        `select candidate_kind, metadata from opportunity_media_candidates where id = $1`,
        [mediaId],
      );
      assert.equal(media.rows[0].candidate_kind, "venue/place");
      assert.equal(
        media.rows[0].metadata.decisions.candidate_kind,
        `data_decisions:${decision("media")}`,
      );
      assert.equal(media.rows[0].metadata.candidate_kind_previous, "unknown");

      const ledger = await pool.query(
        `select id, status, applied_at is not null as applied, applied_from
           from data_decisions where subject_id like $1 order by id`,
        [`${prefix}%`],
      );
      const status = Object.fromEntries(
        ledger.rows.map((row) => [
          row.id,
          [row.status, row.applied, row.applied_from],
        ]),
      );
      assert.deepEqual(status[decision("empty")], ["applied", true, null]);
      assert.deepEqual(status[decision("media")], ["applied", true, "unknown"]);
      assert.deepEqual(status[decision("stated")], ["proposed", false, null]);
      assert.deepEqual(status[decision("shadow")], ["proposed", false, null]);
    } finally {
      await cleanup();
      await pool.end();
    }
  },
);
