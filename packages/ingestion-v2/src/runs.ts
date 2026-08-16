import { createRunId, type IngestionMode, type IngestionRun, type IngestionRunStatus, type IngestionTrigger, type SourceDefinition } from "./contracts.js";
import { enqueuePipeline, type QueueBundle } from "./queues.js";
import { enqueueStage, type StageQueueBundle } from "./stages.js";

export function createRun(source: SourceDefinition, trigger: IngestionTrigger = "shadow", mode: IngestionMode = "shadow", now = new Date()): IngestionRun {
  return { id: createRunId(source.id, now), sourceId: source.id, trigger, mode, status: "queued", createdAt: now.toISOString() };
}

export async function startRun(queues: QueueBundle, source: SourceDefinition, options: { trigger?: IngestionTrigger; mode?: IngestionMode; jobId?: string } = {}): Promise<IngestionRun> {
  const run = createRun(source, options.trigger ?? "shadow", options.mode ?? "shadow");
  await enqueuePipeline(queues, { runId: run.id, sourceId: source.id, trigger: run.trigger, mode: run.mode }, { jobId: options.jobId ?? run.id });
  return run;
}

export function finishRun(run: IngestionRun, status: Exclude<IngestionRunStatus, "queued" | "running">): IngestionRun {
  return { ...run, status };
}

/**
 * Enqueues at the entry point of the staged graph (the fetch queue) instead
 * of the combined pipeline queue. This is the scheduling hand-off point: a
 * source scheduled here is processed by v2-fetch/v2-decide/v2-write, not by
 * the combined worker. Both paths read the same `missa_ingestion_v2_source_schedules`
 * lease, so a source can only ever be claimed by whichever caller runs this
 * function — never both, and never neither.
 */
export async function startStagedRun(fetchQueue: StageQueueBundle, source: SourceDefinition, options: { trigger?: IngestionTrigger; mode?: IngestionMode; jobId?: string } = {}): Promise<IngestionRun> {
  const run = createRun(source, options.trigger ?? "shadow", options.mode ?? "shadow");
  await enqueueStage(fetchQueue, { runId: run.id, sourceId: source.id, trigger: run.trigger, mode: run.mode }, { jobId: options.jobId ?? run.id });
  return run;
}
