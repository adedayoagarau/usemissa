import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATOR_FIT_SCORE_LEVELS,
  SORTING_QUESTIONS,
  createJevClient,
  createMemoryDecisionLedger,
  creatorFitQuestion,
  creatorFitState,
  creatorOpportunitySubjectId,
  decide,
  digestWorthSendingQuestion,
  digestWorthSendingState,
  questionRegistry,
  validateQuestion,
} from "../src/index.js";

test("every sorting question is valid and keys are unique", () => {
  for (const definition of SORTING_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
  }
  assert.equal(
    questionRegistry([...SORTING_QUESTIONS]).size,
    SORTING_QUESTIONS.length,
  );
});

test("sorting questions carry creator data, so they are creator-private", () => {
  for (const definition of SORTING_QUESTIONS) {
    assert.equal(definition.dataClass, "creator-private", definition.key);
  }
  assert.equal(creatorFitQuestion.question.type, "score");
  assert.deepEqual(creatorFitQuestion.question.criteria, [
    ...CREATOR_FIT_SCORE_LEVELS,
  ]);
  assert.equal(digestWorthSendingQuestion.question.type, "noul");
});

test("creator fit state is compact and drops empty fields", () => {
  const state = creatorFitState(
    {
      disciplines: ["poetry", " "],
      careerStages: ["emerging"],
      countryCode: "NG",
      city: "",
      noFeeOnly: false,
    },
    {
      title: "Lagos Poetry Residency",
      type: "residency",
      genres: [],
      location: "Lagos, Nigeria",
      prize: "$2,000 stipend",
    },
  );
  assert.deepEqual(state, {
    creator: {
      disciplines: ["poetry"],
      careerStages: ["emerging"],
      country: "NG",
    },
    opportunity: {
      title: "Lagos Poetry Residency",
      type: "residency",
      location: "Lagos, Nigeria",
      prize: "$2,000 stipend",
    },
  });
  assert.equal(creatorOpportunitySubjectId("acct", "opp"), "acct:opp");
});

test("digest state lists each section's items", () => {
  const state = digestWorthSendingState(
    { genres: ["fiction"] },
    {
      newForYou: [
        { title: "A", type: "grant", reason: "Because you chose Fiction" },
      ],
      closingSoon: [],
      yourDeadlines: [{ title: "B", deadline: "2026-10-10" }],
    },
  );
  assert.deepEqual(state, {
    creator: { genres: ["fiction"] },
    newForYou: [
      { title: "A", type: "grant", reason: "Because you chose Fiction" },
    ],
    closingSoon: [],
    savedDeadlines: [{ title: "B", deadline: "2026-10-10" }],
  });
});

test("creator fit is refused without a no-retention agreement and sent with one", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        model: "jev-test",
        answers: {
          q0: {
            type: "score",
            score: 3,
            legend: {},
            probabilities: { "0": 0.01, "1": 0.02, "2": 0.05, "3": 0.92 },
            confidence: 0.9,
          },
        },
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const state = creatorFitState({ genres: ["poetry"] }, { title: "Call" });

  const refused = await decide({
    client: createJevClient({ apiKey: "k", fetch: fetchImpl }),
    mode: "live",
    subjectId: "sorting-test:1",
    state,
    questions: [creatorFitQuestion],
  });
  assert.equal(refused.outcomes[creatorFitQuestion.key]!.route, "unavailable");
  assert.equal(calls, 0, "creator-private state never leaves Missa");

  const ledger = createMemoryDecisionLedger();
  const allowed = await decide({
    client: createJevClient({
      apiKey: "k",
      fetch: fetchImpl,
      allowCreatorPrivateData: true,
    }),
    ledger,
    mode: "live",
    subjectId: "sorting-test:1",
    state,
    questions: [creatorFitQuestion],
  });
  const outcome = allowed.outcomes[creatorFitQuestion.key]!;
  assert.equal(outcome.route, "apply");
  assert.equal(outcome.answer, "strong");
  assert.equal(outcome.actionable, true);
  assert.equal(ledger.records[0]!.subjectType, "creator_opportunity");
});
