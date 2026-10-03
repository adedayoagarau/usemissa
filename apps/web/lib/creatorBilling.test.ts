import test from 'node:test';
import assert from 'node:assert/strict';
import type { CreatorSubscriptionUpdate } from '@missa/radar-adapters';
import {
  applyCreatorBillingEvent,
  cancelCreatorSubscriptions,
  closeAccountAfterCancellingPlus,
  creatorAccountFor,
  periodEnd,
  plusOffers,
  priceLabel,
  pricingRegion,
  requestCountry,
  StripeRequestError,
} from './creatorBilling';

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

test('a subscription event carries its own state and its event time; a deletion ends the plan', async () => {
  const applied: CreatorSubscriptionUpdate[] = [];
  const apply = async (update: CreatorSubscriptionUpdate) => void applied.push(update);
  assert.equal((await applyCreatorBillingEvent({ type: 'customer.subscription.updated', created: 1_790_000_000, object: subscription }, apply)).handled, true);
  assert.deepEqual(applied[0], {
    accountId: 'acc_1',
    customerId: 'cus_1',
    subscriptionId: 'sub_1',
    status: 'active',
    currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    eventCreatedAt: new Date(1_790_000_000 * 1000).toISOString(),
  });
  await applyCreatorBillingEvent({ type: 'customer.subscription.deleted', created: 1_790_000_100, object: { ...subscription, status: 'active' } }, apply);
  assert.equal(applied[1]!.status, 'canceled');
  assert.equal(applied[1]!.eventCreatedAt, new Date(1_790_000_100 * 1000).toISOString());
});

test('the plan result is handed back so the webhook can see a skipped event', async () => {
  const outcome = await applyCreatorBillingEvent({ type: 'customer.subscription.updated', created: 1, object: subscription }, async () => ({ applied: false, reason: 'stale' }));
  assert.deepEqual(outcome, { handled: true, result: { applied: false, reason: 'stale' } });
});

test('a completed checkout reads its subscription from Stripe', async () => {
  const applied: CreatorSubscriptionUpdate[] = [];
  const fetched: string[] = [];
  const outcome = await applyCreatorBillingEvent(
    { type: 'checkout.session.completed', object: { mode: 'subscription', subscription: 'sub_1', metadata: { account_id: 'acc_1', creator_plan: 'plus' } } },
    async (update) => void applied.push(update),
    async (id) => {
      fetched.push(id);
      return { ...subscription, status: 'trialing' };
    },
  );
  assert.equal(outcome.handled, true);
  assert.deepEqual(fetched, ['sub_1']);
  assert.equal(applied[0]!.status, 'trialing');
  assert.equal(applied[0]!.eventCreatedAt, null, 'an event without a time is applied unordered');
});

test('organisation and unrelated events are left to the existing billing ledger', async () => {
  const apply = async () => assert.fail('must not apply');
  assert.deepEqual(await applyCreatorBillingEvent({ type: 'checkout.session.completed', object: { mode: 'subscription', subscription: 'sub_1', metadata: { organization_id: 'org_1' } } }, apply), { handled: false });
  assert.deepEqual(await applyCreatorBillingEvent({ type: 'invoice.paid', object: subscription }, apply), { handled: false });
});

type FakeStripeCall = { path: string; method: string; idempotencyKey?: string };

function fakeStripe(subscriptions: Record<string, { status: string; metadata?: Record<string, string> } | 'missing'>, customerList: string[] = []) {
  const calls: FakeStripeCall[] = [];
  const request = async <T,>(path: string, init: { method?: string; idempotencyKey?: string } = {}): Promise<T> => {
    calls.push({ path, method: init.method ?? 'GET', ...(init.idempotencyKey ? { idempotencyKey: init.idempotencyKey } : {}) });
    if (path.startsWith('/subscriptions?')) {
      return { data: customerList.map((id) => ({ id, ...(subscriptions[id] as object) })) } as T;
    }
    const id = decodeURIComponent(path.replace('/subscriptions/', ''));
    const found = subscriptions[id];
    if (!found || found === 'missing') throw new StripeRequestError('No such subscription', 404, 'resource_missing');
    if (init.method === 'DELETE') subscriptions[id] = { ...found, status: 'canceled' };
    return { id, ...found } as T;
  };
  return { calls, request };
}

const plusFor = (account: string) => ({ creator_plan: 'plus', account_id: account });

test('closing an account cancels every Plus subscription that can still charge, immediately', async () => {
  const stripe = fakeStripe(
    {
      sub_row: { status: 'active', metadata: plusFor('acc_1') },
      sub_dup: { status: 'past_due', metadata: plusFor('acc_1') },
      sub_done: { status: 'incomplete_expired', metadata: plusFor('acc_1') },
      sub_org: { status: 'active', metadata: { organization_id: 'org_1' } },
    },
    ['sub_row', 'sub_dup', 'sub_done', 'sub_org'],
  );
  const cancelled = await cancelCreatorSubscriptions({ accountId: 'acc_1', customerId: 'cus_1', subscriptionId: 'sub_row' }, stripe.request);
  assert.deepEqual(cancelled.sort(), ['sub_dup', 'sub_row']);
  const deletes = stripe.calls.filter((call) => call.method === 'DELETE');
  assert.deepEqual(deletes.map((call) => call.path).sort(), ['/subscriptions/sub_dup', '/subscriptions/sub_row']);
  assert.ok(deletes.every((call) => call.idempotencyKey?.startsWith('account-close:acc_1:')), 'cancellation is safe to retry');
  assert.ok(!stripe.calls.some((call) => call.path.includes('sub_org') && call.method === 'DELETE'), 'never touches an organisation subscription');
});

test('an already cancelled or missing subscription needs no cancellation', async () => {
  const stripe = fakeStripe({ sub_old: { status: 'canceled' }, sub_gone: 'missing' });
  assert.deepEqual(await cancelCreatorSubscriptions({ accountId: 'acc_1', customerId: null, subscriptionId: 'sub_old' }, stripe.request), []);
  assert.deepEqual(await cancelCreatorSubscriptions({ accountId: 'acc_1', customerId: null, subscriptionId: 'sub_gone' }, stripe.request), []);
  assert.equal(stripe.calls.filter((call) => call.method === 'DELETE').length, 0);
});

test('an account closes only after its Plus billing is cancelled', async () => {
  const order: string[] = [];
  const closed = await closeAccountAfterCancellingPlus('acc_1', {
    billing: async () => ({ customerId: 'cus_1', subscriptionId: 'sub_1' }),
    cancel: async (input) => {
      order.push(`cancel:${input.accountId}:${input.subscriptionId}`);
      return ['sub_1'];
    },
    close: async () => {
      order.push('close');
      return true;
    },
  });
  assert.deepEqual(closed, { status: 'closed', cancelledSubscriptions: ['sub_1'] });
  assert.deepEqual(order, ['cancel:acc_1:sub_1', 'close']);
});

test('when Stripe cancellation fails the account stays open', async () => {
  let closeCalled = false;
  const result = await closeAccountAfterCancellingPlus('acc_1', {
    billing: async () => ({ customerId: 'cus_1', subscriptionId: 'sub_1' }),
    cancel: async () => {
      throw new Error('Stripe is down');
    },
    close: async () => {
      closeCalled = true;
      return true;
    },
  });
  assert.deepEqual(result, { status: 'billing-failed' });
  assert.equal(closeCalled, false);
});

test('an account that never paid closes without calling Stripe', async () => {
  const result = await closeAccountAfterCancellingPlus('acc_1', {
    billing: async () => ({ customerId: null, subscriptionId: null }),
    cancel: async () => assert.fail('must not call Stripe'),
    close: async () => true,
  });
  assert.deepEqual(result, { status: 'closed', cancelledSubscriptions: [] });
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
