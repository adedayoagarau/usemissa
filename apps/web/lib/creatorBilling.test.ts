import test from 'node:test';
import assert from 'node:assert/strict';
import type { CreatorSubscriptionUpdate } from '@missa/radar-adapters';
import { applyCreatorBillingEvent, creatorAccountFor, periodEnd, plusOffers, priceLabel, pricingRegion, requestCountry } from './creatorBilling';

const subscription = {
  id: 'sub_1',
  object: 'subscription',
  status: 'active',
  customer: 'cus_1',
  cancel_at_period_end: false,
  items: { data: [{ current_period_end: 1_800_000_000 }] },
  metadata: { account_id: 'acc_1', creator_plan: 'plus' },
};

test('only Plus checkouts and subscriptions belong to a creator', () => {
  assert.equal(creatorAccountFor({ metadata: { account_id: 'acc_1', creator_plan: 'plus' } }), 'acc_1');
  assert.equal(creatorAccountFor({ metadata: { organization_id: 'org_1', plan: 'pro' } }), undefined);
  assert.equal(creatorAccountFor({}), undefined);
});

test('a subscription event carries its own state; a deletion ends the plan', async () => {
  const applied: CreatorSubscriptionUpdate[] = [];
  const apply = async (update: CreatorSubscriptionUpdate) => void applied.push(update);
  assert.equal(await applyCreatorBillingEvent('customer.subscription.updated', subscription, apply), true);
  assert.deepEqual(applied[0], {
    accountId: 'acc_1',
    customerId: 'cus_1',
    subscriptionId: 'sub_1',
    status: 'active',
    currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
  });
  await applyCreatorBillingEvent('customer.subscription.deleted', { ...subscription, status: 'active' }, apply);
  assert.equal(applied[1]!.status, 'canceled');
});

test('a completed checkout reads its subscription from Stripe', async () => {
  const applied: CreatorSubscriptionUpdate[] = [];
  const fetched: string[] = [];
  const handled = await applyCreatorBillingEvent(
    'checkout.session.completed',
    { mode: 'subscription', subscription: 'sub_1', metadata: { account_id: 'acc_1', creator_plan: 'plus' } },
    async (update) => void applied.push(update),
    async (id) => {
      fetched.push(id);
      return { ...subscription, status: 'trialing' };
    },
  );
  assert.equal(handled, true);
  assert.deepEqual(fetched, ['sub_1']);
  assert.equal(applied[0]!.status, 'trialing');
});

test('organisation and unrelated events are left to the existing billing ledger', async () => {
  const apply = async () => assert.fail('must not apply');
  assert.equal(await applyCreatorBillingEvent('checkout.session.completed', { mode: 'subscription', subscription: 'sub_1', metadata: { organization_id: 'org_1' } }, apply), false);
  assert.equal(await applyCreatorBillingEvent('invoice.paid', subscription, apply), false);
});

test('prices read naturally in their own currency, and no Stripe key means no offers', async () => {
  assert.equal(priceLabel(600, 'usd', 'month'), '$6 a month');
  assert.equal(priceLabel(5999, 'eur', 'year'), '€59.99 a year');
  assert.equal(periodEnd({ current_period_end: 1_800_000_000 }), new Date(1_800_000_000 * 1000).toISOString());
  const previous = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    assert.deepEqual(await plusOffers(), []);
  } finally {
    if (previous !== undefined) process.env.STRIPE_SECRET_KEY = previous;
  }
});

test('African countries get the Africa price region; everywhere else and unknown pay the standard price', () => {
  for (const country of ['NG', 'gh', 'KE', 'ZA', 'EG', 'MA', 'SN']) assert.equal(pricingRegion(country), 'africa', country);
  for (const country of ['GB', 'US', 'IN', 'BR', 'FR']) assert.equal(pricingRegion(country), 'standard', country);
  assert.equal(pricingRegion(null), 'standard');
  assert.equal(requestCountry(new Headers({ 'x-vercel-ip-country': 'ng' })), 'NG');
  assert.equal(requestCountry(new Headers()), null);
});

test('a region uses its own price when set and falls back to the standard price per interval', async () => {
  const env = { ...process.env };
  const realFetch = globalThis.fetch;
  const prices: Record<string, { unit_amount: number; currency: string }> = {
    price_std_month: { unit_amount: 600, currency: 'usd' },
    price_std_year: { unit_amount: 6000, currency: 'usd' },
    price_af_month: { unit_amount: 200, currency: 'usd' },
  };
  globalThis.fetch = (async (url: string | URL) => {
    const id = decodeURIComponent(String(url).split('/prices/')[1] ?? '');
    const price = prices[id];
    return new Response(JSON.stringify(price ? { id, active: true, ...price } : { error: { message: 'No such price' } }), { status: price ? 200 : 404 });
  }) as typeof fetch;
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_PRICE_CREATOR_PLUS_MONTHLY: 'price_std_month',
    STRIPE_PRICE_CREATOR_PLUS_YEARLY: 'price_std_year',
    STRIPE_PRICE_CREATOR_PLUS_MONTHLY_AFRICA: 'price_af_month',
  });
  try {
    const at = Date.now() + 3_600_000; // past any earlier test's cache
    const africa = await plusOffers('africa', at);
    assert.deepEqual(africa.map((offer) => [offer.interval, offer.label]), [['month', '$2 a month'], ['year', '$60 a year']]);
    const standard = await plusOffers('standard', at);
    assert.deepEqual(standard.map((offer) => offer.label), ['$6 a month', '$60 a year']);
  } finally {
    globalThis.fetch = realFetch;
    process.env = env;
  }
});
