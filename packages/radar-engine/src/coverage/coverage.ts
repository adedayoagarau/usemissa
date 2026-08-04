/** Pure gap assessment and bounded discovery helpers for source coverage.
 * Persistence workers can use these functions without duplicating the policy
 * or inventing counters: counts always come from active memberships. */

export type CoverageStatus = 'unassessed' | 'gap' | 'thin' | 'covered' | 'strong' | 'blocked';
export type CoverageMembershipRole = 'canonical' | 'application' | 'discovery' | 'syndication' | 'professional-body' | 'funder';
export type CoverageMembershipStatus = 'candidate' | 'active' | 'stale' | 'rejected' | 'blocked';

export interface CoverageCellInput {
  id: string;
  termIds: string[];
  opportunityType: string;
  geographyCode: string;
  languageCode: string;
  sourceTier: number;
  minimumSources: number;
  minimumCanonicalSources: number;
  lastAssessedAt?: string;
  blockedReason?: string;
}

export interface CoverageMembershipInput {
  sourceId: string;
  role: CoverageMembershipRole;
  status: CoverageMembershipStatus;
}

export interface CoverageAssessment {
  status: CoverageStatus;
  activeSources: number;
  activeCanonicalSources: number;
  gap: boolean;
  reason: string;
}

/** Assess a cell from memberships only. A blocked cell is explicit and wins
 * over numerical thresholds; an unassessed cell is never called covered. */
export function assessCoverage(cell: CoverageCellInput, memberships: Iterable<CoverageMembershipInput>): CoverageAssessment {
  if (cell.blockedReason) {
    return { status: 'blocked', activeSources: 0, activeCanonicalSources: 0, gap: true, reason: cell.blockedReason };
  }
  if (!cell.lastAssessedAt) {
    return { status: 'unassessed', activeSources: 0, activeCanonicalSources: 0, gap: true, reason: 'No assessment has been recorded.' };
  }
  const active = [...memberships].filter((membership) => membership.status === 'active');
  const activeSources = new Set(active.map((membership) => membership.sourceId)).size;
  const activeCanonicalSources = new Set(active.filter((membership) => membership.role === 'canonical').map((membership) => membership.sourceId)).size;
  if (activeCanonicalSources < cell.minimumCanonicalSources || activeSources < cell.minimumSources) {
    const missing = [
      activeCanonicalSources < cell.minimumCanonicalSources ? `${cell.minimumCanonicalSources - activeCanonicalSources} canonical` : '',
      activeSources < cell.minimumSources ? `${cell.minimumSources - activeSources} total` : '',
    ].filter(Boolean).join(' and ');
    return { status: activeSources === 0 ? 'gap' : 'thin', activeSources, activeCanonicalSources, gap: true, reason: `Needs ${missing} source${missing === '1' ? '' : 's'}.` };
  }
  const strong = activeSources >= Math.max(cell.minimumSources * 2, cell.minimumSources + 1)
    && activeCanonicalSources >= Math.max(cell.minimumCanonicalSources * 2, cell.minimumCanonicalSources + 1);
  return { status: strong ? 'strong' : 'covered', activeSources, activeCanonicalSources, gap: false, reason: strong ? 'Coverage exceeds the target.' : 'Coverage meets the target.' };
}

export interface DiscoveryQueryInput {
  termLabels: string[];
  opportunityType: string;
  geographyCode: string;
  languageCode: string;
  locale?: string;
}

/** Generate a small, deterministic query set for a gap. Locale and geography
 * stay in every query so a global gap does not accidentally become US-only. */
export function buildCoverageQueries(input: DiscoveryQueryInput, limit = 8): string[] {
  const labels = [...new Set(input.termLabels.map((label) => label.trim()).filter(Boolean))].slice(0, 3);
  if (!labels.length || limit <= 0) return [];
  const geography = input.geographyCode === 'global' ? '' : input.geographyCode;
  const language = input.languageCode === 'und' ? '' : input.languageCode;
  const suffix = [input.opportunityType, geography, language].filter(Boolean).join(' ');
  const bases = labels.flatMap((label) => [
    `${label} ${suffix} open call`,
    `${label} ${suffix} opportunities`,
    `${label} ${suffix} application deadline`,
  ]);
  return [...new Set(bases.map((query) => query.replace(/\s+/g, ' ').trim()))].slice(0, limit);
}

/** Global URL deduplication used before candidate review/promotion. */
export function deduplicateCandidateUrls(urls: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      url.hash = '';
      url.hostname = url.hostname.toLowerCase();
      const normalized = url.href.replace(/\/$/, '');
      if (!/^https?:$/.test(url.protocol) || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    } catch {
      // Invalid candidate URLs remain unpublished and are intentionally dropped.
    }
  }
  return result;
}

export interface TaxonomyAssignmentMetricInput {
  facet: string;
  origin: string;
  certainty: string;
  resolved: boolean;
  ambiguous?: boolean;
}

export interface TaxonomyOperationalMetrics {
  totalAssignments: number;
  byFacet: Record<string, number>;
  byOrigin: Record<string, number>;
  byCertainty: Record<string, number>;
  unresolved: number;
  ambiguous: number;
}

/** Deterministic operational counters for dashboards and reviewer queues. */
export function summarizeTaxonomyMetrics(records: Iterable<TaxonomyAssignmentMetricInput>): TaxonomyOperationalMetrics {
  const result: TaxonomyOperationalMetrics = { totalAssignments: 0, byFacet: {}, byOrigin: {}, byCertainty: {}, unresolved: 0, ambiguous: 0 };
  for (const record of records) {
    result.totalAssignments += 1;
    result.byFacet[record.facet] = (result.byFacet[record.facet] ?? 0) + 1;
    result.byOrigin[record.origin] = (result.byOrigin[record.origin] ?? 0) + 1;
    result.byCertainty[record.certainty] = (result.byCertainty[record.certainty] ?? 0) + 1;
    if (!record.resolved) result.unresolved += 1;
    if (record.ambiguous) result.ambiguous += 1;
  }
  return result;
}
