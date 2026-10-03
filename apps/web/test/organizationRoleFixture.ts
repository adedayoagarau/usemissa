import assert from 'node:assert/strict';
import type { OrgRole } from '@missa/radar-engine';
import { issueSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getCompatibilityWorkspaceEngine } from '@/lib/workspaceEngine';

/** Shared fixture for Organization route authorization tests: one account per
 * role in an isolated in-memory Organization, plus a Submission assigned to the
 * `reviewer` account, a second reviewer's recommendation, and a decision. */
export const ORGANIZATION_ROLES: OrgRole[] = ['owner', 'admin', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest', 'member'];
export const ROLE_FIXTURE_ORGANIZATION_ID = 'org_role_access_test';

export async function organizationRoleFixture() {
  const organizationId = ROLE_FIXTURE_ORGANIZATION_ID;
  process.env.MISSA_SESSION_SECRET = 'organization-role-access-secret';
  delete process.env.MISSA_WORKSPACE_RELATIONAL_AUTHORITY;
  delete process.env.MISSA_ORG_BILLING_ENABLED;
  delete process.env.DATABASE_URL;
  const radar = await getEngine();
  const workspace = await getCompatibilityWorkspaceEngine();
  if (!radar.store.organizations.has(organizationId)) {
    const template = [...radar.store.organizations.values()][0];
    assert.ok(template);
    radar.store.organizations.set(organizationId, {
      ...structuredClone(template), id: organizationId, name: 'Role Access Test', seatLimit: 100,
      billingCustomerId: 'cus_private_customer', billingSubscriptionId: 'sub_private_subscription', stripeConnectAccountId: 'acct_private_connect',
    });
  }
  const accounts = new Map<string, string>();
  const ensureAccount = (key: string, role?: OrgRole) => {
    const email = `${key}@role-access.test`;
    const account = [...radar.store.accounts.values()].find((candidate) => candidate.email === email) ?? radar.signUp(email, 'role-access-password', key).account;
    if (role && !radar.store.memberships.some((membership) => membership.accountId === account.id && membership.organizationId === organizationId)) {
      radar.store.memberships.push({ accountId: account.id, organizationId, role, grantedAt: new Date().toISOString() });
    }
    accounts.set(key, account.id);
    return account.id;
  };
  for (const role of ORGANIZATION_ROLES) ensureAccount(role, role);
  const otherReviewer = ensureAccount('other-reviewer', 'reviewer');
  const submitter = ensureAccount('submitter');
  ensureAccount('outsider-with-account');

  const entity = workspace.createEntity(organizationId, 'Editorial');
  const program = workspace.createProgram(entity.id, 'Poetry');
  const openCall = workspace.createOpenCall(program.id, 'Spring reading');
  const path = workspace.createSubmissionPath(openCall.id, ['Poetry'], []);
  const encoded = (text: string) => `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;
  const assigned = workspace.createSubmission(path.id, submitter, [{ title: 'Assigned poem', fileUrl: encoded('assigned manuscript') }]);
  const unassigned = workspace.createSubmission(path.id, submitter, [{ title: 'Unassigned poem', fileUrl: encoded('unassigned manuscript') }]);
  const round = workspace.createReviewRound(openCall.id, 'First read');
  const ownAssignment = workspace.assignReviewer(round.id, assigned.id, accounts.get('reviewer')!);
  const otherAssignment = workspace.assignReviewer(round.id, assigned.id, otherReviewer);
  workspace.recordReview(otherAssignment.id, 5, 'Other reviewer private notes');
  const assignedWork = workspace.worksForSubmission(assigned.id)[0]!;
  workspace.recordDecision(organizationId, assignedWork.id, 'accepted', accounts.get('owner')!);
  return { organizationId, accounts, openCall, assigned, unassigned, assignedWork, unassignedWork: workspace.worksForSubmission(unassigned.id)[0]!, ownAssignment, otherAssignment };
}

export function requestAs(accountId: string, path = '/', init: RequestInit = {}) {
  return new Request(`https://usemissa.test/api/orgs/${ROLE_FIXTURE_ORGANIZATION_ID}${path}`, {
    ...init,
    headers: { cookie: `${SESSION_COOKIE}=${issueSessionToken(accountId)}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}
