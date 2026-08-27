import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-strip runtime resolves this source extension directly.
import { organizationMessageState, recipientReferenceLabel, reconcileRequestedWorkIds } from './organizationMessagePresentation.ts';

test('decision batch reconciliation returns every omitted requested Work', () => {
  assert.deepEqual(reconcileRequestedWorkIds(['work-1', 'work-2', 'work-3'], ['work-1'], ['work-3']), ['work-2']);
});

test('Organization presentation keeps accepted distinct from delivered', () => {
  assert.equal(organizationMessageState('accepted'), 'Accepted');
  assert.equal(organizationMessageState('delivered'), 'Delivered');
  assert.equal(organizationMessageState('attempted'), 'In progress');
  assert.equal(organizationMessageState('bounced'), 'Needs attention');
});

test('Organization presentation never renders an internal recipient ID', () => {
  const internalId = 'acct_internal_secret';
  const label = recipientReferenceLabel(internalId);
  assert.equal(label, 'Recipient reference retained');
  assert.equal(label.includes(internalId), false);
});
