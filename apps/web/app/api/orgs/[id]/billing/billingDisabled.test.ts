import assert from 'node:assert/strict';
import test from 'node:test';
import { organizationRoleFixture, requestAs } from '../../../../../test/organizationRoleFixture';
import { GET as getBilling, POST as startBilling } from './route';
import { POST as cancelBilling } from './cancel/route';
import { POST as connectBilling } from './connect/route';

test('Organization billing hides Stripe identifiers and paid flows stay off by default', async () => {
  const data = await organizationRoleFixture();
  const params = { params: Promise.resolve({ id: data.organizationId }) };
  const owner = data.accounts.get('owner')!;
  const billing = await getBilling(requestAs(owner), params);
  const text = await billing.text();
  assert.doesNotMatch(text, /cus_private_customer|sub_private_subscription|acct_private_connect/);
  assert.equal(JSON.parse(text).paidPlansAvailable, false);
  for (const [name, call] of [['checkout', startBilling], ['connect', connectBilling], ['cancel', cancelBilling]] as const) {
    const response = await call(requestAs(owner, '/billing', { method: 'POST', body: JSON.stringify({ plan: 'pro' }) }), params);
    assert.equal(response.status, 503, name);
    assert.match((await response.json()).error, /not available yet/);
  }
  const finance = await startBilling(requestAs(data.accounts.get('finance')!, '/billing', { method: 'POST', body: JSON.stringify({ plan: 'pro' }) }), params);
  assert.equal(finance.status, 403);
});
