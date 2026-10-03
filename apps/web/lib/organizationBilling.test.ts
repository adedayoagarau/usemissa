import assert from 'node:assert/strict';
import test from 'node:test';
import { organizationBillingEnabled } from './organizationBilling';

test('Organization paid billing is off unless explicitly enabled', () => {
  assert.equal(organizationBillingEnabled({}), false);
  assert.equal(organizationBillingEnabled({ MISSA_ORG_BILLING_ENABLED: 'true' }), false);
  assert.equal(organizationBillingEnabled({ MISSA_ORG_BILLING_ENABLED: '0' }), false);
  assert.equal(organizationBillingEnabled({ MISSA_ORG_BILLING_ENABLED: '1' }), true);
});
