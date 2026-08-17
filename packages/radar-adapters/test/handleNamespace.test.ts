import test from "node:test";
import assert from "node:assert/strict";
import {
  handleClaimAccessMode,
  normalizeUserHandleInput,
  readNextDeletedUserHandle,
  readPublicProfilePageViews,
} from "../src/handleNamespace.js";
import type { Pool, QueryResult } from "pg";

test("claim-time normalization is the shared deterministic gate", () => {
  assert.equal(normalizeUserHandleInput("Writer's Room"), "writers-room");
  assert.equal(normalizeUserHandleInput("@Granta"), "granta");
  assert.equal(normalizeUserHandleInput("grаnta"), null);
});

test("handle claims default to the protected invitee window", () => {
  assert.equal(handleClaimAccessMode(), "invite-only");
});

test("handle deletion reads the trailing public Profile view window", async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass"))
        return {
          rows: [{ present: "platform_analytics_events" }],
          rowCount: 1,
        } as unknown as QueryResult;
      return {
        rows: [{ views: 42 }],
        rowCount: 1,
      } as unknown as QueryResult;
    },
  } as unknown as Pool;
  const deletedAt = new Date("2026-08-16T00:00:00.000Z");

  const views = await readPublicProfilePageViews(pool, "amaka", deletedAt);

  assert.equal(views, 42);
  assert.deepEqual(calls[1]!.params, ["/@amaka", deletedAt, 90]);
  assert.match(calls[1]!.sql, /event_name = 'page_view'/u);
});

test("handle maintenance selects only completed deleted accounts still on hold", async () => {
  const requestedAt = new Date("2026-08-16T00:00:00.000Z");
  const pool = {
    query: async (sql: string) => {
      assert.match(sql, /status = 'completed'/u);
      assert.match(sql, /h\.state = 'blocked'/u);
      return {
        rows: [
          {
            handle_key: "amaka",
            user_id: "user_amaka",
            requested_at: requestedAt,
          },
        ],
        rowCount: 1,
      } as unknown as QueryResult;
    },
  } as unknown as Pool;

  assert.deepEqual(await readNextDeletedUserHandle(pool), {
    handleKey: "amaka",
    userId: "user_amaka",
    deletedAt: requestedAt,
  });
});
