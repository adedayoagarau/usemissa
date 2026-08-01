import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceEngine } from "../src/engine.js";

function seededOrganizations() {
  const engine = new WorkspaceEngine();
  const teamA = engine.createEntity("org_a", "Team A");
  const programA = engine.createProgram(teamA.id, "Program A");
  const callA = engine.createOpenCall(programA.id, "Opportunity A");
  const pathA = engine.createSubmissionPath(callA.id, [], []);
  const submissionA = engine.createSubmission(pathA.id, "acct_submitter", [{ title: "Work A" }]);
  const roundA = engine.createReviewRound(callA.id, "Round A");

  const teamB = engine.createEntity("org_b", "Team B");
  const programB = engine.createProgram(teamB.id, "Program B");
  const callB = engine.createOpenCall(programB.id, "Opportunity B");
  const pathB = engine.createSubmissionPath(callB.id, [], []);
  const submissionB = engine.createSubmission(pathB.id, "acct_other", [{ title: "Work B" }]);

  return { engine, teamA, programA, callA, pathA, submissionA, roundA, teamB, programB, callB, pathB, submissionB };
}

test("Organization Scope returns only resources related to its organization", () => {
  const world = seededOrganizations();
  const scope = world.engine.organizationScope("org_a");

  assert.equal(scope.entity(world.teamA.id)?.id, world.teamA.id);
  assert.equal(scope.program(world.programA.id)?.id, world.programA.id);
  assert.equal(scope.openCall(world.callA.id)?.id, world.callA.id);
  assert.equal(scope.submissionPath(world.pathA.id)?.id, world.pathA.id);
  assert.equal(scope.submission(world.submissionA.id)?.id, world.submissionA.id);
  assert.equal(scope.reviewRound(world.roundA.id)?.id, world.roundA.id);

  assert.equal(scope.entity(world.teamB.id), undefined);
  assert.equal(scope.program(world.programB.id), undefined);
  assert.equal(scope.openCall(world.callB.id), undefined);
  assert.equal(scope.submissionPath(world.pathB.id), undefined);
  assert.equal(scope.submission(world.submissionB.id), undefined);
});

test("review assignment rejects a submission from another opportunity", () => {
  const world = seededOrganizations();
  assert.throws(
    () => world.engine.assignReviewer(world.roundA.id, world.submissionB.id, "acct_reviewer"),
    /same opportunity/,
  );
});
