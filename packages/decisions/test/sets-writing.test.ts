import assert from "node:assert/strict";
import test from "node:test";
import {
  WRITING_QUESTIONS,
  buildGroundingPlan,
  contentClaimSupported,
  createJevClient,
  createMemoryDecisionLedger,
  decide,
  groundingState,
  opportunityGeneratedFields,
  organizationGeneratedFields,
  questionForField,
  questionRegistry,
  splitSentences,
  summarizeGrounding,
  validateQuestion,
  type JevAnswer,
  type JevQuestion,
} from "../src/index.js";

/** Answers each question by matching its instructions; unmatched noul questions get `fallback`. */
function fakeJev(
  answer: (question: JevQuestion) => JevAnswer,
): ReturnType<typeof createJevClient> {
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      questions: Record<string, JevQuestion>;
    };
    const answers = Object.fromEntries(
      Object.entries(body.questions).map(([id, question]) => [
        id,
        answer(question),
      ]),
    );
    return new Response(JSON.stringify({ model: "jev-test", answers }), {
      status: 200,
    });
  }) as typeof fetch;
  return createJevClient({ apiKey: "k", fetch: fetchImpl });
}

test("every writing question is valid, public and uniquely keyed", () => {
  for (const definition of WRITING_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "public");
  }
  assert.equal(
    questionRegistry(WRITING_QUESTIONS).size,
    WRITING_QUESTIONS.length,
  );
});

test("sentences split on stops but not on abbreviations, initials or numbers", () => {
  assert.deepEqual(
    splitSentences(
      "The prize is $1,500.50 for one writer. Work by J. M. Coetzee, e.g. Disgrace, is cited.\nApply by 1 May! Is it free? Not stated…",
    ),
    [
      "The prize is $1,500.50 for one writer.",
      "Work by J. M. Coetzee, e.g. Disgrace, is cited.",
      "Apply by 1 May!",
      "Is it free?",
      "Not stated…",
    ],
  );
  assert.deepEqual(splitSentences("No stop at the end"), [
    "No stop at the end",
  ]);
  assert.deepEqual(splitSentences("  \n "), []);
  assert.deepEqual(splitSentences("Based in the U.S. Artists apply."), [
    "Based in the U.S. Artists apply.",
  ]);
});

test("per-sentence questions get stable indexed keys and field names", () => {
  const definition = questionForField(contentClaimSupported, {
    subjectType: "organization",
    field: "reputationSummary",
    sentenceIndex: 3,
    sentence: "It was founded in 1850.",
  });
  assert.equal(definition.key, "content.claim_supported.reputation_summary.s3");
  assert.equal(definition.fieldName, "reputationSummary#3");
  assert.equal(definition.subjectType, "organization");
  assert.equal(definition.version, contentClaimSupported.version);
  assert.match(
    definition.question.instructions,
    /generated\.reputationSummary/,
  );
  assert.match(definition.question.instructions, /"It was founded in 1850\."/);
  assert.doesNotMatch(
    definition.question.instructions,
    /\{field\}|\{sentence\}/,
  );
});

test("a grounding plan asks one question per sentence plus field checks, capped", () => {
  const fields = opportunityGeneratedFields({
    editorialHook: "A residency in Lagos.",
    curatorialOverview: "One. Two. Three. Four.",
    targetAudience: { careerStages: ["emerging"], idealCandidate: "Painters." },
    insiderTips: ["Keep it short.", "Name the dates."],
  });
  assert.deepEqual(Object.keys(fields), [
    "editorialHook",
    "curatorialOverview",
    "targetAudience",
    "insiderTips",
  ]);
  const plan = buildGroundingPlan({
    subjectType: "opportunity",
    fields,
    maxSentencesPerField: 3,
    includeEvidenceCheck: true,
  });
  assert.equal(plan.sentences.length, 1 + 3 + 2 + 2);
  assert.deepEqual(plan.unchecked, { curatorialOverview: 1 });
  assert.equal(plan.fieldChecks.length, 4 * 6);
  assert.equal(plan.evidenceKey, "content.enough_evidence_to_write");
  const keys = plan.questions.map((question) => question.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes("content.claim_supported.insider_tips.s1"));
  assert.ok(keys.includes("content.voice_compliance.target_audience"));
});

test("live grounding withholds only fields with a confident truth problem", async () => {
  const profile = {
    overview:
      "The Lagos Studio runs a summer residency. It was founded in 1850.",
    reputationSummary: "It is widely admired.",
    submissionGuidance: "Read the guidelines.",
  };
  const plan = buildGroundingPlan({
    subjectType: "organization",
    fields: organizationGeneratedFields(profile),
    includeEvidenceCheck: true,
  });
  const client = fakeJev((question) => {
    const text = question.instructions;
    if (question.type === "score")
      return {
        type: "score",
        score: 2,
        legend: {},
        probabilities: { 0: 0.02, 1: 0.03, 2: 0.95 },
        confidence: 0.95,
      };
    if (text.includes("founded in 1850")) return { type: "noul", noul: 0.03 };
    if (text.includes("widely admired")) return { type: "noul", noul: 0.5 };
    if (
      text.startsWith("Does generated.reputationSummary state who") ||
      text.startsWith("Does generated.reputationSummary promise")
    )
      return { type: "noul", noul: 0.6 };
    if (text.startsWith("Take this sentence"))
      return { type: "noul", noul: 0.97 };
    if (text.startsWith("Does source state enough"))
      return { type: "noul", noul: 0.95 };
    return { type: "noul", noul: 0.04 };
  });
  const ledger = createMemoryDecisionLedger();
  const result = await decide({
    client,
    ledger,
    mode: "live",
    subjectId: "writing-test-org",
    state: groundingState(
      { name: "The Lagos Studio" },
      organizationGeneratedFields(profile),
    ),
    questions: plan.questions,
  });
  const summary = summarizeGrounding(plan, result.outcomes);
  assert.deepEqual(summary.withheldFields, ["overview"]);
  assert.deepEqual(summary.fields.overview!.unsupportedSentences, [1]);
  assert.deepEqual(summary.fields.reputationSummary!.unsupportedSentences, []);
  assert.deepEqual(summary.fields.reputationSummary!.flags, [
    "promotional_promise",
    "identity_claim_not_in_source",
  ]);
  assert.equal(summary.fields.reputationSummary!.withhold, false);
  assert.equal(summary.fields.overview!.voice, "on-voice");
  assert.equal(summary.enoughEvidence, true);
  assert.equal(summary.reasons.length, 1);

  const sentenceRows = ledger.records.filter((row) =>
    row.questionKey.startsWith("content.claim_supported."),
  );
  assert.deepEqual(
    sentenceRows.map((row) => row.fieldName),
    ["overview#0", "overview#1", "reputationSummary#0", "submissionGuidance#0"],
  );
  assert.ok(ledger.records.every((row) => row.subjectType === "organization"));

  const shadow = await decide({
    client,
    mode: "shadow",
    subjectId: "writing-test-org",
    state: "x",
    questions: plan.questions,
  });
  const shadowSummary = summarizeGrounding(plan, shadow.outcomes);
  assert.deepEqual(shadowSummary.withheldFields, []);
  assert.deepEqual(shadowSummary.fields.overview!.unsupportedSentences, [1]);
});

test("without Jev nothing is withheld", async () => {
  const plan = buildGroundingPlan({
    subjectType: "opportunity",
    fields: { editorialHook: ["Anything at all."] },
  });
  const result = await decide({
    client: createJevClient(),
    mode: "live",
    subjectId: "writing-test-none",
    state: "x",
    questions: plan.questions,
  });
  const summary = summarizeGrounding(plan, result.outcomes);
  assert.deepEqual(summary.withheldFields, []);
  assert.equal(summary.enoughEvidence, null);
});
