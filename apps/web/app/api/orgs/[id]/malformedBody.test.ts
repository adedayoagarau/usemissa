import assert from 'node:assert/strict';
import test from 'node:test';
import type { RelationalWorkspace } from '@missa/workspace-engine';
import { getCompatibilityWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationRoleFixture, requestAs } from '../../../../test/organizationRoleFixture';
import { POST as createTeam } from './teams/route';
import { POST as createProgram } from './teams/[entityId]/programs/route';
import { POST as createOpenCall } from './open-calls/route';
import { POST as createReviewRound } from './open-calls/[openCallId]/review-rounds/route';
import { PATCH as updateSubmissionPath, POST as createSubmissionPath } from './open-calls/[openCallId]/submission-paths/route';
import { POST as createFormVersion } from './form-versions/route';
import { PATCH as updateFormVersion } from './form-versions/[versionId]/route';
import { POST as transitionFormVersion } from './form-versions/[versionId]/transition/route';
import { POST as createPortalConfiguration } from './portal-configurations/route';
import { PATCH as updatePortalConfiguration } from './portal-configurations/[configurationId]/route';
import { POST as transitionPortalConfiguration } from './portal-configurations/[configurationId]/transition/route';
import { POST as createConfigurationVersion } from './open-calls/[openCallId]/configuration-versions/route';
import { PATCH as updateConfigurationVersion } from './open-calls/[openCallId]/configuration-versions/[versionId]/route';
import { POST as transitionConfigurationVersion } from './open-calls/[openCallId]/configuration-versions/[versionId]/transition/route';
import { POST as createReviewWorkflowVersion } from './open-calls/[openCallId]/review-workflow-versions/route';
import { PATCH as updateReviewWorkflowVersion } from './open-calls/[openCallId]/review-workflow-versions/[versionId]/route';
import { POST as transitionReviewWorkflowVersion } from './open-calls/[openCallId]/review-workflow-versions/[versionId]/transition/route';
import { POST as recordReview } from '../../reviewer/assignments/[assignmentId]/review/route';

interface RouteParams { id: string; entityId: string; openCallId: string; versionId: string; configurationId: string; assignmentId: string }
type Handler = (request: Request, context: { params: Promise<RouteParams> }) => Promise<Response>;

const MALFORMED_BODIES = ['{not json', '', 'null'];

/** Sends each malformed body to the handler and expects a 400, never a thrown error. */
async function assertRejectsMalformed(name: string, handler: Handler, accountId: string, params: RouteParams, method: string) {
  for (const body of MALFORMED_BODIES) {
    const response = await handler(requestAs(accountId, `/${name}`, { method, headers: { 'Idempotency-Key': `malformed-${name}` }, body }), { params: Promise.resolve(params) });
    assert.equal(response.status, 400, `${name} with body ${JSON.stringify(body)}`);
    assert.deepEqual(await response.json(), { error: 'Invalid JSON' }, name);
  }
}

test('compatibility write routes answer a malformed body with 400', async () => {
  const data = await organizationRoleFixture();
  const owner = data.accounts.get('owner')!;
  const params: RouteParams = { id: data.organizationId, entityId: data.openCall.programId, openCallId: data.openCall.id, versionId: 'unused', configurationId: 'unused', assignmentId: data.ownAssignment.id };
  const routes: Array<[string, Handler, string]> = [
    ['teams', createTeam, 'POST'],
    ['teams/programs', createProgram, 'POST'],
    ['open-calls', createOpenCall, 'POST'],
    ['open-calls/review-rounds', createReviewRound, 'POST'],
    ['open-calls/submission-paths', createSubmissionPath, 'POST'],
    ['open-calls/submission-paths', updateSubmissionPath, 'PATCH'],
  ];
  for (const [name, handler, method] of routes) await assertRejectsMalformed(name, handler, owner, params, method);
});

test('a malformed review body is a 400 and records nothing', async () => {
  const data = await organizationRoleFixture();
  const workspace = await getCompatibilityWorkspaceEngine();
  const params: RouteParams = { id: data.organizationId, entityId: 'unused', openCallId: data.openCall.id, versionId: 'unused', configurationId: 'unused', assignmentId: data.ownAssignment.id };
  await assertRejectsMalformed('reviewer/review', recordReview, data.accounts.get('reviewer')!, params, 'POST');
  assert.equal(workspace.recommendationForAssignment(data.ownAssignment.id), undefined);
});

test('relational configuration routes answer a malformed body with 400', async (t) => {
  const data = await organizationRoleFixture();
  process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY = '1';
  // Any relational read or write fails the test: the body must be refused first.
  globalThis.__missaRelationalWorkspacePromise = Promise.resolve({} as RelationalWorkspace);
  t.after(() => {
    delete globalThis.__missaRelationalWorkspacePromise;
    delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  });
  const owner = data.accounts.get('owner')!;
  const params: RouteParams = { id: data.organizationId, entityId: 'relational-entity', openCallId: 'relational-call', versionId: 'relational-version', configurationId: 'relational-configuration', assignmentId: 'relational-assignment' };
  const routes: Array<[string, Handler, string]> = [
    ['teams', createTeam, 'POST'],
    ['teams/programs', createProgram, 'POST'],
    ['open-calls', createOpenCall, 'POST'],
    ['open-calls/review-rounds', createReviewRound, 'POST'],
    ['open-calls/submission-paths', createSubmissionPath, 'POST'],
    ['open-calls/submission-paths', updateSubmissionPath, 'PATCH'],
    ['form-versions', createFormVersion, 'POST'],
    ['form-versions/version', updateFormVersion, 'PATCH'],
    ['form-versions/version/transition', transitionFormVersion, 'POST'],
    ['portal-configurations', createPortalConfiguration, 'POST'],
    ['portal-configurations/configuration', updatePortalConfiguration, 'PATCH'],
    ['portal-configurations/configuration/transition', transitionPortalConfiguration, 'POST'],
    ['configuration-versions', createConfigurationVersion, 'POST'],
    ['configuration-versions/version', updateConfigurationVersion, 'PATCH'],
    ['configuration-versions/version/transition', transitionConfigurationVersion, 'POST'],
    ['review-workflow-versions', createReviewWorkflowVersion, 'POST'],
    ['review-workflow-versions/version', updateReviewWorkflowVersion, 'PATCH'],
    ['review-workflow-versions/version/transition', transitionReviewWorkflowVersion, 'POST'],
  ];
  for (const [name, handler, method] of routes) await assertRejectsMalformed(name, handler, owner, params, method);
  await assertRejectsMalformed('reviewer/review', recordReview, data.accounts.get('reviewer')!, params, 'POST');
});
