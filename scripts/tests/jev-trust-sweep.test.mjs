import assert from "node:assert/strict";
import test from "node:test";
import {
  createJevClient,
  createMemoryDecisionLedger,
} from "../../packages/decisions/dist/src/index.js";
import {
  PUBLISHED_OPPORTUNITIES_SQL,
  TRUST_REVIEW_REASON,
  runTrustSweep,
  trustReviewIdempotencyKey,
  trustReviewSignals,
} from "../jev-trust-sweep.mjs";

const rows = [
  {
    id: "trust_opp_1",
    title: "Pay-to-enter prize",
    fee_status: "paid",
    fee_cents: 9500,
    fee_currency: "USD",
    prize: "Publication",
    source_url: "https://example.org/prize",
    prizes: [],
  },
  {
    id: "trust_opp_2",
    title: "Free residency",
    fee_status: "no-fee",
    source_url: "https://example.org/residency",
    prizes: [],
  },
];

function fakeDb({ decided = [] } = {}) {
  const cases = [];
  return {
    cases,
    async query(text, values) {
      if (text === PUBLISHED_OPPORTUNITIES_SQL)
        return {
          rows: values[0] ? rows.filter((row) => row.id === values[0]) : rows,
        };
      if (text.includes("from data_decisions"))
        return { rows: decided.includes(values[0]) ? [{}] : [] };
      if (text.includes("insert into opportunity_issue_reports")) {
        if (cases.some((existing) => existing.opportunityId === values[2]))
          return { rows: [] };
        cases.push({
          id: values[0],
          accountId: values[1],
          opportunityId: values[2],
          reason: values[3],
          note: values[4],
          key: values[5],
        });
        return { rows: [{ id: values[0] }] };
      }
      throw new Error(`Unexpected query: ${text.slice(0, 60)}`);
    },
  };
}

/** Flags the first call as likely predatory with a rights grab; the second is legitimate. */
function fakeClient() {
  const requests = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    requests.push(body);
    const risky = body.state.title === "Pay-to-enter prize";
    const answers = {};
    for (const [id, question] of Object.entries(body.questions)) {
      answers[id] =
        question.type === "score"
          ? {
              type: "score",
              score: risky ? 2 : 0,
              legend: {},
              probabilities: risky
                ? { 0: 0.02, 1: 0.03, 2: 0.95 }
                : { 0: 0.96, 1: 0.03, 2: 0.01 },
              confidence: 0.92,
            }
          : {
              type: "noul",
              noul:
                risky && question.instructions.includes("takes all rights")
                  ? 0.96
                  : 0.04,
            };
    }
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  };
  return {
    client: createJevClient({ apiKey: "k", fetch: fetchImpl, maxRetries: 0 }),
    requests,
  };
}

test("shadow sweeps record every answer and open no case", async () => {
  const db = fakeDb();
  const ledger = createMemoryDecisionLedger();
  const { client, requests } = fakeClient();
  const summary = await runTrustSweep({
    db,
    client,
    ledger,
    mode: "shadow",
    reviewAccountId: "acct_admin",
    log: () => {},
  });
  assert.equal(summary.decided, 2);
  assert.equal(summary.flagged, 0);
  assert.equal(db.cases.length, 0);
  assert.equal(requests.length, 2, "one request per call");
  assert.equal(ledger.records.length, 10);
  assert.ok(
    ledger.records.every(
      (record) =>
        record.subjectType === "opportunity" && record.mode === "shadow",
    ),
  );
});

test("live sweeps only open an admin case for flagged calls, once", async () => {
  const db = fakeDb();
  const { client } = fakeClient();
  const run = () =>
    runTrustSweep({
      db,
      client,
      ledger: createMemoryDecisionLedger(),
      mode: "live",
      reviewAccountId: "acct_admin",
      log: () => {},
    });
  const first = await run();
  assert.equal(first.flagged, 1);
  assert.equal(first.casesOpened, 1);
  assert.equal(db.cases[0].opportunityId, "trust_opp_1");
  assert.equal(db.cases[0].reason, TRUST_REVIEW_REASON);
  assert.match(db.cases[0].note, /likely-predatory, rights_grab/);
  const second = await run();
  assert.equal(second.casesOpened, 0);
  assert.equal(db.cases.length, 1);
});

test("live sweeps without a review account record only", async () => {
  const db = fakeDb();
  const { client } = fakeClient();
  const summary = await runTrustSweep({
    db,
    client,
    ledger: createMemoryDecisionLedger(),
    mode: "live",
    log: () => {},
  });
  assert.equal(summary.flagged, 1);
  assert.equal(db.cases.length, 0);
});

test("calls already decided for the same input are skipped", async () => {
  const db = fakeDb({ decided: ["trust_opp_1"] });
  const { client, requests } = fakeClient();
  const summary = await runTrustSweep({
    db,
    client,
    ledger: createMemoryDecisionLedger(),
    mode: "shadow",
    log: () => {},
  });
  assert.equal(summary.skipped, 1);
  assert.equal(requests.length, 1);
});

test("a Jev failure is counted and nothing is opened", async () => {
  const db = fakeDb();
  const client = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: async () => new Response("bad", { status: 400 }),
  });
  const summary = await runTrustSweep({
    db,
    client,
    ledger: createMemoryDecisionLedger(),
    mode: "live",
    reviewAccountId: "acct_admin",
    log: () => {},
  });
  assert.equal(summary.errors, 2);
  assert.equal(db.cases.length, 0);
});

test("signals need live, confident answers", () => {
  assert.deepEqual(
    trustReviewSignals({
      "opportunity.rights_grab": { actionable: false, route: "apply" },
    }),
    [],
  );
  assert.deepEqual(
    trustReviewSignals({
      "opportunity.predatory_risk": {
        actionable: true,
        route: "apply",
        answer: "legitimate",
      },
    }),
    [],
  );
  assert.match(
    trustReviewIdempotencyKey("opp", "hash"),
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});
