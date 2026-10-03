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
};

export type CreatorBillingAccount = {
  plan: "free" | "plus" | "pro";
  source: string | null;
  customerId: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: string | null;
};

/**
 * Applies a Stripe subscription to the creator's plan. A paying subscription
 * makes the account Plus with no end date, or ending at the period end when it
 * is set to cancel. An ended subscription expires a billing plan now. Plans
 * granted another way (a grant, a trial, a cohort) are never ended by billing.
 * Events can arrive out of order; each one carries the full current state, so
 * applying them in any order converges on Stripe's latest status.
 */
export async function applyCreatorSubscription(pool: Pick<Pool, "query">, update: CreatorSubscriptionUpdate): Promise<void> {
  if (PAYING.has(update.status)) {
    const expiresAt = update.cancelAtPeriodEnd ? update.currentPeriodEnd : null;
    await pool.query(
      `insert into creator_plans(account_id,plan,source,expires_at,stripe_customer_id,stripe_subscription_id,billing_status,cancel_at_period_end)
       values($1,'plus','billing',$2,$3,$4,$5,$6)
       on conflict (account_id) do update set
         plan='plus',source='billing',expires_at=excluded.expires_at,
         stripe_customer_id=coalesce(excluded.stripe_customer_id,creator_plans.stripe_customer_id),
         stripe_subscription_id=coalesce(excluded.stripe_subscription_id,creator_plans.stripe_subscription_id),
         billing_status=excluded.billing_status,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()`,
      [update.accountId, expiresAt, update.customerId, update.subscriptionId, update.status, update.cancelAtPeriodEnd],
    );
    return;
  }
  await pool.query(
    `update creator_plans set
       expires_at=case when source='billing' then least(coalesce(expires_at,now()),now()) else expires_at end,
       billing_status=$2,cancel_at_period_end=false,
       stripe_customer_id=coalesce($3,stripe_customer_id),updated_at=now()
     where account_id=$1 and (stripe_subscription_id is null or $4::text is null or stripe_subscription_id=$4)`,
    [update.accountId, update.status, update.customerId, update.subscriptionId],
  );
}

/** What the plan page shows: the plan, whether it is paid, and the Stripe customer to manage it. */
export async function creatorBillingAccount(pool: Pick<Pool, "query">, accountId: string): Promise<CreatorBillingAccount> {
  const ready = await pool.query<{ ready: boolean }>(
    `select count(*) = 1 as ready from information_schema.columns
      where table_schema=current_schema() and table_name='creator_plans' and column_name='stripe_customer_id'`,
  );
  if (!ready.rows[0]?.ready) return { plan: "free", source: null, customerId: null, status: null, cancelAtPeriodEnd: false, expiresAt: null };
  const row = (
    await pool.query<{
      plan: "free" | "plus" | "pro";
      source: string;
      stripe_customer_id: string | null;
      billing_status: string | null;
      cancel_at_period_end: boolean;
      expires_at: Date | null;
      active: boolean;
    }>(
      `select plan,source,stripe_customer_id,billing_status,cancel_at_period_end,expires_at,
              (expires_at is null or expires_at > now()) active
         from creator_plans where account_id=$1`,
      [accountId],
    )
  ).rows[0];
  if (!row) return { plan: "free", source: null, customerId: null, status: null, cancelAtPeriodEnd: false, expiresAt: null };
  return {
    plan: row.active ? row.plan : "free",
    source: row.source,
    customerId: row.stripe_customer_id,
    status: row.billing_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  };
}
