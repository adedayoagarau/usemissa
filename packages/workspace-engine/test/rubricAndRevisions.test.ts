import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceEngine, normalizeRubricCriteria, validateCriterionScores, weightedRubricScore } from "../src/index.js";

function seed() {
  let tick = 0;
  const engine = new WorkspaceEngine({ now: () => `2026-10-0${1 + (tick++ % 8)}T10:00:00.000Z` });
  const team = engine.createEntity("org_1", "Editorial");
  const program = engine.createProgram(team.id, "Prize");
  const call = engine.createOpenCall(program.id, "2027 Poetry Prize");
  engine.publishOpenCall(call.id);
  const path = engine.createSubmissionPath(call.id, [], [{ type: "text", label: "Statement", required: false }]);
  const first = engine.createSubmission(path.id, "acct_rosa", [{ title: "Saltwater", fileUrl: "https://blob.example/a.pdf" }, { title: "Night bus" }]);
  const round = engine.createReviewRound(call.id, "First read");
  const other = engine.createEntity("org_2", "Elsewhere");
  return { engine, call, path, first, round, other };
}

test("rubric criteria normalize, keep ids unique and reject bad scales", () => {
  const criteria = normalizeRubricCriteria([{ label: "Voice", weight: 3, maxScore: 5 }, { label: "Voice" }, { label: "Craft & form", description: " Line by line " }]);
  assert.deepEqual(criteria.map((criterion) => criterion.id), ["voice", "voice-2", "craft-form"]);
  assert.equal(criteria[2]!.description, "Line by line");
  assert.equal(criteria[1]!.weight, 1);
  assert.throws(() => normalizeRubricCriteria([{ label: "" }]), /needs a name/);
  assert.throws(() => normalizeRubricCriteria([{ label: "A", maxScore: 2 }]), /scale/);
  assert.throws(() => normalizeRubricCriteria([{ label: "A", weight: 0.5 }]), /Weight/);
  assert.throws(() => normalizeRubricCriteria(Array.from({ length: 11 }, (_, index) => ({ label: `C${index}` }))), /at most 10/);
});

test("weighted rubric score maps to 0-100 and validation needs every criterion", () => {
  const criteria = normalizeRubricCriteria([{ label: "Voice", weight: 3, maxScore: 5 }, { label: "Craft", weight: 1, maxScore: 10 }]);
  assert.equal(weightedRubricScore(criteria, { voice: 5, craft: 0 }), 75);
  assert.equal(weightedRubricScore(criteria, { voice: 5, craft: 10 }), 100);
  assert.throws(() => validateCriterionScores(criteria, { voice: 5 }), /Craft/);
  assert.throws(() => validateCriterionScores(criteria, { voice: 6, craft: 1 }), /Voice/);
  assert.throws(() => validateCriterionScores(criteria, { voice: 2.5, craft: 1 }), /whole number/);
});

test("rubric versions are immutable and scored reads keep their version", () => {
  const { engine, first, round } = seed();
  assert.throws(() => engine.setRoundRubric("org_2", round.id, [{ label: "Voice" }], "acct_admin"), /not part of this organization/);
  assert.throws(() => engine.setRoundRubric("org_1", round.id, [], "acct_admin"), /at least one/);
  const v1 = engine.setRoundRubric("org_1", round.id, [{ label: "Voice", weight: 2 }, { label: "Craft" }], "acct_admin");
  assert.equal(v1.version, 1);
  assert.equal(engine.setRoundRubric("org_1", round.id, [{ id: "voice", label: "Voice", weight: 2 }, { id: "craft", label: "Craft" }], "acct_admin").id, v1.id, "an unchanged rubric adds no version");
  const assignment = engine.assignReviewer(round.id, first.id, "acct_reader");
  assert.throws(() => engine.recordRubricReview(assignment.id, { voice: 4 }), /Craft/);
  const { recommendation, criterionScores } = engine.recordRubricReview(assignment.id, { voice: 5, craft: 0 }, "Strong voice");
  assert.equal(recommendation.score, 67);
  assert.equal(criterionScores.rubricVersion, 1);
  const v2 = engine.setRoundRubric("org_1", round.id, [{ label: "Voice" }], "acct_admin");
  assert.equal(v2.version, 2);
  assert.equal(engine.criterionScoresForAssignment(assignment.id)!.rubricVersion, 1, "earlier reads keep their version");
  assert.equal(engine.rubricVersionsForRound(round.id)[0]!.criteria.length, 2, "version 1 is unchanged");
  engine.setRoundRubric("org_1", round.id, [], "acct_admin");
  assert.equal(engine.rubricForRound(round.id), undefined, "an empty version returns the round to the single score");
  assert.throws(() => engine.recordRubricReview(assignment.id, {}), /no rubric/);
});

test("submitters edit titles, files and answers until reading starts, with a revision record", () => {
  const { engine, first, round } = seed();
  const [saltwater, nightBus] = engine.worksForSubmission(first.id);
  assert.equal(engine.submissionEditability(first.id, "acct_other").editable, false);
  assert.equal(engine.submissionEditability(first.id, "acct_rosa", { allowedByOrganization: false }).editable, false);
  assert.throws(() => engine.editSubmission(first.id, "acct_rosa", { works: [{ workId: saltwater!.id, title: "Saltwater" }] }), /Nothing changed/);
  const revision = engine.editSubmission(first.id, "acct_rosa", {
    works: [{ workId: saltwater!.id, title: "Salt Water", fileUrls: ["https://blob.example/b.pdf", "https://blob.example/c.pdf"] }],
    answers: { statement: "A new statement" },
  });
  assert.deepEqual(revision.changes.map((change) => change.kind), ["work-title", "work-files", "answer"]);
  const updated = engine.store.works.get(saltwater!.id)!;
  assert.equal(updated.title, "Salt Water");
  assert.equal(updated.fileUrl, "https://blob.example/b.pdf");
  assert.deepEqual(updated.fileUrls, ["https://blob.example/c.pdf"]);
  assert.equal(engine.store.submissions.get(first.id)!.answers!.statement, "A new statement");
  assert.throws(() => engine.editSubmission(first.id, "acct_rosa", { works: [{ workId: "work_missing", title: "X" }] }), /not part of this submission/);
  assert.throws(() => engine.editSubmission(first.id, "acct_rosa", { works: [{ workId: nightBus!.id, title: "  " }] }), /needs a title/);

  const read = engine.assignReviewer(round.id, first.id, "acct_reader");
  assert.match(engine.submissionEditability(first.id, "acct_rosa").reason!, /Reading has started/);
  engine.store.reviewAssignments.get(read.id)!.recusedAt = "2026-10-05T10:00:00.000Z";
  assert.equal(engine.submissionEditability(first.id, "acct_rosa").editable, true, "a withdrawn read does not lock the submission");
  engine.recordDecision("org_1", nightBus!.id, "declined", "acct_admin");
  assert.match(engine.submissionEditability(first.id, "acct_rosa").reason!, /decision/);
  assert.equal(engine.revisionsForSubmission(first.id).length, 1);
});
