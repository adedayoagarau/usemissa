import { GenericHtmlAdapter } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { createFirstTrancheSources } from "./catalog.js";
import {
  assertIngestionV2SchemaReady,
  claimDueIngestionV2Schedules,
  createIngestionV2Pool,
  PostgresShadowRunStore,
  readRecentCandidateArtifacts,
  readIngestionV2SourceRefreshHistory,
  rescheduleIngestionV2Source,
  syncIngestionV2Schedules,
} from "./persistence.js";
import {
  runDuePostgresShadowBatch,
  type ScheduledSourceStore,
} from "./postgresRunner.js";
import { AdapterRegistry } from "./registry.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { evaluateCandidateReplayGate } from "./candidateGate.js";
import { handoffApprovedCandidate } from "./canonicalWriter.js";

assertIngestionV2DatabaseRole(undefined, {
  productionPromotionApproved: false,
});
const pool = createIngestionV2Pool();
await assertIngestionV2SchemaReady(pool);

const useDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
const adapterId = useDeepSeek ? "deepseek-html-v2" : "generic-html-v2";
const registry = new AdapterRegistry()
  .register(new GenericHtmlAdapter())
  .register(new DeepSeekHtmlAdapter())
  .register(new FeedAdapter())
  .register(new JsonApiAdapter());
const sources = createFirstTrancheSources(adapterId);
const runStore = new PostgresShadowRunStore(pool);

const configuredReviewIds = new Set(
  (process.env.MISSA_INGESTION_V2_REVIEW_SOURCE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const reviewApproved = process.env.MISSA_INGESTION_V2_REVIEW_APPROVED === "1";
if (configuredReviewIds.size && !reviewApproved) {
  throw new Error("Ingestion v2 review sources require MISSA_INGESTION_V2_REVIEW_APPROVED=1");
}
const reviewSourceIds = new Set(
  sources
    .filter((source) => {
      const manifestId = (source.config.sourceManifest as { id?: string } | undefined)?.id;
      return reviewApproved && (configuredReviewIds.has(source.id) || Boolean(manifestId && configuredReviewIds.has(manifestId)));
    })
    .map((source) => source.id),
);

await syncIngestionV2Schedules(pool, sources);

const scheduleStore: ScheduledSourceStore = {
  claimDue: (limit) =>
    claimDueIngestionV2Schedules(
      pool,
      limit,
      sources.map((source) => source.id),
    ),
  readRefreshHistory: (sourceId) =>
    readIngestionV2SourceRefreshHistory(pool, sourceId),
  reschedule: (sourceId, cadenceHours) =>
    rescheduleIngestionV2Source(pool, sourceId, cadenceHours),
};

const batchLimit = Math.min(
  Math.max(Number(process.env.MISSA_INGESTION_V2_BATCH_LIMIT ?? 5) || 5, 1),
  10,
);
let running = false;

async function runDueBatch(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runDuePostgresShadowBatch({
      registry,
      sources,
      runStore,
      scheduleStore,
      limit: batchLimit,
      reviewSourceIds,
      afterArtifact: async (source, artifact) => {
        if (!reviewSourceIds.has(source.id) || artifact.unchanged) return;
        const history = await readRecentCandidateArtifacts(pool, source.id, 2);
        const gate = evaluateCandidateReplayGate(history, [source.id], 2);
        const sourceGate = gate.sources[0];
        if (!sourceGate?.eligible) {
          console.log(`[missa-ingestion-v2] review gate closed source=${source.id} reasons=${JSON.stringify(sourceGate?.reasons ?? ["missing replay evidence"])}`);
          return;
        }
        const latest = history.at(-1);
        if (!latest?.publisher?.candidateReviews?.length) return;
        const canonicalHandoffs = [];
        for (const candidate of latest.publisher.candidateReviews) {
          const handoff = await handoffApprovedCandidate(pool, source, latest, candidate);
          canonicalHandoffs.push({
            candidateKey: candidate.candidate.stableId ?? candidate.candidate.canonicalUrl ?? candidate.candidate.url,
            ...handoff,
          });
        }
        latest.publisher.canonicalHandoffs = canonicalHandoffs;
        await runStore.save(latest);
        console.log(`[missa-ingestion-v2] review handoff source=${source.id} results=${JSON.stringify(canonicalHandoffs)}`);
      },
    });
    if (result.claimed)
      console.log(
        `[missa-ingestion-v2] postgres batch claimed=${result.claimed} completed=${result.completed} unchanged=${result.unchanged} failed=${result.failed} skipped=${result.skipped}`,
      );
  } finally {
    running = false;
  }
}

await runDueBatch();
const scheduleTimer = setInterval(
  () =>
    void runDueBatch().catch((error) =>
      console.error("[missa-ingestion-v2] postgres scheduler error", error),
    ),
  5 * 60 * 1000,
);

console.log(
  `missa-ingestion-v2 postgres worker listening; adapter=${adapterId}; sourceSet=first-tranche; sources=${sources.length}; reviewSources=${reviewSourceIds.size}; batchLimit=${batchLimit}`,
);

async function shutdown(signal: string): Promise<void> {
  console.log(`missa-ingestion-v2 received ${signal}; shutting down`);
  clearInterval(scheduleTimer);
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
