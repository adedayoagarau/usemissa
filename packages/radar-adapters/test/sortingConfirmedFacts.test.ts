import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  searchOpportunitiesWithConfirmedFacts,
  type Opportunity,
} from "@missa/radar-engine";
import { createLedgerConfirmedFactsProvider } from "../src/index.js";

type Row = {
  subject_id: string;
  question_key: string;
  answer: string | null;
  route: string;
};

function fakeDb(rows: Row[]) {
  const calls: unknown[][] = [];
  return {
    calls,
    async query(_text: string, values: unknown[] = []) {
      calls.push(values);
      const ids = values[0] as string[];
      return { rows: rows.filter((row) => ids.includes(row.subject_id)) };
    },
  };
}

test("ledger facts map yes/no and fee answers, ignoring review and unknown", async () => {
  const db = fakeDb([
    {
      subject_id: "a",
      question_key: "opportunity.has_stipend",
      answer: "false",
      route: "reject",
    },
    {
      subject_id: "a",
      question_key: "opportunity.fee_status",
      answer: "paid",
      route: "apply",
    },
    {
      subject_id: "a",
      question_key: "opportunity.housing_provided",
      answer: "true",
      route: "review",
    },
    {
      subject_id: "b",
      question_key: "opportunity.fee_status",
      answer: "unknown",
      route: "apply",
    },
    {
      subject_id: "b",
      question_key: "opportunity.studio_provided",
      answer: "true",
      route: "apply",
    },
    {
      subject_id: "b",
      question_key: "opportunity.emerging_only",
      answer: "true",
      route: "apply",
    },
    {
      subject_id: "b",
      question_key: "opportunity.international_ok",
      answer: "false",
      route: "reject",
    },
  ]);
  const provider = createLedgerConfirmedFactsProvider(db);
  const facts = await provider.factsFor(["a", "b", "c"]);
  assert.deepEqual(facts.get("a"), { hasStipend: false, feeStatus: "paid" });
  assert.deepEqual(facts.get("b"), {
    studioProvided: true,
    emergingOnly: true,
    internationalOk: false,
  });
  assert.equal(facts.has("c"), false);
});

test("ledger lookups are cached, including misses, until the TTL passes", async () => {
  let clock = 0;
  const db = fakeDb([
    {
      subject_id: "a",
      question_key: "opportunity.has_stipend",
      answer: "true",
      route: "apply",
    },
  ]);
  const provider = createLedgerConfirmedFactsProvider(db, {
    ttlMs: 1000,
    now: () => clock,
  });
  await provider.factsFor(["a", "b"]);
  await provider.factsFor(["a", "b"]);
  assert.equal(db.calls.length, 1, "second lookup is served from cache");
  await provider.factsFor(["a", "c"]);
  assert.deepEqual(db.calls[1]![0], ["c"], "only uncached ids are queried");
  clock = 2000;
  await provider.factsFor(["a"]);
  assert.equal(db.calls.length, 3, "expired entries are reloaded");
});

test("question keys can follow the reading set's names", async () => {
  const db = fakeDb([
    {
      subject_id: "a",
      question_key: "opportunity.pays_stipend",
      answer: "true",
      route: "apply",
    },
  ]);
  const provider = createLedgerConfirmedFactsProvider(db, {
    questionKeys: { hasStipend: "opportunity.pays_stipend" },
  });
  assert.deepEqual((await provider.factsFor(["a"])).get("a"), {
    hasStipend: true,
  });
  assert.ok((db.calls[0]![1] as string[]).includes("opportunity.pays_stipend"));
});

/**
 * Real-Postgres coverage for the ledger query: only live or applied, not
 * superseded, latest-per-question decisions count. Skipped without
 * DATABASE_URL or migration 0088.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "ledger provider reads only live, latest, confident decisions",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const ready = await pool.query<{ ready: boolean }>(
      "select to_regclass('public.data_decisions') is not null as ready",
    );
    if (!ready.rows[0]!.ready) {
      await pool.end();
      t.skip("data_decisions is not applied to this database");
      return;
    }
    const p = `sorting-test-${randomBytes(4).toString("hex")}`;
    const insert = (
      subject: string,
      key: string,
      answer: string,
      route: string,
      mode: string,
      status: string,
      createdSecondsAgo: number,
    ) =>
      pool.query(
        `insert into data_decisions(id,subject_type,subject_id,question_key,question_version,question_kind,input_hash,answer,route,mode,status,decider_kind,decider,created_at)
       values($1,'opportunity',$2,$3,1,'noul',$1,$4,$5,$6,$7,'jev','jev',now()-make_interval(secs=>$8::int))`,
        [
          `${p}-${randomBytes(4).toString("hex")}`,
          subject,
          key,
          answer,
          route,
          mode,
          status,
          createdSecondsAgo,
        ],
      );
    try {
      // Shadow decisions never count, however confident.
      await insert(
        `${p}-shadow`,
        "opportunity.has_stipend",
        "false",
        "reject",
        "shadow",
        "proposed",
        10,
      );
      // Live and confident: a reading fee that keyword reading took for a stipend.
      await insert(
        `${p}-live`,
        "opportunity.has_stipend",
        "false",
        "reject",
        "live",
        "proposed",
        10,
      );
      await insert(
        `${p}-live`,
        "opportunity.housing_provided",
        "true",
        "apply",
        "live",
        "applied",
        10,
      );
      // A newer review hides an older confident decision.
      await insert(
        `${p}-newer-review`,
        "opportunity.has_stipend",
        "true",
        "apply",
        "live",
        "applied",
        20,
      );
      await insert(
        `${p}-newer-review`,
        "opportunity.has_stipend",
        "true",
        "review",
        "live",
        "proposed",
        5,
      );
      // A superseded decision is ignored.
      await insert(
        `${p}-superseded`,
        "opportunity.studio_provided",
        "true",
        "apply",
        "live",
        "superseded",
        5,
      );

      const provider = createLedgerConfirmedFactsProvider(pool);
      const ids = ["shadow", "live", "newer-review", "superseded"].map(
        (name) => `${p}-${name}`,
      );
      const facts = await provider.factsFor(ids);
      assert.deepEqual([...facts.keys()], [`${p}-live`]);
      assert.deepEqual(facts.get(`${p}-live`), {
        hasStipend: false,
        housingProvided: true,
      });

      const opportunity = {
        id: `${p}-live`,
        createdAt: "2026-08-01T00:00:00.000Z",
        status: "open",
        fields: {
          title: "Poetry Prize",
          type: "magazine",
          genres: [],
          deadline: { kind: "exact", date: "2026-11-01" },
          fee: { disclosed: false },
          eligibility: [],
          requiredMaterials: [],
          contactEmailPresent: false,
          prize: "$1,000 prize",
        },
        sourceId: "src",
        sourceUrl: "https://example.invalid",
        alternateSourceIds: [],
        scores: { freshness: 90, confidence: 90, trust: 80 },
        trustSignals: [],
        lastCheckedAt: "2026-08-01T00:00:00.000Z",
        lastChangedAt: "2026-08-01T00:00:00.000Z",
        lastExtractionConfidence: 90,
        lastOpenSignal: true,
        lastClosedSignal: false,
        lastSuspiciousSignals: [],
        pastCycles: [],
        conflicts: [],
      } as Opportunity;
      const result = await searchOpportunitiesWithConfirmedFacts(
        [opportunity],
        {},
        provider,
      );
      assert.equal(
        result.items[0]!.hasStipend,
        false,
        "the confirmed fact overrides the keyword reading",
      );
      assert.equal(result.items[0]!.housingProvided, true);
    } finally {
      await pool.query("delete from data_decisions where subject_id like $1", [
        `${p}-%`,
      ]);
      await pool.end();
    }
  },
);
