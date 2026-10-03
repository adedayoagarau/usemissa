import assert from 'node:assert/strict';
import test from 'node:test';
import { organizationRoleCan, type OrganizationCapability } from '@/lib/organizationProduct';
import { ORGANIZATION_ROLES, organizationRoleFixture, requestAs } from '../../../../test/organizationRoleFixture';
import { GET as getBilling } from './billing/route';
import { GET as getDeliveryTasks } from './delivery-tasks/route';
import { GET as getInsights } from './insights/route';
import { GET as getMembers } from './members/route';
import { GET as getOpenCalls } from './open-calls/route';
import { GET as getReviewRounds } from './open-calls/[openCallId]/review-rounds/route';
import { GET as getRetentionPolicy } from './retention-policy/route';
import { GET as getReviewSettings } from './review-settings/route';
import { GET as getReviewerGroups } from './reviewer-groups/route';
import { GET as getSeats } from './seats/route';
import { GET as getSubmission } from './submissions/[submissionId]/route';
import { GET as getSubmissions } from './submissions/route';
import { GET as getTeams } from './teams/route';
import { GET as getWorkFile } from './works/[workId]/file/route';

test('every Organization read route enforces its role capability', async () => {
  const data = await organizationRoleFixture();
  const id = data.organizationId;
  const routes: Array<{ name: string; capability: OrganizationCapability | OrganizationCapability[]; call: (request: Request) => Promise<Response> }> = [
    { name: 'submissions', capability: 'submissions.read', call: (request) => getSubmissions(request, { params: Promise.resolve({ id }) }) },
    { name: 'delivery-tasks', capability: 'delivery.read', call: (request) => getDeliveryTasks(request, { params: Promise.resolve({ id }) }) },
    { name: 'insights', capability: 'insights.read', call: (request) => getInsights(request, { params: Promise.resolve({ id }) }) },
    { name: 'members', capability: 'people.read', call: (request) => getMembers(request, { params: Promise.resolve({ id }) }) },
    { name: 'billing', capability: 'billing.read', call: (request) => getBilling(request, { params: Promise.resolve({ id }) }) },
    { name: 'seats', capability: ['people.read', 'billing.read'], call: (request) => getSeats(request, { params: Promise.resolve({ id }) }) },
    { name: 'open-calls', capability: 'opportunities.read', call: (request) => getOpenCalls(request, { params: Promise.resolve({ id }) }) },
    { name: 'teams', capability: 'opportunities.read', call: (request) => getTeams(request, { params: Promise.resolve({ id }) }) },
    { name: 'review-rounds', capability: 'reviews.read', call: (request) => getReviewRounds(request, { params: Promise.resolve({ id, openCallId: data.openCall.id }) }) },
    { name: 'reviewer-groups', capability: 'reviews.read', call: (request) => getReviewerGroups(request, { params: Promise.resolve({ id }) }) },
    { name: 'review-settings', capability: 'reviews.read', call: (request) => getReviewSettings(request, { params: Promise.resolve({ id }) }) },
    { name: 'retention-policy', capability: 'settings.read', call: (request) => getRetentionPolicy(request, { params: Promise.resolve({ id }) }) },
  ];
  for (const role of ORGANIZATION_ROLES) {
    for (const route of routes) {
      const response = await route.call(requestAs(data.accounts.get(role)!));
      if (organizationRoleCan(role, route.capability)) assert.equal(response.status, 200, `${role} should read ${route.name}`);
      else assert.equal(response.status, 403, `${role} must not read ${route.name}`);
    }
  }
  const outsider = await getSubmissions(requestAs(data.accounts.get('outsider-with-account')!), { params: Promise.resolve({ id }) });
  assert.equal(outsider.status, 403);
});

test('assigned reviewers see only their own assignment and never other reviewers or decisions', async () => {
  const data = await organizationRoleFixture();
  const reviewer = data.accounts.get('reviewer')!;
  const params = (submissionId: string) => ({ params: Promise.resolve({ id: data.organizationId, submissionId }) });

  const response = await getSubmission(requestAs(reviewer), params(data.assigned.id));
  assert.equal(response.status, 200);
  const body = await response.json() as { reviewAssignments: Array<{ id: string }>; decisions: unknown[]; deliveryTasks: unknown[] };
  assert.deepEqual(body.reviewAssignments.map((assignment) => assignment.id), [data.ownAssignment.id]);
  assert.deepEqual(body.decisions, []);
  assert.deepEqual(body.deliveryTasks, []);
  assert.doesNotMatch(JSON.stringify(body), /Other reviewer private notes/);

  assert.equal((await getSubmission(requestAs(reviewer), params(data.unassigned.id))).status, 403);
  assert.equal((await getSubmission(requestAs(reviewer), params('submission_does_not_exist'))).status, 403, 'unassigned callers cannot probe existence');
  for (const role of ['guest', 'viewer', 'finance', 'program-manager'] as const) {
    assert.equal((await getSubmission(requestAs(data.accounts.get(role)!), params(data.assigned.id))).status, 403, role);
  }

  const owner = await getSubmission(requestAs(data.accounts.get('owner')!), params(data.assigned.id));
  const full = await owner.json() as { reviewAssignments: unknown[]; decisions: unknown[] };
  assert.equal(full.reviewAssignments.length, 2);
  assert.equal(full.decisions.length, 1);
});

test('private Work files open only for submissions.read holders or the assigned reviewer', async () => {
  const data = await organizationRoleFixture();
  const file = (accountId: string, workId: string) => getWorkFile(requestAs(accountId, `/works/${workId}/file`), { params: Promise.resolve({ id: data.organizationId, workId }) });
  const own = await file(data.accounts.get('reviewer')!, data.assignedWork.id);
  assert.equal(own.status, 200);
  assert.equal(await own.text(), 'assigned manuscript');
  assert.equal(own.headers.get('x-content-type-options'), 'nosniff');
  assert.match(own.headers.get('content-disposition') ?? '', /^attachment/, 'text files download instead of rendering');
  assert.equal((await file(data.accounts.get('reviewer')!, data.unassignedWork.id)).status, 403);
  for (const role of ['guest', 'viewer', 'finance', 'legal', 'member', 'team-admin'] as const) {
    assert.equal((await file(data.accounts.get(role)!, data.assignedWork.id)).status, 403, role);
  }
  assert.equal((await file(data.accounts.get('admin')!, data.unassignedWork.id)).status, 200);
});
