import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compatibilityPublishReadiness,
  grantableRoles,
  reviewerAlreadyAssigned,
} from './organizationActions';
import { organizationErrorMessage } from './organizationMutation';

test('a draft Opportunity needs a saved form with a field before it can publish', () => {
  assert.deepEqual(compatibilityPublishReadiness({ status: 'draft' }), ['Save the submission form so applicants have somewhere to apply.']);
  assert.deepEqual(compatibilityPublishReadiness({ status: 'draft', form: { fieldCount: 0 } }), ['Add at least one field to the submission form.']);
  assert.deepEqual(compatibilityPublishReadiness({ status: 'draft', form: { fieldCount: 2 } }), []);
  assert.deepEqual(compatibilityPublishReadiness({ status: 'published' }), []);
});

test('a reviewer cannot be assigned twice to one Submission in the same round', () => {
  const assignments = [
    { reviewRoundId: 'round_1', reviewerAccountId: 'acct_a' },
    { reviewRoundId: 'round_1', reviewerAccountId: 'acct_b', recusedAt: '2026-10-01T00:00:00Z' },
  ];
  assert.equal(reviewerAlreadyAssigned(assignments, { reviewRoundId: 'round_1', reviewerAccountId: 'acct_a' }), true);
  assert.equal(reviewerAlreadyAssigned(assignments, { reviewRoundId: 'round_2', reviewerAccountId: 'acct_a' }), false);
  assert.equal(reviewerAlreadyAssigned(assignments, { reviewRoundId: 'round_1', reviewerAccountId: 'acct_b' }), false, 'a recused assignment no longer blocks a new one');
});

test('only an Owner is offered the Owner role, and legacy roles stay selectable for their holder', () => {
  assert.equal(grantableRoles('owner')[0], 'owner');
  assert.equal(grantableRoles('admin').includes('owner'), false);
  assert.equal(grantableRoles('admin').includes('member'), false);
  assert.equal(grantableRoles('admin', 'member').at(-1), 'member');
});

test('failed requests explain themselves in plain language', () => {
  assert.equal(organizationErrorMessage(400, { error: 'Team name is required' }, 'fallback'), 'Team name is required');
  assert.equal(organizationErrorMessage(403, {}, 'fallback'), 'Your Organization role does not allow this action.');
  assert.equal(organizationErrorMessage(500, {}, 'fallback'), 'fallback');
});
