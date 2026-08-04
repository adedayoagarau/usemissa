/**
 * PlaywrightFetcher is deliberately NOT re-exported here (import it directly
 * from './playwrightFetcher.js' if you need it). `playwright`'s own
 * module-load code reaches for browser-registry files that don't exist in a
 * serverless bundle -- a *static* import/re-export runs that code the moment
 * this barrel loads, which crashed every route that imports anything from
 * this package (createProductionEngine included), not just actual Playwright
 * usage. See productionEngine.ts's dynamic import for the same reasoning.
 */
export { LlmExtractor, type LlmExtractorOptions } from "./llmExtractor.js";
export {
  ensurePostgresSchema,
  saveStoreToPostgres,
  loadStoreFromPostgres,
  readSnapshotVersion,
  saveRadarStoreDeltaToPostgres,
  SnapshotConflictError,
} from "./postgresStore.js";
export { uuidIds } from "./uuidIds.js";
export {
  createProductionEngine,
  seedRegistryIfEmpty,
  type ProductionEngine,
} from "./productionEngine.js";
export {
  PostgresOpportunityRepository,
  createPostgresOpportunityRepository,
  createPostgresOpportunityRepositoryFromUrl,
  buildOpportunityBrowseQuery,
  type SqlQuery,
} from "./opportunityRepository.js";
export { saveOpportunityProjectionToPostgres } from "./opportunityRelationalStore.js";
export { ensureEnrichmentSchema, enrichmentSchema } from "./enrichmentSchema.js";
export { ensureAgentGraphSchema, agentGraphSchema } from "./agentGraphSchema.js";
export { RADAR_AGENT_GRAPH, agentGraphSnapshot, type RadarAgentKind } from "./agentGraph.js";
export { runReviewTick, reviewCandidate, type ReviewCandidate } from "./reviewWorker.js";
export {
  runDiscoveryWorker,
  runDiscoveryWorkerTick,
  extractDiscoveryLinks,
  discoveryBatchSize,
  type DiscoveryWorkerOptions,
  type DiscoveryTickResult,
} from "./discoveryWorker.js";
export {
  runCoverageWorkerTick,
  materializeCoverageCells,
  assessCoverageCells,
  enqueueCoverageQueries,
  type CoverageWorkerOptions,
  type CoverageTickResult,
} from "./coverageWorker.js";
export {
  readTaxonomyAdminDashboard,
  createTaxonomyChangeProposal,
  type TaxonomyAdminDashboard,
} from "./taxonomyAdmin.js";
export {
  readPlatformAdminDurableSummary,
  type DurableMaturity,
  type DurableQueueMetric,
  type PlatformAdminDurableSummary,
} from "./platformAdmin.js";
export { GoogleGmailProvider } from './email/gmail/google.js';
export { MockGmailProvider } from './email/gmail/mock.js';
export {
  RADAR_INGESTION_LOCK,
  DISCOVERY_INGESTION_LOCK,
  DEFAULT_RADAR_WORKER_BATCH_SIZE,
  MAX_RADAR_WORKER_BATCH_SIZE,
  radarWorkerBatchSize,
  runRadarWorker,
  runRadarWorkerTick,
  type RadarWorkerOptions,
  type RadarWorkerTickResult,
} from "./radarWorker.js";
