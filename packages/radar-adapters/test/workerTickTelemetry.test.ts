import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import {
  readWorkerTickHealth,
  recordWorkerTick,
  workerTickRunId,
} from "../src/index.js";

/**
 * The creator tick keeps one liveness row: a failed pass keeps the last
 * success time so readiness can tell how long the lane has been unhealthy.
 * Skipped without DATABASE_URL or the radar_agent_runs table.
 */
const databaseUrl = process.env.DATABASE_URL;

test(
  "worker ticks upsert one liveness row that remembers the last success",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    try {
      const schema = await pool.query<{ ready: boolean }>(
        "select to_regclass('public.radar_agent_runs') is not null as ready",
      );
      if (!schema.rows[0]!.ready) {
        t.skip("radar_agent_runs is not deployed to this database");
        return;
      }
      await pool.query("delete from radar_agent_runs where id=$1", [
        workerTickRunId("creator-worker"),
      ]);
      assert.equal(await readWorkerTickHealth(pool, "creator-worker"), undefined);

      await recordWorkerTick(pool, "creator-worker", {
        status: "completed",
        startedAt: new Date(),
      });
      const healthy = await readWorkerTickHealth(pool, "creator-worker");
      assert.equal(healthy?.status, "running");
      assert.ok(healthy?.lastSuccessAt);

      await recordWorkerTick(pool, "creator-worker", {
        status: "failed",
        startedAt: new Date(),
        error: "database unavailable",
      });
      const failed = await readWorkerTickHealth(pool, "creator-worker");
      assert.equal(failed?.status, "failed");
      assert.equal(failed?.lastSuccessAt, healthy?.lastSuccessAt);
      assert.ok(failed?.lastFailureAt);
      const rows = await pool.query<{ count: number; error: string | null }>(
        "select count(*)::int count, max(error) error from radar_agent_runs where agent_kind='creator-worker'",
      );
      assert.equal(rows.rows[0]!.count, 1);
      assert.equal(rows.rows[0]!.error, "database unavailable");

      await recordWorkerTick(pool, "creator-worker", {
        status: "completed",
        startedAt: new Date(),
      });
      const recovered = await pool.query<{ error: string | null; last_error: string | null }>(
        "select error, metadata->>'lastError' last_error from radar_agent_runs where id=$1",
        [workerTickRunId("creator-worker")],
      );
      assert.equal(recovered.rows[0]!.error, null);
      assert.equal(recovered.rows[0]!.last_error, null);
    } finally {
      await pool
        .query("delete from radar_agent_runs where id=$1", [
          workerTickRunId("creator-worker"),
        ])
        .catch(() => undefined);
      await pool.end();
    }
  },
);
