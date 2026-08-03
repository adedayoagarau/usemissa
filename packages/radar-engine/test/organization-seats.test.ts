import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthError, FixtureFetcher, ManualClock, RadarEngine, createStore } from '../src/index.js';

function engine() {
  return new RadarEngine({ store: createStore(), fetcher: new FixtureFetcher(), clock: new ManualClock(new Date('2026-08-02T00:00:00Z')) });
}

test('organization seats enforce the plan limit and expose usage', () => {
  const radar = engine();
  const organization = radar.addOrganization({ name: 'Seat Test', domains: [], verified: true, billingTier: 'free' });
  const accounts = ['one', 'two', 'three', 'four'].map((name) => radar.signUp(`${name}@example.com`, 'password123', name).account);

  radar.grantOrgMembership(accounts[0].id, organization.id, 'admin');
  radar.grantOrgMembership(accounts[1].id, organization.id, 'reviewer');
  radar.grantOrgMembership(accounts[2].id, organization.id, 'viewer');
  assert.deepEqual(radar.organizationSeatUsage(organization.id), { used: 3, limit: 3, available: 0 });
  assert.throws(() => radar.grantOrgMembership(accounts[3].id, organization.id, 'member'), (error: unknown) => {
    return error instanceof AuthError && error.message.includes('3-seat limit');
  });
});

test('organization membership can be revoked without changing other seats', () => {
  const radar = engine();
  const organization = radar.addOrganization({ name: 'Revoke Test', domains: [], verified: true, seatLimit: 2 });
  const first = radar.signUp('first@example.com', 'password123', 'First').account;
  const second = radar.signUp('second@example.com', 'password123', 'Second').account;
  radar.grantOrgMembership(first.id, organization.id, 'admin');
  radar.grantOrgMembership(second.id, organization.id, 'member');
  radar.revokeOrgMembership(second.id, organization.id);
  assert.deepEqual(radar.organizationSeatUsage(organization.id), { used: 1, limit: 2, available: 1 });
  assert.equal(radar.isOrgMember(second.id, organization.id), false);
});

test('SCIM-style provisioning creates an opaque account and can reactivate it', () => {
  const radar = engine();
  const organization = radar.addOrganization({ name: 'Provisioned Org', domains: [], verified: true });
  const first = radar.provisionOrgAccount(organization.id, { email: 'provisioned@example.com', externalId: 'idp-1', displayName: 'Provisioned User', role: 'reviewer' });
  assert.equal(first.account.externalId, 'idp-1');
  assert.equal(first.account.passwordHash.length > 0, true);
  assert.equal(first.membership?.role, 'reviewer');
  const second = radar.provisionOrgAccount(organization.id, { email: 'provisioned@example.com', role: 'viewer' });
  assert.equal(second.account.id, first.account.id);
  assert.equal(second.membership?.role, 'viewer');
});
