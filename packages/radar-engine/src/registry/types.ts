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

/** Trust describes Missa's confidence in the publisher/channel, not whether
 * a particular opportunity is currently open. A curated source is suitable
 * for the trusted registry; live verification is still performed by Radar. */
export type SourceTrustStatus = 'curated' | 'verified' | 'needs-review' | 'blocked';

export type SourceAuthorityKind =
  | 'official-source'
  | 'professional-body'
  | 'publisher'
  | 'platform'
  | 'directory'
  | 'feed'
  | 'funder'
  | 'academic'
  | 'community'
  | 'other';

export interface SourceTrust {
  status: SourceTrustStatus;
  authorityKind: SourceAuthorityKind;
  score: number;
  evidenceUrl?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

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
  /** Canonical creative-practice terms; opportunity type and eligibility stay separate. */
  taxonomyTermIds?: string[];
  /** Values such as identity/community focus are eligibility lenses, not practices. */
  eligibilityLens?: string;
  /** Platform/directory identity is a source channel, not a creative facet. */
  sourceChannel?: string;
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
  taxonomyTermIds?: string[];
  eligibilityLens?: string;
  sourceChannel?: string;
  /** ISO 3166-1 alpha-2, "global", or region slug like "us", "eu". */
  geography?: string[];
  checkIntervalHours: number;
  active: boolean;
  organizationName?: string;
  /** For tier-2 directories: enqueue linked org pages as tier-0 sources. */
  followsOutboundLinks?: boolean;
  /** Explicit site schema used to turn this source into follow-up call URLs. */
  discoveryAdapterId?: string;
  notes?: string;
  trust?: SourceTrust;
}

export type RegistryCoverageStatus = 'gap' | 'thin' | 'covered';

export interface RegistryTermCoverage {
  termId: string;
  facet: string;
  label: string;
  sourceCount: number;
  canonicalSourceCount: number;
  trustedSourceCount: number;
  status: RegistryCoverageStatus;
}

export interface RegistryFacetCoverage {
  totalTerms: number;
  coveredTerms: number;
  thinTerms: number;
  gapTerms: number;
}

export interface RegistryCoverageSummary {
  schemeVersion: number;
  totalTerms: number;
  coveredTerms: number;
  thinTerms: number;
  gapTerms: number;
  byFacet: Record<string, RegistryFacetCoverage>;
  terms: RegistryTermCoverage[];
}

export interface SourceRegistry {
  version: string;
  generatedAt: string;
  verticals: RegistryVertical[];
  sources: SourceRegistryEntry[];
  coverage: RegistryCoverageSummary;
}

export interface RegistryStats {
  totalSources: number;
  activeSources: number;
  byVertical: Record<string, number>;
  byGroup: Record<string, number>;
  byTier: Record<SourceTier, number>;
  byKind: Record<SourceKind, number>;
  trustedSources: number;
  byTrustStatus: Record<SourceTrustStatus, number>;
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
