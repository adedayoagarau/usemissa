import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFIRMING_DIRECT_PUBLISH_QUESTIONS,
  CONFIRMING_LIFECYCLE_QUESTIONS,
  CONFIRMING_QUESTIONS,
  confirmingLifecycleState,
  confirmingPageKind,
  confirmingPublicationRoute,
  confirmingState,
  confirmingVerdictRecord,
  createMemoryDecisionLedger,
  NON_OPPORTUNITY_PAGE_KINDS,
  questionRegistry,
  routeAnswer,
  validateQuestion,
} from "../src/index.js";

test("every confirming question is valid, public and uniquely keyed", () => {
  for (const definition of CONFIRMING_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "public", definition.key);
    assert.equal(definition.subjectType, "opportunity", definition.key);
  }
  assert.equal(
    questionRegistry([...CONFIRMING_QUESTIONS]).size,
    CONFIRMING_QUESTIONS.length,
  );
  for (const subset of [
    CONFIRMING_LIFECYCLE_QUESTIONS,
    CONFIRMING_DIRECT_PUBLISH_QUESTIONS,
  ]) {
    for (const definition of subset)
      assert.ok(CONFIRMING_QUESTIONS.includes(definition), definition.key);
  }
});

test("confirming choices declare the options the wiring relies on", () => {
  const pageKinds = Object.keys(
    confirmingPageKind.question.type === "choice"
      ? confirmingPageKind.question.criteria
      : {},
  );
  for (const kind of NON_OPPORTUNITY_PAGE_KINDS)
    assert.ok(pageKinds.includes(kind), kind);
  assert.deepEqual(
    confirmingPublicationRoute.question.type === "choice"
      ? Object.keys(confirmingPublicationRoute.question.criteria)
      : [],
    ["publish", "needs-human", "suppress"],
  );
});

test("uncertain lifecycle and needs-human routes always go to review", () => {
  const confident = (choice: string) => ({
    type: "choice" as const,
    choice,
    probabilities: { [choice]: 0.99 },
    confidence: 0.99,
  });
  assert.equal(
    routeAnswer(confirmingLifecycleState, confident("uncertain"), "live")
      .actionable,
    false,
  );
  assert.equal(
    routeAnswer(confirmingLifecycleState, confident("closed"), "live").route,
    "apply",
  );
  assert.equal(
    routeAnswer(confirmingPublicationRoute, confident("needs-human"), "live")
      .route,
    "review",
  );
});

test("confirming state leaves out missing facts and bounds page text", () => {
  const state = confirmingState({
    title: " Example Prize ",
    organizationName: "",
    deadlineDate: null,
    pageText: `<p>${"word ".repeat(5_000)}</p>`,
  });
  assert.deepEqual(Object.keys(state).sort(), ["page_text", "title"]);
  assert.equal(state.title, "Example Prize");
  assert.ok(String(state.page_text).length <= 8_000);
  assert.ok(!String(state.page_text).includes("<p>"));
});

test("verdict records sit beside Jev rows under the same question", async () => {
  const ledger = createMemoryDecisionLedger();
  const record = confirmingVerdictRecord({
    definition: confirmingPublicationRoute,
    subjectId: "confirming_test_1",
    inputHash: "hash",
    answer: "needs-human",
    route: "review",
    mode: "shadow",
    deciderKind: "heuristic",
    decider: "publication-rubric",
    deciderVersion: "v1",
  });
  assert.equal(record.questionKey, "opportunity.publication_route");
  assert.deepEqual(record.options, ["publish", "needs-human", "suppress"]);
  await ledger.record([record, record]);
  assert.equal(ledger.records.length, 1);
});
