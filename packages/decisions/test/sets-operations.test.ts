import assert from "node:assert/strict";
import test from "node:test";
import {
  askOperations,
  createJevClient,
  createMemoryDecisionLedger,
  lengthenedIntervalHours,
  linkCloseState,
  linkShouldCloseNow,
  OperationsUsage,
  operationsDeciderFromEnv,
  operationsQuestions,
  questionRegistry,
  recheckCadence,
  recheckCadenceState,
  retryWillSucceed,
  routeAnswer,
  sourcePromotion,
  textDiff,
  validateQuestion,
  visibleText,
  worthExtracting,
  worthExtractingState,
  type JevAnswer,
} from "../src/index.js";

function fakeClient(answers: Record<string, JevAnswer>) {
  const calls: unknown[] = [];
  const client = createJevClient({
    apiKey: "k",
    fetch: (async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ model: "jev-test", answers }), {
        status: 200,
      });
    }) as typeof fetch,
  });
  return { client, calls };
}

test("every operations question is valid, public or operational, and keyed once", () => {
  for (const definition of operationsQuestions) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.ok(
      definition.dataClass === "public" ||
        definition.dataClass === "operational",
      definition.key,
    );
    assert.match(definition.key, /^operations\./);
  }
  assert.equal(
    questionRegistry(operationsQuestions).size,
    operationsQuestions.length,
  );
});

test("source promotion can never auto-accept", () => {
  const accept = routeAnswer(
    sourcePromotion,
    {
      type: "choice",
      choice: "accept",
      probabilities: { accept: 0.99, reject: 0.01 },
      confidence: 0.99,
    },
    "live",
  );
  assert.equal(accept.route, "review");
  assert.equal(accept.actionable, false);
  const reject = routeAnswer(
    sourcePromotion,
    {
      type: "choice",
      choice: "reject",
      probabilities: { reject: 0.95 },
      confidence: 0.95,
    },
    "live",
  );
  assert.equal(reject.actionable, true);
});

test("worth-extracting state carries a bounded diff of visible text", () => {
  const before = visibleText(
    "<p>Deadline: May 1, 2026.</p><script>x()</script><p>Fee: none.</p>",
  );
  const after = visibleText(
    "<p>Deadline: June 1, 2026.</p><p>Fee: none.</p><nav>Home</nav>",
  );
  assert.deepEqual(textDiff(before, after), {
    removed: ["Deadline: May 1, 2026."],
    added: ["Deadline: June 1, 2026.", "Home"],
  });
  const state = worthExtractingState({
    pageRole: "detail",
    url: "https://example.org/call",
    previousText: before,
    currentText: after,
  }) as Record<string, unknown>;
  assert.equal(state.text_identical, false);
  const long = textDiff("", "word ".repeat(5_000));
  assert.ok(long.added.join("").length <= 1_500);
  assert.equal(
    (
      recheckCadenceState({
        hoursUntilDeadline: 50,
        changeHistory: "unchanged",
      }) as Record<string, unknown>
    ).deadline,
    "2 days away",
  );
  assert.equal(
    (
      linkCloseState({
        url: "https://a.org/x",
        status: 404,
        redirectTarget: "https://a.org/x",
      }) as Record<string, unknown>
    ).redirected_to,
    null,
  );
});

test("recheck intervals only lengthen, stay bounded and respect deadlines", () => {
  const outcome = (answer: string, mode: "live" | "shadow" = "live") =>
    routeAnswer(
      recheckCadence,
      {
        type: "choice",
        choice: answer,
        probabilities: { [answer]: 0.95 },
        confidence: 0.95,
      },
      mode,
    );
  assert.equal(
    lengthenedIntervalHours({
      currentHours: 24,
      outcome: outcome("7d"),
      maxHours: 4320,
    }),
    168,
  );
  assert.equal(
    lengthenedIntervalHours({
      currentHours: 168,
      outcome: outcome("6h"),
      maxHours: 4320,
    }),
    168,
  );
  assert.equal(
    lengthenedIntervalHours({
      currentHours: 24,
      outcome: outcome("30d"),
      maxHours: 72,
    }),
    72,
  );
  assert.equal(
    lengthenedIntervalHours({
      currentHours: 24,
      outcome: outcome("7d", "shadow"),
      maxHours: 4320,
    }),
    24,
  );
  assert.equal(
    lengthenedIntervalHours({
      currentHours: 24,
      outcome: outcome("7d"),
      maxHours: 4320,
      hoursUntilDeadline: 100,
    }),
    24,
  );
});

test("askOperations is a no-op without a key and records with one", async () => {
  assert.equal(operationsDeciderFromEnv({ env: {} }), undefined);
  assert.equal(
    await askOperations(undefined, "recheck", {
      subjectId: "operations_x",
      state: {},
      questions: [retryWillSucceed],
    }),
    null,
  );

  const { client, calls } = fakeClient({
    q0: { type: "noul", noul: 0.03 },
    q1: { type: "noul", noul: 0.5 },
  });
  const ledger = createMemoryDecisionLedger();
  const outcomes = await askOperations(
    { client, ledger, mode: () => "live" },
    "extract_gate",
    {
      subjectId: "operations_page",
      state: { url: "https://example.org" },
      questions: [worthExtracting, retryWillSucceed],
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(outcomes?.["operations.worth_extracting"]?.route, "reject");
  assert.equal(outcomes?.["operations.worth_extracting"]?.actionable, true);
  assert.equal(ledger.records.length, 2);

  const failing = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => new Response("no", { status: 400 })) as typeof fetch,
  });
  const failed = await askOperations(
    { client: failing, mode: () => "live" },
    "recheck",
    {
      subjectId: "operations_job",
      state: {},
      questions: [retryWillSucceed],
    },
  );
  assert.equal(failed?.["operations.retry_will_succeed"]?.route, "unavailable");
});

test("usage summary reports made, skipped and shadow savings per scope", () => {
  const usage = new OperationsUsage();
  assert.deepEqual(usage.summary(), []);
  usage.asked("extract_gate");
  usage.made("extract_gate", true);
  usage.asked("extract_gate");
  usage.skipped("extract_gate");
  assert.deepEqual(usage.summary(), [
    "[missa-decisions] usage scope=extract_gate jev_calls=2 made=1 skipped=1 shadow_would_skip=1",
  ]);
  usage.reset();
  assert.deepEqual(usage.summary(), []);
});

test("a link closes only on a live confident yes while HEAD is failing", async () => {
  const decider = (noul: number, mode: "live" | "shadow" = "live") => ({
    client: fakeClient({ q0: { type: "noul", noul } }).client,
    mode: () => mode,
  });
  const input = {
    subjectId: "operations_opp",
    url: "https://example.org/call",
    status: 500,
    snippet: "Page not found",
  };
  assert.equal(await linkShouldCloseNow(undefined, input), false);
  assert.equal(await linkShouldCloseNow(decider(0.97), input), true);
  assert.equal(await linkShouldCloseNow(decider(0.97, "shadow"), input), false);
  assert.equal(await linkShouldCloseNow(decider(0.6), input), false);
  assert.equal(
    await linkShouldCloseNow(decider(0.97), { ...input, status: 200 }),
    false,
  );
  const usage = new OperationsUsage();
  assert.equal(
    await linkShouldCloseNow(
      decider(0.97),
      { ...input, status: "network-error" },
      usage,
    ),
    true,
  );
  assert.equal(usage.get("link_check").skipped, 1);
});
