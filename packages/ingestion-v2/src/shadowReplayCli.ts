import { DeepSeekHtmlAdapter } from "./adapters/deepseek.js";
import { FeedAdapter } from "./adapters/feed.js";
import { GenericHtmlAdapter } from "./adapters/html.js";
import { JsonApiAdapter } from "./adapters/json.js";
import { ChillSubsNextAdapter } from "./adapters/chillSubs.js";
import { evaluateCandidateReplayGate } from "./candidateGate.js";
import { createFirstTrancheSources } from "./catalog.js";
import { executeShadowPipeline, shadowJob } from "./execution.js";
import { assertIngestionV2SchemaReady, createIngestionV2Pool, PostgresShadowRunStore } from "./persistence.js";
import { AdapterRegistry } from "./registry.js";
import { assertIngestionV2DatabaseRole } from "./safety.js";
import { findCanonicalDuplicateMatches } from "./canonicalWriter.js";
import { resolveCurrentDeadline } from "./deadline.js";

assertIngestionV2DatabaseRole();
const pool = createIngestionV2Pool();
await assertIngestionV2SchemaReady(pool);
const adapterId = process.env.DEEPSEEK_API_KEY ? "deepseek-html-v2" : "generic-html-v2";
const allSources = createFirstTrancheSources(adapterId);
const selectedIds = new Set((process.env.V2_SOURCE_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const sources = selectedIds.size
  ? allSources.filter((source) => {
      const manifestId = (source.config.sourceManifest as { id?: string } | undefined)?.id;
      return selectedIds.has(source.id) || Boolean(manifestId && selectedIds.has(manifestId));
    })
  : allSources;
if (!sources.length) throw new Error("V2_SOURCE_IDS did not match the first-tranche manifest");
const passes = Math.min(Math.max(Math.trunc(Number(process.env.V2_REPLAY_PASSES ?? 2) || 2), 2), 5);
const registry = new AdapterRegistry()
  .register(new GenericHtmlAdapter())
  .register(new DeepSeekHtmlAdapter())
  .register(new FeedAdapter())
  .register(new JsonApiAdapter())
  .register(new ChillSubsNextAdapter());
const store = new PostgresShadowRunStore(pool);
const artifacts = [];

try {
  for (let pass = 1; pass <= passes; pass += 1) {
    for (const source of sources) {
      try {
        const artifact = await executeShadowPipeline(
          registry,
          source,
          shadowJob(source, { trigger: "shadow" }),
          store,
          { forceReprocess: true },
        );
        artifacts.push(artifact);
        console.log(`[missa-ingestion-v2] replay pass=${pass}/${passes} source=${source.id} candidates=${artifact.publisher?.candidateReviews?.length ?? 0}`);
      } catch (error) {
        console.error(`[missa-ingestion-v2] replay pass=${pass}/${passes} source=${source.id} failed=${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const duplicateUrls = new Set<string>();
  for (const artifact of artifacts) {
    for (const candidate of artifact.publisher?.candidateReviews ?? []) {
      const url = candidate.review.reconciliation.authoritativeUrl;
      const deadline = resolveCurrentDeadline(candidate.extraction.fields, url);
      if (!url || deadline.conflict || (!deadline.date && deadline.kind === "unknown")) continue;
      if ((await findCanonicalDuplicateMatches(pool, candidate.extraction, url, deadline.date, deadline.kind)).length) duplicateUrls.add(url);
    }
  }
  const result = evaluateCandidateReplayGate(artifacts, sources.map((source) => source.id), passes, {
    existingCanonicalUrls: duplicateUrls,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.eligible ? 0 : 1;
} finally {
  await pool.end();
}
