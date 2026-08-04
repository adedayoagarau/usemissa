#!/usr/bin/env node

/** Gap-driven coverage lane. It queues research work but never publishes data. */
import { createHash } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { assessCoverage, buildCoverageQueries, type CoverageCellInput, type CoverageMembershipInput } from '@missa/radar-engine';

const LOCK_KEY = 1947350012;
const DEFAULT_TYPES = ['grant', 'fellowship', 'residency', 'magazine', 'open-call'] as const;
const DEFAULT_GEOS = ['global', 'US', 'NG', 'GB', 'CA', 'AU'] as const;
const DEFAULT_LANGUAGES = ['en'] as const;

export interface CoverageWorkerOptions {
  maxTerms?: number;
  maxCells?: number;
  maxQueriesPerCell?: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}
export interface CoverageTickResult { status: 'completed' | 'unavailable' | 'skipped'; cellsMaterialized: number; cellsAssessed: number; queriesQueued: number }

function idFor(value: string): string { return `cov_${createHash('sha256').update(value).digest('hex').slice(0, 28)}`; }
function listEnv(name: string, fallback: readonly string[]): string[] { const value = process.env[name]?.split(',').map((item) => item.trim()).filter(Boolean); return value?.length ? [...new Set(value)] : [...fallback]; }
function bound(value: number | undefined, fallback: number, max: number): number { return Number.isInteger(value) && value! > 0 ? Math.min(value!, max) : fallback; }

async function taxonomyTablesPresent(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ ready: boolean }>(`select
    to_regclass('public.source_coverage_cells') is not null
    and to_regclass('public.source_coverage_cell_terms') is not null
    and to_regclass('public.source_coverage_memberships') is not null
    and to_regclass('public.source_discovery_queries') is not null
    and to_regclass('public.taxonomy_terms') is not null as ready`);
  return result.rows[0]?.ready === true;
}

export async function materializeCoverageCells(client: PoolClient, options: Pick<CoverageWorkerOptions, 'maxTerms' | 'maxCells'> = {}): Promise<number> {
  const maxTerms = bound(options.maxTerms, 64, 512);
  const maxCells = bound(options.maxCells, 512, 10_000);
  const scheme = await client.query<{ id: string }>(`select id from taxonomy_schemes where status in ('active', 'draft') order by version desc limit 1`);
  const schemeId = scheme.rows[0]?.id;
  if (!schemeId) return 0;
  const terms = await client.query<{ id: string; preferred_label: string }>(`select id, preferred_label from taxonomy_terms where status = 'active' and selectable = true order by id limit $1`, [maxTerms]);
  const types = listEnv('MISSA_COVERAGE_TYPES', DEFAULT_TYPES);
  const geographies = listEnv('MISSA_COVERAGE_GEOGRAPHIES', DEFAULT_GEOS);
  const languages = listEnv('MISSA_COVERAGE_LANGUAGES', DEFAULT_LANGUAGES);
  const tiers = (process.env.MISSA_COVERAGE_TIERS ?? '0,1').split(',').map(Number).filter((tier) => Number.isInteger(tier) && tier >= 0 && tier <= 3);
  let inserted = 0;
  for (const term of terms.rows) for (const opportunityType of types) for (const geographyCode of geographies) for (const languageCode of languages) for (const sourceTier of tiers) {
    if (inserted >= maxCells) return inserted;
    const dimensionKey = JSON.stringify({ termIds: [term.id], opportunityType, geographyCode, languageCode, sourceTier });
    const id = idFor(`${schemeId}:${dimensionKey}`);
    await client.query(`insert into source_coverage_cells
      (id, scheme_id, dimension_key, opportunity_type, geography_code, language_code, source_tier, minimum_sources, minimum_canonical_sources, status, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, 3, 1, 'unassessed', now()) on conflict (id) do nothing`, [id, schemeId, dimensionKey, opportunityType, geographyCode, languageCode, sourceTier]);
    await client.query(`insert into source_coverage_cell_terms (coverage_cell_id, term_id, required, created_at) values ($1, $2, true, now()) on conflict do nothing`, [id, term.id]);
    inserted += 1;
  }
  return inserted;
}

export async function assessCoverageCells(client: PoolClient, maxCells = 1_000): Promise<number> {
  const cells = await client.query<{ id: string; term_ids: string[]; opportunity_type: string; geography_code: string; language_code: string; source_tier: number; minimum_sources: number; minimum_canonical_sources: number; last_assessed_at: string | null; blocked_reason: string | null }>(`select c.id, coalesce(array_agg(t.term_id order by t.term_id), '{}'::text[]) term_ids, c.opportunity_type, c.geography_code, c.language_code, c.source_tier, c.minimum_sources, c.minimum_canonical_sources, c.last_assessed_at, c.blocked_reason from source_coverage_cells c left join source_coverage_cell_terms t on t.coverage_cell_id = c.id group by c.id order by c.status in ('gap', 'thin') desc, c.updated_at asc limit $1`, [maxCells]);
  let assessed = 0;
  for (const cell of cells.rows) {
    const memberships = await client.query<{ source_id: string; role: CoverageMembershipInput['role']; status: CoverageMembershipInput['status'] }>(`select source_id, role, status from source_coverage_memberships where coverage_cell_id = $1`, [cell.id]);
    const assessment = assessCoverage({ id: cell.id, termIds: cell.term_ids, opportunityType: cell.opportunity_type, geographyCode: cell.geography_code, languageCode: cell.language_code, sourceTier: cell.source_tier, minimumSources: cell.minimum_sources, minimumCanonicalSources: cell.minimum_canonical_sources, lastAssessedAt: cell.last_assessed_at ?? undefined, blockedReason: cell.blocked_reason ?? undefined } satisfies CoverageCellInput, memberships.rows.map((membership) => ({ sourceId: membership.source_id, role: membership.role, status: membership.status })));
    const reviewHours = assessment.status === 'gap' ? 24 : assessment.status === 'thin' ? 72 : assessment.status === 'strong' ? 720 : 336;
    await client.query(`update source_coverage_cells set status = $2, last_assessed_at = now(), next_review_at = now() + ($3 || ' hours')::interval, notes = $4, updated_at = now() where id = $1`, [cell.id, assessment.status, reviewHours, assessment.reason]);
    assessed += 1;
  }
  return assessed;
}

export async function enqueueCoverageQueries(client: PoolClient, maxCells = 128, maxQueriesPerCell = 6): Promise<number> {
  const cells = await client.query<{ id: string; status: string; opportunity_type: string; geography_code: string; language_code: string; term_labels: string[] }>(`select c.id, c.status, c.opportunity_type, c.geography_code, c.language_code, coalesce(array_agg(t.preferred_label order by t.preferred_label), '{}'::text[]) term_labels from source_coverage_cells c join source_coverage_cell_terms ct on ct.coverage_cell_id = c.id join taxonomy_terms t on t.id = ct.term_id where c.status in ('gap', 'thin') group by c.id order by c.status = 'gap' desc, c.next_review_at nulls first limit $1`, [maxCells]);
  let queued = 0;
  for (const cell of cells.rows) for (const query of buildCoverageQueries({ termLabels: cell.term_labels, opportunityType: cell.opportunity_type, geographyCode: cell.geography_code, languageCode: cell.language_code }, maxQueriesPerCell)) {
    const id = idFor(`${cell.id}:${query}:${cell.language_code}`);
    const priority = cell.status === 'gap' ? 100 : 50;
    await client.query(`insert into source_discovery_queries (id, coverage_cell_id, query, engine, locale, status, priority, cadence_hours, next_run_at, updated_at) values ($1, $2, $3, 'web', $4, 'queued', $5, 720, now(), now()) on conflict (coverage_cell_id, query, locale) do update set priority = greatest(source_discovery_queries.priority, excluded.priority), status = case when source_discovery_queries.status = 'blocked' then source_discovery_queries.status else 'queued' end, updated_at = now()`, [id, cell.id, query, cell.language_code, priority]);
    queued += 1;
  }
  return queued;
}

export async function runCoverageWorkerTick(options: CoverageWorkerOptions = {}): Promise<CoverageTickResult> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (!(await taxonomyTablesPresent(client))) return { status: 'unavailable', cellsMaterialized: 0, cellsAssessed: 0, queriesQueued: 0 };
    const lock = await client.query<{ locked: boolean }>('select pg_try_advisory_lock($1) locked', [LOCK_KEY]);
    if (!lock.rows[0]?.locked) return { status: 'skipped', cellsMaterialized: 0, cellsAssessed: 0, queriesQueued: 0 };
    try {
      await client.query('begin');
      const cellsMaterialized = await materializeCoverageCells(client, options);
      const cellsAssessed = await assessCoverageCells(client, bound(options.maxCells, 1_000, 10_000));
      const queriesQueued = await enqueueCoverageQueries(client, 128, bound(options.maxQueriesPerCell, 6, 12));
      await client.query('commit');
      options.logger?.info(`[missa-coverage-worker] materialized=${cellsMaterialized} assessed=${cellsAssessed} queries=${queriesQueued}`);
      return { status: 'completed', cellsMaterialized, cellsAssessed, queriesQueued };
    } finally { await client.query('select pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => undefined); }
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    options.logger?.error('[missa-coverage-worker] tick failed', error);
    throw error;
  } finally { client.release(); await pool.end(); }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to run the Missa coverage worker.');
  const result = await runCoverageWorkerTick({ logger: console });
  console.log(JSON.stringify(result));
}
if (process.argv[1]?.endsWith('coverageWorker.js')) void main();
