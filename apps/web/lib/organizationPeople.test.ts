import assert from 'node:assert/strict';
import test from 'node:test';
import { accessSafeguard, initialsForPerson, ORGANIZATION_ROLE_LABELS } from './organizationPeople';

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
