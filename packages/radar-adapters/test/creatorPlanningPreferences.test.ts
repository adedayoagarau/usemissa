import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import {
  DEFAULT_PLANNING_PREFERENCES,
  getPlanningPreferences,
  planningPreferencesAvailable,
  PlanningPreferencesUnavailableError,
  putPlanningPreferences,
} from "../src/index.js";

/** A database before migration 0088: only the availability probe answers. */
function withoutPlanningTable() {
  const statements: string[] = [];
  const db = {
    query: async (sql: string) => {
      statements.push(sql);
      if (sql.includes("to_regclass('public.creator_planning_preferences')")) return { rows: [{ ready: false }] };
      throw new Error('relation "creator_planning_preferences" does not exist');
    },
  } as unknown as Pool;
  return { db, statements };
}

test("before migration 0088 planning preferences read as defaults and saves are refused clearly", async () => {
  const { db, statements } = withoutPlanningTable();
  assert.equal(await planningPreferencesAvailable(db), false);
  assert.deepEqual(await getPlanningPreferences(db, "acct"), DEFAULT_PLANNING_PREFERENCES);
  const { revision: _revision, ...input } = DEFAULT_PLANNING_PREFERENCES;
  await assert.rejects(putPlanningPreferences(db, "acct", input, 0), PlanningPreferencesUnavailableError);
  assert.ok(statements.every((sql) => !/insert into|update creator_planning_preferences/i.test(sql)));
});
