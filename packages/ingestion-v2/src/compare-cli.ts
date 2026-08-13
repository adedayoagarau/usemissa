import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createGaryNeonObservationLoader, GaryObservationAdapter } from "./adapters/gary.js";
import { GenericHtmlAdapter, createBenchmarkSources } from "./adapters/html.js";
import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { compareSourceAdapters } from "./comparison.js";
import { createIngestionV2Pool } from "./persistence.js";
import { shadowJob } from "./execution.js";

const pool = createIngestionV2Pool();
const source = createBenchmarkSources()[0]!;
const v2 = process.env.DEEPSEEK_API_KEY ? new DeepSeekHtmlAdapter() : new GenericHtmlAdapter();
const gary = new GaryObservationAdapter(createGaryNeonObservationLoader(pool));
const outputPath = process.env.V2_COMPARISON_OUTPUT ?? "outputs/ingestion-v2/pw-gary-comparison.json";

try {
  const report = await compareSourceAdapters(source, v2, gary, shadowJob(source, { trigger: "shadow" }));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, runId: report.runId, sharedFields: report.comparison.sharedFieldNames.length, disagreements: report.comparison.disagreements.length, publicWrites: report.publicWrites }));
} finally {
  await pool.end();
}
