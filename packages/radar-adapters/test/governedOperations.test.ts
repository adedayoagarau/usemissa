import assert from 'node:assert/strict';
import test from 'node:test';
import { expectedConfirmation, governedIdentity, requestPlatformBillingAction, validateAuthoritativeRefundFact, validateBillingAction } from '../src/governedOperations.js';

test('governed identity is canonical and binds immutable fields', () => {
  assert.equal(governedIdentity({ b: 2, a: 1 }), governedIdentity({ a: 1, b: 2 }));
  assert.notEqual(governedIdentity({ actor: 'one', amount: 100 }), governedIdentity({ actor: 'two', amount: 100 }));
  assert.notEqual(governedIdentity({ actor: 'one', amount: 100 }), governedIdentity({ actor: 'one', amount: 101 }));
});

test('refund requires positive amount, ISO currency, and exact contextual confirmation', () => {
  const input = { organizationId: 'org_1', action: 'refund' as const, amountCents: 2500, currency: 'USD', reasonCode: 'duplicate-charge' };
  assert.doesNotThrow(() => validateBillingAction({ ...input, confirmation: expectedConfirmation(input) }));
  assert.throws(() => validateBillingAction({ ...input, amountCents: -1, confirmation: expectedConfirmation({ ...input, amountCents: -1 }) }), /positive/);
  assert.throws(() => validateBillingAction({ ...input, currency: 'usd', confirmation: 'wrong' }), /ISO currency/);
  assert.throws(() => validateBillingAction({ ...input, confirmation: 'CONFIRM' }), /Exact confirmation/);
});

test('entitlement actions only accept canonical capability identifiers', () => {
  const input = { organizationId: 'org_1', action: 'grant-entitlement' as const, entitlementKey: 'radar.pro', reasonCode: 'service-credit' };
  assert.doesNotThrow(() => validateBillingAction({ ...input, confirmation: expectedConfirmation(input) }));
  assert.throws(() => validateBillingAction({ ...input, entitlementKey: 'root.everything', confirmation: expectedConfirmation({ ...input, entitlementKey: 'root.everything' }) }), /Unknown entitlement/);
  assert.throws(() => validateBillingAction({ ...input, amountCents: 1, confirmation: expectedConfirmation(input) }), /cannot include an amount/);
});

test('every billing action fails closed before database access when no bounded executor and reconciler are configured', async () => {
  const common = { organizationId: 'org_1', actorAccountId: 'account_1', reasonCode: 'operator-request', idempotencyKey: 'billing-key-123', connectionString: 'postgres://must-not-connect', executionAndReconciliationReady: false };
  const actions = [
    { action: 'refund' as const, providerObjectId: 'pi_1', amountCents: 100, currency: 'USD', expectedState: 'processed', expectedVersion: 1 },
    { action: 'correction' as const, providerObjectId: 'in_1', amountCents: -100, currency: 'USD' },
    { action: 'grant-entitlement' as const, entitlementKey: 'radar.pro' },
    { action: 'revoke-entitlement' as const, entitlementKey: 'radar.pro' },
    { action: 'reconcile' as const, providerObjectId: 'sub_1' },
  ];
  for (const action of actions) {
    assert.deepEqual(await requestPlatformBillingAction({ ...common, ...action, confirmation: expectedConfirmation({ organizationId: common.organizationId, ...action }) }), { status: 'unavailable' });
  }
});

test('refund fact validation binds tenant, currency, state/version, and remaining amount', () => {
  const request = { organizationId: 'org_1', currency: 'USD', amountCents: 400, expectedState: 'processed', expectedVersion: 3 };
  const fact = { organizationId: 'org_1', currency: 'USD', amountCents: 1000, status: 'processed', reconciliationVersion: 3 };
  assert.doesNotThrow(() => validateAuthoritativeRefundFact(request, fact, 600));
  assert.throws(() => validateAuthoritativeRefundFact({ ...request, amountCents: 401 }, fact, 600), /refundable remainder/);
  assert.throws(() => validateAuthoritativeRefundFact(request, { ...fact, organizationId: 'org_2' }, 0), /authoritative fact conflict/);
  assert.throws(() => validateAuthoritativeRefundFact(request, { ...fact, reconciliationVersion: 4 }, 0), /authoritative fact conflict/);
});
