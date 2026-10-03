/**
 * Revenue metrics read straight from Stripe, the source of truth for prices
 * and subscription state. Results are cached briefly so admin page loads stay fast.
 */

const STRIPE = 'https://api.stripe.com/v1';
const CACHE_MS = 5 * 60_000;
const MAX_PAGES = 20;

export interface StripePrice {
  id: string;
  nickname: string | null;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null;
  product?: string | { id: string; name?: string };
}

export interface StripeSubscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  created: number;
  canceled_at: number | null;
  ended_at: number | null;
  cancel_at_period_end: boolean;
  items: { data: Array<{ quantity?: number; price: StripePrice }> };
}

export interface RevenueData {
  available: boolean;
  reason?: string;
  generatedAt: string;
  currency: string;
  mrr: number;
  arr: number;
  payingCustomers: number;
  trialing: number;
  pastDue: number;
  cancellingAtPeriodEnd: number;
  arpu: number | null;
  newInPeriod: number;
  churnedInPeriod: number;
  churnRate: number | null;
  revenueInPeriod: number;
  planMix: Array<{ label: string; customers: number; mrr: number }>;
  mrrHistory: Array<{ month: string; mrr: number; customers: number }>;
  otherCurrencies: string[];
}

/** Monthly value of one subscription item in minor units (cents). */
export function monthlyValue(price: StripePrice, quantity = 1): number {
  if (!price.recurring || price.unit_amount === null) return 0;
  const perInterval = price.unit_amount * quantity;
  const count = price.recurring.interval_count || 1;
  switch (price.recurring.interval) {
    case 'year':
      return perInterval / (12 * count);
    case 'month':
      return perInterval / count;
    case 'week':
      return (perInterval * 52) / (12 * count);
    case 'day':
      return (perInterval * 365) / (12 * count);
  }
}

function planLabel(price: StripePrice): string {
  const product = typeof price.product === 'object' ? price.product.name : undefined;
  const interval = price.recurring?.interval === 'year' ? 'yearly' : price.recurring?.interval === 'month' ? 'monthly' : price.recurring?.interval ?? 'one-off';
  return price.nickname || (product ? `${product} · ${interval}` : `${interval} plan`);
}

const COUNTS_AS_PAYING = new Set(['active', 'past_due']);

/** Pure computation over Stripe subscriptions, so it can be tested without the network. */
export function computeRevenue(subscriptions: StripeSubscription[], paidInvoicesInPeriod: Array<{ amount_paid: number; currency: string }>, options: { days: number; now?: Date }): RevenueData {
  const now = options.now ?? new Date();
  const periodStart = now.getTime() / 1000 - options.days * 86_400;
  const currencyTotals = new Map<string, number>();
  for (const subscription of subscriptions) {
    for (const item of subscription.items.data) currencyTotals.set(item.price.currency, (currencyTotals.get(item.price.currency) ?? 0) + 1);
  }
  const currency = [...currencyTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'usd';
  const valueOf = (subscription: StripeSubscription) => subscription.items.data.filter((item) => item.price.currency === currency).reduce((total, item) => total + monthlyValue(item.price, item.quantity ?? 1), 0);

  const paying = subscriptions.filter((subscription) => COUNTS_AS_PAYING.has(subscription.status));
  const mrrMinor = paying.reduce((total, subscription) => total + valueOf(subscription), 0);
  const plans = new Map<string, { customers: number; mrr: number }>();
  for (const subscription of paying) {
    const price = subscription.items.data[0]?.price;
    if (!price) continue;
    const key = planLabel(price);
    const current = plans.get(key) ?? { customers: 0, mrr: 0 };
    plans.set(key, { customers: current.customers + 1, mrr: current.mrr + valueOf(subscription) / 100 });
  }

  const payingAtStart = subscriptions.filter((subscription) => subscription.created < periodStart && (subscription.ended_at === null || subscription.ended_at >= periodStart) && subscription.status !== 'trialing' && subscription.status !== 'incomplete' && subscription.status !== 'incomplete_expired').length;
  const churned = subscriptions.filter((subscription) => subscription.ended_at !== null && subscription.ended_at >= periodStart && subscription.created < subscription.ended_at).length;

  const history: RevenueData['mrrHistory'] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const monthEnd = Math.min(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1) / 1000, now.getTime() / 1000);
    const live = subscriptions.filter((subscription) => subscription.created <= monthEnd && (subscription.ended_at === null || subscription.ended_at > monthEnd) && subscription.status !== 'incomplete' && subscription.status !== 'incomplete_expired' && !(subscription.status === 'trialing'));
    history.push({ month: monthStart.toISOString().slice(0, 7), mrr: Math.round(live.reduce((total, subscription) => total + valueOf(subscription), 0)) / 100, customers: live.length });
  }

  const mrr = mrrMinor / 100;
  return {
    available: true,
    generatedAt: now.toISOString(),
    currency: currency.toUpperCase(),
    mrr,
    arr: mrr * 12,
    payingCustomers: paying.length,
    trialing: subscriptions.filter((subscription) => subscription.status === 'trialing').length,
    pastDue: subscriptions.filter((subscription) => subscription.status === 'past_due' || subscription.status === 'unpaid').length,
    cancellingAtPeriodEnd: paying.filter((subscription) => subscription.cancel_at_period_end).length,
    arpu: paying.length ? mrr / paying.length : null,
    newInPeriod: subscriptions.filter((subscription) => subscription.created >= periodStart && subscription.status !== 'incomplete' && subscription.status !== 'incomplete_expired').length,
    churnedInPeriod: churned,
    churnRate: payingAtStart ? churned / payingAtStart : null,
    revenueInPeriod: paidInvoicesInPeriod.filter((invoice) => invoice.currency === currency).reduce((total, invoice) => total + invoice.amount_paid, 0) / 100,
    planMix: [...plans.entries()].map(([label, value]) => ({ label, customers: value.customers, mrr: Math.round(value.mrr * 100) / 100 })).sort((a, b) => b.mrr - a.mrr),
    mrrHistory: history,
    otherCurrencies: [...currencyTotals.keys()].filter((code) => code !== currency).map((code) => code.toUpperCase()),
  };
}

async function stripeList<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('Stripe is not configured');
  const items: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: '100', ...params, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    const response = await fetch(`${STRIPE}${path}?${query}`, { headers: { authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Stripe ${path} returned ${response.status}`);
    const body = (await response.json()) as { data: Array<T & { id: string }>; has_more: boolean };
    items.push(...body.data);
    if (!body.has_more || !body.data.length) break;
    startingAfter = body.data[body.data.length - 1]!.id;
  }
  return items;
}

let cache: { key: string; at: number; value: RevenueData } | undefined;

export function emptyRevenue(reason: string): RevenueData {
  return { available: false, reason, generatedAt: new Date().toISOString(), currency: 'USD', mrr: 0, arr: 0, payingCustomers: 0, trialing: 0, pastDue: 0, cancellingAtPeriodEnd: 0, arpu: null, newInPeriod: 0, churnedInPeriod: 0, churnRate: null, revenueInPeriod: 0, planMix: [], mrrHistory: [], otherCurrencies: [] };
}

export async function getRevenue(days = 30): Promise<RevenueData> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return emptyRevenue('Set STRIPE_SECRET_KEY to see revenue. Missa reads subscriptions straight from Stripe.');
  const key = `${days}`;
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const since = Math.floor(Date.now() / 1000 - days * 86_400);
    const [subscriptions, invoices] = await Promise.all([
      // Subscription items already carry the full price (with its nickname); Stripe
      // rejects expansions deeper than four levels, so the product is not expanded.
      stripeList<StripeSubscription>('/subscriptions', { status: 'all' }),
      stripeList<{ amount_paid: number; currency: string }>('/invoices', { status: 'paid', 'created[gte]': String(since) }),
    ]);
    const value = computeRevenue(subscriptions, invoices, { days });
    cache = { key, at: Date.now(), value };
    return value;
  } catch (error) {
    console.error('Stripe revenue read failed', error instanceof Error ? error.message : error);
    return emptyRevenue('Stripe could not be reached just now. Try again in a minute.');
  }
}
