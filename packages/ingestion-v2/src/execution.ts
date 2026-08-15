import { Worker, type Job } from "bullmq";
import type { AdapterRegistry } from "./registry.js";
import type { AdapterContext, IngestionRun, PageSnapshot, ExtractionResult, SourceDefinition, IngestionFailureCode } from "./contracts.js";
import { classifyIngestionFailure, createRunId, type IngestionMode, type IngestionTrigger } from "./contracts.js";
import type { PipelineJobData, QueueBundle } from "./queues.js";
import { destinationConfig, isPotentialDestination } from "./destinations.js";
import { assessEvidenceQuality, type EvidenceQuality } from "./quality.js";
import { reviewForPublication, type PublisherReview } from "./publisher.js";
import { promoteApprovedArtifact } from "./canonicalWriter.js";
import { renderIfNeeded, type RenderClient } from "./render.js";
import type { Pool } from "pg";

export interface ShadowArtifact {
  run: IngestionRun;
  snapshot: PageSnapshot;
  relatedSnapshots?: PageSnapshot[];
  extraction: ExtractionResult;
  quality?: EvidenceQuality;
  publisher?: PublisherReview;
  published: false;
}

export interface ShadowRunStore {
  save(artifact: ShadowArtifact): Promise<void> | void;
  saveFailure?(run: IngestionRun, error: string, code?: IngestionFailureCode): Promise<void> | void;
  get(runId: string): Promise<ShadowArtifact | undefined> | ShadowArtifact | undefined;
}

export class MemoryShadowRunStore implements ShadowRunStore {
  private readonly artifacts = new Map<string, ShadowArtifact>();
  private readonly failures = new Map<string, { message: string; code: IngestionFailureCode }>();

  save(artifact: ShadowArtifact): void {
    this.artifacts.set(artifact.run.id, artifact);
  }

  get(runId: string): ShadowArtifact | undefined {
    return this.artifacts.get(runId);
  }

  saveFailure(run: IngestionRun, error: string, code = classifyIngestionFailure(error)): void {
    this.failures.set(run.id, { message: error, code });
  }

  failure(runId: string): string | undefined {
    return this.failures.get(runId)?.message;
  }

  failureCode(runId: string): IngestionFailureCode | undefined {
    return this.failures.get(runId)?.code;
  }

  values(): ShadowArtifact[] {
    return [...this.artifacts.values()];
  }
}

export interface PipelineExecutionOptions {
  now?: () => Date;
  logger?: Pick<Console, "info" | "warn">;
  promotionPool?: Pool;
  renderClient?: RenderClient;
}

/**
 * Fetch, then escalate to a rendered document only when the static response
 * cannot answer the question. Re-extraction runs against whichever document won.
 */
async function fetchAndExtract(
  adapter: { fetch: (context: AdapterContext) => Promise<PageSnapshot>; extract: (context: AdapterContext, snapshot: PageSnapshot) => Promise<ExtractionResult> },
  context: { run: IngestionRun; source: SourceDefinition },
  options: PipelineExecutionOptions,
): Promise<{ snapshot: PageSnapshot; extraction: ExtractionResult }> {
  const logger = options.logger ?? console;
  const staticSnapshot = await adapter.fetch(context);
  const staticExtraction = await adapter.extract({ ...context, snapshot: staticSnapshot }, staticSnapshot);
  const escalation = await renderIfNeeded(staticSnapshot, options.renderClient, staticExtraction.fields.length, logger);
  if (!escalation.rendered) return { snapshot: staticSnapshot, extraction: staticExtraction };
  logger.info(`[missa-ingestion-v2] rendered ${staticSnapshot.url}: ${escalation.reason}`);
  const rendered = await adapter.extract({ ...context, snapshot: escalation.snapshot }, escalation.snapshot);
  return { snapshot: escalation.snapshot, extraction: rendered };
}

function runFromJob(job: PipelineJobData, now: Date): IngestionRun {
  return { id: job.runId, sourceId: job.sourceId, trigger: job.trigger, mode: job.mode, status: "running", createdAt: now.toISOString() };
}

/**
 * Stage 1: fetch the source page, escalate to a render when needed, follow
 * classified destination links. Produces evidence with no decision made yet —
 * the artifact is saved with `quality` and `publisher` absent so a staged
 * deployment can hand it to the decide stage over the run id alone.
 */
export async function runFetchStage(
  registry: AdapterRegistry,
  source: SourceDefinition,
  job: PipelineJobData,
  store: ShadowRunStore,
  options: PipelineExecutionOptions = {},
): Promise<ShadowArtifact> {
  const now = options.now ?? (() => new Date());
  const logger = options.logger ?? console;
  const run = runFromJob(job, now());
  const adapter = registry.get(source.adapterId);
  if (!adapter.canHandle(source)) throw new Error(`Adapter ${source.adapterId} cannot handle source ${source.id}`);
  logger.info(`[missa-ingestion-v2] shadow run ${run.id} fetching ${source.url}`);
  try {
    const { snapshot, extraction: sourceExtraction } = await fetchAndExtract(adapter, { run, source }, options);
    const extraction: ExtractionResult = { fields: [...sourceExtraction.fields], candidateLinks: [...sourceExtraction.candidateLinks], warnings: [...sourceExtraction.warnings] };
    const relatedSnapshots: PageSnapshot[] = [];
    const detailLimit = Math.min(destinationConfig(source).detailLimit ?? 5, 5);
    const details = extraction.candidateLinks.filter((candidate) => isPotentialDestination(source, candidate)).slice(0, detailLimit);
    for (const candidate of details) {
      try {
      const destinationSource = { ...source, id: `${source.id}:destination:${candidate.url}`, url: candidate.url, config: { ...source.config, ...(candidate.request ? { request: candidate.request } : {}), destination: { ...destinationConfig(source), pageRole: "detail" as const } } };
        const { snapshot: destinationSnapshot, extraction: destinationExtraction } = await fetchAndExtract(adapter, { run, source: destinationSource }, options);
        relatedSnapshots.push(destinationSnapshot);
        extraction.fields.push(...destinationExtraction.fields);
        extraction.warnings.push(...destinationExtraction.warnings.map((warning) => `Destination ${candidate.url}: ${warning}`));
      } catch (error) {
        extraction.warnings.push(`Destination ${candidate.url} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (details.length) extraction.warnings.push(`Fetched ${relatedSnapshots.length} of ${details.length} classified detail destinations; destination evidence remains shadow-only`);
    const artifact: ShadowArtifact = { run: { ...run, status: "running" }, snapshot, relatedSnapshots, extraction, published: false };
    await store.save(artifact);
    return artifact;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await store.saveFailure?.({ ...run, status: "failed" }, message, classifyIngestionFailure(error));
    throw error;
  }
}

/**
 * Stage 2: assess evidence quality and run publisher reconciliation against
 * fetched evidence. This is the stage bounded by model spend rather than
 * network I/O, so it scales on a different axis from fetching.
 */
export async function runDecideStage(source: SourceDefinition, fetched: ShadowArtifact, store: ShadowRunStore): Promise<ShadowArtifact> {
  const publisher = await reviewForPublication({ source, sourceSnapshot: fetched.snapshot, sourceExtraction: fetched.extraction, relatedSnapshots: fetched.relatedSnapshots ?? [], relatedFields: fetched.extraction.fields });
  const artifact: ShadowArtifact = { ...fetched, run: { ...fetched.run, status: "completed" }, quality: assessEvidenceQuality(fetched.snapshot, fetched.extraction), publisher };
  await store.save(artifact);
  return artifact;
}

/** Stage 3: the canonical write. A thin name for `promoteApprovedArtifact` so the three stages read as one sequence. */
export async function runWriteStage(pool: Pool, source: SourceDefinition, artifact: ShadowArtifact): Promise<ReturnType<typeof promoteApprovedArtifact>> {
  return promoteApprovedArtifact(pool, source, artifact);
}

/**
 * Runs all three stages in one call. This is what the combined worker uses —
 * unchanged behaviour and unchanged callers — while a staged deployment runs
 * the same three functions from separate BullMQ workers instead.
 */
export async function executeShadowPipeline(
  registry: AdapterRegistry,
  source: SourceDefinition,
  job: PipelineJobData,
  store: ShadowRunStore,
  options: PipelineExecutionOptions = {},
): Promise<ShadowArtifact> {
  const fetched = await runFetchStage(registry, source, job, store, options);
  return runDecideStage(source, fetched, store);
}

export interface PipelineWorkerHandle {
  worker: Worker<PipelineJobData, ShadowArtifact>;
  close(): Promise<void>;
}

export function createPipelineWorker(
  queues: QueueBundle,
  registry: AdapterRegistry,
  sources: Iterable<SourceDefinition>,
  store: ShadowRunStore,
  options: PipelineExecutionOptions = {},
): PipelineWorkerHandle {
  const byId = new Map([...sources].map((source) => [source.id, source]));
  const worker = new Worker<PipelineJobData, ShadowArtifact>(
    "pipeline",
    async (job: Job<PipelineJobData>) => {
      const source = byId.get(job.data.sourceId);
      if (!source) throw new Error(`Unknown v2 source: ${job.data.sourceId}`);
      if (job.data.mode !== "shadow" && !options.promotionPool) throw new Error("v2 promotion requires a canonical database pool");
      const artifact = await executeShadowPipeline(registry, source, job.data, store, options);
      if (job.data.mode === "promote") await promoteApprovedArtifact(options.promotionPool!, source, artifact);
      return artifact;
    },
    { connection: queues.connection, prefix: "missa-ingestion-v2", concurrency: 1 },
  );
  return { worker, close: () => worker.close() };
}

export function shadowJob(source: SourceDefinition, options: { trigger?: IngestionTrigger; runId?: string } = {}): PipelineJobData {
  return { runId: options.runId ?? createRunId(source.id), sourceId: source.id, trigger: options.trigger ?? "shadow", mode: "shadow" as IngestionMode };
}
