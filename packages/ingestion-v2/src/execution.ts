import { Worker, type Job } from "bullmq";
import type { AdapterRegistry } from "./registry.js";
import type { IngestionRun, PageSnapshot, ExtractionResult, SourceDefinition, IngestionFailureCode } from "./contracts.js";
import { classifyIngestionFailure, createRunId, type IngestionMode, type IngestionTrigger } from "./contracts.js";
import type { PipelineJobData, QueueBundle } from "./queues.js";
import { destinationConfig } from "./destinations.js";
import { assessEvidenceQuality, type EvidenceQuality } from "./quality.js";

export interface ShadowArtifact {
  run: IngestionRun;
  snapshot: PageSnapshot;
  relatedSnapshots?: PageSnapshot[];
  extraction: ExtractionResult;
  quality?: EvidenceQuality;
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
}

function runFromJob(job: PipelineJobData, now: Date): IngestionRun {
  return { id: job.runId, sourceId: job.sourceId, trigger: job.trigger, mode: job.mode, status: "running", createdAt: now.toISOString() };
}

/** Execute v2's first shadow slice without touching Gary/Radar public records. */
export async function executeShadowPipeline(
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
    const snapshot = await adapter.fetch({ run, source });
    const extraction = await adapter.extract({ run, source, snapshot }, snapshot);
    const relatedSnapshots: PageSnapshot[] = [];
    const detailLimit = Math.min(destinationConfig(source).detailLimit ?? 5, 5);
    const details = extraction.candidateLinks.filter((candidate) => candidate.role === "detail").slice(0, detailLimit);
    for (const candidate of details) {
      try {
      const destinationSource = { ...source, id: `${source.id}:destination:${candidate.url}`, url: candidate.url, config: { ...source.config, ...(candidate.request ? { request: candidate.request } : {}), destination: { ...destinationConfig(source), pageRole: "detail" as const } } };
        const destinationSnapshot = await adapter.fetch({ run, source: destinationSource });
        const destinationExtraction = await adapter.extract({ run, source: destinationSource, snapshot: destinationSnapshot }, destinationSnapshot);
        relatedSnapshots.push(destinationSnapshot);
        extraction.fields.push(...destinationExtraction.fields);
        extraction.warnings.push(...destinationExtraction.warnings.map((warning) => `Destination ${candidate.url}: ${warning}`));
      } catch (error) {
        extraction.warnings.push(`Destination ${candidate.url} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (details.length) extraction.warnings.push(`Fetched ${relatedSnapshots.length} of ${details.length} classified detail destinations; destination evidence remains shadow-only`);
    const artifact: ShadowArtifact = { run: { ...run, status: "completed" }, snapshot, relatedSnapshots, extraction, quality: assessEvidenceQuality(snapshot, extraction), published: false };
    await store.save(artifact);
    return artifact;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await store.saveFailure?.({ ...run, status: "failed" }, message, classifyIngestionFailure(error));
    throw error;
  }
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
      if (job.data.mode !== "shadow") throw new Error("v2 currently supports shadow mode only; promotion is intentionally not implemented");
      return executeShadowPipeline(registry, source, job.data, store, options);
    },
    { connection: queues.connection, prefix: "missa-ingestion-v2", concurrency: 1 },
  );
  return { worker, close: () => worker.close() };
}

export function shadowJob(source: SourceDefinition, options: { trigger?: IngestionTrigger; runId?: string } = {}): PipelineJobData {
  return { runId: options.runId ?? createRunId(source.id), sourceId: source.id, trigger: options.trigger ?? "shadow", mode: "shadow" as IngestionMode };
}
