import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { RelationalOrganizationSubmissionView, RelationalWorkspace } from '@missa/workspace-engine';
import { getEngine } from '@/lib/engine';
import { organizationRoleFixture, requestAs } from '../test/organizationRoleFixture';
import { POST } from '../app/api/orgs/[id]/review-rounds/[roundId]/assign/route';

const ROUND = { id: 'relational-round', openCallId: 'relational-call', name: 'First read', revision: 1 };

/** A relational Organization with one round and one Submission, readable through the same projections production uses. */
async function relationalAssignFixture(t: TestContext, options: { submission?: Partial<RelationalOrganizationSubmissionView>; replayed?: boolean } = {}) {
  const data = await organizationRoleFixture();
  const radar = await getEngine();
  // The fixture reviewers share a private email domain with the submitter; this reader does not.
  const readerEmail = 'relational-reader@independent-readers.test';
  const reader = [...radar.store.accounts.values()].find((account) => account.email === readerEmail) ?? radar.signUp(readerEmail, 'relational-reader-password', 'Relational Reader').account;
  if (!radar.store.memberships.some((membership) => membership.accountId === reader.id && membership.organizationId === data.organizationId)) {
    radar.store.memberships.push({ accountId: reader.id, organizationId: data.organizationId, role: 'reviewer', grantedAt: new Date().toISOString() });
  }
  const submission: RelationalOrganizationSubmissionView = {
    id: 'relational-submission', submissionPathId: 'relational-path', openCallId: ROUND.openCallId, openCallTitle: 'Spring reading',
    submitterAccountId: data.accounts.get('submitter')!, status: 'submitted', submittedAt: '2026-10-01T00:00:00.000Z',
    works: [{ id: 'relational-work', title: 'Relational poem', order: 0 }], assignments: [], decisions: [],
    ...options.submission,
  };
  const assigned: unknown[] = [];
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({
    openCallsForOrganization: async () => [{ id: ROUND.openCallId, programId: 'relational-program', title: 'Spring reading', status: 'published', revision: 1 }],
    reviewRoundsForOpenCall: async (_organizationId: string, openCallId: string) => (openCallId === ROUND.openCallId ? [ROUND] : []),
    submissionsForOrganization: async () => [submission],
    assignReviewer: async (_envelope: unknown, payload: { reviewRoundId: string; reviewerAccountId: string }) => {
      const result = { resourceType: 'review_assignment', resourceId: 'relational-assignment', revision: 1, receiptId: 'relational-receipt' };
      if (options.replayed) return { ...result, replayed: true };
      // The relational unique index on (round, Submission, reviewer).
      if (submission.assignments.some((assignment) => assignment.reviewRoundId === payload.reviewRoundId && assignment.reviewerAccountId === payload.reviewerAccountId)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505', constraint: 'review_assignments_unique_idx' });
      }
      assigned.push(payload);
      return { ...result, replayed: false };
    },
  } as unknown as RelationalWorkspace);
  t.after(() => {
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
    delete process.env.JEV_API_KEY;
  });
  const assign = (body: unknown, roundId = ROUND.id) => POST(
    requestAs(data.accounts.get('owner')!, `/review-rounds/${roundId}/assign`, { method: 'POST', headers: { 'Idempotency-Key': `assign-${Math.random()}` }, body: typeof body === 'string' ? body : JSON.stringify(body) }),
    { params: Promise.resolve({ id: data.organizationId, roundId }) },
  );
  return { data, reader, submission, assigned, assign };
}

test('relational assignment with Jev enabled answers 201 and runs the advisory conflict check on relational data', async (t) => {
  const { reader, submission, assigned, assign } = await relationalAssignFixture(t);
  process.env.JEV_API_KEY = 'jev-test-key';
  const warn = t.mock.method(console, 'warn', () => undefined);
  const response = await assign({ submissionId: submission.id, reviewerAccountId: reader.id });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 'relational-assignment', reviewRoundId: ROUND.id, submissionId: submission.id, reviewerAccountId: reader.id, revision: 1, receiptId: 'relational-receipt', idempotent: false });
  assert.equal(assigned.length, 1);
  // Outside a request `after()` cannot schedule, so reaching it proves the check found the
  // applicant, the reader and the Works without the compatibility store.
  assert.ok(warn.mock.calls.some((call) => String(call.arguments[0]).includes('reviewer_conflict could not be scheduled')));
});

test('a replayed relational assignment answers 200 and does not repeat the advisory check', async (t) => {
  const { reader, submission, assign } = await relationalAssignFixture(t, { replayed: true });
  process.env.JEV_API_KEY = 'jev-test-key';
  const warn = t.mock.method(console, 'warn', () => undefined);
  const response = await assign({ submissionId: submission.id, reviewerAccountId: reader.id });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).idempotent, true);
  assert.equal(warn.mock.calls.length, 0);
});

test('relational assignment applies the distribution conflict rules before writing', async (t) => {
  const sharedDomain = await relationalAssignFixture(t);
  const refused = await sharedDomain.assign({ submissionId: sharedDomain.submission.id, reviewerAccountId: sharedDomain.data.accounts.get('reviewer')! });
  assert.equal(refused.status, 409);
  const refusedBody = await refused.json();
  assert.equal(refusedBody.reason, 'shared-email-domain');
  assert.match(refusedBody.error, /cannot review this Submission/);
  assert.equal(sharedDomain.assigned.length, 0);
});

test('relational assignment refuses a reader who already holds, or recused from, the Submission in this round', async (t) => {
  const { reader } = await relationalAssignFixture(t);
  const assignment = { id: 'existing', reviewRoundId: ROUND.id, reviewerAccountId: reader.id, revision: 1 };

  const held = await relationalAssignFixture(t, { submission: { assignments: [assignment] } });
  const duplicate = await held.assign({ submissionId: held.submission.id, reviewerAccountId: reader.id });
  assert.equal(duplicate.status, 409);
  const duplicateBody = await duplicate.json();
  assert.equal(duplicateBody.reason, 'already-assigned');
  assert.match(duplicateBody.error, /already assigned/);

  const recused = await relationalAssignFixture(t, { submission: { assignments: [{ ...assignment, recusedAt: '2026-10-02T00:00:00.000Z' }] } });
  const again = await recused.assign({ submissionId: recused.submission.id, reviewerAccountId: reader.id });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).reason, 'previously-recused');

  const otherRound = await relationalAssignFixture(t, { submission: { assignments: [{ ...assignment, reviewRoundId: 'another-round' }] } });
  const allowed = await otherRound.assign({ submissionId: otherRound.submission.id, reviewerAccountId: reader.id });
  assert.equal(allowed.status, 201);
  assert.equal(held.assigned.length + recused.assigned.length, 0);
});

test('a retried relational assignment replays its committed write instead of being refused as a duplicate', async (t) => {
  const { reader } = await relationalAssignFixture(t);
  const committed = { id: 'relational-assignment', reviewRoundId: ROUND.id, reviewerAccountId: reader.id, revision: 1 };
  const retry = await relationalAssignFixture(t, { replayed: true, submission: { assignments: [committed] } });
  const response = await retry.assign({ submissionId: retry.submission.id, reviewerAccountId: reader.id });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).idempotent, true);
});

test('relational assignment refuses a withdrawn Submission or one from another Opportunity, and 404s unknown records', async (t) => {
  const withdrawn = await relationalAssignFixture(t, { submission: { status: 'withdrawn' } });
  const refused = await withdrawn.assign({ submissionId: withdrawn.submission.id, reviewerAccountId: withdrawn.reader.id });
  assert.equal(refused.status, 409);
  assert.match((await refused.json()).error, /cannot be read in this round/);

  const elsewhere = await relationalAssignFixture(t, { submission: { openCallId: 'another-call' } });
  assert.equal((await elsewhere.assign({ submissionId: elsewhere.submission.id, reviewerAccountId: elsewhere.reader.id })).status, 409);

  const unknownRound = await elsewhere.assign({ submissionId: elsewhere.submission.id, reviewerAccountId: elsewhere.reader.id }, 'missing-round');
  assert.equal(unknownRound.status, 404);
  assert.deepEqual(await unknownRound.json(), { error: 'Unknown review round for this organization' });
  const unknownSubmission = await elsewhere.assign({ submissionId: 'missing-submission', reviewerAccountId: elsewhere.reader.id });
  assert.equal(unknownSubmission.status, 404);
  assert.deepEqual(await unknownSubmission.json(), { error: 'Unknown submission for this organization' });
  assert.equal(withdrawn.assigned.length + elsewhere.assigned.length, 0);
});

test('a malformed relational assignment body is a 400', async (t) => {
  const { assign, assigned } = await relationalAssignFixture(t);
  const response = await assign('{not json');
  assert.equal(response.status, 400);
  assert.equal(assigned.length, 0);
});
