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

test('SCIM-style provisioning changes account-wide state only for accounts the organization created', () => {
  const radar = engine();
  const organization = radar.addOrganization({ name: 'Provisioning Org', domains: [], verified: true });
  const other = radar.addOrganization({ name: 'Other Org', domains: [], verified: true });
  const shared = radar.signUp('shared@example.com', 'password123', 'Shared').account;
  shared.displayName = 'Shared Person';
  radar.grantOrgMembership(shared.id, other.id, 'admin');

  const linked = radar.provisionOrgAccount(organization.id, { email: 'shared@example.com', externalId: 'idp-shared', displayName: 'Renamed', role: 'viewer' });
  assert.deepEqual([linked.created, linked.managed, linked.membership?.role], [false, false, 'viewer']);
  assert.deepEqual([shared.active, shared.externalId, shared.displayName, shared.provisionedByOrganizationId], [undefined, undefined, 'Shared Person', undefined]);
  radar.provisionOrgAccount(organization.id, { email: 'shared@example.com', active: false });
  assert.notEqual(shared.active, false);

  const created = radar.provisionOrgAccount(organization.id, { email: 'created@example.com', externalId: 'idp-created' });
  assert.deepEqual([created.created, created.managed, created.account.provisionedByOrganizationId], [true, true, organization.id]);
  assert.equal(radar.organizationManagesAccount(organization.id, created.account.id), true);
  radar.grantOrgMembership(created.account.id, other.id, 'viewer');
  assert.equal(radar.organizationManagesAccount(organization.id, created.account.id), false, 'joining another organization ends exclusive management');
  radar.provisionOrgAccount(organization.id, { email: 'created@example.com', active: false });
  assert.notEqual(created.account.active, false);
});

test('SCIM-style provisioning at the seat limit creates no account', () => {
  const radar = engine();
  const organization = radar.addOrganization({ name: 'Full Org', domains: [], verified: true, seatLimit: 1 });
  radar.provisionOrgAccount(organization.id, { email: 'first@example.com' });
  const accounts = radar.store.accounts.size;
  assert.throws(() => radar.provisionOrgAccount(organization.id, { email: 'second@example.com' }), /1-seat limit/);
  assert.equal(radar.store.accounts.size, accounts);
});
