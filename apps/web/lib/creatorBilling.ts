import type { CreatorSubscriptionUpdate } from '@missa/radar-adapters';

/**
 * Creator Plus billing through Stripe. Prices live in Stripe, not in code:
 * STRIPE_PRICE_CREATOR_PLUS_MONTHLY and STRIPE_PRICE_CREATOR_PLUS_YEARLY name
 * the Stripe prices, and Missa shows whatever amount and currency they hold.
 * With neither set, or no STRIPE_SECRET_KEY, Plus shows as coming soon.
 *
 * Prices respect geography: a creator in a pricing region (Africa first) sees
 * that region's prices, named by the same variables with the region suffix
 * (STRIPE_PRICE_CREATOR_PLUS_MONTHLY_AFRICA). A region without its own price
 * for an interval falls back to the standard price.
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

export type PricingRegion = 'standard' | 'africa';

/** African Union member states (ISO 3166-1 alpha-2), the first regional price. */
const AFRICA = new Set(
  'DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW EH ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'.split(' '),
);

/** The pricing region for a two-letter country code; unknown or missing countries pay the standard price. */
export function pricingRegion(country: string | null | undefined): PricingRegion {
  return country && AFRICA.has(country.trim().toUpperCase()) ? 'africa' : 'standard';
}

/** The visitor's country as Vercel reports it, from request headers. */
export function requestCountry(headers: Pick<Headers, 'get'>): string | null {
  return headers.get('x-vercel-ip-country')?.trim().toUpperCase() || null;
}

const STRIPE = 'https://api.stripe.com/v1';

function secret(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

async function stripe<T>(path: string, init: { method?: 'GET' | 'POST' | 'DELETE'; form?: URLSearchParams; idempotencyKey?: string } = {}): Promise<T> {
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
  const data = (await response.json()) as T & { error?: { message?: string; code?: string } };
  if (!response.ok) throw new StripeRequestError(data.error?.message ?? `Stripe request failed (${response.status})`, response.status, data.error?.code);
  return data;
}

export class StripeRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'StripeRequestError';
  }
}

export function priceLabel(amount: number, currency: string, interval: PlusInterval): string {
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 ? 2 : 0,
  }).format(amount / 100);
  return `${money} a ${interval}`;
}

const cached = new Map<PricingRegion, { at: number; offers: PlusOffer[] }>();

async function priceOffer(priceId: string, interval: PlusInterval): Promise<PlusOffer | undefined> {
  try {
    const price = await stripe<{ id: string; unit_amount: number | null; currency: string; active: boolean }>(`/prices/${encodeURIComponent(priceId)}`);
    if (!price.active || price.unit_amount === null) return undefined;
    return { interval, priceId: price.id, amount: price.unit_amount, currency: price.currency, label: priceLabel(price.unit_amount, price.currency, interval) };
  } catch {
    // A missing or archived price leaves that interval out rather than breaking the page.
    return undefined;
  }
}

/**
 * The Plus prices for a pricing region, monthly first. Each interval uses the
 * region's own price when one is set and active, otherwise the standard price.
 * Empty when billing is not set up.
 */
export async function plusOffers(region: PricingRegion = 'standard', now = Date.now()): Promise<PlusOffer[]> {
  if (!secret()) return [];
  const hit = cached.get(region);
  if (hit && now - hit.at < 10 * 60_000) return hit.offers;
  const offers: PlusOffer[] = [];
  for (const interval of ['month', 'year'] as const) {
    const regional = region === 'standard' ? undefined : process.env[`${PRICE_ENV[interval]}_${region.toUpperCase()}`]?.trim();
    const standard = process.env[PRICE_ENV[interval]]?.trim();
    const offer = (regional ? await priceOffer(regional, interval) : undefined) ?? (standard ? await priceOffer(standard, interval) : undefined);
    if (offer) offers.push(offer);
  }
  cached.set(region, { at: now, offers });
  return offers;
}

/** A Stripe Checkout session for Plus; the webhook turns the paid session into the plan. */
export async function startPlusCheckout(input: {
  accountId: string;
  email?: string;
  customerId?: string | null;
  interval: PlusInterval;
  /** Where the visitor is, from the request; picks the regional price. */
  country: string | null;
  origin: string;
  idempotencyKey?: string;
}): Promise<string> {
  const region = pricingRegion(input.country);
  const offer = (await plusOffers(region)).find((candidate) => candidate.interval === input.interval);
  if (!offer) throw new Error('Plus is not available for that billing period yet');
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': offer.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${input.origin}/plan?checkout=success`,
    cancel_url: `${input.origin}/plan?checkout=cancelled`,
    client_reference_id: input.accountId,
    allow_promotion_codes: 'true',
    // A billing address is required so the country behind a regional price is on record.
    billing_address_collection: 'required',
    'metadata[account_id]': input.accountId,
    'metadata[creator_plan]': 'plus',
    'metadata[pricing_region]': region,
    'metadata[request_country]': input.country ?? 'unknown',
    'subscription_data[metadata][account_id]': input.accountId,
    'subscription_data[metadata][creator_plan]': 'plus',
    'subscription_data[metadata][pricing_region]': region,
    'subscription_data[metadata][request_country]': input.country ?? 'unknown',
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
 * have arrived yet); subscription events carry their own state. Every update
 * carries the event's `created` time so the plan ignores events older than one
 * it already applied. Returns false for events that are not about a creator's
 * Plus subscription.
 */
export async function applyCreatorBillingEvent<R>(
  event: { type: string; created?: number; object: StripeObject },
  apply: (update: CreatorSubscriptionUpdate) => Promise<R>,
  fetchSubscription: (id: string) => Promise<SubscriptionLike> = retrieveSubscription,
): Promise<{ handled: false } | { handled: true; result: R }> {
  const { type, object } = event;
  const accountId = creatorAccountFor(object);
  if (!accountId) return { handled: false };
  let subscription: SubscriptionLike | undefined;
  if (type === 'checkout.session.completed') {
    if (object.mode !== 'subscription' || typeof object.subscription !== 'string') return { handled: false };
    subscription = await fetchSubscription(object.subscription);
  } else if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    subscription = object as unknown as SubscriptionLike;
  } else {
    return { handled: false };
  }
  const result = await apply({
    accountId,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
    subscriptionId: subscription.id,
    status: type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    eventCreatedAt: typeof event.created === 'number' && Number.isFinite(event.created) ? new Date(event.created * 1000).toISOString() : null,
  });
  return { handled: true, result };
}

/** Stripe subscription statuses that can still charge the customer. */
const BILLABLE = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);

type StripeRequest = <T>(path: string, init?: { method?: 'GET' | 'POST' | 'DELETE'; form?: URLSearchParams; idempotencyKey?: string }) => Promise<T>;

/**
 * Cancels every Plus subscription that can still charge a creator, for account
 * closure. Cancellation is immediate and without a proration refund (Stripe's
 * default for DELETE /v1/subscriptions): the closed account loses Plus now, the
 * period already paid is not refunded automatically, and no further invoice is
 * raised. Covers the subscription on the plan row and any other Plus
 * subscription on the same Stripe customer (a duplicate checkout). Throws when
 * any cancellation fails, so closure can stop instead of leaving a live charge.
 * Returns the ids cancelled.
 */
export async function cancelCreatorSubscriptions(
  input: { accountId: string; customerId: string | null; subscriptionId: string | null },
  request: StripeRequest = stripe,
): Promise<string[]> {
  const candidates = new Set<string>();
  if (input.subscriptionId) candidates.add(input.subscriptionId);
  if (input.customerId) {
    // Without a status filter Stripe lists every subscription that is not canceled.
    const listed = await request<{ data?: Array<{ id: string; status: string; metadata?: Record<string, string> }> }>(
      `/subscriptions?customer=${encodeURIComponent(input.customerId)}&limit=100`,
    );
    for (const subscription of listed.data ?? []) {
      const ownsIt = subscription.metadata?.creator_plan === 'plus' && subscription.metadata?.account_id === input.accountId;
      if (ownsIt && BILLABLE.has(subscription.status)) candidates.add(subscription.id);
    }
  }
  const cancelled: string[] = [];
  for (const id of candidates) {
    let current: { id: string; status: string };
    try {
      current = await request<{ id: string; status: string }>(`/subscriptions/${encodeURIComponent(id)}`);
    } catch (error) {
      // A subscription Stripe no longer has cannot charge anyone.
      if (error instanceof StripeRequestError && error.code === 'resource_missing') continue;
      throw error;
    }
    if (!BILLABLE.has(current.status)) continue;
    await request(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE', idempotencyKey: `account-close:${input.accountId}:${id}` });
    cancelled.push(id);
  }
  return cancelled;
}

export type AccountClosure = { status: 'closed'; cancelledSubscriptions: string[] } | { status: 'not-found' } | { status: 'billing-failed' };

/**
 * Closes a creator account only after its Plus billing is stopped. Billing is
 * cancelled first; if that fails the account stays open, so the creator can try
 * again rather than being charged for an account that no longer exists.
 */
export async function closeAccountAfterCancellingPlus(
  accountId: string,
  deps: {
    /** The plan row's Stripe ids, or undefined when plans are unavailable. */
    billing: () => Promise<{ customerId: string | null; subscriptionId: string | null } | undefined>;
    close: () => Promise<boolean>;
    cancel?: (input: { accountId: string; customerId: string | null; subscriptionId: string | null }) => Promise<string[]>;
  },
): Promise<AccountClosure> {
  let cancelledSubscriptions: string[] = [];
  try {
    const billing = await deps.billing();
    if (billing && (billing.customerId || billing.subscriptionId)) {
      cancelledSubscriptions = await (deps.cancel ?? cancelCreatorSubscriptions)({ accountId, ...billing });
    }
  } catch {
    return { status: 'billing-failed' };
  }
  if (!(await deps.close())) return { status: 'not-found' };
  return { status: 'closed', cancelledSubscriptions };
}
