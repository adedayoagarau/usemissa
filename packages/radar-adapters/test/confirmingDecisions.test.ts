import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFIRMING_QUESTIONS,
  createJevClient,
  createMemoryDecisionLedger,
  type JevAnswer,
} from "@missa/decisions";
import {
  confirmDirectPublish,
  confirmEditorialReview,
  confirmingContextFromEnv,
  confirmLifecycleEvidence,
  directPublishMode,
  type ConfirmingContext,
} from "../src/confirmingDecisions.js";
import {
  classifyLifecycleEvidence,
  runLifecycleReconcilerBatch,
} from "../src/lifecycleReconciler.js";
import { PUBLICATION_RUBRIC_VERSION } from "../src/publicationRubric.js";
import { editorialReview, type ReviewCandidate } from "../src/reviewWorker.js";

type Answers = Record<string, JevAnswer>;

const choice = (value: string, probability = 0.97): JevAnswer => ({
  type: "choice",
  choice: value,
  probabilities: { [value]: probability },
  confidence: probability,
});
const noul = (probability: number): JevAnswer => ({
  type: "noul",
  noul: probability,
});

/** Answers by question key; the fake maps Jev's q0..qN ids back through the instructions. */
function fakeJev(answers: Answers, calls: unknown[] = []) {
  const keyByInstructions = new Map(
    CONFIRMING_QUESTIONS.map((definition) => [
      definition.question.instructions,
      definition.key,
    ]),
  );
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      state: unknown;
      questions: Record<string, { instructions: string }>;
    };
    calls.push(body.state);
    const out: Answers = {};
    for (const [id, question] of Object.entries(body.questions)) {
      const key = keyByInstructions.get(question.instructions);
      if (key && answers[key]) out[id] = answers[key];
    }
    return new Response(JSON.stringify({ model: "jev-test", answers: out }), {
      status: 200,
    });
  }) as typeof fetch;
  return createJevClient({ apiKey: "k", fetch: fetchImpl, maxRetries: 0 });
}

const silent = { warn: () => undefined };

function context(
  mode: "shadow" | "live",
  answers: Answers,
  calls: unknown[] = [],
) {
  const ledger = createMemoryDecisionLedger();
  const value: ConfirmingContext = {
    client: fakeJev(answers, calls),
    ledger,
    mode,
    logger: silent,
  };
  return { context: value, ledger };
}

const PUBLISH: Answers = {
  "opportunity.publication_route": choice("publish"),
  "opportunity.is_single_real_opportunity": noul(0.97),
  "opportunity.lifecycle_state": choice("open"),
  "opportunity.title_identifies_opportunity": noul(0.96),
  "opportunity.page_kind": choice("single-opportunity"),
};
const SUPPRESS: Answers = {
  "opportunity.publication_route": choice("suppress"),
  "opportunity.is_single_real_opportunity": noul(0.03),
  "opportunity.page_kind": choice("directory-or-roundup"),
};

function candidate(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
  return {
    opportunityId: "confirming_opp_1",
    title: "Example Poetry Prize",
    organizationName: "Example Review",
    status: "open",
    submissionState: "available",
    deadlineDate: "2026-12-01",
    submissionUrl: "https://example.org/submit",
    guidelinesUrl: "https://example.org/prize",
    sourceUrl: "https://example.org/prize",
    processingSucceededAt: "2026-10-01T00:00:00.000Z",
    // Unconfirmed organization: the rubric says needs-human.
    organizationConfirmed: false,
    callProfilePresent: true,
    readingPeriodKind: "exact",
    evidenceCount: 1,
    destinationReconciled: true,
    contentApproved: true,
    ...overrides,
  };
}

test("review: without a Jev key nothing is asked or recorded and the verdict is untouched", async () => {
  const item = candidate();
  const before = editorialReview(item, "auto");
  const ledger = createMemoryDecisionLedger();
  const noKey = {
    ...confirmingContextFromEnv("review_queue", undefined, {
      DECISIONS_MODE_REVIEW_QUEUE: "live",
    }),
    ledger,
  };
  const after = await confirmEditorialReview(
    noKey,
    item,
    before,
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(after, before);
  assert.equal(ledger.records.length, 0);
});

test("review: shadow records Jev, the rubric and the editorial verdict but changes nothing", async () => {
  const item = candidate();
  const before = editorialReview(item, "auto");
  assert.equal(before.decision, "needs-human");
  const calls: unknown[] = [];
  const { context: shadow, ledger } = context("shadow", PUBLISH, calls);
  const after = await confirmEditorialReview(
    shadow,
    item,
    before,
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(after, before);
  assert.equal(calls.length, 1, "one Jev call per record");
  const jevRows = ledger.records.filter((row) => row.deciderKind === "jev");
  // Only answered questions are recorded; the fake leaves the four field-certainty questions unanswered.
  assert.equal(jevRows.length, Object.keys(PUBLISH).length);
  assert.ok(jevRows.every((row) => row.mode === "shadow"));
  const rubric = ledger.records.find(
    (row) => row.decider === "publication-rubric",
  );
  assert.equal(rubric?.deciderKind, "heuristic");
  assert.equal(rubric?.answer, "needs-human");
  assert.equal(rubric?.route, "review");
  assert.equal(rubric?.deciderVersion, PUBLICATION_RUBRIC_VERSION);
  assert.equal(rubric?.inputHash, jevRows[0]?.inputHash);
  assert.ok(ledger.records.some((row) => row.decider === "editorial-review"));
});

test("review: live resolves a needs-human into publish or suppress", async () => {
  const item = candidate();
  const published = await confirmEditorialReview(
    context("live", PUBLISH).context,
    item,
    editorialReview(item, "auto"),
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(published.decision, "publish");
  assert.equal(
    (published.checks.confirming as { overrode: string }).overrode,
    "needs-human",
  );
  const suppressed = await confirmEditorialReview(
    context("live", SUPPRESS).context,
    item,
    editorialReview(item, "auto"),
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(suppressed.decision, "suppress");
});

test("review: live never turns a rubric suppress into publish", async () => {
  const unsafe = candidate({ submissionState: "unsafe" });
  const before = editorialReview(unsafe, "auto");
  assert.equal(before.decision, "suppress");
  const after = await confirmEditorialReview(
    context("live", PUBLISH).context,
    unsafe,
    before,
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(after.decision, "suppress");
});

test("review: live never lifts review-only, editorial holds, write-up waits or a missing destination", async () => {
  const cases: Array<[string, ReviewCandidate, "auto" | "queue"]> = [
    ["review-only", candidate({ reviewOnly: true }), "auto"],
    ["queue mode hold", candidate({ organizationConfirmed: true }), "queue"],
    [
      "missing organization hold",
      candidate({ title: "Open Call", organizationName: null }),
      "auto",
    ],
    [
      "write-up wait",
      candidate({ contentApproved: false, contentWaitExpired: false }),
      "auto",
    ],
    [
      "no destination",
      candidate({ submissionUrl: null, guidelinesUrl: null }),
      "auto",
    ],
  ];
  for (const [label, item, mode] of cases) {
    const before = editorialReview(item, mode);
    assert.equal(before.decision, "needs-human", label);
    const after = await confirmEditorialReview(
      context("live", PUBLISH).context,
      item,
      before,
      PUBLICATION_RUBRIC_VERSION,
    );
    assert.equal(after.decision, "needs-human", label);
  }
});

test("review: live keeps needs-human when Jev is unsure or partly disagrees", async () => {
  const item = candidate();
  const variants: Answers[] = [
    { ...PUBLISH, "opportunity.publication_route": choice("publish", 0.6) },
    { ...PUBLISH, "opportunity.lifecycle_state": choice("uncertain") },
    { ...PUBLISH, "opportunity.is_single_real_opportunity": noul(0.7) },
    { ...PUBLISH, "opportunity.title_identifies_opportunity": noul(0.5) },
    { ...PUBLISH, "opportunity.lifecycle_state": choice("closed") },
    {
      ...SUPPRESS,
      "opportunity.is_single_real_opportunity": noul(0.5),
      "opportunity.page_kind": choice("single-opportunity"),
    },
  ];
  for (const answers of variants) {
    const after = await confirmEditorialReview(
      context("live", answers).context,
      item,
      editorialReview(item, "auto"),
      PUBLICATION_RUBRIC_VERSION,
    );
    assert.equal(after.decision, "needs-human", JSON.stringify(answers));
  }
});

test("review: a failing Jev call leaves the verdict alone", async () => {
  const failing = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => new Response("down", { status: 500 })) as typeof fetch,
  });
  const item = candidate();
  const before = editorialReview(item, "auto");
  const after = await confirmEditorialReview(
    {
      client: failing,
      ledger: createMemoryDecisionLedger(),
      mode: "live",
      logger: silent,
    },
    item,
    before,
    PUBLICATION_RUBRIC_VERSION,
  );
  assert.equal(after, before);
});

const NOW = new Date("2026-10-04T00:00:00.000Z");
const VAGUE =
  "The Example Prize is for emerging poets. Read the guidelines and send up to five poems through the form.";

function lifecycleInput(text: string, aggregate = false) {
  return {
    opportunityId: "confirming_life_1",
    title: "Example Prize",
    sourceUrl: "https://example.org/prize",
    text,
    now: NOW,
    aggregate,
    classifierVersion: "lifecycle-source-test",
  };
}

test("lifecycle: shadow records Jev and the regex verdict without changing it", async () => {
  const regex = classifyLifecycleEvidence(VAGUE, NOW);
  assert.equal(regex.decision, "review");
  const { context: shadow, ledger } = context("shadow", {
    ...PUBLISH,
    "opportunity.lifecycle_state": choice("closed"),
  });
  const after = await confirmLifecycleEvidence(
    shadow,
    lifecycleInput(VAGUE),
    regex,
  );
  assert.equal(after, regex);
  const heuristic = ledger.records.find(
    (row) => row.decider === "lifecycle-regex",
  );
  assert.equal(heuristic?.answer, "uncertain");
  assert.equal(heuristic?.route, "review");
  assert.ok(
    ledger.records.some(
      (row) =>
        row.deciderKind === "jev" &&
        row.questionKey === "opportunity.lifecycle_state" &&
        row.answer === "closed",
    ),
  );
});

test("lifecycle: live resolves only regex review cases on single-opportunity pages", async () => {
  const answers = {
    ...PUBLISH,
    "opportunity.lifecycle_state": choice("closed"),
  };
  const regexReview = classifyLifecycleEvidence(VAGUE, NOW);
  const resolved = await confirmLifecycleEvidence(
    context("live", answers).context,
    lifecycleInput(VAGUE),
    regexReview,
  );
  assert.equal(resolved.decision, "apply");
  assert.equal(resolved.confidence, "high");
  assert.equal(resolved.status, "closed");
  assert.equal(resolved.decider, "jev");

  const openText = "Submissions are open year-round for the Example Prize.";
  const regexApply = classifyLifecycleEvidence(openText, NOW);
  assert.equal(regexApply.decision, "apply");
  const kept = await confirmLifecycleEvidence(
    context("live", answers).context,
    lifecycleInput(openText),
    regexApply,
  );
  assert.equal(
    kept,
    regexApply,
    "an applied regex decision is never overridden",
  );

  const aggregate = await confirmLifecycleEvidence(
    context("live", answers).context,
    lifecycleInput(VAGUE, true),
    regexReview,
  );
  assert.equal(aggregate, regexReview, "aggregate pages stay in review");

  for (const variant of [
    { ...answers, "opportunity.lifecycle_state": choice("uncertain") },
    { ...answers, "opportunity.is_single_real_opportunity": noul(0.6) },
    { ...answers, "opportunity.page_kind": choice("directory-or-roundup") },
  ]) {
    const unchanged = await confirmLifecycleEvidence(
      context("live", variant).context,
      lifecycleInput(VAGUE),
      regexReview,
    );
    assert.equal(unchanged, regexReview);
  }
});

/** Minimal pg fake for one claimed lifecycle job; records every statement. */
function fakeLifecyclePool() {
  const statements: Array<{ text: string; values?: unknown[] }> = [];
  const job = {
    opportunityId: "confirming_life_2",
    title: "Example Prize",
    sourceUrl: "https://example.org/prize",
    guidelinesUrl: null,
    submissionUrl: null,
    publicationState: "published",
  };
  const query = async (text: string, values?: unknown[]) => {
    statements.push({ text, values });
    return { rows: /with due as/.test(text) ? [job] : [] };
  };
  const pool = {
    query,
    connect: async () => ({ query, release: () => undefined }),
  };
  return { pool: pool as never, statements };
}

test("lifecycle batch: default keeps regex review, live applies the Jev state", async () => {
  const fetchPage = async () => ({ status: "ok" as const, text: VAGUE });
  const shadowPool = fakeLifecyclePool();
  const shadowTotals = await runLifecycleReconcilerBatch(shadowPool.pool, {
    now: NOW,
    fetchPage,
    confirming: context("shadow", {
      ...PUBLISH,
      "opportunity.lifecycle_state": choice("closed"),
    }).context,
  });
  assert.equal(shadowTotals.applied, 0);
  assert.ok(
    !shadowPool.statements.some((statement) =>
      /update opportunities set status/.test(statement.text),
    ),
  );

  const livePool = fakeLifecyclePool();
  const liveTotals = await runLifecycleReconcilerBatch(livePool.pool, {
    now: NOW,
    fetchPage,
    confirming: context("live", {
      ...PUBLISH,
      "opportunity.lifecycle_state": choice("closed"),
    }).context,
  });
  assert.equal(liveTotals.applied, 1);
  const update = livePool.statements.find((statement) =>
    /update opportunities set status/.test(statement.text),
  );
  assert.equal(update?.values?.[1], "closed");
  const evidence = livePool.statements.find((statement) =>
    /insert into opportunity_lifecycle_evidence/.test(statement.text),
  );
  assert.match(String(evidence?.values?.[12]), /"decider":"jev"/);
});

test("direct publish: default publishes; the gate holds only a confident non-opportunity", async () => {
  assert.equal(directPublishMode({}), "shadow");
  assert.equal(
    directPublishMode({ MISSA_DIRECT_PUBLISH_GATE: "decision" }),
    "live",
  );
  const input = {
    opportunityId: "confirming_direct_1",
    record: {
      title: "Top 50 Residencies",
      sourceUrl: "https://example.org/list",
      origin: "test",
    },
  };

  const shadow = context("shadow", SUPPRESS);
  assert.equal(await confirmDirectPublish(shadow.context, input), "published");
  assert.ok(
    shadow.ledger.records.some(
      (row) => row.questionKey === "opportunity.is_single_real_opportunity",
    ),
  );

  assert.equal(
    await confirmDirectPublish(context("live", SUPPRESS).context, input),
    "reviewable",
  );
  assert.equal(
    await confirmDirectPublish(
      context("live", { "opportunity.is_single_real_opportunity": noul(0.5) })
        .context,
      input,
    ),
    "published",
  );
  assert.equal(
    await confirmDirectPublish(context("live", PUBLISH).context, input),
    "published",
  );
  const noKey = {
    ...confirmingContextFromEnv("direct_publish", undefined, {}),
    mode: "live" as const,
  };
  assert.equal(await confirmDirectPublish(noKey, input), "published");
});
