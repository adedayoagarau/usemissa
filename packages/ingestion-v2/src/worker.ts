import { AdapterRegistry } from "./registry.js";
import { createBenchmarkSources, GenericHtmlAdapter } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { claimDueIngestionV2Schedules, createIngestionV2Pool, ensureIngestionV2Schema, PostgresShadowRunStore, syncIngestionV2Schedules } from "./persistence.js";
import { createSnapshotBodyStore } from "./snapshotStore.js";
import { createRenderClient } from "./render.js";
import { PostgresModelResponseCache } from "./modelCache.js";
import { createPipelineWorker } from "./execution.js";
import { createQueueBundle, V2_QUEUE_PREFIX } from "./queues.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { adapterForSource, createWorkerSources } from "./catalog.js";
import { startRun, startStagedRun } from "./runs.js";
import { createStageQueueBundle } from "./stages.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
await ensureIngestionV2Schema(pool);
const queues = createQueueBundle();
const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
const modelCache = new PostgresModelResponseCache(pool);
const registry = new AdapterRegistry().register(new GenericHtmlAdapter()).register(new DeepSeekHtmlAdapter({ cache: modelCache })).register(new FeedAdapter()).register(new JsonApiAdapter());
const bodies = createSnapshotBodyStore();
const store = new PostgresShadowRunStore(pool, bodies);
const adapterId = useDeepSeek ? "deepseek-html-v2" : "generic-html-v2";
const workerSources = [
  ...createWorkerSources(adapterId),
  ...createBenchmarkSources(adapterId).map((source) => ({ ...source, adapterId: source.adapterId === "json-api-v2" ? source.adapterId : adapterForSource(source.kind, adapterId) })),
];
const modelSourceCount = workerSources.filter((source) => source.adapterId === "deepseek-html-v2").length;
await syncIngestionV2Schedules(pool, workerSources);
const renderClient = createRenderClient();
const worker = createPipelineWorker(queues, registry, workerSources, store, { promotionPool: pool, ...(renderClient ? { renderClient } : {}) });

/**
 * Where scheduled work goes is an explicit, reversible choice, not an
 * automatic one: this table has exactly one claimant at a time. Setting
 * MISSA_INGESTION_V2_SCHEDULER_TARGET=staged hands newly-due sources to
 * v2-fetch/v2-decide/v2-write instead of this worker's own combined
 * pipeline. It does not stop this worker from consuming the combined
 * "pipeline" queue — the admin API's manual/on-demand runs enqueue there
 * directly, independent of this scheduler, and must keep working either way.
 */
const schedulerTarget = process.env.MISSA_INGESTION_V2_SCHEDULER_TARGET === "staged" ? "staged" : "combined";
const fetchStageQueue = schedulerTarget === "staged" ? createStageQueueBundle("fetch") : undefined;

const sourceById = new Map(workerSources.map((source) => [source.id, source]));
let scheduling = false;
async function scheduleDueSources(): Promise<void> {
  if (scheduling) return;
  scheduling = true;
  try {
    const dueIds = await claimDueIngestionV2Schedules(pool, 25);
    const mode = process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED === "1" ? "promote" : "shadow";
    for (const sourceId of dueIds) {
      const source = sourceById.get(sourceId);
      if (!source) continue;
      if (fetchStageQueue) await startStagedRun(fetchStageQueue, source, { trigger: "scheduled", mode });
      else await startRun(queues, source, { trigger: "scheduled", mode });
    }
    if (dueIds.length) console.log(`[missa-ingestion-v2] scheduled ${dueIds.length} source runs to ${schedulerTarget}; model cache ${JSON.stringify(modelCache.stats())}`);
  } finally {
    scheduling = false;
  }
}
await scheduleDueSources();
const scheduleTimer = setInterval(() => void scheduleDueSources().catch((error) => console.error("[missa-ingestion-v2] scheduler error", error)), 5 * 60 * 1000);

worker.worker.on("error", (error) => console.error("[missa-ingestion-v2] worker error", error));
queues.events.on("error", (error) => console.error("[missa-ingestion-v2] queue events error", error));
queues.connection.on("error", (error) => console.error("[missa-ingestion-v2] redis connection error", error));
queues.events.on("completed", ({ jobId }) => console.log(`[missa-ingestion-v2] shadow run ${jobId} completed`));
queues.events.on("failed", ({ jobId, failedReason }) => console.error(`[missa-ingestion-v2] shadow run ${jobId} failed: ${failedReason}`));

console.log(`missa-ingestion-v2 worker listening in shadow mode; adapter=${adapterId}; sources=${workerSources.length}; model-sources=${modelSourceCount}; queue=${V2_QUEUE_PREFIX}; bodies=${bodies.id}; render=${renderClient ? "on" : "off"}; model-cache=${modelCache.id}; scheduler-target=${schedulerTarget}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`missa-ingestion-v2 received ${signal}; shutting down`);
  await worker.close();
  clearInterval(scheduleTimer);
  await queues.close();
  if (fetchStageQueue) await fetchStageQueue.close();
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
