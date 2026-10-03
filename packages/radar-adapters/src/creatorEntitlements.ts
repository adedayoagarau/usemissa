import type { PoolClient } from "pg";

export type CreatorPlan = "free" | "plus" | "pro";

/**
 * What each creator plan allows. This is the one place limits live; product
 * code asks for an entitlement instead of checking plan names. Discovery,
 * Opportunity pages, official sources and email reminders are never limited.
 */
export const CREATOR_PLAN_LIMITS = {
  free: { activeTrackedLimit: 10 },
  plus: { activeTrackedLimit: null },
  pro: { activeTrackedLimit: null },
} as const satisfies Record<CreatorPlan, { activeTrackedLimit: number | null }>;

export const FREE_ACTIVE_TRACKED_LIMIT = CREATOR_PLAN_LIMITS.free.activeTrackedLimit;

/**
 * Calls a creator is still working towards: not yet submitted, and either
 * rolling or closing today or later. Submitted, decided and lapsed calls never
 * count, so the limit never punishes someone for applying.
 */
const ACTIVE_TRACKED_SQL = `
  select count(*)::int as active
    from tracked_opportunities t
    join opportunities o on o.id = t.opportunity_id
   where t.account_id = $1
     and t.status in ('interested','saved','preparing','draft-started','ready-to-submit')
     and (o.deadline_date is null or o.deadline_date >= current_date)`;

export class TrackingLimitReachedError extends Error {
  readonly code = "tracking-limit";
  constructor(readonly limit: number, readonly active: number) {
    super(`You are working on ${active} calls, the most the Free plan tracks at once.`);
    this.name = "TrackingLimitReachedError";
  }
}

export type CreatorEntitlements = Readonly<{
  plan: CreatorPlan;
  activeTrackedLimit: number | null;
  activeTracked: number;
}>;

type Queryable = Pick<PoolClient, "query">;

/** The account's current plan; Free when no plan row exists, it has expired, or migration 0080 is not applied. */
export async function creatorPlan(client: Queryable, accountId: string): Promise<CreatorPlan> {
  const table = await client.query<{ ready: boolean }>("select to_regclass('creator_plans') is not null as ready");
  if (!table.rows[0]?.ready) return "free";
  const result = await client.query<{ plan: CreatorPlan }>(
    "select plan from creator_plans where account_id=$1 and (expires_at is null or expires_at > now())",
    [accountId],
  );
  return result.rows[0]?.plan ?? "free";
}

export async function creatorEntitlements(client: Queryable, accountId: string): Promise<CreatorEntitlements> {
  const plan = await creatorPlan(client, accountId);
  const active = await client.query<{ active: number }>(ACTIVE_TRACKED_SQL, [accountId]);
  return { plan, activeTrackedLimit: CREATOR_PLAN_LIMITS[plan].activeTrackedLimit, activeTracked: active.rows[0]?.active ?? 0 };
}

/**
 * Called inside a Tracker save transaction before a new call is added. Saving
 * a call that is already tracked is always allowed. Takes a per-account lock so
 * two saves at once cannot both pass the limit.
 */
export async function assertTrackingAllowance(client: PoolClient, accountId: string, opportunityId: string): Promise<void> {
  const existing = await client.query("select 1 from tracked_opportunities where account_id=$1 and opportunity_id=$2", [accountId, opportunityId]);
  if (existing.rows[0]) return;
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`tracking-allowance:${accountId}`]);
  const entitlements = await creatorEntitlements(client, accountId);
  if (entitlements.activeTrackedLimit !== null && entitlements.activeTracked >= entitlements.activeTrackedLimit) {
    throw new TrackingLimitReachedError(entitlements.activeTrackedLimit, entitlements.activeTracked);
  }
}
