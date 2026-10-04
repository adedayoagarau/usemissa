import assert from "node:assert/strict";
import test from "node:test";
import {
  createJevClient,
  createMemoryDecisionLedger,
  decide,
  decisionModeFromEnv,
  defineQuestion,
  inputHash,
  routeAnswer,
  validateQuestion,
  type JevResponse,
  type QuestionDefinition,
} from "../src/index.js";

const isSingleCall = defineQuestion({
  key: "opportunity.is_single_call",
  version: 1,
  subjectType: "opportunity",
  dataClass: "public",
  question: { type: "noul", instructions: "Is this page one opportunity?" },
  policy: { kind: "noul", acceptAtOrAbove: 0.9, rejectAtOrBelow: 0.1 },
});

const feeStatus = defineQuestion({
  key: "opportunity.fee_status",
  version: 1,
  subjectType: "opportunity",
  fieldName: "fee_status",
  dataClass: "public",
  question: {
    type: "choice",
    instructions: "What does the page say about an entry fee?",
    criteria: {
      "no-fee": "No fee",
      paid: "A fee is charged",
      unknown: "Not stated",
    },
  },
  policy: { kind: "choice", minProbability: 0.85, alwaysReview: ["unknown"] },
});

const emailStatus = defineQuestion({
  key: "tracker.email_status",
  version: 1,
  subjectType: "email",
  dataClass: "creator-private",
  question: {
    type: "choice",
    instructions: "What does this email say about the application?",
    criteria: { accepted: "Accepted", declined: "Declined", other: "Other" },
  },
  policy: { kind: "choice", minProbability: 0.9 },
});

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ url: string; body: unknown; auth: string | null }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      auth: new Headers(init.headers).get("authorization"),
    });
    const next = responses.shift();
    if (!next) throw new Error("No more fake responses");
    return new Response(JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

test("noul answers route by the question's thresholds", () => {
  const route = (noul: number) =>
    routeAnswer(isSingleCall, { type: "noul", noul }, "live").route;
  assert.equal(route(0.95), "apply");
  assert.equal(route(0.5), "review");
  assert.equal(route(0.05), "reject");
  const shadow = routeAnswer(
    isSingleCall,
    { type: "noul", noul: 0.99 },
    "shadow",
  );
  assert.equal(shadow.route, "apply");
  assert.equal(
    shadow.actionable,
    false,
    "shadow decisions are never actionable",
  );
});

test("choice answers apply only above threshold and never for review-only options", () => {
  const apply = routeAnswer(
    feeStatus,
    {
      type: "choice",
      choice: "paid",
      probabilities: { paid: 0.9, "no-fee": 0.1, unknown: 0 },
      confidence: 0.8,
    },
    "live",
  );
  assert.equal(apply.route, "apply");
  assert.equal(apply.actionable, true);

  const low = routeAnswer(
    feeStatus,
    {
      type: "choice",
      choice: "paid",
      probabilities: { paid: 0.6, "no-fee": 0.4 },
      confidence: 0.2,
    },
    "live",
  );
  assert.equal(low.route, "review");

  const unknown = routeAnswer(
    feeStatus,
    {
      type: "choice",
      choice: "unknown",
      probabilities: { unknown: 0.99 },
      confidence: 0.98,
    },
    "live",
  );
  assert.equal(unknown.route, "review");

  const offOption = routeAnswer(
    feeStatus,
    {
      type: "choice",
      choice: "free",
      probabilities: { free: 1 },
      confidence: 1,
    },
    "live",
  );
  assert.equal(offOption.route, "unavailable");
});

test("score answers map level indexes to labels", () => {
  const usefulness = defineQuestion({
    key: "content.usefulness",
    version: 1,
    subjectType: "opportunity_content",
    dataClass: "public",
    question: {
      type: "score",
      instructions: "How useful?",
      criteria: ["poor", "fair", "good"],
    },
    policy: { kind: "score", minConfidence: 0.8 },
  });
  const outcome = routeAnswer(
    usefulness,
    {
      type: "score",
      score: 1.9,
      legend: { "0": "poor", "1": "fair", "2": "good" },
      probabilities: { "0": 0, "1": 0.1, "2": 0.9 },
      confidence: 0.85,
    },
    "live",
  );
  assert.equal(outcome.answer, "good");
  assert.equal(outcome.route, "apply");
  assert.deepEqual(outcome.distribution, { poor: 0, fair: 0.1, good: 0.9 });
});

test("invalid definitions are rejected at definition time", () => {
  assert.throws(() =>
    defineQuestion({
      ...isSingleCall,
      policy: { kind: "noul", acceptAtOrAbove: 0.4, rejectAtOrBelow: 0.1 },
    }),
  );
  const tooFew: QuestionDefinition = {
    ...feeStatus,
    question: { type: "choice", instructions: "x", criteria: { only: "one" } },
    policy: { kind: "choice", minProbability: 0.9 },
  };
  assert.ok(validateQuestion(tooFew).length > 0);
});

test("decide asks every question in one call and records each answer", async () => {
  const response: JevResponse = {
    model: "jev-1.13.0",
    answers: {
      q0: { type: "noul", noul: 0.97 },
      q1: {
        type: "choice",
        choice: "no-fee",
        probabilities: { "no-fee": 0.93, paid: 0.07 },
        confidence: 0.9,
      },
    },
    usage: { input_tokens: 300, output_tokens: 20 },
  };
  const { fetchImpl, calls } = fakeFetch([{ status: 200, body: response }]);
  const client = createJevClient({ apiKey: "test-key", fetch: fetchImpl });
  const ledger = createMemoryDecisionLedger();
  const state = { title: "Spring Residency", guidelines: "No entry fee." };

  const result = await decide({
    client,
    ledger,
    mode: "shadow",
    subjectId: "opp_1",
    state,
    questions: [isSingleCall, feeStatus],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://thejevai.com/v1/systemone");
  assert.equal(calls[0]!.auth, "Bearer test-key");
  assert.deepEqual(
    Object.keys((calls[0]!.body as { questions: object }).questions),
    ["q0", "q1"],
  );
  assert.equal(result.outcomes["opportunity.is_single_call"]!.route, "apply");
  assert.equal(result.outcomes["opportunity.fee_status"]!.answer, "no-fee");
  assert.equal(ledger.records.length, 2);
  assert.equal(ledger.records[1]!.fieldName, "fee_status");
  assert.equal(ledger.records[1]!.deciderVersion, "jev-1.13.0");
  assert.equal(ledger.records[1]!.inputHash, inputHash(state));
  assert.equal(ledger.records[1]!.mode, "shadow");
});

test("decide never sends creator-private state without permission", async () => {
  const { fetchImpl, calls } = fakeFetch([]);
  const client = createJevClient({ apiKey: "test-key", fetch: fetchImpl });
  const result = await decide({
    client,
    mode: "live",
    subjectId: "email_1",
    state: "Congratulations!",
    questions: [emailStatus],
  });
  assert.equal(calls.length, 0);
  assert.equal(result.outcomes["tracker.email_status"]!.route, "unavailable");
});

test("decide falls back to unavailable when Jev is missing or failing", async () => {
  const unconfigured = await decide({
    client: createJevClient({}),
    mode: "live",
    subjectId: "opp_1",
    state: "x",
    questions: [isSingleCall],
  });
  assert.equal(
    unconfigured.outcomes["opportunity.is_single_call"]!.route,
    "unavailable",
  );

  const { fetchImpl, calls } = fakeFetch([
    { status: 529, body: {} },
    { status: 529, body: {} },
  ]);
  const ledger = createMemoryDecisionLedger();
  const failing = await decide({
    client: createJevClient({
      apiKey: "k",
      fetch: fetchImpl,
      maxRetries: 1,
      sleep: async () => {},
    }),
    ledger,
    mode: "live",
    subjectId: "opp_1",
    state: "x",
    questions: [isSingleCall],
  });
  assert.equal(calls.length, 2, "retries once on overload");
  assert.equal(
    failing.outcomes["opportunity.is_single_call"]!.route,
    "unavailable",
  );
  assert.match(failing.error ?? "", /529/);
  assert.equal(ledger.records.length, 0);
});

test("client does not retry validation errors", async () => {
  const { fetchImpl, calls } = fakeFetch([
    { status: 422, body: { error: "bad" } },
  ]);
  const client = createJevClient({
    apiKey: "k",
    fetch: fetchImpl,
    sleep: async () => {},
  });
  await assert.rejects(
    client.evaluate("x", { a: { type: "noul", instructions: "?" } }),
    /422/,
  );
  assert.equal(calls.length, 1);
});

test("the same input is recorded once per question version", async () => {
  const ledger = createMemoryDecisionLedger();
  for (let i = 0; i < 2; i += 1) {
    const { fetchImpl } = fakeFetch([
      {
        status: 200,
        body: { model: "jev-1", answers: { q0: { type: "noul", noul: 0.2 } } },
      },
    ]);
    await decide({
      client: createJevClient({ apiKey: "k", fetch: fetchImpl }),
      ledger,
      mode: "shadow",
      subjectId: "opp_1",
      state: { b: 1, a: 2 },
      questions: [isSingleCall],
    });
  }
  assert.equal(ledger.records.length, 1);
});

test("modes default to shadow and can be switched per scope", () => {
  assert.equal(decisionModeFromEnv("review", {}), "shadow");
  assert.equal(
    decisionModeFromEnv("review", { DECISIONS_MODE: "live" }),
    "live",
  );
  assert.equal(
    decisionModeFromEnv("review.queue", {
      DECISIONS_MODE: "live",
      DECISIONS_MODE_REVIEW_QUEUE: "shadow",
    }),
    "shadow",
  );
});
