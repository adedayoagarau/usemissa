import type { CreatorSubscriptionUpdate } from '@missa/radar-adapters';

/**
 * Creator Plus billing through Stripe. Prices live in Stripe, not in code:
 * STRIPE_PRICE_CREATOR_PLUS_MONTHLY and STRIPE_PRICE_CREATOR_PLUS_YEARLY name
 * the Stripe prices, and Missa shows whatever amount and currency they hold.
 * With neither set, or no STRIPE_SECRET_KEY, Plus shows as coming soon.
 */

export type PlusInterval = 'month' | 'year';

export type PlusOffer = {
  interval: PlusInterval;
  priceId: string;
  /** In the smallest currency unit. */
  amount: number;
  currency: string;
  /** "$6 a month", "€60 a year". */
  label: string;
};

const PRICE_ENV: Record<PlusInterval, string> = {
  month: 'STRIPE_PRICE_CREATOR_PLUS_MONTHLY',
  year: 'STRIPE_PRICE_CREATOR_PLUS_YEARLY',
};

const STRIPE = 'https://api.stripe.com/v1';

function secret(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

async function stripe<T>(path: string, init: { method?: 'GET' | 'POST'; form?: URLSearchParams; idempotencyKey?: string } = {}): Promise<T> {
  const key = secret();
  if (!key) throw new Error('Stripe is not configured');
  const response = await fetch(`${STRIPE}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
    },
    ...(init.form ? { body: init.form } : {}),
  });
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Stripe request failed (${response.status})`);
  return data;
}

export function priceLabel(amount: number, currency: string, interval: PlusInterval): string {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 ? 2 : 0,
  }).format(amount / 100);
  return `${money} a ${interval}`;
}

let cached: { at: number; offers: PlusOffer[] } | undefined;

/** The Plus prices configured in Stripe, cheapest interval first. Empty when billing is not set up. */
export async function plusOffers(now = Date.now()): Promise<PlusOffer[]> {
  if (!secret()) return [];
  if (cached && now - cached.at < 10 * 60_000) return cached.offers;
  const offers: PlusOffer[] = [];
  for (const interval of ['month', 'year'] as const) {
    const priceId = process.env[PRICE_ENV[interval]]?.trim();
    if (!priceId) continue;
    try {
      const price = await stripe<{ id: string; unit_amount: number | null; currency: string; active: boolean }>(`/prices/${encodeURIComponent(priceId)}`);
      if (!price.active || price.unit_amount === null) continue;
      offers.push({ interval, priceId: price.id, amount: price.unit_amount, currency: price.currency, label: priceLabel(price.unit_amount, price.currency, interval) });
    } catch {
      // A missing or archived price leaves that interval out rather than breaking the page.
    }
  }
  cached = { at: now, offers };
  return offers;
}

/** A Stripe Checkout session for Plus; the webhook turns the paid session into the plan. */
export async function startPlusCheckout(input: {
  accountId: string;
  email?: string;
  customerId?: string | null;
  interval: PlusInterval;
  origin: string;
  idempotencyKey?: string;
}): Promise<string> {
  const offer = (await plusOffers()).find((candidate) => candidate.interval === input.interval);
  if (!offer) throw new Error('Plus is not available for that billing period yet');
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': offer.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${input.origin}/plan?checkout=success`,
    cancel_url: `${input.origin}/plan?checkout=cancelled`,
    client_reference_id: input.accountId,
    allow_promotion_codes: 'true',
    'metadata[account_id]': input.accountId,
    'metadata[creator_plan]': 'plus',
    'subscription_data[metadata][account_id]': input.accountId,
    'subscription_data[metadata][creator_plan]': 'plus',
  });
  if (input.customerId) form.set('customer', input.customerId);
  else if (input.email) form.set('customer_email', input.email);
  const session = await stripe<{ url?: string }>('/checkout/sessions', { method: 'POST', form, idempotencyKey: input.idempotencyKey });
  if (!session.url) throw new Error('Stripe did not return a checkout page');
  return session.url;
}

/** Stripe's customer portal, where a creator changes card, switches period or cancels. */
export async function openBillingPortal(customerId: string, origin: string): Promise<string> {
  const form = new URLSearchParams({ customer: customerId, return_url: `${origin}/plan` });
  const session = await stripe<{ url?: string }>('/billing_portal/sessions', { method: 'POST', form });
  if (!session.url) throw new Error('Stripe did not return a billing page');
  return session.url;
}

/** A subscription's current state, for a checkout that completed before its subscription event arrived. */
export async function retrieveSubscription(subscriptionId: string) {
  return stripe<{ id: string; status: string; customer: string; cancel_at_period_end: boolean; current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

/** Stripe moved current_period_end onto subscription items; read whichever is present. */
export function periodEnd(subscription: { current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } }): string | null {
  const seconds = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

type StripeObject = Record<string, unknown>;
type SubscriptionLike = { id: string; status: string; customer: string; cancel_at_period_end: boolean; current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } };

/** The creator account a Stripe object belongs to, when it is a Plus checkout or subscription. */
export function creatorAccountFor(object: StripeObject): string | undefined {
  const metadata = object.metadata && typeof object.metadata === 'object' ? (object.metadata as Record<string, unknown>) : {};
  return metadata.creator_plan === 'plus' && typeof metadata.account_id === 'string' ? metadata.account_id : undefined;
}

/**
 * Turns a verified Stripe webhook event into the creator's plan. A completed
 * checkout reads its subscription from Stripe (the subscription event may not
 * have arrived yet); subscription events carry their own state. Returns false
 * for events that are not about a creator's Plus subscription.
 */
export async function applyCreatorBillingEvent(
  type: string,
  object: StripeObject,
  apply: (update: CreatorSubscriptionUpdate) => Promise<void>,
  fetchSubscription: (id: string) => Promise<SubscriptionLike> = retrieveSubscription,
): Promise<boolean> {
  const accountId = creatorAccountFor(object);
  if (!accountId) return false;
  let subscription: SubscriptionLike | undefined;
  if (type === 'checkout.session.completed') {
    if (object.mode !== 'subscription' || typeof object.subscription !== 'string') return false;
    subscription = await fetchSubscription(object.subscription);
  } else if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    subscription = object as unknown as SubscriptionLike;
  } else {
    return false;
  }
  await apply({
    accountId,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    subscriptionId: subscription.id,
    status: type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });
  return true;
}
