import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool, QueryResult } from "pg";

import { PostgresAccountDeletionQueue } from "../src/accountDeletionQueue.js";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  account_id: "account_one",
  user_id: "user_one",
  auth_provider: "neon-auth",
  auth_user_id: "auth_one",
  status: "pending",
  stage: "prepared",
  public_asset_urls: ["https://blob.example/photo.jpg"],
  private_asset_refs: ["missa/user_one/file.pdf"],
  retained_submissions: 0,
  retained_completed_reviews: 0,
  attempt_count: 0,
  last_error: null,
  requested_at: new Date("2026-08-16T00:00:00.000Z"),
  updated_at: new Date("2026-08-16T00:00:00.000Z"),
  completed_at: null,
} as const;

test("account deletion queue stores cleanup references before destructive work", async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const pool = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: [row], rowCount: 1 } as unknown as QueryResult;
    },
  } as unknown as Pool;
  const queue = new PostgresAccountDeletionQueue(pool);

  const request = await queue.prepare({
    accountId: "account_one",
    userId: "user_one",
    authProvider: "neon-auth",
    authUserId: "auth_one",
    publicAssetUrls: ["https://blob.example/photo.jpg"],
    privateAssetRefs: ["missa/user_one/file.pdf"],
  });

  assert.equal(request.accountId, "account_one");
  assert.deepEqual(request.publicAssetUrls, ["https://blob.example/photo.jpg"]);
  assert.match(calls[0]!.sql, /on conflict \(account_id\)/u);
  assert.equal(calls[0]!.params[4], '["https://blob.example/photo.jpg"]');
});

test("account deletion queue claims stale work for an idempotent retry", async () => {
  const calls: string[] = [];
  const pool = {
    query: async (sql: string) => {
      calls.push(sql);
      return {
        rows: [{ ...row, status: "processing", attempt_count: 2 }],
        rowCount: 1,
      } as unknown as QueryResult;
    },
  } as unknown as Pool;

  const request = await new PostgresAccountDeletionQueue(pool).claimNext();

  assert.equal(request?.attemptCount, 2);
  assert.match(calls[0]!, /for update skip locked/u);
  assert.match(calls[0]!, /interval '10 minutes'/u);
  assert.match(calls[0]!, /stage <> 'prepared'/u);
});
