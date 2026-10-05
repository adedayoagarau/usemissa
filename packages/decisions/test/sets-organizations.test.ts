import assert from "node:assert/strict";
import test from "node:test";
import {
  DECISION_MESSAGE_KIND_FOR_OUTCOME,
  ORGANIZATION_QUESTIONS,
  PREDATORY_RISK_LEVELS,
  criterionKeyPart,
  decisionMessageKind,
  decisionMessageState,
  importColumnState,
  predatoryRisk,
  predatoryRiskState,
  questionRegistry,
  routeAnswer,
  submissionCriterionMetQuestion,
  submissionTriageQuestions,
  submissionTriageState,
  validateQuestion,
} from "../src/index.js";

test("every organization question is valid and keys are unique", () => {
  for (const definition of ORGANIZATION_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
  }
  assert.equal(
    questionRegistry(ORGANIZATION_QUESTIONS).size,
    ORGANIZATION_QUESTIONS.length,
  );
});

test("creator-written material is never sent as public or operational", () => {
  const privateKeys = [
    "decision_message.matches_decision",
    "decision_message.kind",
    "submission.wrong_category",
    "submission.author_identified_in_blind_file",
    "review_assignment.reviewer_conflict",
    "review.notes_contradict_score",
  ];
  for (const key of privateKeys) {
    const definition = ORGANIZATION_QUESTIONS.find(
      (candidate) => candidate.key === key,
    );
    assert.equal(definition?.dataClass, "creator-private", key);
  }
  assert.equal(
    submissionCriterionMetQuestion("residency").dataClass,
    "creator-private",
  );
});

test("noul thresholds are conservative and review-only options are declared", () => {
  for (const definition of ORGANIZATION_QUESTIONS) {
    if (definition.policy.kind === "noul") {
      assert.ok(definition.policy.acceptAtOrAbove >= 0.9, definition.key);
      assert.ok(definition.policy.rejectAtOrBelow <= 0.1, definition.key);
    }
    if (definition.policy.kind === "choice") {
      assert.ok(definition.policy.minProbability >= 0.85, definition.key);
      assert.ok(
        (definition.policy.alwaysReview ?? []).length > 0,
        definition.key,
      );
    }
  }
});

test("criterion questions get stable, valid, distinct keys", () => {
  assert.equal(criterionKeyPart("Lives in Ohio"), "lives_in_ohio");
  assert.equal(criterionKeyPart("2024-debut"), "c_2024_debut");
  assert.equal(criterionKeyPart("!!!"), "c_criterion");
  const first = submissionCriterionMetQuestion("debut");
  assert.equal(first.key, "submission.criterion_met.debut");
  assert.equal(first.fieldName, "criterion:debut");
  assert.deepEqual(validateQuestion(first), []);

  const questions = submissionTriageQuestions({
    openCallTitle: "Spring call",
    categories: ["Poetry", "Fiction"],
    category: "Poetry",
    works: [{ title: "A poem" }],
    blind: true,
    applicantName: "Ada",
    fileText: "A poem by Ada",
    criteria: { debut: "First book", Debut: "First book again" },
  });
  assert.deepEqual(
    questions.map((question) => question.key),
    [
      "submission.wrong_category",
      "submission.author_identified_in_blind_file",
      "submission.criterion_met.debut",
    ],
  );
});

test("triage state leaves out file text and names unless the call is blind", () => {
  const open = submissionTriageState({
    openCallTitle: "Spring call",
    categories: ["Poetry"],
    works: [{ title: "A poem" }],
    applicantName: "Ada",
    fileText: "A poem by Ada",
  });
  assert.equal(open.applicant, null);
  assert.equal(open.fileText, null);
});

test("state builders trim long text and keep only three import samples", () => {
  const state = decisionMessageState({
    recordedDecision: "declined",
    subject: "About your work",
    letter: "x".repeat(10_000),
  });
  assert.ok(state.letter!.length <= 4_001);
  assert.deepEqual(
    importColumnState("E-mail", ["a@x", "", "b@x", "c@x", "d@x"]),
    {
      header: "E-mail",
      samples: ["a@x", "b@x", "c@x"],
    },
  );
  const risk = predatoryRiskState({
    title: "Prize",
    feeCents: 2500,
    feeCurrency: "USD",
  });
  assert.deepEqual(risk.fee, { status: null, amount: 25, currency: "USD" });
});

test("every recorded outcome maps to a declared message kind", () => {
  if (decisionMessageKind.question.type !== "choice") throw new Error("choice");
  for (const kind of Object.values(DECISION_MESSAGE_KIND_FOR_OUTCOME)) {
    assert.ok(Object.hasOwn(decisionMessageKind.question.criteria, kind));
  }
});

test("predatory risk levels route by confidence", () => {
  const outcome = routeAnswer(
    predatoryRisk,
    {
      type: "score",
      score: 2,
      legend: {},
      probabilities: { "0": 0.02, "1": 0.06, "2": 0.92 },
      confidence: 0.9,
    },
    "live",
  );
  assert.equal(outcome.answer, PREDATORY_RISK_LEVELS[2]);
  assert.equal(outcome.route, "apply");
});
