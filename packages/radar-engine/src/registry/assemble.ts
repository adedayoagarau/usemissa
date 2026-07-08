import type { Source, SourceKind } from '../domain/types.js';
import type {
  LoadRegistryOptions,
  RegistryStats,
  RegistryVertical,
  SourceRegistry,
  SourceRegistryEntry,
  SourceTier,
  VerticalGroup,
} from './types.js';
import { REGISTRY_VERTICALS } from './verticals.js';
import { LITERARY_FICTION_SOURCES } from './bundles/literary-fiction.js';
import { POETRY_SOURCES } from './bundles/poetry.js';
import { CNF_SOURCES } from './bundles/creative-nonfiction.js';
import { BULK_SOURCES } from './sources-bulk.js';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '').toLowerCase();
}

function toRadarSource(entry: SourceRegistryEntry): Source {
  return {
    id: entry.id,
    name: entry.name,
    url: entry.url,
    kind: entry.kind,
    checkIntervalHours: entry.checkIntervalHours,
    active: entry.active,
    consecutiveFailures: 0,
  };
}

/** Assemble the full registry from TS bundles + generated bulk sources. */
export function assembleRegistry(): SourceRegistry {
  const byUrl = new Map<string, SourceRegistryEntry>();

  const add = (entry: SourceRegistryEntry): void => {
    const key = normalizeUrl(entry.url);
    if (!byUrl.has(key)) byUrl.set(key, entry);
  };

  for (const entry of [
    ...LITERARY_FICTION_SOURCES,
    ...POETRY_SOURCES,
    ...CNF_SOURCES,
    ...BULK_SOURCES,
  ]) {
    add(entry);
  }

  const sources = [...byUrl.values()].sort((a, b) => a.verticalId.localeCompare(b.verticalId) || a.name.localeCompare(b.name));

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    verticals: REGISTRY_VERTICALS,
    sources,
  };
}

export function getRegistry(): SourceRegistry {
  return assembleRegistry();
}

export function getVertical(id: string): RegistryVertical | undefined {
  return REGISTRY_VERTICALS.find((v) => v.id === id);
}

export function getVerticalsByGroup(group: VerticalGroup): RegistryVertical[] {
  return REGISTRY_VERTICALS.filter((v) => v.group === group);
}

export function filterSources(
  registry: SourceRegistry,
  opts: LoadRegistryOptions = {},
): SourceRegistryEntry[] {
  const { verticalIds, groups, maxTier, activeOnly = true } = opts;
  return registry.sources.filter((s) => {
    if (activeOnly && !s.active) return false;
    if (maxTier !== undefined && s.tier > maxTier) return false;
    if (verticalIds?.length && !verticalIds.includes(s.verticalId)) return false;
    if (groups?.length) {
      const vertical = getVertical(s.verticalId);
      if (!vertical || !groups.includes(vertical.group)) return false;
    }
    return true;
  });
}

export function registryStats(registry: SourceRegistry): RegistryStats {
  const byVertical: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  const byTier: Record<SourceTier, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const byKind: Record<string, number> = {};

  for (const s of registry.sources) {
    byVertical[s.verticalId] = (byVertical[s.verticalId] ?? 0) + 1;
    const v = getVertical(s.verticalId);
    if (v) byGroup[v.group] = (byGroup[v.group] ?? 0) + 1;
    byTier[s.tier]++;
    byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
  }

  return {
    totalSources: registry.sources.length,
    activeSources: registry.sources.filter((s) => s.active).length,
    byVertical,
    byGroup,
    byTier,
    byKind,
  };
}

export function loadSourcesIntoEngine(
  addSource: (input: {
    name: string;
    url: string;
    kind: SourceKind;
    checkIntervalHours?: number;
  }) => Source,
  opts?: LoadRegistryOptions,
): { loaded: number; skipped: number; entries: SourceRegistryEntry[] } {
  const registry = assembleRegistry();
  const entries = filterSources(registry, opts);
  let loaded = 0;
  for (const entry of entries) {
    addSource({
      name: entry.name,
      url: entry.url,
      kind: entry.kind,
      checkIntervalHours: entry.checkIntervalHours,
    });
    loaded++;
  }
  return { loaded, skipped: registry.sources.length - loaded, entries };
}

export function toRadarSources(opts?: LoadRegistryOptions): Source[] {
  const registry = assembleRegistry();
  return filterSources(registry, opts).map(toRadarSource);
}

/** Tier-2 sources that should enqueue outbound org-page crawling. */
export function discoverySeeds(registry: SourceRegistry = assembleRegistry()): SourceRegistryEntry[] {
  return registry.sources.filter((s) => s.tier === 2 && s.followsOutboundLinks);
}

/** Tier-0 canonical org guideline pages. */
export function canonicalSources(registry: SourceRegistry = assembleRegistry()): SourceRegistryEntry[] {
  return registry.sources.filter((s) => s.tier === 0);
}
