import { createBenchmarkSources } from "./adapters/html.js";
import { createStageQueueBundle, enqueueStage } from "./stages.js";
import { createRunId } from "./contracts.js";

/** Manually enqueues one job at the entry point of the staged graph, for verifying the split deployment end to end. */
const sourceId = process.env.V2_SOURCE_ID ?? "benchmark-pw-grants";
const source = createBenchmarkSources().find((candidate) => candidate.id === sourceId);
if (!source) throw new Error(`Unknown V2_SOURCE_ID: ${sourceId}`);

const fetchQueue = createStageQueueBundle("fetch");
try {
  const mode = process.env.V2_MODE === "promote" ? "promote" : "shadow";
  const runId = createRunId(source.id);
  const jobId = await enqueueStage(fetchQueue, { runId, sourceId: source.id, trigger: "manual", mode });
  console.log(JSON.stringify({ runId, jobId, sourceId: source.id, mode }));
} finally {
  await fetchQueue.close();
}
