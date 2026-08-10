import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrgRole } from '@missa/radar-engine';
import { organizationCapabilityProjection, organizationNavigation } from './organizationProduct';

const roles: OrgRole[] = ['owner', 'admin', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest', 'member'];

test('all ten Organization roles have an explicit capability projection', () => {
  assert.equal(new Set(roles.map((role) => organizationCapabilityProjection(role).role)).size, 10);
  for (const role of roles) assert.ok(organizationCapabilityProjection(role).destinations.includes('overview'));
});

test('reviewer and finance projections omit unrelated destinations', () => {
  const reviewer = organizationCapabilityProjection('reviewer');
  assert.deepEqual(reviewer.destinations, ['overview', 'reviews']);
  assert.equal(reviewer.canSeeAllSubmissions, false);
  assert.equal(reviewer.canSeeBilling, false);
  const finance = organizationCapabilityProjection('finance');
  assert.equal(finance.destinations.includes('reviews'), false);
  assert.equal(finance.destinations.includes('people'), false);
  assert.equal(finance.canSeeBilling, true);
});

test('Organization navigation never exposes tenant IDs as labels', () => {
  const navigation = organizationNavigation(organizationCapabilityProjection('owner'), 'org_private_123');
  assert.ok(navigation.every((item) => !item.label.includes('org_private_123')));
  assert.equal(navigation[0]?.href, '/organization/org_private_123/overview');
  assert.equal(navigation.find((item) => item.id === 'messages')?.href, '/organization/org_private_123/messages');
  assert.equal(navigation.find((item) => item.id === 'delivery')?.href, '/organization/org_private_123/delivery');
  assert.equal(navigation.find((item) => item.id === 'insights')?.href, '/organization/org_private_123/insights');
  assert.equal(navigation.find((item) => item.id === 'people')?.href, '/organization/org_private_123/people');
  assert.equal(navigation.find((item) => item.id === 'settings')?.href, '/organization/org_private_123/settings');
});
