import assert from 'node:assert/strict';
import test from 'node:test';
import { organizationCommercialFacts, selectedSettingsSection, settingsAuthority, settingsSectionsForRole } from './organizationSettings';

test('Finance receives only the bounded billing section', () => {
  assert.deepEqual(settingsSectionsForRole('finance').map((section) => section.id), ['billing']);
  assert.equal(selectedSettingsSection('finance', 'security'), 'billing');
  assert.equal(settingsAuthority('finance', 'billing'), 'Finance view of current commercial facts');
});

test('Owner and Admin can inspect every settings domain without gaining mutation capability', () => {
  assert.equal(settingsSectionsForRole('owner').length, 8);
  assert.equal(settingsSectionsForRole('admin').length, 8);
  assert.equal(selectedSettingsSection('admin', 'integrations'), 'integrations');
});

test('commercial facts keep plan, subscription, cancellation, and payout state separate', () => {
  const facts = organizationCommercialFacts({
    id: 'org_1',
    name: 'Missa Arts',
    domains: [],
    verified: true,
    billingTier: 'program',
    billingStatus: 'active',
    billingSubscriptionId: 'sub_private',
    billingCancelAtPeriodEnd: true,
    stripeConnectStatus: 'pending',
  });
  assert.equal(facts.tierLabel, 'Program');
  assert.equal(facts.statusLabel, 'Cancellation scheduled');
  assert.equal(facts.hasSubscriptionReference, true);
  assert.equal(facts.payoutLabel, 'Setup incomplete');
});

test('missing commercial fields are stated as compatibility defaults', () => {
  const facts = organizationCommercialFacts({ id: 'org_1', name: 'Missa Arts', domains: [], verified: false });
  assert.deepEqual({ tier: facts.tierLabel, status: facts.statusLabel, payout: facts.payoutLabel }, { tier: 'Free', status: 'Inactive', payout: 'Not connected' });
});
