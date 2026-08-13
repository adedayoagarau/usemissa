import { createRunId, type IngestionMode, type IngestionRun, type IngestionRunStatus, type IngestionTrigger, type SourceDefinition } from "./contracts.js";
import { enqueuePipeline, type QueueBundle } from "./queues.js";

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
