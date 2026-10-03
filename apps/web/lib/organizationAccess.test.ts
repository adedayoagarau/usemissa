import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrgMembership, OrgRole } from '@missa/radar-engine';
import {
  ORGANIZATION_CAPABILITIES,
  organizationCapabilityProjection,
  organizationCapabilityRoles,
  organizationRoleCan,
  type OrganizationCapability,
  type OrganizationDestination,
} from './organizationProduct';
import { legacyWorkspaceMembership } from './workspacePage';

const roles: OrgRole[] = ['owner', 'admin', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest', 'member'];

/** The enforced matrix, written out so any change to it is a reviewed diff. */
const expected: Record<OrganizationCapability, OrgRole[]> = {
  'organization.read': roles,
  'opportunities.read': ['owner', 'admin', 'team-admin', 'program-manager', 'legal', 'viewer', 'member'],
  'submissions.read': ['owner', 'admin'],
  'reviews.read': ['owner', 'admin'],
  'decisions.read': ['owner', 'admin'],
  'delivery.read': ['owner', 'admin'],
  'messages.read': ['owner', 'admin'],
  'insights.read': ['owner', 'admin', 'viewer'],
  'people.read': ['owner', 'admin'],
  'settings.read': ['owner', 'admin'],
  'billing.read': ['owner', 'admin', 'finance'],
  'organization.manage': ['owner', 'admin'],
  'organization.own': ['owner'],
};

test('every role resolves every capability to the documented matrix', () => {
  assert.deepEqual([...ORGANIZATION_CAPABILITIES].sort(), Object.keys(expected).sort());
  for (const capability of ORGANIZATION_CAPABILITIES) {
    for (const role of roles) {
      assert.equal(organizationRoleCan(role, capability), expected[capability].includes(role), `${role} ${capability}`);
    }
  }
});

test('reviewers, guests, viewers, and finance cannot read Organization-wide ledgers', () => {
  for (const role of ['reviewer', 'guest', 'viewer', 'finance', 'legal', 'member', 'team-admin', 'program-manager'] as const) {
    for (const capability of ['submissions.read', 'reviews.read', 'decisions.read', 'delivery.read', 'people.read', 'organization.manage'] as const) {
      assert.equal(organizationRoleCan(role, capability), false, `${role} ${capability}`);
    }
  }
  assert.equal(organizationRoleCan('admin', 'organization.own'), false, 'admin is not an owner');
});

test('a capability list is satisfied by any listed capability', () => {
  assert.equal(organizationRoleCan('finance', ['people.read', 'billing.read']), true);
  assert.equal(organizationRoleCan('viewer', ['people.read', 'billing.read']), false);
  assert.equal(organizationRoleCan('viewer', []), false);
});

test('capabilities never exceed the role destinations the product projects', () => {
  const destinationFor: Partial<Record<OrganizationCapability, OrganizationDestination>> = {
    'opportunities.read': 'opportunities', 'submissions.read': 'submissions', 'reviews.read': 'reviews', 'decisions.read': 'decisions',
    'delivery.read': 'delivery', 'messages.read': 'messages', 'insights.read': 'insights', 'people.read': 'people', 'settings.read': 'settings', 'billing.read': 'settings',
  };
  for (const [capability, destination] of Object.entries(destinationFor) as Array<[OrganizationCapability, OrganizationDestination]>) {
    for (const role of organizationCapabilityRoles(capability)) {
      assert.ok(organizationCapabilityProjection(role).destinations.includes(destination), `${role} holds ${capability} without the ${destination} destination`);
    }
  }
  for (const role of organizationCapabilityRoles('billing.read')) assert.equal(organizationCapabilityProjection(role).canSeeBilling, true);
});

test('legacy workspace pages apply the same capability as their API', () => {
  const memberships: OrgMembership[] = [
    { accountId: 'a', organizationId: 'org-review', role: 'reviewer', grantedAt: '2026-01-01T00:00:00.000Z' },
    { accountId: 'a', organizationId: 'org-admin', role: 'admin', grantedAt: '2026-01-01T00:00:00.000Z' },
  ];
  assert.deepEqual(legacyWorkspaceMembership(memberships, 'org-review', 'submissions.read'), { kind: 'not-found' });
  assert.deepEqual(legacyWorkspaceMembership(memberships, undefined, 'submissions.read'), { kind: 'redirect', organizationId: 'org-admin' });
  assert.deepEqual(legacyWorkspaceMembership(memberships, 'org-unknown', 'submissions.read'), { kind: 'redirect', organizationId: 'org-admin' });
  assert.equal(legacyWorkspaceMembership(memberships, 'org-admin', 'delivery.read').kind, 'render');
  assert.deepEqual(legacyWorkspaceMembership([memberships[0]!], undefined, 'people.read'), { kind: 'not-found' });
});
