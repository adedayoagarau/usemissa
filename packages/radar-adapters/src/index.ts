/**
 * PlaywrightFetcher is deliberately NOT re-exported here (import it directly
 * from './playwrightFetcher.js' if you need it). `playwright`'s own
 * module-load code reaches for browser-registry files that don't exist in a
 * serverless bundle -- a *static* import/re-export runs that code the moment
 * this barrel loads, which crashed every route that imports anything from
 * this package (createProductionEngine included), not just actual Playwright
 * usage. See productionEngine.ts's dynamic import for the same reasoning.
 */
export { LlmExtractor, type LlmExtractorOptions } from './llmExtractor.js';
export { ensurePostgresSchema, saveStoreToPostgres, loadStoreFromPostgres } from './postgresStore.js';
export { createProductionEngine, type ProductionEngine } from './productionEngine.js';
