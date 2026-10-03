import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrgRole } from '@missa/radar-engine';
import { accessSafeguard, initialsForPerson, membershipChangeVerdict, ORGANIZATION_ROLE_LABELS } from './organizationPeople';

test('all ten compatibility roles have customer-facing labels', () => {
  assert.equal(Object.keys(ORGANIZATION_ROLE_LABELS).length, 10);
  assert.equal(ORGANIZATION_ROLE_LABELS.owner, 'Organization Owner');
  assert.equal(ORGANIZATION_ROLE_LABELS.member, 'Legacy member');
});

test('ownership and unfinished review safeguards outrank lower consequence labels', () => {
  assert.equal(accessSafeguard({ role: 'owner', ownerCount: 1, incompleteReviews: 4, externalId: 'scim-1' }), 'Sole Owner');
  assert.equal(accessSafeguard({ role: 'reviewer', ownerCount: 1, incompleteReviews: 2, externalId: 'scim-2' }), 'Reassignment required');
});

test('provisioned, inactive, and legacy identities stay distinct', () => {
  assert.equal(accessSafeguard({ role: 'viewer', ownerCount: 1, incompleteReviews: 0, active: false }), 'Inactive account');
  assert.equal(accessSafeguard({ role: 'viewer', ownerCount: 1, incompleteReviews: 0, externalId: 'scim-1' }), 'Provisioned identity');
  assert.equal(accessSafeguard({ role: 'member', ownerCount: 1, incompleteReviews: 0 }), 'Legacy role');
});

test('initials support names, email fallback, and diacritics', () => {
  assert.equal(initialsForPerson('Amaka Nwosu', 'amaka@example.com'), 'AN');
  assert.equal(initialsForPerson('Élodie', 'elodie@example.com'), 'É');
  assert.equal(initialsForPerson('', 'zo@example.com'), 'ZO');
});

test('only owners grant, change, or remove owner access', () => {
  const organizationRoles: OrgRole[] = ['owner', 'admin', 'member'];
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'admin', nextRole: 'owner', organizationRoles }), { ok: false, status: 403, error: 'Only an organization owner can grant, change, or remove owner access' });
  assert.equal(membershipChangeVerdict({ actorRole: 'admin', currentRole: undefined, nextRole: 'owner', organizationRoles }).ok, false, 'admin cannot invite an owner');
  assert.equal(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'owner', nextRole: 'member', organizationRoles }).ok, false, 'admin cannot demote an owner');
  assert.equal(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'owner', nextRole: undefined, organizationRoles }).ok, false, 'admin cannot remove an owner');
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'owner', currentRole: 'admin', nextRole: 'owner', organizationRoles }), { ok: true });
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'member', nextRole: 'admin', organizationRoles }), { ok: true });
});

test('nobody removes the last owner or the last admin-or-owner', () => {
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'owner', currentRole: 'owner', nextRole: 'admin', organizationRoles: ['owner', 'admin'] }), { ok: false, status: 409, error: 'An organization must keep at least one owner' });
  assert.equal(membershipChangeVerdict({ actorRole: 'owner', currentRole: 'owner', nextRole: undefined, organizationRoles: ['owner'] }).ok, false);
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'owner', currentRole: 'owner', nextRole: 'member', organizationRoles: ['owner', 'owner'] }), { ok: true });
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'admin', nextRole: 'member', organizationRoles: ['admin', 'member'] }), { ok: false, status: 409, error: 'An organization must keep at least one admin or owner' });
  assert.deepEqual(membershipChangeVerdict({ actorRole: 'admin', currentRole: 'admin', nextRole: 'member', organizationRoles: ['admin', 'admin'] }), { ok: true });
});
