import assert from "node:assert/strict";
import test from "node:test";
import {
  IDENTITY_QUESTIONS,
  createJevClient,
  createMemoryDecisionLedger,
  decide,
  fieldConflictResolution,
  garyPublicationRoute,
  identityPairSubjectId,
  inputHash,
  questionRegistry,
  sameOpportunity,
  sameOpportunityState,
  sameOrganizationState,
  validateQuestion,
  type JevResponse,
} from "../src/index.js";

test("every identity question is valid, public and uniquely keyed", () => {
  for (const definition of IDENTITY_QUESTIONS) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "public", definition.key);
  }
  assert.equal(
    questionRegistry([...IDENTITY_QUESTIONS]).size,
    IDENTITY_QUESTIONS.length,
  );
});

test("noul identity questions use the conservative thresholds", () => {
  for (const definition of IDENTITY_QUESTIONS) {
    if (definition.policy.kind === "noul") {
      assert.equal(definition.policy.acceptAtOrAbove, 0.9);
      assert.equal(definition.policy.rejectAtOrBelow, 0.1);
    }
    if (definition.policy.kind === "choice") {
      assert.equal(definition.policy.minProbability, 0.85);
    }
  }
  assert.deepEqual(
    fieldConflictResolution.policy.kind === "choice" &&
      fieldConflictResolution.policy.alwaysReview,
    ["cannot-tell"],
  );
});

test("the Gary publication route keeps the reviewer's three outcomes", () => {
  assert.equal(garyPublicationRoute.key, "gary.publication_route");
  assert.equal(garyPublicationRoute.version, 1);
  assert.deepEqual(
    garyPublicationRoute.question.type === "choice" &&
      Object.keys(garyPublicationRoute.question.criteria),
    ["publish", "needs_human", "reject"],
  );
});

test("pair states and subject ids do not depend on argument order", () => {
  const a = {
    title: "Poetry Prize",
    organization: "North Review",
    urls: ["https://north.test/prize"],
    deadline: "2026-10-01",
    type: "contest",
  };
  const b = {
    title: "Poetry Prize",
    organization: "North Review",
    urls: ["https://pw.test/north"],
    deadline: "2026-10-01",
    type: "contest",
  };
  assert.equal(
    inputHash(sameOpportunityState(a, b)),
    inputHash(sameOpportunityState(b, a)),
  );
  assert.equal(
    inputHash(
      sameOrganizationState(
        { name: "A", website: "a.test" },
        { name: "B", website: "b.test" },
      ),
    ),
    inputHash(
      sameOrganizationState(
        { name: "B", website: "b.test" },
        { name: "A", website: "a.test" },
      ),
    ),
  );
  assert.equal(identityPairSubjectId("opp_2", "opp_1"), "opp_1~opp_2");
  assert.match(
    identityPairSubjectId("x".repeat(150), "y".repeat(150)),
    /^pair_[0-9a-f]{40}$/,
  );
});

test("a same_opportunity decision records one row against the pair", async () => {
  const fetch = (async () =>
    new Response(
      JSON.stringify({
        model: "jev-test",
        answers: { q0: { type: "noul", noul: 0.95 } },
      } satisfies JevResponse),
      { status: 200 },
    )) as typeof globalThis.fetch;
  const ledger = createMemoryDecisionLedger();
  const result = await decide({
    client: createJevClient({ apiKey: "k", fetch }),
    ledger,
    mode: "shadow",
    subjectId: identityPairSubjectId("opp_a", "opp_b"),
    state: sameOpportunityState({ title: "A" }, { title: "A" }),
    questions: [sameOpportunity],
  });
  assert.equal(result.outcomes[sameOpportunity.key]?.route, "apply");
  assert.equal(result.outcomes[sameOpportunity.key]?.actionable, false);
  assert.equal(ledger.records.length, 1);
  assert.equal(ledger.records[0]?.subjectType, "opportunity_pair");
  assert.equal(ledger.records[0]?.subjectId, "opp_a~opp_b");
});
