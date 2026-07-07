import type { OpportunityType, Source, SourceKind } from '../domain/types.js';

/**
 * Source tier — where this URL sits in the opportunity graph.
 *
 * Tier 0: org guideline / open-call page (canonical publisher)
 * Tier 1: submission platform listing (structured application endpoint)
 * Tier 2: directory / aggregator (discovery seed — follow outbound links)
 * Tier 3: feed / newsletter / partner syndication
 */
export type SourceTier = 0 | 1 | 2 | 3;

export type VerticalGroup =
  | 'literary'
  | 'visual-arts'
  | 'performing-arts'
  | 'film-media'
  | 'music'
  | 'grants-funding'
  | 'awards-festivals'
  | 'academic-professional'
  | 'craft-design'
  | 'platforms';

export interface RegistryVertical {
  id: string;
  label: string;
  group: VerticalGroup;
  opportunityTypes: OpportunityType[];
  disciplines: string[];
  description: string;
}

export interface SourceRegistryEntry {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  verticalId: string;
  tier: SourceTier;
  opportunityTypes: OpportunityType[];
  /** Narrower tags within the vertical, e.g. "fiction", "poetry", "sculpture". */
  disciplines?: string[];
  /** ISO 3166-1 alpha-2, "global", or region slug like "us", "eu". */
  geography?: string[];
  checkIntervalHours: number;
  active: boolean;
  organizationName?: string;
  /** For tier-2 directories: enqueue linked org pages as tier-0 sources. */
  followsOutboundLinks?: boolean;
  notes?: string;
}

export interface SourceRegistry {
  version: string;
  generatedAt: string;
  verticals: RegistryVertical[];
  sources: SourceRegistryEntry[];
}

export interface RegistryStats {
  totalSources: number;
  activeSources: number;
  byVertical: Record<string, number>;
  byGroup: Record<string, number>;
  byTier: Record<SourceTier, number>;
  byKind: Record<SourceKind, number>;
}

export interface LoadRegistryOptions {
  /** Only include these vertical IDs. */
  verticalIds?: string[];
  /** Only include these vertical groups. */
  groups?: VerticalGroup[];
  /** Only include sources at or below this tier (0 = org pages only). */
  maxTier?: SourceTier;
  /** Skip inactive entries. Default true. */
  activeOnly?: boolean;
}
