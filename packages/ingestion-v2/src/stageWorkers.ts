import { Worker, type Job } from "bullmq";
import type { Pool } from "pg";
import type { AdapterRegistry } from "./registry.js";
import type { SourceDefinition } from "./contracts.js";
import { runFetchStage, runDecideStage, runWriteStage, type PipelineExecutionOptions, type ShadowArtifact, type ShadowRunStore } from "./execution.js";
import { enqueueStage, type StageJobData, type StageQueueBundle } from "./stages.js";

export interface StageWorkerHandle<TResult = ShadowArtifact | void> {
  worker: Worker<StageJobData, TResult>;
  close(): Promise<void>;
}

function sourceLookup(sources: Iterable<SourceDefinition>): (id: string) => SourceDefinition {
  const byId = new Map([...sources].map((source) => [source.id, source]));
  return (id: string) => {
    const source = byId.get(id);
    if (!source) throw new Error(`Unknown v2 source: ${id}`);
    return source;
  };
}

/** Runs the fetch stage, then hands the run id to the decide queue. Fetching never decides. */
export function createFetchWorker(
  fetchQueue: StageQueueBundle,
  decideQueue: StageQueueBundle,
  registry: AdapterRegistry,
  sources: Iterable<SourceDefinition>,
  store: ShadowRunStore,
  options: PipelineExecutionOptions = {},
): StageWorkerHandle<ShadowArtifact> {
  const lookup = sourceLookup(sources);
  const worker = new Worker<StageJobData, ShadowArtifact>(
    "fetch",
    async (job: Job<StageJobData>) => {
      const source = lookup(job.data.sourceId);
      const artifact = await runFetchStage(registry, source, job.data, store, options);
      await enqueueStage(decideQueue, job.data);
      return artifact;
    },
    { connection: fetchQueue.connection, prefix: "missa-ingestion-v2", concurrency: Number(process.env.RENDER_CONCURRENCY ?? 8) },
  );
  return { worker, close: () => worker.close() };
}

/**
 * Runs the decide stage, then — only for a promote-mode run whose publisher
 * approved — hands off to the write queue. Everything else stops here: a
 * shadow run has nothing further to do, and a rejected or ambiguous decision
 * must not reach a canonical write.
 */
export function createDecideWorker(
  decideQueue: StageQueueBundle,
  writeQueue: StageQueueBundle,
  sources: Iterable<SourceDefinition>,
  store: ShadowRunStore,
): StageWorkerHandle<ShadowArtifact> {
  const lookup = sourceLookup(sources);
  const worker = new Worker<StageJobData, ShadowArtifact>(
    "decide",
    async (job: Job<StageJobData>) => {
      const source = lookup(job.data.sourceId);
      const fetched = await store.get(job.data.runId);
      if (!fetched) throw new Error(`No fetched evidence found for run ${job.data.runId}; the fetch stage may not have completed`);
      const artifact = await runDecideStage(source, fetched, store);
      if (job.data.mode === "promote" && artifact.publisher?.decision === "approve") await enqueueStage(writeQueue, job.data);
      return artifact;
    },
    { connection: decideQueue.connection, prefix: "missa-ingestion-v2", concurrency: Number(process.env.RESOLVE_CONCURRENCY ?? 4) },
  );
  return { worker, close: () => worker.close() };
}

/** Runs the canonical write. The last stage; nothing enqueues after it. */
export function createWriteWorker(writeQueue: StageQueueBundle, sources: Iterable<SourceDefinition>, store: ShadowRunStore, pool: Pool): StageWorkerHandle<void> {
  const lookup = sourceLookup(sources);
  const worker = new Worker<StageJobData, void>(
    "write",
    async (job: Job<StageJobData>) => {
      const source = lookup(job.data.sourceId);
      const artifact = await store.get(job.data.runId);
      if (!artifact) throw new Error(`No decided artifact found for run ${job.data.runId}; the decide stage may not have completed`);
      await runWriteStage(pool, source, artifact);
    },
    { connection: writeQueue.connection, prefix: "missa-ingestion-v2", concurrency: Number(process.env.WRITE_CONCURRENCY ?? 2) },
  );
  return { worker, close: () => worker.close() };
}
