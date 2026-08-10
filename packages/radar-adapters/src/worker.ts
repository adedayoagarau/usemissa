#!/usr/bin/env node
import { radarWorkerBatchSize, runRadarWorker } from "./radarWorker.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run the Missa source monitor.");
  process.exit(1);
}

const abortController = new AbortController();
const stop = () => abortController.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

runRadarWorker({
  maxSources: radarWorkerBatchSize(),
  signal: abortController.signal,
}).catch((error) => {
  console.error("[missa-radar-worker] stopped unexpectedly", error);
  process.exitCode = 1;
});
