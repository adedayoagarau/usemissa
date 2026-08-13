import { createBenchmarkSources } from "./adapters/html.js";
import { startRun } from "./runs.js";
import { createQueueBundle } from "./queues.js";

const sourceId = process.env.V2_SOURCE_ID ?? "benchmark-pw-grants";
const source = createBenchmarkSources().find((candidate) => candidate.id === sourceId);
if (!source) throw new Error(`Unknown V2_SOURCE_ID: ${sourceId}`);

const queues = createQueueBundle();
try {
  const run = await startRun(queues, source, { trigger: "manual", mode: "shadow" });
  console.log(JSON.stringify({ runId: run.id, sourceId: run.sourceId, mode: run.mode, status: run.status }));
} finally {
  await queues.close();
}
