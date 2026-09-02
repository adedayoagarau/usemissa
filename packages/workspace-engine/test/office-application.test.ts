import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendOfficeApplicationEvent,
  createOfficeApplicationEvent,
  OfficeApplicationConflictError,
  OfficeApplicationTransitionError,
  reduceOfficeApplication,
  type OfficeApplicationEvent,
} from '../src/index.js';

type OfficeEventType = OfficeApplicationEvent['type'];
type OfficeEventInputFor<T extends OfficeEventType> = Omit<
  Extract<OfficeApplicationEvent, { type: T }>,
  'eventId' | 'occurredAt'
> & {
  eventId?: string;
  occurredAt?: string;
};
type OfficeEventInput = {
  [T in OfficeEventType]: OfficeEventInputFor<T>;
}[OfficeEventType];

const created = createOfficeApplicationEvent({
  eventId: 'evt-created',
  occurredAt: '2026-08-21T10:00:00.000Z',
  id: 'app-1',
  accountId: 'acct-1',
  trackerOpportunityId: 'tracked-1',
  opportunityId: 'opp-1',
  opportunityVersionId: 'opp-1-v3',
  compilerVersion: 'compiler-v1',
  playbookVersion: 'playbook-v1',
  eligibilityPolicyVersion: 'eligibility-v1',
  idempotencyKey: 'create-app-1',
});

let eventNumber = 0;

function event(value: OfficeEventInput): OfficeApplicationEvent {
  return {
    ...value,
    eventId: value.eventId ?? `evt-${++eventNumber}`,
    occurredAt: value.occurredAt ?? '2026-08-21T10:01:00.000Z',
  } as OfficeApplicationEvent;
}

test('Office application reducer models compile, Work, approval, handoff, and receipt states', () => {
  const events: OfficeApplicationEvent[] = [
    created,
    event({ type: 'compilation.started', expectedEventRevision: 1 }),
    event({ type: 'compilation.completed', blocked: false, expectedEventRevision: 2 }),
    event({ type: 'work.snapshot_selected', workSnapshotId: 'work-snapshot-1', expectedEventRevision: 3 }),
    event({ type: 'approval.requested', approvalRequestId: 'approval-1', expectedEventRevision: 4 }),
    event({ type: 'approval.decided', approvalRequestId: 'approval-1', decision: 'approved', expectedEventRevision: 5 }),
    event({ type: 'handoff.started', sideEffectIdempotencyKey: 'handoff-app-1', expectedEventRevision: 6 }),
    event({ type: 'receipt.confirmed', providerReference: 'provider-123', expectedEventRevision: 7 }),
  ];

  const state = reduceOfficeApplication(events);

  assert.equal(state.readiness, 'approved_for_handoff');
  assert.equal(state.approvalStatus, 'approved');
  assert.equal(state.externalAction, 'confirmed');
  assert.equal(state.providerReference, 'provider-123');
  assert.deepEqual(state.workSnapshotIds, ['work-snapshot-1']);
  assert.equal(state.applicationRevision, 2);
  assert.equal(state.eventRevision, 8);
});

test('replayed event ids and idempotency keys return the original history', () => {
  const first = appendOfficeApplicationEvent({ events: [] }, created);
  const sameId = appendOfficeApplicationEvent(first, created);
  const sameKey = appendOfficeApplicationEvent(first, {
    ...created,
    eventId: 'evt-created-retry',
  });

  assert.equal(sameId.events.length, 1);
  assert.equal(sameKey.events.length, 1);
  assert.equal(sameKey.state?.id, 'app-1');
});

test('stale revisions are rejected before applying a mutation', () => {
  const history = appendOfficeApplicationEvent({ events: [] }, created);

  assert.throws(
    () =>
      appendOfficeApplicationEvent(history, {
        type: 'compilation.started',
        eventId: 'evt-stale',
        occurredAt: '2026-08-21T10:01:00.000Z',
        expectedEventRevision: 0,
      }),
    OfficeApplicationConflictError,
  );
});

test('approval cannot be bypassed and ambiguous handoffs cannot retry blindly', () => {
  let history = appendOfficeApplicationEvent({ events: [] }, created);
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.started' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.completed', blocked: false }));

  assert.throws(
    () => appendOfficeApplicationEvent(history, event({ type: 'handoff.started', sideEffectIdempotencyKey: 'handoff-app-1' })),
    OfficeApplicationTransitionError,
  );

  history = appendOfficeApplicationEvent(history, event({ type: 'approval.requested', approvalRequestId: 'approval-1' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'approval.decided', approvalRequestId: 'approval-1', decision: 'approved' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'handoff.started', sideEffectIdempotencyKey: 'handoff-app-1' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'handoff.outcome_unknown' }));

  assert.throws(
    () => appendOfficeApplicationEvent(history, event({ type: 'handoff.retry_started', sideEffectIdempotencyKey: 'different-key' })),
    OfficeApplicationTransitionError,
  );
});

test('a failed handoff reuses its original side-effect key', () => {
  let history = appendOfficeApplicationEvent({ events: [] }, created);
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.started' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.completed', blocked: false }));
  history = appendOfficeApplicationEvent(history, event({ type: 'approval.requested', approvalRequestId: 'approval-failed' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'approval.decided', approvalRequestId: 'approval-failed', decision: 'approved' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'handoff.started', sideEffectIdempotencyKey: 'handoff-failed' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'handoff.failed' }));

  assert.throws(
    () => appendOfficeApplicationEvent(history, event({ type: 'handoff.started', sideEffectIdempotencyKey: 'handoff-different' })),
    OfficeApplicationTransitionError,
  );
});

test('changed requirements require a new approval request', () => {
  let history = appendOfficeApplicationEvent({ events: [] }, created);
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.started' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.completed', blocked: false }));
  history = appendOfficeApplicationEvent(history, event({ type: 'approval.requested', approvalRequestId: 'approval-1' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'approval.decided', approvalRequestId: 'approval-1', decision: 'changes_requested' }));

  assert.equal(history.state?.readiness, 'changes_requested');
  assert.equal(history.state?.approvalStatus, 'changes_requested');

  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.started' }));
  history = appendOfficeApplicationEvent(history, event({ type: 'compilation.completed', blocked: false }));
  assert.equal(history.state?.approvalStatus, 'not_requested');
  assert.equal(history.state?.readiness, 'ready_for_review');
});
