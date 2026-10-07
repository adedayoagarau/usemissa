import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { RelationalOrganizationSubmissionView, RelationalWorkspace } from '@missa/workspace-engine';
import { organizationRoleFixture, requestAs } from '../test/organizationRoleFixture';
import { GET as getSubmission } from '../app/api/orgs/[id]/submissions/[submissionId]/route';
import { GET as getWorkFile } from '../app/api/orgs/[id]/works/[workId]/file/route';

const manuscript = `data:text/plain;base64,${Buffer.from('relational manuscript').toString('base64')}`;

async function relationalDossierFixture(t: TestContext) {
  const data = await organizationRoleFixture();
  const submission: RelationalOrganizationSubmissionView = {
    id: 'relational-submission', submissionPathId: 'relational-path', openCallId: 'relational-call', openCallTitle: 'Spring reading',
    submitterAccountId: data.accounts.get('submitter')!, status: 'submitted', submittedAt: '2026-10-01T00:00:00.000Z',
    works: [{ id: 'relational-work', title: 'Relational poem', fileUrl: manuscript, order: 0 }],
    assignments: [{ id: 'relational-assignment', reviewRoundId: 'relational-round', reviewerAccountId: data.accounts.get('reviewer')!, revision: 1 }],
    decisions: [{ workId: 'relational-work', outcome: 'accepted' }],
  };
  const reviewAssignment = { id: 'relational-assignment', reviewRoundId: 'relational-round', submissionId: submission.id, reviewerAccountId: data.accounts.get('reviewer')!, revision: 1, recommendation: { reviewAssignmentId: 'relational-assignment', score: 80, notes: 'Strong', status: 'complete', recordedAt: '2026-10-02T00:00:00.000Z' } };
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({
    submissionsForOrganization: async (organizationId: string) => (organizationId === data.organizationId ? [submission] : []),
    reviewAssignmentsForSubmission: async (organizationId: string, submissionId: string) => (organizationId === data.organizationId && submissionId === submission.id ? [reviewAssignment] : []),
  } as unknown as RelationalWorkspace);
  t.after(() => {
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  });
  const dossier = (accountId: string, submissionId = submission.id) => getSubmission(requestAs(accountId, `/submissions/${submissionId}`), { params: Promise.resolve({ id: data.organizationId, submissionId }) });
  const file = (accountId: string, workId = 'relational-work', index = 0) => getWorkFile(requestAs(accountId, `/works/${workId}/file?index=${index}`), { params: Promise.resolve({ id: data.organizationId, workId }) });
  return { data, submission, reviewAssignment, dossier, file };
}

test('relational Submission dossier is read from the relational projection', async (t) => {
  const { data, submission, reviewAssignment, dossier } = await relationalDossierFixture(t);
  const response = await dossier(data.accounts.get('owner')!);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.submission.id, submission.id);
  assert.deepEqual(body.works, submission.works);
  assert.deepEqual(body.reviewAssignments, [reviewAssignment]);
  assert.deepEqual(body.decisions, submission.decisions);
  assert.equal('deliveryTasks' in body, false, 'delivery tasks are not reported as none when they cannot be read');

  const unknown = await dossier(data.accounts.get('owner')!, 'missing-submission');
  assert.equal(unknown.status, 404);
  // Assignment-scoped access still fails closed under relational authority.
  assert.equal((await dossier(data.accounts.get('reviewer')!)).status, 403);
});

test('relational Work files stream for Submission readers and stay closed to everyone else', async (t) => {
  const { data, file } = await relationalDossierFixture(t);
  const response = await file(data.accounts.get('owner')!);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'relational manuscript');
  assert.equal((await file(data.accounts.get('owner')!, 'relational-work', 1)).status, 404);
  assert.equal((await file(data.accounts.get('owner')!, 'missing-work')).status, 404);
  assert.equal((await file(data.accounts.get('reviewer')!)).status, 403);
});
