import assert from "node:assert/strict";
import test from "node:test";
import { reconcileExpiredOpportunitiesInDatabase } from "../src/databaseReconciliation.js";

test("reconcileExpiredOpportunitiesInDatabase queries opportunities and radar_opportunities with current date", async () => {
  const executedQueries: Array<{ sql: string; values: unknown[] }> = [];
  const fakePool = {
    query: async (sql: string, values: unknown[]) => {
      executedQueries.push({ sql, values });
      return { rowCount: 5, rows: [{ id: "opp_1" }] };
    },
  };

  const testNow = new Date("2026-09-02T12:00:00Z");
  const result = await reconcileExpiredOpportunitiesInDatabase(fakePool as any, testNow);

  assert.equal(result.canonicalClosed, 5);
  assert.equal(result.radarClosed, 5);
  assert.equal(executedQueries.length, 2);

  // Canonical query checks
  assert.match(executedQueries[0].sql, /UPDATE opportunities/);
  assert.match(executedQueries[0].sql, /deadline_date < \$1::date/);
  assert.deepEqual(executedQueries[0].values, ["2026-09-02"]);

  // Radar query checks
  assert.match(executedQueries[1].sql, /UPDATE radar_opportunities/);
  assert.match(executedQueries[1].sql, /deadline.*date.*< \$1::date/);
  assert.deepEqual(executedQueries[1].values, ["2026-09-02"]);
});
