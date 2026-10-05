import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { applyCreatorSubscription, creatorBillingAccount, creatorEntitlements } from "../src/index.js";

/**
 * Real-Postgres coverage for Plus billing state. Runs in CI's target-schema
 * job; skipped without DATABASE_URL or migrations 0081 and 0082.
 */
const databaseUrl = process.env.DATABASE_URL;

test("a Stripe subscription turns Plus on, keeps it to the period end when cancelled, and never ends a granted plan", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>(
    "select count(*) = 1 as ready from information_schema.columns where table_name='creator_plans' and column_name='stripe_event_at'",
  );
  if (!ready.rows[0]!.ready) {
    await pool.end();
    t.skip("creator billing schema is not applied to this database");
    return;
  }
  const p = `billing-${randomBytes(4).toString("hex")}`;
  const account = `${p}-account`;
  const granted = `${p}-granted`;
  const plan = async (id: string) => {
    const client = await pool.connect();
    try {
      return (await creatorEntitlements(client, id)).plan;
    } finally {
      client.release();
    }
  };
  const update = (status: string, extra: Partial<Parameters<typeof applyCreatorSubscription>[1]> = {}) =>
    applyCreatorSubscription(pool, {
      accountId: account,
      customerId: "cus_fixture",
      subscriptionId: `sub_${p}`,
      status,
      currentPeriodEnd: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      cancelAtPeriodEnd: false,
      ...extra,
    });
  try {
    for (const id of [account, granted]) await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [id, `${id}@example.invalid`]);

    assert.equal(await plan(account), "free");
    await update("active");
    assert.equal(await plan(account), "plus");
    assert.deepEqual(
      { ...(await creatorBillingAccount(pool, account)), expiresAt: null },
      { plan: "plus", source: "billing", customerId: "cus_fixture", subscriptionId: `sub_${p}`, status: "active", cancelAtPeriodEnd: false, expiresAt: null },
    );

    await update("active", { cancelAtPeriodEnd: true });
    const cancelling = await creatorBillingAccount(pool, account);
    assert.equal(cancelling.plan, "plus", "a cancelled plan stays on until the period ends");
    assert.ok(cancelling.expiresAt && Date.parse(cancelling.expiresAt) > Date.now());

    await update("canceled");
    assert.equal(await plan(account), "free", "an ended subscription returns the account to Free");
    assert.equal((await creatorBillingAccount(pool, account)).customerId, "cus_fixture", "the customer stays for a later upgrade");

    assert.deepEqual(await update("active"), { applied: false, reason: "ended-subscription" });
    assert.equal(await plan(account), "free", "an ended subscription is never revived by a late paying event");
    await update("active", { subscriptionId: `sub_${p}_again` });
    assert.equal(await plan(account), "plus", "resubscribing (a new Stripe subscription) turns Plus back on");

    await pool.query("insert into creator_plans(account_id,plan,source) values($1,'plus','grant')", [granted]);
    await applyCreatorSubscription(pool, { accountId: granted, customerId: null, subscriptionId: null, status: "canceled", currentPeriodEnd: null, cancelAtPeriodEnd: false });
    assert.equal(await plan(granted), "plus", "billing never ends a granted plan");
  } finally {
    await pool.query("delete from radar_accounts where id=any($1)", [[account, granted]]);
    await pool.end();
  }
});

test("Stripe events apply in event order: a stale event is ignored, a newer one applies, and a second subscription never replaces a running one", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>(
    "select count(*) = 1 as ready from information_schema.columns where table_name='creator_plans' and column_name='stripe_event_at'",
  );
  if (!ready.rows[0]!.ready) {
    await pool.end();
    t.skip("creator billing event order schema (0082) is not applied to this database");
    return;
  }
  const p = `order-${randomBytes(4).toString("hex")}`;
  const account = `${p}-account`;
  const sub = `sub_${p}`;
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 12, minutes)).toISOString();
  const event = (status: string, minutes: number, extra: Partial<Parameters<typeof applyCreatorSubscription>[1]> = {}) =>
    applyCreatorSubscription(pool, {
      accountId: account,
      customerId: "cus_order",
      subscriptionId: sub,
      status,
      currentPeriodEnd: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      cancelAtPeriodEnd: false,
      eventCreatedAt: at(minutes),
      ...extra,
    });
  const plan = async () => {
    const client = await pool.connect();
    try {
      return (await creatorEntitlements(client, account)).plan;
    } finally {
      client.release();
    }
  };
  try {
    await pool.query("insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)", [account, `${account}@example.invalid`]);

    assert.deepEqual(await event("active", 1), { applied: true });
    assert.deepEqual(await event("canceled", 10), { applied: true });
    assert.equal(await plan(), "free");

    // The update sent before the deletion is retried and lands late.
    assert.deepEqual(await event("active", 5), { applied: false, reason: "stale" });
    assert.equal(await plan(), "free", "a stale active event never turns Plus back on");
    // Even in the same second, an ended subscription stays ended.
    assert.deepEqual(await event("active", 10), { applied: false, reason: "ended-subscription" });
    assert.equal(await plan(), "free");

    // A newer subscription applies, and so do its newer events.
    const next = `${sub}_next`;
    assert.deepEqual(await event("active", 20, { subscriptionId: next }), { applied: true });
    assert.equal(await plan(), "plus");
    assert.deepEqual(await event("active", 21, { subscriptionId: next, cancelAtPeriodEnd: true }), { applied: true });
    assert.equal((await creatorBillingAccount(pool, account)).cancelAtPeriodEnd, true, "a newer event updates the plan");

    // Older non-paying events for the running subscription are ignored.
    assert.deepEqual(await event("unpaid", 15, { subscriptionId: next }), { applied: false, reason: "stale" });
    assert.equal(await plan(), "plus");

    // A duplicate checkout's subscription does not take over the running one,
    // and its deletion does not end the plan the running one pays for.
    assert.deepEqual(await event("active", 30, { subscriptionId: `${sub}_duplicate` }), { applied: false, reason: "other-subscription" });
    assert.equal((await creatorBillingAccount(pool, account)).subscriptionId, next);
    assert.deepEqual(await event("canceled", 31, { subscriptionId: `${sub}_duplicate` }), { applied: false, reason: "other-subscription" });
    assert.equal(await plan(), "plus");
  } finally {
    await pool.query("delete from radar_accounts where id=$1", [account]);
    await pool.end();
  }
});
