import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import {
  createJevClient,
  createMemoryDecisionLedger,
  type DecisionMode,
} from "@missa/decisions";
import {
  buildWeeklyDigest,
  creatorFitRankingFromEnv,
  type CreatorFitRanking,
} from "../src/index.js";

const row = (id: string, reason = "Because you chose Poetry") => ({
  id,
  title: `Call ${id}`,
  organization_name: "Org",
  deadline: "2026-10-20",
  reason,
  type: "grant",
  fee_status: "no-fee",
  fee_cents: 0,
  fee_currency: null,
  prize: null,
});

/** Answers each digest query by its SQL shape; records every query. */
function fakePool() {
  const queries: string[] = [];
  const pool = {
    async query(text: string) {
      queries.push(text);
      if (text.includes("interval '7 days'"))
        return { rows: [row("new-1"), row("new-2"), row("new-3")] };
      if (text.includes("current_date+14"))
        return { rows: [row("close-1"), row("close-2")] };
      if (text.includes("current_date+21"))
        return { rows: [row("saved-1", "You saved this")] };
      if (text.includes("given_name")) return { rows: [{ given_name: "Ada" }] };
      if (text.includes("from radar_accounts a"))
        return {
          rows: [
            {
              disciplines: ["literature"],
              genres: ["poetry"],
              types: [],
              career_stages: ["emerging"],
              locations: [],
              no_fee_only: false,
              travel_willingness: "any",
              country_code: "NG",
              city: "Lagos",
            },
          ],
        };
      if (text.includes("select id,discipline,genres"))
        return {
          rows: [
            {
              id: "new-3",
              discipline: "literature",
              genres: ["poetry"],
              location: "Lagos",
              country_code: "NG",
            },
          ],
        };
      throw new Error(`unexpected query: ${text.slice(0, 80)}`);
    },
  };
  return { pool: pool as unknown as Pool, queries };
}

// Levels by opportunity; the fake Jev reads the title from the state.
const LEVELS: Record<string, number> = {
  "new-1": 0,
  "new-2": 2,
  "new-3": 3,
  "close-1": 1,
  "close-2": 3,
};

function ranking(mode: DecisionMode, allowCreatorPrivateData = true) {
  const states: unknown[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    states.push(body.state ?? body.input ?? body);
    const serialized = JSON.stringify(body);
    const id = Object.keys(LEVELS).find((key) =>
      serialized.includes(`Call ${key}`),
    );
    const answers: Record<string, unknown> = {};
    for (const [questionId, question] of Object.entries(
      body.questions as Record<string, { type: string }>,
    )) {
      if (question.type === "noul")
        answers[questionId] = { type: "noul", noul: 0.95 };
      else {
        const level = LEVELS[id!] ?? 2;
        const probabilities = Object.fromEntries(
          [0, 1, 2, 3].map((index) => [
            String(index),
            index === level ? 0.94 : 0.02,
          ]),
        );
        answers[questionId] = {
          type: "score",
          score: level,
          legend: {},
          probabilities,
          confidence: 0.92,
        };
      }
    }
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  const ledger = createMemoryDecisionLedger();
  const value: CreatorFitRanking = {
    client: createJevClient({
      apiKey: "k",
      fetch: fetchImpl,
      allowCreatorPrivateData,
    }),
    ledger,
    mode,
    onError: (error) => {
      throw error;
    },
  };
  return { ranking: value, ledger, states };
}

const ids = (items: { opportunityId: string }[]) =>
  items.map((item) => item.opportunityId);

test("without creator fit the digest runs exactly today's queries", async () => {
  const { pool, queries } = fakePool();
  const digest = await buildWeeklyDigest(pool, "acct");
  assert.equal(queries.length, 4);
  assert.deepEqual(ids(digest.newForYou), ["new-1", "new-2", "new-3"]);
});

test("in shadow mode creator fit is recorded but the order is unchanged", async () => {
  const { pool } = fakePool();
  const plain = await buildWeeklyDigest(pool, "acct");
  const { ranking: shadow, ledger } = ranking("shadow");
  const digest = await buildWeeklyDigest(pool, "acct", 6, {
    creatorFit: shadow,
    digestKey: "weekly-digest:acct:2026-W40",
  });
  assert.deepEqual(digest, plain);
  const keys = ledger.records.map((record) => record.questionKey);
  assert.equal(
    keys.filter((key) => key === "creator_opportunity.fit").length,
    5,
  );
  assert.deepEqual(
    ledger.records
      .filter((record) => record.questionKey === "weekly_digest.worth_sending")
      .map((record) => [record.subjectId, record.mode]),
    [["weekly-digest:acct:2026-W40", "shadow"]],
  );
  assert.ok(ledger.records.every((record) => record.mode === "shadow"));
});

test("in live mode creator fit reorders within each section and never changes reasons", async () => {
  const { pool } = fakePool();
  const plain = await buildWeeklyDigest(pool, "acct");
  const { ranking: live, states } = ranking("live");
  const digest = await buildWeeklyDigest(pool, "acct", 6, { creatorFit: live });
  assert.deepEqual(ids(digest.newForYou), ["new-3", "new-2", "new-1"]);
  assert.deepEqual(ids(digest.closingSoon), ["close-2", "close-1"]);
  assert.deepEqual(
    digest.yourDeadlines,
    plain.yourDeadlines,
    "saved deadlines are never reordered",
  );
  const byId = (items: typeof plain.newForYou) =>
    new Map(items.map((item) => [item.opportunityId, item]));
  assert.deepEqual(
    byId(digest.newForYou),
    byId(plain.newForYou),
    "same items, same reasons",
  );
  assert.deepEqual(byId(digest.closingSoon), byId(plain.closingSoon));
  const sent = JSON.stringify(states);
  assert.ok(
    sent.includes("emerging") && sent.includes("poetry"),
    "the creator's declared practice is in the state",
  );
});

test("creator-private refusal keeps the digest unchanged and sends nothing", async () => {
  const { pool } = fakePool();
  const plain = await buildWeeklyDigest(pool, "acct");
  const { ranking: refused, ledger, states } = ranking("live", false);
  const digest = await buildWeeklyDigest(pool, "acct", 6, {
    creatorFit: refused,
  });
  assert.deepEqual(digest, plain);
  assert.equal(states.length, 0);
  assert.equal(ledger.records.length, 0);
});

test("the env factory stays off without a key or without the no-retention agreement", () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(creatorFitRankingFromEnv(db, {}), undefined);
  assert.equal(creatorFitRankingFromEnv(db, { JEV_API_KEY: "k" }), undefined);
  const enabled = creatorFitRankingFromEnv(db, {
    JEV_API_KEY: "k",
    JEV_ALLOW_CREATOR_PRIVATE_DATA: "1",
  });
  assert.equal(enabled?.mode, "shadow");
  assert.equal(
    creatorFitRankingFromEnv(db, {
      JEV_API_KEY: "k",
      JEV_ALLOW_CREATOR_PRIVATE_DATA: "1",
      DECISIONS_MODE_CREATOR_FIT: "live",
    })?.mode,
    "live",
  );
});
