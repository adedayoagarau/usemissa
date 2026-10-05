import type { Pool } from "pg";

/** Stripe subscription statuses that keep Plus active. */
const PAYING = new Set(["active", "trialing", "past_due"]);

export type CreatorSubscriptionUpdate = {
  accountId: string;
  customerId: string | null;
  subscriptionId: string | null;
  /** Stripe subscription status, e.g. active, trialing, past_due, canceled. */
  status: string;
  /** End of the paid period, ISO 8601; a cancelled plan stays on until then. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /**
   * When Stripe created the event that carried this state, ISO 8601. The row
   * remembers the newest one applied, and an older event is ignored. Null only
   * for callers without an event; those are applied unordered.
   */
  eventCreatedAt?: string | null;
};

/**
 * Whether a subscription event changed the plan. An event is not applied when
 * it is older than one already applied (`stale`), when it would revive a
 * subscription Stripe has already ended (`ended-subscription`), when the
 * account is already paying through a different subscription that is still
 * running (`other-subscription`), or when an ending subscription has no plan
 * row it owns (`no-plan`).
 */
export type CreatorSubscriptionResult =
  | { applied: true }
  | { applied: false; reason: "stale" | "ended-subscription" | "other-subscription" | "no-plan" };

export type CreatorBillingAccount = {
  plan: "free" | "plus" | "pro";
  source: string | null;
  customerId: string | null;
  /** The Stripe subscription the plan is bound to; server-side only. */
  subscriptionId: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: string | null;
};

/** Stripe subscription statuses that never become active again. */
const ENDED = ["canceled", "incomplete_expired"];

/**
 * Applies a Stripe subscription to the creator's plan. A paying subscription
 * makes the account Plus with no end date, or ending at the period end when it
 * is set to cancel. An ended subscription expires a billing plan now. Plans
 * granted another way (a grant, a trial, a cohort) are never ended by billing.
 *
 * Stripe does not deliver events in order and retries failed ones, so events
 * do NOT converge on their own: a retried `customer.subscription.updated`
 * (active) that lands after `customer.subscription.deleted` would turn Plus
 * back on for good. Three guards stop that:
 *  - the row keeps the `created` time of the newest event applied
 *    (stripe_event_at, migration 0082) and ignores anything older;
 *  - a subscription Stripe has ended (canceled, incomplete_expired) is never
 *    revived by a paying event for that same subscription, whatever its time;
 *  - a paying event for a different subscription does not replace one that is
 *    still paying and unexpired. That is a second, duplicate subscription; it is
 *    reported as `other-subscription` so the webhook can flag it for a refund.
 */
export async function applyCreatorSubscription(pool: Pick<Pool, "query">, update: CreatorSubscriptionUpdate): Promise<CreatorSubscriptionResult> {
  const eventAt = update.eventCreatedAt ?? null;
  if (PAYING.has(update.status)) {
    const expiresAt = update.cancelAtPeriodEnd ? update.currentPeriodEnd : null;
    const result = await pool.query(
      `insert into creator_plans(account_id,plan,source,expires_at,stripe_customer_id,stripe_subscription_id,billing_status,cancel_at_period_end,stripe_event_at)
       values($1,'plus','billing',$2,$3,$4,$5,$6,$7::timestamptz)
       on conflict (account_id) do update set
         plan='plus',source='billing',expires_at=excluded.expires_at,
         stripe_customer_id=coalesce(excluded.stripe_customer_id,creator_plans.stripe_customer_id),
         stripe_subscription_id=coalesce(excluded.stripe_subscription_id,creator_plans.stripe_subscription_id),
         billing_status=excluded.billing_status,cancel_at_period_end=excluded.cancel_at_period_end,
         stripe_event_at=greatest(creator_plans.stripe_event_at,excluded.stripe_event_at),updated_at=now()
       where (creator_plans.stripe_event_at is null or excluded.stripe_event_at is null or excluded.stripe_event_at >= creator_plans.stripe_event_at)
         and not (creator_plans.stripe_subscription_id is not distinct from excluded.stripe_subscription_id
                  and coalesce(creator_plans.billing_status = any($8::text[]), false))
         and (creator_plans.stripe_subscription_id is null or excluded.stripe_subscription_id is null
              or creator_plans.stripe_subscription_id = excluded.stripe_subscription_id
              or creator_plans.source <> 'billing'
              or creator_plans.billing_status is null or creator_plans.billing_status <> all($9::text[])
              or (creator_plans.expires_at is not null and creator_plans.expires_at <= now()))
       returning account_id`,
      [update.accountId, expiresAt, update.customerId, update.subscriptionId, update.status, update.cancelAtPeriodEnd, eventAt, ENDED, [...PAYING]],
    );
    if (result.rowCount) return { applied: true };
    return { applied: false, reason: await skippedReason(pool, update, eventAt) };
  }
  const result = await pool.query(
    `update creator_plans set
       expires_at=case when source='billing' then least(coalesce(expires_at,now()),now()) else expires_at end,
       billing_status=$2,cancel_at_period_end=false,
       stripe_customer_id=coalesce($3,stripe_customer_id),
       stripe_event_at=greatest(stripe_event_at,$5::timestamptz),updated_at=now()
     where account_id=$1 and (stripe_subscription_id is null or $4::text is null or stripe_subscription_id=$4)
       and (stripe_event_at is null or $5::timestamptz is null or $5::timestamptz >= stripe_event_at)
     returning account_id`,
    [update.accountId, update.status, update.customerId, update.subscriptionId, eventAt],
  );
  if (result.rowCount) return { applied: true };
  return { applied: false, reason: await skippedReason(pool, update, eventAt) };
}

/** Why an event left the row alone, read after the guarded write found nothing to change. */
async function skippedReason(
  pool: Pick<Pool, "query">,
  update: CreatorSubscriptionUpdate,
  eventAt: string | null,
): Promise<Exclude<CreatorSubscriptionResult, { applied: true }>["reason"]> {
  const row = (
    await pool.query<{ stale: boolean; same: boolean; ended: boolean }>(
      `select (stripe_event_at is not null and $2::timestamptz is not null and $2::timestamptz < stripe_event_at) stale,
              (stripe_subscription_id is not distinct from $3::text) same,
              coalesce(billing_status = any($4::text[]), false) ended
         from creator_plans where account_id=$1`,
      [update.accountId, eventAt, update.subscriptionId, ENDED],
    )
  ).rows[0];
  if (!row) return "no-plan";
  if (row.stale) return "stale";
  if (row.same && row.ended) return "ended-subscription";
  return "other-subscription";
}

/** What the plan page shows: the plan, whether it is paid, and the Stripe customer to manage it. */
export async function creatorBillingAccount(pool: Pick<Pool, "query">, accountId: string): Promise<CreatorBillingAccount> {
  const ready = await pool.query<{ ready: boolean }>(
    `select count(*) = 1 as ready from information_schema.columns
      where table_schema=current_schema() and table_name='creator_plans' and column_name='stripe_customer_id'`,
  );
  if (!ready.rows[0]?.ready) return { plan: "free", source: null, customerId: null, subscriptionId: null, status: null, cancelAtPeriodEnd: false, expiresAt: null };
  const row = (
    await pool.query<{
      plan: "free" | "plus" | "pro";
      source: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      billing_status: string | null;
      cancel_at_period_end: boolean;
      expires_at: Date | null;
      active: boolean;
    }>(
      `select plan,source,stripe_customer_id,stripe_subscription_id,billing_status,cancel_at_period_end,expires_at,
              (expires_at is null or expires_at > now()) active
         from creator_plans where account_id=$1`,
      [accountId],
    )
  ).rows[0];
  if (!row) return { plan: "free", source: null, customerId: null, subscriptionId: null, status: null, cancelAtPeriodEnd: false, expiresAt: null };
  return {
    plan: row.active ? row.plan : "free",
    source: row.source,
    customerId: row.stripe_customer_id,
    subscriptionId: row.stripe_subscription_id,
    status: row.billing_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  };
}
