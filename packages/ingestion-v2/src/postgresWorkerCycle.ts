import type { PostgresShadowBatchResult } from "./postgresRunner.js";

export interface PostgresWorkerCycleResult {
  batches: number;
  claimed: number;
  completed: number;
  unchanged: number;
  failed: number;
  skipped: number;
}

export async function drainDuePostgresShadowBatches(
  runBatch: () => Promise<PostgresShadowBatchResult>,
  options: { batchLimit: number; maxBatches: number },
): Promise<PostgresWorkerCycleResult> {
  const batchLimit = Math.max(1, Math.trunc(options.batchLimit));
  const maxBatches = Math.max(1, Math.trunc(options.maxBatches));
  const total: PostgresWorkerCycleResult = {
    batches: 0,
    claimed: 0,
    completed: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
  };

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const result = await runBatch();
    total.batches += 1;
    total.claimed += result.claimed;
    total.completed += result.completed;
    total.unchanged += result.unchanged;
    total.failed += result.failed;
    total.skipped += result.skipped;
    if (result.claimed < batchLimit) break;
  }

  return total;
}
