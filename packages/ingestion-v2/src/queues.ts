import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import { Redis, type RedisOptions } from "ioredis";
import type { IngestionMode, IngestionTrigger } from "./contracts.js";

export const V2_QUEUE_PREFIX = "missa-ingestion-v2";

export interface PipelineJobData {
  runId: string;
  sourceId: string;
  trigger: IngestionTrigger;
  mode: IngestionMode;
}

export interface QueueBundle {
  connection: Redis;
  pipeline: Queue<PipelineJobData>;
  events: QueueEvents;
  close(): Promise<void>;
}

export function redisOptionsFromUrl(redisUrl = process.env.REDIS_URL): RedisOptions {
  if (!redisUrl) {
    throw new Error("REDIS_URL is required to create BullMQ queues. Use local Redis for development or Upstash for hosted v2.");
  }
  const parsed = new URL(redisUrl);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "rediss:" ? 6380 : 6379,
    username: decodeURIComponent(parsed.username || "default"),
    password: decodeURIComponent(parsed.password),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  if (parsed.protocol === "rediss:") options.tls = {};
  return options;
}

export function createQueueBundle(redisUrl = process.env.REDIS_URL): QueueBundle {
  const options = redisOptionsFromUrl(redisUrl);
  const connection = new Redis(options);
  const eventsConnection = new Redis(options);
  const pipeline = new Queue<PipelineJobData>("pipeline", {
    connection,
    prefix: V2_QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    } satisfies JobsOptions,
  });
  const events = new QueueEvents("pipeline", { connection: eventsConnection, prefix: V2_QUEUE_PREFIX });
  return {
    connection,
    pipeline,
    events,
    async close() {
      await events.close();
      await pipeline.close();
      await connection.quit();
      await eventsConnection.quit();
    },
  };
}

export async function enqueuePipeline(
  queues: QueueBundle,
  data: PipelineJobData,
  options?: JobsOptions,
): Promise<string> {
  const job = await queues.pipeline.add("run-pipeline", data, options);
  return job.id ?? "";
}
