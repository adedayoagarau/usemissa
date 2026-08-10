import assert from 'node:assert/strict';
import test from 'node:test';
import { decisionSummary, paymentLane, receiptLane, reviewLane, submissionNextAction } from './organizationWorkflow';

const works = [{ id: 'one' }, { id: 'two' }];

test('receipt, review, and payment lanes remain independent', () => {
  assert.equal(receiptLane('submitted', 'disputed'), 'Needs attention');
  assert.equal(receiptLane('withdrawn', 'paid'), 'Withdrawn');
  assert.equal(reviewLane([]), 'Not started');
  assert.equal(reviewLane([{ completedAt: '2026-08-08' }, {}]), 'In review');
  assert.equal(reviewLane([{ completedAt: '2026-08-08' }]), 'Review complete');
  assert.equal(paymentLane(undefined), 'Unknown');
  assert.equal(paymentLane('not-required'), 'Not required');
});

test('decision summary is derived per Work and preserves mixed packets', () => {
  assert.equal(decisionSummary(works, []), 'No decisions');
  assert.equal(decisionSummary(works, [{ workId: 'one', outcome: 'declined' }]), 'Partially decided');
  assert.equal(decisionSummary(works, [{ workId: 'one', outcome: 'accepted' }]), 'Partially accepted');
  assert.equal(decisionSummary(works, [{ workId: 'one', outcome: 'accepted' }, { workId: 'two', outcome: 'declined' }]), 'Partially accepted');
  assert.equal(decisionSummary(works, [{ workId: 'one', outcome: 'declined' }, { workId: 'two', outcome: 'waitlisted' }]), 'Mixed');
  assert.equal(decisionSummary(works, [{ workId: 'one', outcome: 'accepted' }, { workId: 'two', outcome: 'accepted' }]), 'Accepted');
});

test('next action follows consequence order without collapsing lanes', () => {
  assert.equal(submissionNextAction({ receipt: 'Needs attention', review: 'Review complete', decision: 'Accepted' }), 'Resolve receipt issue');
  assert.equal(submissionNextAction({ receipt: 'Received', review: 'In review', decision: 'No decisions' }), 'Complete review');
  assert.equal(submissionNextAction({ receipt: 'Received', review: 'Review complete', decision: 'Mixed' }), 'Review communication');
});
