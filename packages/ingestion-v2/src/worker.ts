import { AdapterRegistry } from "./registry.js";
import { createBenchmarkSources, GenericHtmlAdapter } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { claimDueIngestionV2Schedules, createIngestionV2Pool, ensureIngestionV2Schema, PostgresShadowRunStore, syncIngestionV2Schedules } from "./persistence.js";
import { createSnapshotBodyStore } from "./snapshotStore.js";
import { createRenderClient } from "./render.js";
import { createPipelineWorker } from "./execution.js";
import { createQueueBundle, V2_QUEUE_PREFIX } from "./queues.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { adapterForSource, createWorkerSources } from "./catalog.js";
import { startRun } from "./runs.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
await ensureIngestionV2Schema(pool);
const queues = createQueueBundle();
const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
const registry = new AdapterRegistry().register(new GenericHtmlAdapter()).register(new DeepSeekHtmlAdapter()).register(new FeedAdapter()).register(new JsonApiAdapter());
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

const sourceById = new Map(workerSources.map((source) => [source.id, source]));
let scheduling = false;
async function scheduleDueSources(): Promise<void> {
  if (scheduling) return;
  scheduling = true;
  try {
    const dueIds = await claimDueIngestionV2Schedules(pool, 25);
    for (const sourceId of dueIds) {
      const source = sourceById.get(sourceId);
      if (source) await startRun(queues, source, { trigger: "scheduled", mode: process.env.MISSA_INGESTION_V2_PROMOTE_APPROVED === "1" ? "promote" : "shadow" });
    }
    if (dueIds.length) console.log(`[missa-ingestion-v2] scheduled ${dueIds.length} source runs`);
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

console.log(`missa-ingestion-v2 worker listening in shadow mode; adapter=${adapterId}; sources=${workerSources.length}; model-sources=${modelSourceCount}; queue=${V2_QUEUE_PREFIX}; bodies=${bodies.id}; render=${renderClient ? "on" : "off"}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`missa-ingestion-v2 received ${signal}; shutting down`);
  await worker.close();
  clearInterval(scheduleTimer);
  await queues.close();
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
