import type { ExtractionResult, IngestionRun, PageSnapshot, SourceDefinition } from "./contracts.js";
import { createRunId } from "./contracts.js";
import type { PipelineJobData } from "./queues.js";
import type { SourceAdapter } from "./contracts.js";
import { compareExtractionResults, scoreBenchmarkCase, type BenchmarkScorecard, type ExtractionComparison } from "./evaluation.js";
import { assessEvidenceQuality } from "./quality.js";
import { executeShadowPipeline, MemoryShadowRunStore } from "./execution.js";
import { AdapterRegistry } from "./registry.js";
import { destinationConfig } from "./destinations.js";

export interface SourceComparisonReport {
  version: string;
  runId: string;
  sourceId: string;
  sourceUrl: string;
  v2: { adapterId: string; snapshot: PageSnapshot; relatedSnapshots?: PageSnapshot[]; extraction: ExtractionResult };
  baseline: { adapterId: string; snapshot: PageSnapshot; extraction: ExtractionResult };
  comparison: ExtractionComparison;
  scorecard: BenchmarkScorecard;
  publicWrites: false;
}

function comparisonRun(source: SourceDefinition, job: PipelineJobData, now: Date): IngestionRun {
  return { id: job.runId || createRunId(source.id, now), sourceId: source.id, trigger: "shadow", mode: "shadow", status: "running", createdAt: now.toISOString() };
}

/** Run two adapters over one benchmark source and return a reviewable diff. */
export async function compareSourceAdapters(
  source: SourceDefinition,
  v2Adapter: SourceAdapter,
  baselineAdapter: SourceAdapter,
  job: PipelineJobData,
  now = new Date(),
): Promise<SourceComparisonReport> {
  if (job.mode !== "shadow") throw new Error("Source comparisons are shadow-only");
  if (!v2Adapter.canHandle(source)) throw new Error(`v2 adapter ${v2Adapter.id} cannot handle ${source.id}`);
  if (!baselineAdapter.canHandle(source)) throw new Error(`baseline adapter ${baselineAdapter.id} cannot handle ${source.id}`);
  const run = comparisonRun(source, job, now);
  const baselineSnapshot = await baselineAdapter.fetch({ run, source });
  const baselineExtraction = await baselineAdapter.extract({ run, source, snapshot: baselineSnapshot }, baselineSnapshot);
  const comparisonSource = baselineSnapshot.finalUrl !== source.url
    ? { ...source, adapterId: v2Adapter.id, url: baselineSnapshot.finalUrl, config: { ...source.config, destination: { ...destinationConfig(source), pageRole: "detail" as const } } }
    : { ...source, adapterId: v2Adapter.id };
  const v2Registry = new AdapterRegistry().register(v2Adapter);
  const v2Artifact = await executeShadowPipeline(v2Registry, comparisonSource, { ...job, sourceId: comparisonSource.id }, new MemoryShadowRunStore(), { logger: { info: () => undefined, warn: () => undefined } });
  const v2Snapshot = v2Artifact.snapshot;
  const v2Extraction = v2Artifact.extraction;
  const quality = v2Artifact.quality ?? assessEvidenceQuality(v2Snapshot, v2Extraction);
  return {
    version: "v2-shadow-0.1",
    runId: run.id,
    sourceId: source.id,
    sourceUrl: source.url,
    v2: { adapterId: v2Adapter.id, snapshot: v2Snapshot, relatedSnapshots: v2Artifact.relatedSnapshots, extraction: v2Extraction },
    baseline: { adapterId: baselineAdapter.id, snapshot: baselineSnapshot, extraction: baselineExtraction },
    comparison: compareExtractionResults(v2Extraction, baselineExtraction),
    scorecard: scoreBenchmarkCase(v2Snapshot, v2Extraction, baselineExtraction, quality, { destinationResolved: comparisonSource.url !== source.url || destinationConfig(comparisonSource).pageRole === "detail" }),
    publicWrites: false,
  };
}
