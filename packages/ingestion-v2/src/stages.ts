import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";
import { redisOptionsFromUrl, V2_QUEUE_PREFIX } from "./queues.js";
import type { IngestionMode, IngestionTrigger } from "./contracts.js";

/**
 * The stage graph. Fetching is bounded by per-host politeness, deciding is
 * bounded by model spend, writing is bounded by database throughput — three
 * different constraints that a single `concurrency: 1` worker could not
 * express. Each stage gets its own queue so it can scale on its own limit and
 * be deployed as its own Railway service.
 */
export type PipelineStage = "fetch" | "decide" | "write";
export const PIPELINE_STAGES: readonly PipelineStage[] = ["fetch", "decide", "write"];

export interface StageJobData {
  runId: string;
  sourceId: string;
  trigger: IngestionTrigger;
  mode: IngestionMode;
}

export interface StageQueueBundle {
  stage: PipelineStage;
  connection: Redis;
  queue: Queue<StageJobData>;
  events: QueueEvents;
  close(): Promise<void>;
}

export function createStageQueueBundle(stage: PipelineStage, redisUrl = process.env.REDIS_URL): StageQueueBundle {
  const options = redisOptionsFromUrl(redisUrl);
  const connection = new Redis(options);
  const eventsConnection = new Redis(options);
  const queue = new Queue<StageJobData>(stage, {
    connection,
    prefix: V2_QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    } satisfies JobsOptions,
  });
  const events = new QueueEvents(stage, { connection: eventsConnection, prefix: V2_QUEUE_PREFIX });
  return {
    stage,
    connection,
    queue,
    events,
    async close() {
      await events.close();
      await queue.close();
      await connection.quit();
      await eventsConnection.quit();
    },
  };
}

export async function enqueueStage(bundle: StageQueueBundle, data: StageJobData, options?: JobsOptions): Promise<string> {
  const job = await bundle.queue.add(`run-${bundle.stage}`, data, options);
  return job.id ?? "";
}
