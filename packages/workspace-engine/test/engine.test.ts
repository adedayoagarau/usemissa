import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceEngine } from '../src/engine.js';

test('Story 6.1: creates a Team (Entity) and Program', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');

  assert.equal(program.entityId, entity.id);
  assert.deepEqual(engine.entitiesForOrganization('org1'), [entity]);
  assert.deepEqual(engine.programsForEntity(entity.id), [program]);
});

test('createProgram rejects an unknown entity', () => {
  const engine = new WorkspaceEngine();
  assert.throws(() => engine.createProgram('nope', 'X'));
});

test('Story 6.2: creates an Open Call, optionally linked to a claimed Radar Opportunity', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');

  const standalone = engine.createOpenCall(program.id, 'Fall Issue');
  assert.equal(standalone.status, 'draft');
  assert.equal(standalone.radarOpportunityId, undefined);

  const linked = engine.createOpenCall(program.id, 'Spring Issue', 'opp_0001');
  assert.equal(linked.radarOpportunityId, 'opp_0001');

  const published = engine.publishOpenCall(standalone.id);
  assert.equal(published.status, 'published');
  assert.ok(published.publishedAt);
});

test('Story 6.3: creates a Submission Path (form + categories) for an Open Call', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const openCall = engine.createOpenCall(program.id, 'Fall Issue');

  const path = engine.createSubmissionPath(
    openCall.id,
    ['fiction', 'poetry'],
    [{ type: 'file-upload', label: 'Manuscript', required: true }],
    500
  );

  assert.equal(path.openCallId, openCall.id);
  assert.equal(path.categories.length, 2);
  assert.equal(path.fields[0].order, 0);
  assert.equal(path.feeCents, 500);
  assert.deepEqual(engine.submissionPathsForOpenCall(openCall.id), [path]);
});

test('Story 6.4: publishedOpenCallsForOrganization walks Org -> Entity -> Program -> OpenCall', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const draft = engine.createOpenCall(program.id, 'Draft Call');
  const published = engine.createOpenCall(program.id, 'Live Call');
  engine.publishOpenCall(published.id);

  const otherEntity = engine.createEntity('org2', 'Other Org');
  const otherProgram = engine.createProgram(otherEntity.id, 'Other Program');
  const otherPublished = engine.createOpenCall(otherProgram.id, 'Other Live Call');
  engine.publishOpenCall(otherPublished.id);

  const live = engine.publishedOpenCallsForOrganization('org1');
  assert.equal(live.length, 1);
  assert.equal(live[0].id, published.id);
  assert.notEqual(live.some((o) => o.id === draft.id), true);
  assert.notEqual(live.some((o) => o.id === otherPublished.id), true);
});

test('Story 6.5: submitting creates a Submission with one or more Works (item-level model)', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const openCall = engine.createOpenCall(program.id, 'Fall Issue');
  const path = engine.createSubmissionPath(openCall.id, ['poetry'], [{ type: 'file-upload', label: 'Manuscript', required: true }]);

  const submission = engine.createSubmission(path.id, 'acct1', [
    { title: 'Poem A', fileUrl: 'https://example.com/a.pdf' },
    { title: 'Poem B', fileUrl: 'https://example.com/b.pdf' },
  ]);

  assert.equal(submission.status, 'submitted');
  const works = engine.worksForSubmission(submission.id);
  assert.equal(works.length, 2);
  assert.equal(works[0].title, 'Poem A');
  assert.equal(works[1].title, 'Poem B');
  assert.deepEqual(engine.submissionsForOpenCall(openCall.id), [submission]);
});

test('createSubmission rejects zero works', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme');
  const program = engine.createProgram(entity.id, 'Program');
  const openCall = engine.createOpenCall(program.id, 'Call');
  const path = engine.createSubmissionPath(openCall.id, [], []);

  assert.throws(() => engine.createSubmission(path.id, 'acct1', []));
});

test('Story 7.1: submissionsForOrganization walks Org -> Entity -> Program -> OpenCall -> Submission (drafts included)', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme Magazine');
  const program = engine.createProgram(entity.id, 'Fiction Program');
  const draftCall = engine.createOpenCall(program.id, 'Draft Call');
  const path = engine.createSubmissionPath(draftCall.id, ['fiction'], [{ type: 'file-upload', label: 'Manuscript', required: true }]);
  engine.createSubmission(path.id, 'acct1', [{ title: 'Story A' }]);

  const otherEntity = engine.createEntity('org2', 'Other Org');
  const otherProgram = engine.createProgram(otherEntity.id, 'Other Program');
  const otherCall = engine.createOpenCall(otherProgram.id, 'Other Call');
  const otherPath = engine.createSubmissionPath(otherCall.id, [], []);
  engine.createSubmission(otherPath.id, 'acct2', [{ title: 'Story B' }]);

  const submissions = engine.submissionsForOrganization('org1');
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].openCallId, draftCall.id);
  assert.equal(submissions[0].openCallTitle, 'Draft Call');
});

test('Story 7.2: creates a ReviewRound and assigns a reviewer; reviewer sees only their own assignments', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme');
  const program = engine.createProgram(entity.id, 'Program');
  const openCall = engine.createOpenCall(program.id, 'Call');
  const path = engine.createSubmissionPath(openCall.id, [], [{ type: 'file-upload', label: 'Manuscript', required: true }]);
  const submissionA = engine.createSubmission(path.id, 'submitterA', [{ title: 'A' }]);
  const submissionB = engine.createSubmission(path.id, 'submitterB', [{ title: 'B' }]);

  const round = engine.createReviewRound(openCall.id, 'Round 1');
  engine.assignReviewer(round.id, submissionA.id, 'reviewer1');
  engine.assignReviewer(round.id, submissionB.id, 'reviewer2');

  const reviewer1Assignments = engine.reviewAssignmentsForReviewer('reviewer1');
  assert.equal(reviewer1Assignments.length, 1);
  assert.equal(reviewer1Assignments[0].submissionId, submissionA.id);

  // Admin can add an additional reviewer to the same round/submission.
  engine.assignReviewer(round.id, submissionA.id, 'reviewer3');
  assert.equal(engine.reviewAssignmentsForSubmission(submissionA.id).length, 2);
});

test('assignReviewer rejects an unknown review round or submission', () => {
  const engine = new WorkspaceEngine();
  assert.throws(() => engine.assignReviewer('nope', 'nope', 'reviewer1'));
});

test('Story 7.3: reviewer records a recommendation, marking the assignment complete', () => {
  const engine = new WorkspaceEngine();
  const entity = engine.createEntity('org1', 'Acme');
  const program = engine.createProgram(entity.id, 'Program');
  const openCall = engine.createOpenCall(program.id, 'Call');
  const path = engine.createSubmissionPath(openCall.id, [], [{ type: 'file-upload', label: 'Manuscript', required: true }]);
  const submission = engine.createSubmission(path.id, 'submitterA', [{ title: 'A' }]);
  const round = engine.createReviewRound(openCall.id, 'Round 1');
  const assignment = engine.assignReviewer(round.id, submission.id, 'reviewer1');

  assert.equal(assignment.completedAt, undefined);
  const recommendation = engine.recordReview(assignment.id, 8, 'Strong voice, recommend accept.');
  assert.equal(recommendation.score, 8);
  assert.ok(engine.reviewAssignmentsForSubmission(submission.id)[0].completedAt);
  assert.deepEqual(engine.recommendationForAssignment(assignment.id), recommendation);
});
