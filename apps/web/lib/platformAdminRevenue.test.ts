import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRevenue, monthlyValue, type StripePrice, type StripeSubscription } from './platformAdminRevenue';

const now = new Date('2026-10-03T12:00:00Z');
const t = (daysAgo: number) => Math.floor(now.getTime() / 1000 - daysAgo * 86_400);
const monthly: StripePrice = { id: 'p_m', nickname: 'Plus monthly', unit_amount: 900, currency: 'usd', recurring: { interval: 'month' as const, interval_count: 1 } };
const yearly: StripePrice = { id: 'p_y', nickname: 'Plus yearly', unit_amount: 9000, currency: 'usd', recurring: { interval: 'year' as const, interval_count: 1 } };
const sub = (id: string, price: StripePrice, status: StripeSubscription['status'], createdDaysAgo: number, endedDaysAgo: number | null = null, cancelAtPeriodEnd = false): StripeSubscription => ({
  id, status, created: t(createdDaysAgo), canceled_at: endedDaysAgo === null ? null : t(endedDaysAgo), ended_at: endedDaysAgo === null ? null : t(endedDaysAgo), cancel_at_period_end: cancelAtPeriodEnd, items: { data: [{ quantity: 1, price }] },
});

test('monthly value normalises every billing interval', () => {
  assert.equal(monthlyValue(monthly), 900);
  assert.equal(monthlyValue(yearly), 750);
  assert.equal(monthlyValue({ ...monthly, recurring: { interval: 'month', interval_count: 3 } }), 300);
  assert.equal(monthlyValue({ ...monthly, recurring: null }), 0);
});

test('revenue counts paying subscriptions, churn, and plan mix', () => {
  const data = computeRevenue([
    sub('a', monthly, 'active', 100),
    sub('b', yearly, 'active', 10, null, true),
    sub('c', monthly, 'past_due', 50),
    sub('d', monthly, 'trialing', 2),
    sub('e', monthly, 'canceled', 90, 5),
  ], [{ amount_paid: 900, currency: 'usd' }, { amount_paid: 9000, currency: 'usd' }], { days: 30, now });
  assert.equal(data.mrr, 9 + 7.5 + 9);
  assert.equal(data.arr, (9 + 7.5 + 9) * 12);
  assert.equal(data.payingCustomers, 3);
  assert.equal(data.trialing, 1);
  assert.equal(data.pastDue, 1);
  assert.equal(data.cancellingAtPeriodEnd, 1);
  assert.equal(data.newInPeriod, 2);
  assert.equal(data.churnedInPeriod, 1);
  assert.equal(data.churnRate, 1 / 3);
  assert.equal(data.revenueInPeriod, 99);
  assert.equal(data.planMix[0]?.label, 'Plus monthly');
  assert.equal(data.planMix[0]?.customers, 2);
  assert.equal(data.mrrHistory.length, 12);
  assert.equal(data.mrrHistory.at(-1)?.mrr, 25.5);
});
