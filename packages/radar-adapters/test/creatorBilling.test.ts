import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { applyCreatorSubscription, creatorBillingAccount, creatorEntitlements } from "../src/index.js";

/**
 * Real-Postgres coverage for Plus billing state. Runs in CI's target-schema
 * job; skipped without DATABASE_URL or migration 0081.
 */
const databaseUrl = process.env.DATABASE_URL;

test("a Stripe subscription turns Plus on, keeps it to the period end when cancelled, and never ends a granted plan", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const ready = await pool.query<{ ready: boolean }>(
    "select count(*) = 1 as ready from information_schema.columns where table_name='creator_plans' and column_name='stripe_customer_id'",
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
      { plan: "plus", source: "billing", customerId: "cus_fixture", status: "active", cancelAtPeriodEnd: false, expiresAt: null },
    );

    await update("active", { cancelAtPeriodEnd: true });
    const cancelling = await creatorBillingAccount(pool, account);
    assert.equal(cancelling.plan, "plus", "a cancelled plan stays on until the period ends");
    assert.ok(cancelling.expiresAt && Date.parse(cancelling.expiresAt) > Date.now());

    await update("canceled");
    assert.equal(await plan(account), "free", "an ended subscription returns the account to Free");
    assert.equal((await creatorBillingAccount(pool, account)).customerId, "cus_fixture", "the customer stays for a later upgrade");

    await update("active");
    assert.equal(await plan(account), "plus", "resubscribing turns Plus back on");

    await pool.query("insert into creator_plans(account_id,plan,source) values($1,'plus','grant')", [granted]);
    await applyCreatorSubscription(pool, { accountId: granted, customerId: null, subscriptionId: null, status: "canceled", currentPeriodEnd: null, cancelAtPeriodEnd: false });
    assert.equal(await plan(granted), "plus", "billing never ends a granted plan");
  } finally {
    await pool.query("delete from radar_accounts where id=any($1)", [[account, granted]]);
    await pool.end();
  }
});
