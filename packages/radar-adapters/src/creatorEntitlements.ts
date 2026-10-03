import type { PoolClient } from "pg";

export type CreatorPlan = "free" | "plus" | "pro";

/**
 * What each creator plan allows. This is the one place limits live; product
 * code asks for an entitlement instead of checking plan names. Discovery,
 * Opportunity pages, official sources and email reminders are never limited.
 * Text (SMS) reminders cost Missa per message, so they come with Plus.
 */
export const CREATOR_PLAN_LIMITS = {
  free: { activeTrackedLimit: 10, smsReminders: false },
  plus: { activeTrackedLimit: null, smsReminders: true },
  pro: { activeTrackedLimit: null, smsReminders: true },
} as const satisfies Record<CreatorPlan, { activeTrackedLimit: number | null; smsReminders: boolean }>;

export const FREE_ACTIVE_TRACKED_LIMIT = CREATOR_PLAN_LIMITS.free.activeTrackedLimit;

/** Plans that include text reminders, for SQL that filters recipients by plan. */
export const SMS_REMINDER_PLANS = (Object.keys(CREATOR_PLAN_LIMITS) as CreatorPlan[]).filter(
  (plan) => CREATOR_PLAN_LIMITS[plan].smsReminders,
);

export function planIncludesSmsReminders(plan: CreatorPlan): boolean {
  return CREATOR_PLAN_LIMITS[plan].smsReminders;
}

/** Tracker statuses that count towards the Free limit while the call is open. */
export const ACTIVE_TRACKED_STATUSES = ["interested", "saved", "preparing", "draft-started", "ready-to-submit"] as const;

export function isActiveTrackedStatus(status: string): boolean {
  return (ACTIVE_TRACKED_STATUSES as readonly string[]).includes(status);
}

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
     and t.status in (${ACTIVE_TRACKED_STATUSES.map((status) => `'${status}'`).join(",")})
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
  assertRoomForActiveCall(await creatorEntitlements(client, accountId));
}

/**
 * The limit check itself, for callers that count calls in progress some other
 * way (the legacy Radar store): refuses one more call in progress when the plan
 * is already at its limit.
 */
export function assertRoomForActiveCall(entitlements: Pick<CreatorEntitlements, "activeTrackedLimit" | "activeTracked">): void {
  if (entitlements.activeTrackedLimit !== null && entitlements.activeTracked >= entitlements.activeTrackedLimit) {
    throw new TrackingLimitReachedError(entitlements.activeTrackedLimit, entitlements.activeTracked);
  }
}

/**
 * Bulk Tracker writes, such as a CSV import, take the same per-account lock as
 * a single save and read the in-progress count before writing.
 */
export async function lockTrackingAllowance(client: Queryable, accountId: string): Promise<CreatorEntitlements> {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`tracking-allowance:${accountId}`]);
  return creatorEntitlements(client, accountId);
}

/**
 * Called after a bulk write, before commit: refuses the write when it takes the
 * calls in progress past the plan's limit. A write that only adds submitted or
 * closed calls, or that does not raise the count, is always allowed, so
 * importing a history of past applications never hits the limit.
 */
export async function assertBulkTrackingWithinAllowance(client: Queryable, accountId: string, before: CreatorEntitlements): Promise<void> {
  if (before.activeTrackedLimit === null) return;
  const after = await creatorEntitlements(client, accountId);
  if (after.activeTracked > before.activeTracked && after.activeTracked > before.activeTrackedLimit) {
    throw new TrackingLimitReachedError(before.activeTrackedLimit, after.activeTracked);
  }
}
