export * from './types.js';
export { REGISTRY_VERTICALS } from './verticals.js';
export { auditRegistryTaxonomy, registryVerticalCompatibility } from './taxonomy.js';
export type { RegistryTaxonomyAudit, RegistryVerticalCompatibility } from './taxonomy.js';
export {
  assembleRegistry,
  getRegistry,
  getVertical,
  getVerticalsByGroup,
  filterSources,
  registryStats,
  loadSourcesIntoEngine,
  toRadarSources,
  discoverySeeds,
  canonicalSources,
} from './assemble.js';
