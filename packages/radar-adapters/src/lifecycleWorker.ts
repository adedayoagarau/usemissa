#!/usr/bin/env node
import { Pool } from "pg";
import { runLifecycleReconcilerBatch } from "./lifecycleReconciler.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const batchSize = Number(process.env.MISSA_LIFECYCLE_BATCH_SIZE ?? 25);
const intervalMs = Math.max(60_000, Number(process.env.MISSA_LIFECYCLE_INTERVAL_MINUTES ?? 5) * 60_000);

try {
  do {
    await runLifecycleReconcilerBatch(pool, { batchSize, logger: console });
    if (process.env.MISSA_LIFECYCLE_RUN_ONCE === "1") break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (true);
} finally {
  await pool.end();
}
