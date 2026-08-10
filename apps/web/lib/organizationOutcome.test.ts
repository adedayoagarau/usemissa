import assert from 'node:assert/strict';
import test from 'node:test';
import { decisionEmailBatchDetail, deliveryConsequenceRank, deliveryPlanState, messageBatchState } from './organizationOutcome';

test('message batch detail is defensive and keeps sent and failed recipients separate', () => {
  const detail = decisionEmailBatchDetail({ detail: JSON.stringify({ workIds: ['work-1', 'work-1'], failedWorkIds: ['work-2'] }) });
  assert.deepEqual(detail, { workIds: ['work-1'], failedWorkIds: ['work-2'] });
  assert.equal(messageBatchState(detail), 'Partly sent');
  assert.deepEqual(decisionEmailBatchDetail({ detail: '{broken' }), { workIds: [], failedWorkIds: [] });
});

test('message state never promotes sent to delivered', () => {
  assert.equal(messageBatchState({ workIds: ['work-1'], failedWorkIds: [] }), 'Sent');
  assert.equal(messageBatchState({ workIds: [], failedWorkIds: ['work-1'] }), 'Needs attention');
  assert.equal(messageBatchState({ workIds: [], failedWorkIds: [] }), 'No recorded recipients');
});

test('delivery plans distinguish setup, active, and locally complete', () => {
  assert.equal(deliveryPlanState(), 'Ready to set up');
  assert.equal(deliveryPlanState({ status: 'pending' }), 'Active');
  assert.equal(deliveryPlanState({ status: 'complete' }), 'Complete');
});

test('delivery consequence ordering puts overdue and pending work first', () => {
  const today = '2026-08-08';
  assert.equal(deliveryConsequenceRank({ task: { status: 'pending', dueDate: '2026-08-07' }, today }), 0);
  assert.equal(deliveryConsequenceRank({ task: { status: 'pending' }, today }), 1);
  assert.equal(deliveryConsequenceRank({ today }), 2);
  assert.equal(deliveryConsequenceRank({ task: { status: 'complete' }, today }), 3);
});
