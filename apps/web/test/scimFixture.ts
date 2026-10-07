import assert from 'node:assert/strict';
import type { OrgRole } from '@missa/radar-engine';
import { getEngine } from '@/lib/engine';

/** Shared fixture for SCIM route tests: a fresh in-memory Organization per
 * call (so tests in one file do not share members or seats), a second
 * Organization for cross-organization accounts, and SCIM credentials
 * configured for the first one. */
export const SCIM_TEST_TOKEN = 'scim-route-test-token';

let fixtureSequence = 0;

export async function scimFixture(input: { seatLimit?: number; members?: Record<string, OrgRole> } = {}) {
  delete process.env.DATABASE_URL;
  const radar = await getEngine();
  const template = [...radar.store.organizations.values()][0];
  assert.ok(template);
  const suffix = `${process.pid}_${++fixtureSequence}`;
  const organizationId = `org_scim_test_${suffix}`;
  const otherOrganizationId = `org_scim_other_${suffix}`;
  radar.store.organizations.set(organizationId, { ...structuredClone(template), id: organizationId, name: 'SCIM Test', seatLimit: input.seatLimit ?? 100 });
  radar.store.organizations.set(otherOrganizationId, { ...structuredClone(template), id: otherOrganizationId, name: 'SCIM Other', seatLimit: 100 });
  process.env.SCIM_BEARER_TOKEN = SCIM_TEST_TOKEN;
  process.env.SCIM_ORGANIZATION_ID = organizationId;

  const emailFor = (key: string) => `${key}.${suffix}@scim.test`;
  /** Signs up an account and grants it the given roles, keyed by Organization id. */
  const addAccount = (key: string, roles: Record<string, OrgRole> = {}) => {
    const account = radar.signUp(emailFor(key), 'scim-route-password', `${key} person`).account;
    for (const [organization, role] of Object.entries(roles)) {
      radar.store.memberships.push({ accountId: account.id, organizationId: organization, role, grantedAt: new Date().toISOString() });
    }
    return account;
  };
  const accounts = new Map<string, string>();
  for (const [key, role] of Object.entries(input.members ?? {})) accounts.set(key, addAccount(key, { [organizationId]: role }).id);

  const membership = (accountId: string, organization = organizationId) => radar.store.memberships.find((candidate) => candidate.accountId === accountId && candidate.organizationId === organization);
  const auditFor = (accountId: string) => radar.store.auditLog.filter((entry) => entry.targetId === accountId && entry.action.startsWith('scim.'));
  return { radar, organizationId, otherOrganizationId, accounts, emailFor, addAccount, membership, auditFor };
}

export function scimRequest(organizationId: string, path = '', init: RequestInit = {}) {
  return new Request(`https://usemissa.test/api/scim/v2/organizations/${organizationId}/Users${path}`, {
    ...init,
    headers: { authorization: `Bearer ${SCIM_TEST_TOKEN}`, 'content-type': 'application/scim+json', ...(init.headers ?? {}) },
  });
}

export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';

/** Asserts a SCIM error body (RFC 7644 §3.12) and returns it. */
export async function assertScimError(response: Response, status: number, scimType?: string) {
  assert.equal(response.status, status);
  const body = await response.json() as { schemas: string[]; status: string; scimType?: string; detail: string };
  assert.deepEqual(body.schemas, [SCIM_ERROR_SCHEMA]);
  assert.equal(body.status, String(status));
  assert.equal(body.scimType, scimType);
  assert.equal(typeof body.detail, 'string');
  return body;
}
