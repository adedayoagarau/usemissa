import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore as createRadarStore } from '@missa/radar-engine';
import { WorkspaceEngine, createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { reviewerAssignmentForAccount, reviewerAssignmentsForAccount } from './reviewerProduct';

function fixture() {
  const radarStore = createRadarStore();
  radarStore.organizations.set('org-1', { id: 'org-1', name: 'North River Review', domains: [], verified: true });
  const radar = { store: radarStore };
  const workspaceStore = createWorkspaceStore();
  const workspace = new WorkspaceEngine({ store: workspaceStore, now: () => '2026-08-08T12:00:00.000Z' });
  const team = workspace.createEntity('org-1', 'Editorial');
  const program = workspace.createProgram(team.id, 'Awards');
  const opportunity = workspace.createOpenCall(program.id, 'Emerging Writers Award');
  const path = workspace.createSubmissionPath(opportunity.id, [], []);
  const submission = workspace.createSubmission(path.id, 'submitter-private', [{ title: 'Saltwater' }, { title: 'Night bus' }]);
  const round = workspace.createReviewRound(opportunity.id, 'First review');
  const own = workspace.assignReviewer(round.id, submission.id, 'reviewer-1');
  const foreign = workspace.assignReviewer(round.id, submission.id, 'reviewer-2');
  return { radar, workspace, own, foreign };
}

test('reviewer projection returns only assignments owned by the account', () => {
  const { radar, workspace, own } = fixture();
  const result = reviewerAssignmentsForAccount(workspace, radar, 'reviewer-1');
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, own.id);
});

test('reviewer projection exposes Work titles but not submitter, files, answers, or provider details', () => {
  const { radar, workspace, own } = fixture();
  const result = reviewerAssignmentForAccount(workspace, radar, 'reviewer-1', own.id)!;
  assert.deepEqual(result.works.map((work) => work.title), ['Saltwater', 'Night bus']);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('submitter-private'), false);
  assert.equal(serialized.includes('fileUrl'), false);
  assert.equal(serialized.includes('answers'), false);
  assert.equal(serialized.includes('reviewerAccountId'), false);
});

test('foreign assignment is indistinguishable from a missing assignment', () => {
  const { radar, workspace, foreign } = fixture();
  assert.equal(reviewerAssignmentForAccount(workspace, radar, 'reviewer-1', foreign.id), undefined);
  assert.equal(reviewerAssignmentForAccount(workspace, radar, 'reviewer-1', 'missing'), undefined);
});

test('completed fixed-score recommendations are labelled as legacy records', () => {
  const { radar, workspace, own } = fixture();
  workspace.recordReview(own.id, 7, 'Strong control of form.');
  const result = reviewerAssignmentForAccount(workspace, radar, 'reviewer-1', own.id)!;
  assert.equal(result.state, 'legacy-submitted');
  assert.equal(result.legacyRecommendation?.score, 7);
  assert.equal(result.legacyRecommendation?.notes, 'Strong control of form.');
});
