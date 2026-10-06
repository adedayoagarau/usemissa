import assert from 'node:assert/strict';
import test from 'node:test';
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
  assert.match((await duplicate.json()).error, /already assigned/);

  const first = await assign(data.unassigned.id, data.accounts.get('reviewer')!);
  assert.equal(first.status, 201);
  const repeat = await assign(data.unassigned.id, data.accounts.get('reviewer')!);
  assert.equal(repeat.status, 409);
});

test('a malformed assignment body is a 400, not a server error', async () => {
  const data = await organizationRoleFixture();
  const roundId = data.ownAssignment.reviewRoundId;
  const response = await assignReviewer(requestAs(data.accounts.get('owner')!, `/review-rounds/${roundId}/assign`, { method: 'POST', body: '{not json' }), { params: Promise.resolve({ id: data.organizationId, roundId }) });
  assert.equal(response.status, 400);
});
