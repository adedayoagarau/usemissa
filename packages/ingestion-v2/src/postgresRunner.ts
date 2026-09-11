import type { AdapterRegistry } from "./registry.js";
import type { SourceDefinition } from "./contracts.js";
import {
  executeShadowPipeline,
  shadowJob,
  type ShadowRunStore,
} from "./execution.js";
import { adaptiveCadenceHours } from "./scheduling.js";
import type { SourceRefreshPolicy } from "./sourceManifest.js";
import type { IngestionV2SourceRefreshHistory } from "./persistence.js";

export interface ScheduledSourceStore {
  claimDue(limit: number): Promise<string[]>;
  readRefreshHistory(
    sourceId: string,
  ): Promise<IngestionV2SourceRefreshHistory>;
  reschedule(sourceId: string, cadenceHours: number): Promise<void>;
}

export interface PostgresShadowBatchResult {
  claimed: number;
  completed: number;
  unchanged: number;
  failed: number;
  skipped: number;
  runs: Array<{
    sourceId: string;
    runId?: string;
    status: "completed" | "failed" | "skipped";
    nextCadenceHours: number;
    error?: string;
  }>;
}

export interface PostgresShadowBatchOptions {
  registry: AdapterRegistry;
  sources: Iterable<SourceDefinition>;
  runStore: ShadowRunStore;
  scheduleStore: ScheduledSourceStore;
  limit?: number;
  now?: () => Date;
  logger?: Pick<Console, "info" | "warn">;
  reviewSourceIds?: ReadonlySet<string>;
  afterArtifact?: (source: SourceDefinition, artifact: Awaited<ReturnType<typeof executeShadowPipeline>>) => Promise<void>;
}

function refreshPolicy(source: SourceDefinition): SourceRefreshPolicy {
  const configured = (
    source.config.sourceManifest as
      { refresh?: Partial<SourceRefreshPolicy> } | undefined
  )?.refresh;
  const baseCadenceHours = Math.max(1, source.schedule.cadenceHours);
  return {
    baseCadenceHours,
    minimumCadenceHours: Math.min(6, baseCadenceHours),
    maximumCadenceHours: Math.max(168, baseCadenceHours),
    nearDeadlineCadenceHours: Math.min(24, baseCadenceHours),
    finalDeadlineCadenceHours: Math.min(6, baseCadenceHours),
    unchangedBackoffAfterRuns: 7,
    failureCooldownAfterRuns: 3,
    ...configured,
  };
}

function hoursUntilNearestDeadline(
  fields: Awaited<
    ReturnType<typeof executeShadowPipeline>
  >["extraction"]["fields"],
  now: Date,
): number | undefined {
  const futureDeadlines = fields
    .filter((field) => field.fieldName === "deadline")
    .map((field) =>
      typeof field.normalizedValue === "string"
        ? field.normalizedValue
        : field.rawValue,
    )
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value) && value >= now.getTime())
    .sort((left, right) => left - right);
  const nearest = futureDeadlines[0];
  return nearest === undefined
    ? undefined
    : (nearest - now.getTime()) / (60 * 60 * 1000);
}

/**
 * Claims due Postgres schedules and executes them directly in shadow mode.
 * It deliberately has no queue or publication mode.
 */
export async function runDuePostgresShadowBatch(
  options: PostgresShadowBatchOptions,
): Promise<PostgresShadowBatchResult> {
  const logger = options.logger ?? console;
  const sourceById = new Map(
    [...options.sources].map((source) => [source.id, source]),
  );
  const dueSourceIds = await options.scheduleStore.claimDue(
    Math.min(Math.max(Math.trunc(options.limit ?? 10), 1), 25),
  );
  const result: PostgresShadowBatchResult = {
    claimed: dueSourceIds.length,
    completed: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
    runs: [],
  };

  for (const sourceId of dueSourceIds) {
    const source = sourceById.get(sourceId);
    if (!source) {
      const nextCadenceHours = 168;
      await options.scheduleStore.reschedule(sourceId, nextCadenceHours);
      result.skipped += 1;
      result.runs.push({
        sourceId,
        status: "skipped",
        nextCadenceHours,
        error: "Claimed source is not present in the bounded worker manifest",
      });
      logger.warn(
        `[missa-ingestion-v2] skipped unknown scheduled source ${sourceId}`,
      );
      continue;
    }

    const reviewMode = options.reviewSourceIds?.has(source.id) === true;
    const job = shadowJob(source, { trigger: "scheduled", mode: reviewMode ? "review" : "shadow" });
    try {
      const artifact = await executeShadowPipeline(
        options.registry,
        source,
        job,
        options.runStore,
        { logger, forceReprocess: reviewMode },
      );
      if (options.afterArtifact) {
        try {
          await options.afterArtifact(source, artifact);
        } catch (error) {
          logger.warn(`[missa-ingestion-v2] post-extraction review handoff failed for ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      const history = await options.scheduleStore.readRefreshHistory(source.id);
      const hoursUntilDeadline = hoursUntilNearestDeadline(
        artifact.extraction.fields,
        (options.now ?? (() => new Date()))(),
      );
      const nextCadenceHours = adaptiveCadenceHours(refreshPolicy(source), {
        changed: !artifact.unchanged,
        ...history,
        ...(hoursUntilDeadline === undefined ? {} : { hoursUntilDeadline }),
      });
      await options.scheduleStore.reschedule(source.id, nextCadenceHours);
      result.completed += 1;
      if (artifact.unchanged) result.unchanged += 1;
      result.runs.push({
        sourceId,
        runId: job.runId,
        status: "completed",
        nextCadenceHours,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const history = await options.scheduleStore.readRefreshHistory(source.id);
      const nextCadenceHours = adaptiveCadenceHours(refreshPolicy(source), {
        changed: false,
        ...history,
      });
      await options.scheduleStore.reschedule(source.id, nextCadenceHours);
      result.failed += 1;
      result.runs.push({
        sourceId,
        runId: job.runId,
        status: "failed",
        nextCadenceHours,
        error: message,
      });
      logger.warn(
        `[missa-ingestion-v2] shadow run ${job.runId} failed: ${message}`,
      );
    }
  }

  return result;
}
