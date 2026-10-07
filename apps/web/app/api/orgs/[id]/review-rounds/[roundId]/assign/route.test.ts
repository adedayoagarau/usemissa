import assert from 'node:assert/strict';
import test from 'node:test';
import { getEngine } from '@/lib/engine';
import { getCompatibilityWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationRoleFixture, requestAs } from '../../../../../../../test/organizationRoleFixture';
import { POST as assignReviewer } from './route';

test('a reviewer cannot hold two assignments for one Submission in the same round', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const roundId = data.ownAssignment.reviewRoundId;
  const assign = (submissionId: string, reviewerAccountId: string) =>
    assignReviewer(requestAs(owner, `/review-rounds/${roundId}/assign`, { method: 'POST', body: JSON.stringify({ submissionId, reviewerAccountId }) }), { params: Promise.resolve({ id: data.organizationId, roundId }) });

  const duplicate = await assign(data.assigned.id, data.accounts.get('reviewer')!);
  assert.equal(duplicate.status, 409);
  const duplicateBody = await duplicate.json();
  assert.equal(duplicateBody.reason, 'already-assigned');
  assert.match(duplicateBody.error, /already assigned/);

  // A reader on another email domain has no conflict with the fixture submitter.
  const radar = await getEngine();
  const outsideEmail = 'outside-reader@independent-readers.test';
  const outside = [...radar.store.accounts.values()].find((account) => account.email === outsideEmail) ?? radar.signUp(outsideEmail, 'outside-reader-password', 'Outside Reader').account;
  if (!radar.store.memberships.some((membership) => membership.accountId === outside.id && membership.organizationId === data.organizationId)) {
    radar.store.memberships.push({ accountId: outside.id, organizationId: data.organizationId, role: 'reviewer', grantedAt: new Date().toISOString() });
  }
  const first = await assign(data.unassigned.id, outside.id);
  assert.equal(first.status, 201);
  const repeat = await assign(data.unassigned.id, outside.id);
  assert.equal(repeat.status, 409);
  assert.equal((await repeat.json()).reason, 'already-assigned');
});

test('one-off assignment applies the distribution conflict rules', async () => {
  const data = await organizationRoleFixture();
  const roundId = data.ownAssignment.reviewRoundId;
  // The fixture reviewer and submitter share the private domain role-access.test.
  const response = await assignReviewer(requestAs(data.accounts.get('owner')!, `/review-rounds/${roundId}/assign`, { method: 'POST', body: JSON.stringify({ submissionId: data.unassigned.id, reviewerAccountId: data.accounts.get('reviewer')! }) }), { params: Promise.resolve({ id: data.organizationId, roundId }) });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.reason, 'shared-email-domain');
  assert.match(body.error, /cannot review this submission/);
});

test('a reader who recused from a Submission is not assigned to it again in that round', async () => {
  const data = await organizationRoleFixture();
  const roundId = data.ownAssignment.reviewRoundId;
  const workspace = await getCompatibilityWorkspaceEngine();
  const recused = workspace.store.reviewAssignments.get(data.otherAssignment.id)!;
  recused.recusedAt = new Date().toISOString();
  const response = await assignReviewer(requestAs(data.accounts.get('owner')!, `/review-rounds/${roundId}/assign`, { method: 'POST', body: JSON.stringify({ submissionId: data.assigned.id, reviewerAccountId: recused.reviewerAccountId }) }), { params: Promise.resolve({ id: data.organizationId, roundId }) });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).reason, 'previously-recused');
});

test('a malformed assignment body is a 400, not a server error', async () => {
  const data = await organizationRoleFixture();
  const roundId = data.ownAssignment.reviewRoundId;
  const response = await assignReviewer(requestAs(data.accounts.get('owner')!, `/review-rounds/${roundId}/assign`, { method: 'POST', body: '{not json' }), { params: Promise.resolve({ id: data.organizationId, roundId }) });
  assert.equal(response.status, 400);
});
