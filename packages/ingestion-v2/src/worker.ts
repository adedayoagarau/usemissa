import { AdapterRegistry } from "./registry.js";
import { createBenchmarkSources, GenericHtmlAdapter } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { createIngestionV2Pool, ensureIngestionV2Schema, PostgresShadowRunStore } from "./persistence.js";
import { createPipelineWorker } from "./execution.js";
import { createQueueBundle, V2_QUEUE_PREFIX } from "./queues.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { createWorkerSources } from "./catalog.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
await ensureIngestionV2Schema(pool);
const queues = createQueueBundle();
const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
const registry = new AdapterRegistry().register(new GenericHtmlAdapter()).register(new DeepSeekHtmlAdapter()).register(new FeedAdapter()).register(new JsonApiAdapter());
const store = new PostgresShadowRunStore(pool);
const adapterId = useDeepSeek ? "deepseek-html-v2" : "generic-html-v2";
const workerSources = [...createWorkerSources(adapterId), ...createBenchmarkSources(adapterId)];
const worker = createPipelineWorker(queues, registry, workerSources, store);

worker.worker.on("error", (error) => console.error("[missa-ingestion-v2] worker error", error));
queues.events.on("error", (error) => console.error("[missa-ingestion-v2] queue events error", error));
queues.connection.on("error", (error) => console.error("[missa-ingestion-v2] redis connection error", error));
queues.events.on("completed", ({ jobId }) => console.log(`[missa-ingestion-v2] shadow run ${jobId} completed`));
queues.events.on("failed", ({ jobId, failedReason }) => console.error(`[missa-ingestion-v2] shadow run ${jobId} failed: ${failedReason}`));

console.log(`missa-ingestion-v2 worker listening in shadow mode; adapter=${adapterId}; sources=${workerSources.length}; queue=${V2_QUEUE_PREFIX}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`missa-ingestion-v2 received ${signal}; shutting down`);
  await worker.close();
  await queues.close();
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
