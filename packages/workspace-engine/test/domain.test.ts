import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  Entity,
  Program,
  OpenCall,
  SubmissionPath,
  Submission,
  Work,
  ReviewRound,
  ReviewAssignment,
  Decision,
  DeliveryTask,
} from '../src/index.js';

// This is a compile-and-shape smoke test for Story 1.3: the domain types
// don't have runtime behavior yet (no Drizzle schema, no functions), so the
// meaningful assertion is that the full Entity -> Program -> OpenCall ->
// SubmissionPath -> Submission -> Work chain type-checks and that Decision /
// DeliveryTask attach to a Work id, not a Submission id (the ADR in types.ts).

test('domain chain: Entity -> Program -> OpenCall -> SubmissionPath -> Submission -> Work', () => {
  const entity: Entity = { id: 'e1', organizationId: 'org1', name: 'Acme Magazine', createdAt: '2026-07-07T00:00:00.000Z' };
  const program: Program = { id: 'p1', entityId: entity.id, name: 'Fiction Program', createdAt: '2026-07-07T00:00:00.000Z' };
  const openCall: OpenCall = { id: 'oc1', programId: program.id, title: 'Fall Issue', status: 'draft', createdAt: '2026-07-07T00:00:00.000Z' };
  const path: SubmissionPath = {
    id: 'sp1',
    openCallId: openCall.id,
    categories: ['fiction', 'poetry'],
    fields: [{ id: 'f1', type: 'file-upload', label: 'Manuscript', required: true, order: 0 }],
    createdAt: '2026-07-07T00:00:00.000Z',
  };
  const submission: Submission = { id: 's1', submissionPathId: path.id, submitterAccountId: 'acct1', status: 'submitted', submittedAt: '2026-07-07T00:00:00.000Z' };
  const work: Work = { id: 'w1', submissionId: submission.id, title: 'Poem A', order: 0 };

  assert.equal(work.submissionId, submission.id);
  assert.equal(submission.submissionPathId, path.id);
  assert.equal(path.openCallId, openCall.id);
  assert.equal(openCall.programId, program.id);
  assert.equal(program.entityId, entity.id);
});

test('Decision and DeliveryTask attach to a Work, not a Submission (ADR)', () => {
  const work: Work = { id: 'w1', submissionId: 's1', title: 'Poem A', order: 0 };
  const decision: Decision = { id: 'd1', workId: work.id, outcome: 'accepted', decidedByAccountId: 'acct-admin', decidedAt: '2026-07-07T00:00:00.000Z' };
  const delivery: DeliveryTask = { id: 'dt1', workId: work.id, status: 'pending' };

  assert.equal(decision.workId, work.id);
  assert.equal(delivery.workId, work.id);
  // @ts-expect-error Decision must not have a submissionId field — enforces the ADR at compile time.
  assert.equal(decision.submissionId, undefined);
});

test('ReviewRound and ReviewAssignment scope to an Open Call and a Submission', () => {
  const round: ReviewRound = { id: 'r1', openCallId: 'oc1', name: 'Round 1', createdAt: '2026-07-07T00:00:00.000Z' };
  const assignment: ReviewAssignment = { id: 'ra1', reviewRoundId: round.id, submissionId: 's1', reviewerAccountId: 'acct-reviewer' };

  assert.equal(assignment.reviewRoundId, round.id);
});
