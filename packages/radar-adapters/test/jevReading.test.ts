import assert from "node:assert/strict";
import test from "node:test";
import {
  createJevClient,
  createMemoryDecisionLedger,
  readingQuestions,
  type Queryable,
} from "@missa/decisions";
import {
  calibrationBuckets,
  evaluateReading,
  expectedCalibrationError,
  formatReadingEvaluation,
  magazineReadingTruths,
  mergeReadingTruths,
  readingInputFromCandidate,
  reportedProbability,
  residencyReadingTruths,
  runReadingPass,
  type ReadingCandidate,
  type ReadingDecisionRow,
} from "../src/index.js";

const PAGE =
  "Submissions are open year-round. We pay $50 per poem. Simultaneous submissions are fine; let us know if your work is accepted elsewhere. ".repeat(
    4,
  );

function candidate(
  id: string,
  overrides: Partial<ReadingCandidate> = {},
): ReadingCandidate {
  return {
    id,
    title: `Call ${id}`,
    type: "magazine",
    organizationName: "Example Review",
    pageText: PAGE,
    pageUrl: `https://example.org/${id}`,
    guidelinesUrl: null,
    submissionUrl: null,
    sourceUrl: "https://example.org",
    eligibility: [],
    requiredMaterials: [],
    eligibilitySummary: null,
    rightsSummary: null,
    ...overrides,
  };
}

/** A pg-like fake that serves opportunities and keeps every statement it saw. */
function fakeDb(rows: ReadingCandidate[]) {
  const statements: string[] = [];
  const inserted: unknown[][] = [];
  const db: Queryable = {
    async query(text, values = []) {
      statements.push(text);
      if (text.includes("to_regclass")) return { rows: [{ present: true }] };
      if (/insert into data_decisions/i.test(text)) {
        inserted.push(values);
        return { rows: [{ id: `dec_${inserted.length}` }] };
      }
      if (/from opportunities o/.test(text)) {
        const [afterId, , ids, limit] = values as [
          string | null,
          unknown,
          string[] | null,
          number,
        ];
        const matching = rows
          .filter((row) => afterId === null || row.id > afterId)
          .filter((row) => !ids || ids.includes(row.id))
          .sort((left, right) => left.id.localeCompare(right.id));
        return { rows: matching.slice(0, limit) };
      }
      throw new Error(`Unexpected query: ${text.slice(0, 80)}`);
    },
  };
  return { db, statements, inserted };
}

/** Answers every question: Nouls at 0.95, choices with their first option at 0.9. */
function fakeJev() {
  const calls: Array<{
    state: unknown;
    questions: Record<string, { type: string; criteria?: unknown }>;
  }> = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push(body);
    const answers: Record<string, unknown> = {};
    for (const [id, question] of Object.entries(
      body.questions as Record<
        string,
        { type: string; criteria: Record<string, string> }
      >,
    )) {
      if (question.type === "noul") answers[id] = { type: "noul", noul: 0.95 };
      else {
        const first = Object.keys(question.criteria)[0]!;
        answers[id] = {
          type: "choice",
          choice: first,
          probabilities: { [first]: 0.9 },
          confidence: 0.8,
        };
      }
    }
    return new Response(JSON.stringify({ model: "jev-test-1", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  return { client: createJevClient({ apiKey: "k", fetch: fetchImpl }), calls };
}

test("the reading pass asks every question once per opportunity and records shadow decisions", async () => {
  const { db, statements } = fakeDb([
    candidate("reading_a"),
    candidate("reading_b"),
    candidate("reading_c"),
  ]);
  const { client, calls } = fakeJev();
  const ledger = createMemoryDecisionLedger();
  const summary = await runReadingPass({
    db,
    client,
    ledger,
    limit: 10,
    batchSize: 2,
  });

  assert.equal(summary.considered, 3);
  assert.equal(summary.decided, 3);
  assert.equal(calls.length, 3);
  assert.equal(
    Object.keys(calls[0]!.questions).length,
    readingQuestions.length,
  );
  assert.equal(ledger.records.length, 3 * readingQuestions.length);
  assert.ok(ledger.records.every((record) => record.mode === "shadow"));
  assert.ok(
    ledger.records.every((record) => record.subjectType === "opportunity"),
  );
  assert.equal(summary.recordedAnswers, ledger.records.length);
  assert.equal(summary.routes["opportunity.reading.fee_status"]!.apply, 3);
  // Two batches of two (the second short), keyed by id.
  assert.equal(
    statements.filter((text) => /from opportunities o/.test(text)).length,
    2,
  );
  assert.ok(
    statements.every(
      (text) => !/\b(update|delete|insert into)\s+opportunit/i.test(text),
    ),
  );
});

test("with the Postgres ledger the pass writes only to data_decisions", async () => {
  const { db, statements, inserted } = fakeDb([candidate("reading_a")]);
  const { client } = fakeJev();
  await runReadingPass({ db, client, limit: 5 });
  assert.equal(inserted.length, 1);
  const writes = statements.filter((text) =>
    /\b(insert|update|delete)\b/i.test(text),
  );
  assert.ok(writes.length > 0);
  assert.ok(writes.every((text) => /insert into data_decisions/i.test(text)));
});

test("a dry run builds states without calling Jev or writing", async () => {
  const { db, inserted } = fakeDb([
    candidate("reading_a"),
    candidate("reading_b"),
  ]);
  const { client, calls } = fakeJev();
  const summary = await runReadingPass({ db, client, dryRun: true });
  assert.equal(summary.considered, 2);
  assert.equal(summary.decided, 0);
  assert.equal(calls.length, 0);
  assert.equal(inserted.length, 0);
  assert.ok(summary.stateChars.max > 0);
});

test("opportunities with too little text are skipped, and limit and ids are honoured", async () => {
  const { db } = fakeDb([
    candidate("reading_a", { pageText: "Short." }),
    candidate("reading_b"),
    candidate("reading_c"),
  ]);
  const { client, calls } = fakeJev();
  const ledger = createMemoryDecisionLedger();
  const summary = await runReadingPass({
    db,
    client,
    ledger,
    ids: ["reading_a", "reading_b"],
  });
  assert.equal(summary.considered, 2);
  assert.equal(summary.skippedThinText, 1);
  assert.equal(calls.length, 1);

  const limited = await runReadingPass({
    db,
    client,
    ledger: createMemoryDecisionLedger(),
    limit: 1,
  });
  assert.equal(limited.considered, 1);
});

test("without a Jev key nothing is recorded", async () => {
  const { db, inserted } = fakeDb([candidate("reading_a")]);
  const summary = await runReadingPass({ db, client: createJevClient({}) });
  assert.equal(summary.decided, 0);
  assert.equal(inserted.length, 0);
  assert.equal(
    summary.routes["opportunity.reading.fee_status"]!.unavailable,
    1,
  );
});

test("a Jev failure is counted and never thrown", async () => {
  const { db } = fakeDb([candidate("reading_a")]);
  const failing = createJevClient({
    apiKey: "k",
    maxRetries: 0,
    fetch: (async () => new Response("bad", { status: 400 })) as typeof fetch,
  });
  const summary = await runReadingPass({
    db,
    client: failing,
    ledger: createMemoryDecisionLedger(),
  });
  assert.equal(summary.failed, 1);
  assert.equal(summary.decided, 0);
});

test("state comes from stored text with the best evidence URL", () => {
  const { state, evidenceUrl } = readingInputFromCandidate(
    candidate("reading_a", {
      pageUrl: null,
      guidelinesUrl: "https://example.org/guidelines",
      eligibility: [{ description: "Open worldwide" }],
      eligibilitySummary: "Writers 18 and over",
      rightsSummary: "First North American serial rights",
      requiredMaterials: [{ label: "Bio" }],
    }),
  );
  assert.equal(evidenceUrl, "https://example.org/guidelines");
  assert.equal(state.eligibility, "Open worldwide; Writers 18 and over");
  assert.equal(state.guidelines, "First North American serial rights");
  assert.equal(state.requiredMaterials, "Bio");
});

test("calibration buckets average probability and accuracy per range", () => {
  const buckets = calibrationBuckets(
    [
      { probability: 0.55, correct: true },
      { probability: 0.65, correct: false },
      { probability: 0.92, correct: true },
      { probability: 0.98, correct: true },
      { probability: 1, correct: false },
      { probability: 0.2, correct: false },
    ],
    [0, 0.5, 0.9, 1],
  );
  assert.deepEqual(
    buckets.map((bucket) => [bucket.lower, bucket.upper, bucket.count]),
    [
      [0, 0.5, 1],
      [0.5, 0.9, 2],
      [0.9, 1, 3],
    ],
  );
  assert.ok(Math.abs(buckets[1]!.meanProbability! - 0.6) < 1e-9);
  assert.equal(buckets[1]!.accuracy, 0.5);
  assert.ok(
    Math.abs(buckets[2]!.meanProbability! - (0.92 + 0.98 + 1) / 3) < 1e-9,
  );
  assert.ok(Math.abs(buckets[2]!.accuracy! - 2 / 3) < 1e-9);
  const ece = expectedCalibrationError(buckets)!;
  const expected =
    (1 / 6) * 0.2 + (2 / 6) * 0.1 + (3 / 6) * Math.abs(2 / 3 - 2.9 / 3);
  assert.ok(Math.abs(ece - expected) < 1e-9);
  assert.equal(expectedCalibrationError(calibrationBuckets([])), null);
});

test("a Noul's reported probability follows its answer", () => {
  const base = { subjectId: "o", questionKey: "k", route: "review" };
  assert.ok(
    Math.abs(
      reportedProbability({
        ...base,
        questionKind: "noul",
        answer: "false",
        probability: 0.2,
      })! - 0.8,
    ) < 1e-9,
  );
  assert.equal(
    reportedProbability({
      ...base,
      questionKind: "noul",
      answer: "true",
      probability: 0.7,
    }),
    0.7,
  );
  assert.equal(
    reportedProbability({
      ...base,
      questionKind: "choice",
      answer: "paid",
      probability: 0.6,
    }),
    0.6,
  );
  assert.equal(
    reportedProbability({
      ...base,
      questionKind: "choice",
      answer: "paid",
      probability: null,
    }),
    null,
  );
});

test("index facts become truths only when cited", () => {
  const magazine = magazineReadingTruths({
    opportunityId: "o1",
    chargesReadingFee: true,
    payKind: "copies_only",
    simultaneousPolicy: "conditional",
    blindReading: false,
    factSources: {
      fee: { url: "https://dir/fee" },
      pay: { url: "https://dir/pay" },
    },
  });
  assert.deepEqual(
    magazine.map((truth) => [truth.questionKey, truth.expected]),
    [
      ["opportunity.reading.fee_status", ["paid", "waiver-available"]],
      ["opportunity.reading.artist_payment", ["contributor-copies"]],
    ],
  );
  const residency = residencyReadingTruths({
    opportunityId: "o2",
    hasStipend: false,
    applicationFeeAmount: 0,
    meals: "some",
    hasMeals: null,
    hasPrivateStudio: false,
    housing: "No housing provided",
    wheelchair: "Partially Accessible",
    factSources: {
      stipend: {},
      applicationFee: {},
      meals: {},
      studio: {},
      housing: {},
      wheelchair: {},
    },
  });
  assert.deepEqual(
    Object.fromEntries(
      residency.map((truth) => [truth.questionKey, truth.expected]),
    ),
    {
      "opportunity.reading.stipend_paid_to_artist": ["false"],
      "opportunity.reading.fee_status": ["no-fee"],
      "opportunity.reading.meals_provided": ["true"],
      "opportunity.reading.studio_provided": ["true"],
      "opportunity.reading.housing_provided": ["false"],
      "opportunity.reading.wheelchair_access_stated": ["true"],
    },
  );
});

test("conflicting sources for one opportunity are dropped", () => {
  const truth = (expected: string[]) => ({
    opportunityId: "o1",
    questionKey: "opportunity.reading.fee_status",
    expected,
    source: "x",
    url: null,
  });
  const merged = mergeReadingTruths([
    truth(["no-fee"]),
    truth(["paid"]),
    truth(["no-fee"]),
  ]);
  assert.equal(merged.truths.length, 0);
  assert.equal(merged.conflicts, 1);
  assert.equal(
    mergeReadingTruths([truth(["no-fee"]), truth(["no-fee"])]).truths.length,
    1,
  );
});

test("evaluation separates coverage from agreement", () => {
  const decision = (
    subjectId: string,
    questionKey: string,
    answer: string,
    probability: number,
    route = "apply",
    questionKind = "choice",
  ): ReadingDecisionRow => ({
    subjectId,
    questionKey: `opportunity.reading.${questionKey}`,
    questionKind,
    answer,
    probability,
    route,
  });
  const fee = (opportunityId: string, expected: string[]) => ({
    opportunityId,
    questionKey: "opportunity.reading.fee_status",
    expected,
    source: "magazine.fee",
    url: null,
  });
  const evaluation = evaluateReading(
    [
      decision("o1", "fee_status", "paid", 0.95),
      decision("o2", "fee_status", "no-fee", 0.6, "review"),
      decision("o3", "fee_status", "unstated", 0.9, "review"),
      decision("o4", "blind_review", "false", 0.05, "reject", "noul"),
    ],
    [
      fee("o1", ["paid", "waiver-available"]),
      fee("o2", ["paid", "waiver-available"]),
      fee("o3", ["no-fee"]),
      fee("o9", ["no-fee"]),
      {
        opportunityId: "o4",
        questionKey: "opportunity.reading.blind_review",
        expected: ["false"],
        source: "magazine.blind",
        url: null,
      },
    ],
  );
  assert.equal(evaluation.opportunitiesWithDecisions, 4);
  assert.equal(evaluation.truthsWithoutDecisions, 1);
  const feeRow = evaluation.questions.find((row) =>
    row.questionKey.endsWith("fee_status"),
  )!;
  assert.equal(feeRow.truths, 3);
  assert.equal(feeRow.decided, 3);
  assert.equal(feeRow.stated, 2);
  assert.equal(feeRow.agree, 1);
  assert.equal(feeRow.disagree, 1);
  assert.ok(Math.abs(feeRow.coverage! - 2 / 3) < 1e-9);
  assert.equal(feeRow.agreement, 0.5);
  assert.equal(feeRow.confident, 1);
  assert.equal(feeRow.confidentAgree, 1);
  const blind = evaluation.questions.find((row) =>
    row.questionKey.endsWith("blind_review"),
  )!;
  assert.equal(blind.agree, 1);
  // Three compared answers reach calibration: 0.95 (right), 0.6 (wrong), 0.95 for "false" (right).
  assert.equal(
    evaluation.calibration.reduce((sum, bucket) => sum + bucket.count, 0),
    3,
  );
  assert.match(
    formatReadingEvaluation(evaluation),
    /Expected calibration error/,
  );
});
