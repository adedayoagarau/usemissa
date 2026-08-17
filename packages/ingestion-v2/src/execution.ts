import { Worker, type Job } from "bullmq";
import type { AdapterRegistry } from "./registry.js";
import type { IngestionRun, PageSnapshot, ExtractionResult, SourceDefinition, IngestionFailureCode } from "./contracts.js";
import { classifyIngestionFailure, createRunId, INGESTION_V2_VERSION, type IngestionMode, type IngestionTrigger } from "./contracts.js";
import type { PipelineJobData, QueueBundle } from "./queues.js";
import { destinationConfig, isPotentialDestination } from "./destinations.js";
import { assessEvidenceQuality, type EvidenceQuality } from "./quality.js";
import { reviewForPublication, type CandidatePublisherReview, type PublisherReview } from "./publisher.js";
import { promoteApprovedArtifact } from "./canonicalWriter.js";
import type { Pool } from "pg";

export const UNCHANGED_ROOT_WARNING = "Source root unchanged; extraction and child destination fetches skipped";

export interface ShadowArtifact {
  run: IngestionRun;
  snapshot: PageSnapshot;
  relatedSnapshots?: PageSnapshot[];
  extraction: ExtractionResult;
  quality?: EvidenceQuality;
  publisher?: PublisherReview;
  unchanged?: boolean;
  published: false;
}

export interface ShadowRunStore {
  save(artifact: ShadowArtifact): Promise<void> | void;
  saveFailure?(run: IngestionRun, error: string, code?: IngestionFailureCode): Promise<void> | void;
  latestRootContentHash?(sourceId: string, processingVersion?: string): Promise<string | undefined> | string | undefined;
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

  latestRootContentHash(sourceId: string, processingVersion = INGESTION_V2_VERSION): string | undefined {
    return [...this.artifacts.values()]
      .filter((artifact) => artifact.run.sourceId === sourceId && artifact.run.status === "completed" && artifact.publisher?.pipelineVersion === processingVersion)
      .sort((left, right) => right.run.createdAt.localeCompare(left.run.createdAt))[0]?.snapshot.contentHash;
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
  forceReprocess?: boolean;
}

function runFromJob(job: PipelineJobData, now: Date): IngestionRun {
  return { id: job.runId, sourceId: job.sourceId, trigger: job.trigger, mode: job.mode, status: "running", createdAt: now.toISOString() };
}

function sameHost(left: string, right: string): boolean {
  try {
    return new URL(left).hostname.replace(/^www\./, "") === new URL(right).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
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
    const previousContentHash = await store.latestRootContentHash?.(source.id, INGESTION_V2_VERSION);
    if (!options.forceReprocess && previousContentHash && previousContentHash === snapshot.contentHash) {
      const extraction: ExtractionResult = { fields: [], candidateLinks: [], warnings: [UNCHANGED_ROOT_WARNING] };
      const artifact: ShadowArtifact = { run: { ...run, status: "completed" }, snapshot, relatedSnapshots: [], extraction, quality: assessEvidenceQuality(snapshot, extraction), unchanged: true, published: false };
      await store.save(artifact);
      logger.info(`[missa-ingestion-v2] shadow run ${run.id} unchanged; skipped child fetches`);
      return artifact;
    }
    const sourceExtraction = await adapter.extract({ run, source, snapshot }, snapshot);
    const extraction: ExtractionResult = { fields: [...sourceExtraction.fields], candidateLinks: [...sourceExtraction.candidateLinks], warnings: [...sourceExtraction.warnings] };
    const relatedSnapshots: PageSnapshot[] = [];
    const candidateReviews: CandidatePublisherReview[] = [];
    const destination = destinationConfig(source);
    const detailLimit = Math.min(destination.detailLimit ?? 5, 5);
    const scanLimit = Math.min(Math.max(destination.scanLimit ?? detailLimit, detailLimit), 15);
    const details = extraction.candidateLinks.filter((candidate) => isPotentialDestination(source, candidate)).slice(0, scanLimit);
    const candidateTarget = Math.min(detailLimit, details.length);
    let attemptedDetails = 0;
    let failedDetails = 0;
    for (const candidate of details) {
      if (candidateReviews.length >= candidateTarget) break;
      attemptedDetails += 1;
      try {
        const destinationSource = {
          ...source,
          id: `${source.id}:destination:${candidate.stableId ?? candidate.url}`,
          url: candidate.url,
          config: {
            ...source.config,
            ...(candidate.request ? { request: candidate.request } : {}),
            ...(candidate.canonicalUrl ? { canonicalUrl: candidate.canonicalUrl } : {}),
            destination: { ...destinationConfig(source), pageRole: "detail" as const },
          },
        };
        const destinationSnapshot = await adapter.fetch({ run, source: destinationSource });
        const destinationExtraction = await adapter.extract({ run, source: destinationSource, snapshot: destinationSnapshot }, destinationSnapshot);
        relatedSnapshots.push(destinationSnapshot);
        extraction.fields.push(...destinationExtraction.fields);
        extraction.warnings.push(...destinationExtraction.warnings.map((warning) => `Destination ${candidate.url}: ${warning}`));
        const scopedSourceFields = sourceExtraction.fields.filter((field) =>
          candidate.stableId
            ? field.provenance.recordId === candidate.stableId
            : field.provenance.sourceUrl === candidate.url || field.provenance.sourceUrl === candidate.canonicalUrl
        );
        const firstPartyHop = destinationConfig(source).firstPartyHop;
        if (firstPartyHop && sameHost(source.url, candidate.url)) {
          const firstPartyCandidate = destinationExtraction.candidateLinks.find((outbound) => !sameHost(destinationSnapshot.finalUrl, outbound.url));
          if (!firstPartyCandidate) {
            extraction.warnings.push(`Destination ${candidate.url} failed: no first-party organizer destination was classified`);
            failedDetails += 1;
            continue;
          }
          const firstPartySource = {
            ...destinationSource,
            id: `${destinationSource.id}:first-party:${firstPartyCandidate.url}`,
            url: firstPartyCandidate.url,
            config: {
              ...destinationSource.config,
              destination: { ...destinationConfig(source), pageRole: "detail" as const, firstPartyHop: undefined },
            },
          };
          const firstPartySnapshot = await adapter.fetch({ run, source: firstPartySource });
          const firstPartyExtraction = await adapter.extract({ run, source: firstPartySource, snapshot: firstPartySnapshot }, firstPartySnapshot);
          relatedSnapshots.push(firstPartySnapshot);
          extraction.fields.push(...firstPartyExtraction.fields);
          extraction.warnings.push(...firstPartyExtraction.warnings.map((warning) => `First-party destination ${firstPartyCandidate.url}: ${warning}`));
          const candidateExtraction: ExtractionResult = {
            fields: [...scopedSourceFields, ...destinationExtraction.fields, ...firstPartyExtraction.fields],
            candidateLinks: [firstPartyCandidate],
            warnings: [...destinationExtraction.warnings, ...firstPartyExtraction.warnings],
          };
          const review = await reviewForPublication({
            source,
            sourceSnapshot: destinationSnapshot,
            sourceExtraction: { fields: destinationExtraction.fields, candidateLinks: [firstPartyCandidate], warnings: destinationExtraction.warnings },
            relatedSnapshots: [firstPartySnapshot],
            relatedFields: firstPartyExtraction.fields,
            candidate: firstPartyCandidate,
            candidateSnapshot: firstPartySnapshot,
          });
          candidateReviews.push({
            candidate: firstPartyCandidate,
            snapshotId: firstPartySnapshot.id,
            extraction: candidateExtraction,
            quality: assessEvidenceQuality(firstPartySnapshot, candidateExtraction),
            review,
          });
          continue;
        }
        const candidateExtraction: ExtractionResult = {
          fields: [...scopedSourceFields, ...destinationExtraction.fields],
          candidateLinks: [candidate],
          warnings: [...destinationExtraction.warnings],
        };
        const review = await reviewForPublication({
          source,
          sourceSnapshot: snapshot,
          sourceExtraction: { fields: scopedSourceFields, candidateLinks: [candidate], warnings: [] },
          relatedSnapshots: [destinationSnapshot],
          relatedFields: destinationExtraction.fields,
          candidate,
          candidateSnapshot: destinationSnapshot,
        });
        candidateReviews.push({
          candidate,
          snapshotId: destinationSnapshot.id,
          extraction: candidateExtraction,
          quality: assessEvidenceQuality(destinationSnapshot, candidateExtraction),
          review,
        });
      } catch (error) {
        failedDetails += 1;
        extraction.warnings.push(`Destination ${candidate.url} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const candidateCoverage = { target: candidateTarget, attempted: attemptedDetails, completed: candidateReviews.length, failed: failedDetails };
    if (details.length) extraction.warnings.push(`Completed ${candidateCoverage.completed} of ${candidateCoverage.target} bounded candidate chains after ${candidateCoverage.attempted} attempts; destination evidence remains shadow-only`);
    const publisher: PublisherReview = candidateReviews.length > 1
      ? {
          ...candidateReviews[0]!.review,
          decision: "review",
          model: "deterministic",
          rationale: [
            `This source produced ${candidateReviews.length} distinct opportunity candidates; only candidate-scoped verdicts may enter canonical review.`,
          ],
          candidateReviews,
          candidateCoverage,
        }
      : candidateReviews.length === 1
        ? { ...candidateReviews[0]!.review, candidateReviews, candidateCoverage }
        : { ...await reviewForPublication({ source, sourceSnapshot: snapshot, sourceExtraction, relatedSnapshots, relatedFields: extraction.fields }), candidateCoverage };
    const artifact: ShadowArtifact = { run: { ...run, status: "completed" }, snapshot, relatedSnapshots, extraction, quality: assessEvidenceQuality(snapshot, extraction), publisher, published: false };
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
      if (job.data.mode !== "shadow" && !options.promotionPool) throw new Error("v2 promotion requires a canonical database pool");
      const artifact = await executeShadowPipeline(registry, source, job.data, store, options);
      if (job.data.mode === "promote" && !artifact.unchanged) await promoteApprovedArtifact(options.promotionPool!, source, artifact);
      return artifact;
    },
    { connection: queues.connection, prefix: "missa-ingestion-v2", concurrency: 1 },
  );
  return { worker, close: () => worker.close() };
}

export function shadowJob(source: SourceDefinition, options: { trigger?: IngestionTrigger; runId?: string; mode?: IngestionMode } = {}): PipelineJobData {
  return { runId: options.runId ?? createRunId(source.id), sourceId: source.id, trigger: options.trigger ?? "shadow", mode: options.mode ?? "shadow" };
}
