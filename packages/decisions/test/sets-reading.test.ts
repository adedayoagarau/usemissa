import assert from "node:assert/strict";
import test from "node:test";
import {
  READING_COLUMN_VALUES,
  questionRegistry,
  readingColumnValue,
  readingDeadlineKind,
  readingEvidenceLength,
  readingFeeStatus,
  readingMarketKind,
  readingOpportunityType,
  readingQuestions,
  readingSimultaneousAllowed,
  readingStateFromOpportunity,
  routeAnswer,
  trimReadingText,
  validateQuestion,
} from "../src/index.js";

test("every reading question is valid, public and about an opportunity", () => {
  for (const definition of readingQuestions) {
    assert.deepEqual(validateQuestion(definition), [], definition.key);
    assert.equal(definition.dataClass, "public", definition.key);
    assert.equal(definition.subjectType, "opportunity", definition.key);
    assert.match(definition.key, /^opportunity\.reading\./);
  }
  assert.equal(
    questionRegistry([...readingQuestions]).size,
    readingQuestions.length,
  );
  assert.ok(readingQuestions.length >= 29);
});

test("Noul criteria separate stated from not stated", () => {
  for (const definition of readingQuestions) {
    if (definition.question.type !== "noul") continue;
    assert.match(definition.question.criteria!.true, /^The page states /);
    assert.match(definition.question.criteria!.false, /does not mention it/);
  }
});

test("every choice keeps a not-stated option out of automatic apply", () => {
  for (const definition of readingQuestions) {
    if (
      definition.question.type !== "choice" ||
      definition.policy.kind !== "choice"
    )
      continue;
    assert.ok(
      (definition.policy.alwaysReview ?? []).length > 0,
      definition.key,
    );
    assert.equal(definition.policy.minProbability, 0.85);
  }
});

test("type options cover every contract type plus not-an-opportunity", () => {
  const options = Object.keys(readingOpportunityType.question.criteria).sort();
  // Mirrors opportunityTypeSchema in packages/contracts/src/opportunities.ts.
  const contractTypes = [
    "open-call",
    "magazine",
    "grant",
    "award",
    "fellowship",
    "residency",
    "festival",
    "scholarship",
    "conference",
    "rfp",
    "contest",
    "pitch",
    "exhibition",
    "commission",
    "job",
    "other",
  ];
  assert.deepEqual(options, [...contractTypes, "not-an-opportunity"].sort());
});

test("column mappings only produce values the database accepts", () => {
  const deadlineKinds = [
    "exact",
    "inferred",
    "rolling",
    "until-filled",
    "conflicting",
    "unknown",
  ];
  for (const value of Object.values(
    READING_COLUMN_VALUES[readingDeadlineKind.key]!,
  )) {
    if (value !== null) assert.ok(deadlineKinds.includes(value), value);
  }
  for (const value of Object.values(
    READING_COLUMN_VALUES[readingFeeStatus.key]!,
  )) {
    assert.ok(["no-fee", "paid", "unknown"].includes(value!), String(value));
  }
  const marketKinds = [
    "magazine",
    "journal",
    "press",
    "anthology",
    "contest",
    "award",
    "organization",
    "unknown",
  ];
  assert.deepEqual(
    Object.keys(readingMarketKind.question.criteria).sort(),
    [...marketKinds].sort(),
  );
});

test("a not-stated Noul never writes false", () => {
  const notStated = routeAnswer(
    readingSimultaneousAllowed,
    { type: "noul", noul: 0.02 },
    "live",
  );
  assert.equal(notStated.route, "reject");
  assert.equal(readingColumnValue(readingSimultaneousAllowed, notStated), null);
  const statedTrue = routeAnswer(
    readingSimultaneousAllowed,
    { type: "noul", noul: 0.97 },
    "live",
  );
  assert.deepEqual(readingColumnValue(readingSimultaneousAllowed, statedTrue), {
    fieldName: "simultaneous_allowed",
    value: true,
  });
  const waiver = routeAnswer(
    readingFeeStatus,
    {
      type: "choice",
      choice: "waiver-available",
      probabilities: { "waiver-available": 0.92 },
      confidence: 0.9,
    },
    "shadow",
  );
  assert.deepEqual(readingColumnValue(readingFeeStatus, waiver), {
    fieldName: "fee_status",
    value: "paid",
  });
});

test("the state builder trims text to its budget and keeps short fields", () => {
  const long = "word ".repeat(5_000);
  const state = readingStateFromOpportunity({
    title: "  Spring   Prize ",
    organizationName: "Example Review",
    type: "contest",
    url: "https://example.org/prize",
    pageText: long,
    guidelines: "Send up to three poems. No fee.",
    eligibility: [
      { description: "Open to writers worldwide", value: "any" },
      "18+",
    ],
    requiredMaterials: [
      "Bio",
      { label: "Work sample", description: "10 pages" },
    ],
  });
  assert.equal(state.title, "Spring Prize");
  assert.equal(state.organization, "Example Review");
  assert.equal(state.listedType, "contest");
  assert.equal(state.guidelines, "Send up to three poems. No fee.");
  assert.equal(state.eligibility, "Open to writers worldwide: any; 18+");
  assert.equal(state.requiredMaterials, "Bio; Work sample: 10 pages");
  assert.ok(state.pageText!.endsWith("…"));
  assert.ok(readingEvidenceLength(state) <= 8_000);
  assert.ok(readingEvidenceLength(state) > 7_900);

  const small = readingStateFromOpportunity(
    { title: "T", pageText: long },
    { maxTextChars: 100 },
  );
  assert.ok(small.pageText!.length <= 100);
  assert.equal(small.organization, undefined);
});

test("guidelines already in the page text are not repeated", () => {
  const state = readingStateFromOpportunity({
    title: "Call",
    pageText: "Intro. Send up to three poems. Thanks.",
    guidelines: "Send up to three poems.",
  });
  assert.equal(state.guidelines, undefined);
});

test("trimReadingText cuts at a word boundary", () => {
  assert.equal(trimReadingText("alpha beta gamma delta", 12), "alpha beta…");
  assert.equal(trimReadingText(null, 10), "");
  assert.equal(trimReadingText("short", 10), "short");
});
