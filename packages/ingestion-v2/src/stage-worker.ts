import { AdapterRegistry } from "./registry.js";
import { createBenchmarkSources, GenericHtmlAdapter } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { createIngestionV2Pool, ensureIngestionV2Schema, PostgresShadowRunStore } from "./persistence.js";
import { createSnapshotBodyStore } from "./snapshotStore.js";
import { createRenderClient } from "./render.js";
import { PostgresModelResponseCache } from "./modelCache.js";
import { createStageQueueBundle, type PipelineStage } from "./stages.js";
import { createFetchWorker, createDecideWorker, createWriteWorker, type StageWorkerHandle } from "./stageWorkers.js";
import type { ShadowArtifact } from "./execution.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { adapterForSource, createWorkerSources } from "./catalog.js";

/**
 * One process, one stage. Deployed as its own Railway service per stage —
 * v2-fetch, v2-resolve, v2-write — sharing this single binary the same way
 * radar-adapters shares one image across MISSA_WORKER_MODE.
 *
 * This does not claim from the schedule table. That table already has one
 * claimant — the combined ingestion-v2-worker — and a second scheduler
 * reading the same "due" rows would race it for the same sources rather than
 * adding capacity. Until the combined worker's scheduling is formally handed
 * over, the staged graph is driven by explicit enqueue (stage-run-cli.ts),
 * not by its own clock.
 */
const stage = process.env.MISSA_INGESTION_V2_STAGE as PipelineStage | undefined;
if (stage !== "fetch" && stage !== "decide" && stage !== "write") {
  throw new Error('MISSA_INGESTION_V2_STAGE must be "fetch", "decide", or "write"');
}

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
await ensureIngestionV2Schema(pool);
const bodies = createSnapshotBodyStore();
const store = new PostgresShadowRunStore(pool, bodies);

const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
const adapterId = useDeepSeek ? "deepseek-html-v2" : "generic-html-v2";
const workerSources = [
  ...createWorkerSources(adapterId),
  ...createBenchmarkSources(adapterId).map((source) => ({ ...source, adapterId: source.adapterId === "json-api-v2" ? source.adapterId : adapterForSource(source.kind, adapterId) })),
];

// BullMQ's Job<Data, Result> is contravariant in Result, so the three stage
// handles (ShadowArtifact, ShadowArtifact, void) don't unify into one variable
// without a cast. Only .on()/.close() are used past this point, both of which
// are safe under the widened type.
let handle: StageWorkerHandle<ShadowArtifact | void>;
let closeQueues: Array<() => Promise<void>> = [];

if (stage === "fetch") {
  const fetchQueue = createStageQueueBundle("fetch");
  const decideQueue = createStageQueueBundle("decide");
  closeQueues = [() => fetchQueue.close(), () => decideQueue.close()];
  const modelCache = new PostgresModelResponseCache(pool);
  const registry = new AdapterRegistry().register(new GenericHtmlAdapter()).register(new DeepSeekHtmlAdapter({ cache: modelCache })).register(new FeedAdapter()).register(new JsonApiAdapter());
  const renderClient = createRenderClient();
  handle = createFetchWorker(fetchQueue, decideQueue, registry, workerSources, store, { promotionPool: pool, ...(renderClient ? { renderClient } : {}) }) as StageWorkerHandle<ShadowArtifact | void>;
  console.log(`[missa-ingestion-v2:fetch] listening; sources=${workerSources.length}; render=${renderClient ? "on" : "off"}; model-cache=${modelCache.id}`);
} else if (stage === "decide") {
  const decideQueue = createStageQueueBundle("decide");
  const writeQueue = createStageQueueBundle("write");
  closeQueues = [() => decideQueue.close(), () => writeQueue.close()];
  handle = createDecideWorker(decideQueue, writeQueue, workerSources, store) as StageWorkerHandle<ShadowArtifact | void>;
  console.log(`[missa-ingestion-v2:decide] listening; sources=${workerSources.length}`);
} else {
  const writeQueue = createStageQueueBundle("write");
  closeQueues = [() => writeQueue.close()];
  handle = createWriteWorker(writeQueue, workerSources, store, pool) as StageWorkerHandle<ShadowArtifact | void>;
  console.log(`[missa-ingestion-v2:write] listening; sources=${workerSources.length}`);
}

handle.worker.on("error", (error) => console.error(`[missa-ingestion-v2:${stage}] worker error`, error));
handle.worker.on("failed", (job, error) => console.error(`[missa-ingestion-v2:${stage}] job ${job?.id} failed`, error));
handle.worker.on("completed", (job) => console.log(`[missa-ingestion-v2:${stage}] job ${job.id} completed`));

async function shutdown(signal: string): Promise<void> {
  console.log(`[missa-ingestion-v2:${stage}] received ${signal}; shutting down`);
  await handle.close();
  for (const close of closeQueues) await close();
  await pool.end();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
