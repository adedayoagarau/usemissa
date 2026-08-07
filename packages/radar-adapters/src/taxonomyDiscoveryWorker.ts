#!/usr/bin/env node

/**
 * Taxonomy-driven source discovery.
 *
 * Coverage cells are the intent layer: a canonical practice term, opportunity
 * type, geography, language, and source tier become a bounded search query.
 * This worker is deliberately only a candidate collector. It never creates a
 * source, opportunity, taxonomy assignment, or publication record by itself.
 * A reviewer must promote a candidate after checking the canonical page,
 * robots.txt, terms, and evidence quality.
 */
import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { deduplicateCandidateUrls } from "@missa/radar-engine";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from "./workerTelemetry.js";

const LOCK_KEY = 1947350013;
const DEFAULT_BATCH_SIZE = 8;
const MAX_BATCH_SIZE = 50;
const DEFAULT_RESULT_LIMIT = 25;
const MAX_RESULT_LIMIT = 50;
const MAX_QUERY_LENGTH = 500;
const MAX_TEXT_LENGTH = 1_000;
const ALLOWED_KINDS = new Set([
  "organization-website",
  "directory",
  "feed",
  "newsletter",
  "partner-feed",
]);

export interface TaxonomyDiscoveryTerm {
  id: string;
  label: string;
  facet?: string;
}

export interface TaxonomyDiscoveryQuery {
  id: string;
  coverageCellId: string;
  query: string;
  engine: string;
  locale: string;
  priority: number;
  cadenceHours: number;
  cursor?: string;
  consecutiveFailures: number;
  opportunityType: string;
  geographyCode: string;
  languageCode: string;
  sourceTier: number;
  taxonomyTerms: TaxonomyDiscoveryTerm[];
}

export interface TaxonomySearchResult {
  url: string;
  title?: string;
  snippet?: string;
  score?: number;
  proposedKind?: string;
  proposedTier?: number;
  /** Search providers can report a policy preflight without this worker
   * guessing. Blocked results stay in the review queue and are not fetched. */
  robotsAllowed?: boolean;
  termsAllowed?: boolean;
  blockedReason?: string;
}

export interface TaxonomySearchResponse {
  results: TaxonomySearchResult[];
  nextCursor?: string;
}

export interface TaxonomySearchProvider {
  search(input: {
    query: string;
    locale: string;
    cursor?: string;
    limit: number;
    context: Pick<TaxonomyDiscoveryQuery, "opportunityType" | "geographyCode" | "languageCode" | "sourceTier" | "taxonomyTerms">;
  }): Promise<TaxonomySearchResponse>;
}

export interface TaxonomyDiscoveryWorkerOptions {
  maxQueries?: number;
  resultLimit?: number;
  provider?: TaxonomySearchProvider;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

export interface TaxonomyDiscoveryTickResult {
  status: "completed" | "unavailable" | "skipped";
  queriesClaimed: number;
  queriesCompleted: number;
  candidatesDiscovered: number;
  duplicates: number;
  blocked: number;
  failures: number;
}

function bounded(value: string | number | undefined, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function taxonomyDiscoveryBatchSize(value: string | number | undefined = process.env.MISSA_TAXONOMY_DISCOVERY_BATCH_SIZE): number {
  return bounded(value, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
}

export function taxonomyDiscoveryResultLimit(value: string | number | undefined = process.env.MISSA_TAXONOMY_DISCOVERY_RESULT_LIMIT): number {
  return bounded(value, DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT);
}

function text(value: unknown, limit = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

function finiteInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

function normalizeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/** Strictly parse provider output. Unknown fields are ignored and unsafe URLs
 * are dropped before they can enter the candidate table. */
export function parseTaxonomySearchResponse(value: unknown, limit = DEFAULT_RESULT_LIMIT): TaxonomySearchResponse {
  if (!value || typeof value !== "object") return { results: [] };
  const body = value as { results?: unknown; nextCursor?: unknown };
  if (!Array.isArray(body.results)) return { results: [] };
  const results: TaxonomySearchResult[] = [];
  const seen = new Set<string>();
  for (const item of body.results) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const url = typeof raw.url === "string" ? normalizeUrl(raw.url) : undefined;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const proposedKind = typeof raw.proposedKind === "string" && ALLOWED_KINDS.has(raw.proposedKind) ? raw.proposedKind : undefined;
    const proposedTier = Number.isInteger(raw.proposedTier) && Number(raw.proposedTier) >= 0 && Number(raw.proposedTier) <= 3 ? Number(raw.proposedTier) : undefined;
    results.push({
      url,
      title: text(raw.title, 240),
      snippet: text(raw.snippet, 500),
      score: finiteInt(raw.score, 25, 0, 100),
      proposedKind,
      proposedTier,
      robotsAllowed: typeof raw.robotsAllowed === "boolean" ? raw.robotsAllowed : undefined,
      termsAllowed: typeof raw.termsAllowed === "boolean" ? raw.termsAllowed : undefined,
      blockedReason: text(raw.blockedReason, 300),
    });
    if (results.length >= limit) break;
  }
  return { results, nextCursor: text(body.nextCursor, 500) };
}

/** HTTP adapter for the internal search service. Keeping the provider behind
 * this contract makes the worker testable and prevents it from silently using
 * an unapproved public scraper/search API. */
export class HttpTaxonomySearchProvider implements TaxonomySearchProvider {
  constructor(private readonly endpoint: string, private readonly token?: string) {}

  async search(input: Parameters<TaxonomySearchProvider["search"]>[0]): Promise<TaxonomySearchResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({
        query: input.query.slice(0, MAX_QUERY_LENGTH),
        locale: input.locale,
        cursor: input.cursor,
        limit: input.limit,
        context: input.context,
      }),
      signal: AbortSignal.timeout(Number(process.env.MISSA_TAXONOMY_DISCOVERY_TIMEOUT_MS ?? 15_000)),
    });
    if (!response.ok) throw new Error(`search provider HTTP ${response.status}`);
    return parseTaxonomySearchResponse(await response.json(), input.limit);
  }
}

/** Native Serper adapter. Serper returns Google-style organic results; those
 * results remain source candidates and still require Missa's canonical-page,
 * robots, terms, and human review gates before promotion. */
export class SerperTaxonomySearchProvider implements TaxonomySearchProvider {
  constructor(private readonly apiKey: string, private readonly endpoint = "https://google.serper.dev/search") {}

  async search(input: Parameters<TaxonomySearchProvider["search"]>[0]): Promise<TaxonomySearchResponse> {
    const locale = input.locale.split(/[-_]/)[0]?.toLowerCase() || "en";
    const geography = input.context.geographyCode.toLowerCase();
    const page = input.cursor && /^\d+$/.test(input.cursor) ? Number(input.cursor) : 1;
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({
        q: input.query.slice(0, MAX_QUERY_LENGTH),
        hl: locale,
        ...(geography !== "global" && /^[a-z]{2}$/.test(geography) ? { gl: geography } : {}),
        num: input.limit,
        page,
      }),
      signal: AbortSignal.timeout(Number(process.env.MISSA_TAXONOMY_DISCOVERY_TIMEOUT_MS ?? 15_000)),
    });
    if (!response.ok) throw new Error(`Serper search HTTP ${response.status}`);
    const body = await response.json() as { organic?: Array<{ link?: unknown; title?: unknown; snippet?: unknown; position?: unknown }> };
    return parseTaxonomySearchResponse({
      results: (body.organic ?? []).map((result) => ({
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        score: typeof result.position === "number" ? Math.max(1, 100 - result.position * 3) : 25,
      })),
      nextCursor: (body.organic?.length ?? 0) >= input.limit ? String(page + 1) : undefined,
    }, input.limit);
  }
}

export function taxonomySearchProviderFromEnv(): TaxonomySearchProvider | undefined {
  const endpoint = process.env.MISSA_TAXONOMY_DISCOVERY_ENDPOINT?.trim();
  if (endpoint) return new HttpTaxonomySearchProvider(endpoint, process.env.MISSA_TAXONOMY_DISCOVERY_TOKEN);
  const serperKey = process.env.SERPER_API_KEY?.trim() || process.env.MISSA_SERPER_API_KEY?.trim();
  return serperKey ? new SerperTaxonomySearchProvider(serperKey) : undefined;
}

function candidateId(queryId: string, normalizedUrl: string): string {
  return `src_cand_${createHash("sha256").update(`${queryId}:${normalizedUrl}`).digest("hex").slice(0, 28)}`;
}

function parseTerms(value: unknown): TaxonomyDiscoveryTerm[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const id = text(raw.id, 200);
    const label = text(raw.label, 240);
    return id && label ? [{ id, label, ...(text(raw.facet, 80) ? { facet: text(raw.facet, 80) } : {}) }] : [];
  }).slice(0, 24);
}

async function taxonomyTablesPresent(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ ready: boolean }>(`select
    to_regclass('public.source_discovery_queries') is not null
    and to_regclass('public.source_discovery_candidates') is not null
    and to_regclass('public.source_coverage_cells') is not null
    and to_regclass('public.source_coverage_cell_terms') is not null
    and to_regclass('public.taxonomy_terms') is not null as ready`);
  return result.rows[0]?.ready === true;
}

async function claimQueries(client: PoolClient, limit: number): Promise<TaxonomyDiscoveryQuery[]> {
  const result = await client.query<TaxonomyDiscoveryQuery & { taxonomy_terms: unknown }>(`with due as (
      select q.id
      from source_discovery_queries q
      where (q.status in ('queued', 'failed') and q.next_run_at <= now())
         or (q.status = 'running' and q.updated_at < now() - interval '30 minutes')
      order by q.priority desc, q.next_run_at asc, q.id asc
      for update skip locked
      limit $1
    ),
    claimed as (
      update source_discovery_queries q
      set status = 'running', last_error = null, updated_at = now()
      from due
      where q.id = due.id
      returning q.*
    )
    select claimed.id, claimed.coverage_cell_id as "coverageCellId", claimed.query, claimed.engine, claimed.locale, claimed.priority,
      claimed.cadence_hours as "cadenceHours", claimed.cursor, claimed.consecutive_failures as "consecutiveFailures",
      c.opportunity_type as "opportunityType", c.geography_code as "geographyCode",
      c.language_code as "languageCode", c.source_tier as "sourceTier",
      (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'label', t.preferred_label, 'facet', f.key)
        order by t.preferred_label), '[]'::jsonb)
       from source_coverage_cell_terms ct
       join taxonomy_terms t on t.id = ct.term_id
       join taxonomy_facets f on f.id = t.facet_id
       where ct.coverage_cell_id = c.id) as taxonomy_terms
    from claimed
    join source_coverage_cells c on c.id = claimed.coverage_cell_id
    `, [limit]);
  return result.rows.map((row) => ({ ...row, taxonomyTerms: parseTerms(row.taxonomy_terms) }));
}

function nextRunExpression(cadenceHours: number, failures = 0): string {
  const backoff = Math.min(2 ** Math.max(0, failures), 8);
  const hours = Math.max(1, Math.min(8760, Math.round(cadenceHours * backoff)));
  return String(hours);
}

async function completeQuery(client: PoolClient, query: TaxonomyDiscoveryQuery, cursor?: string): Promise<void> {
  await client.query(`update source_discovery_queries set status = 'complete', last_run_at = now(), next_run_at = now() + ($2 || ' hours')::interval, cursor = $3, consecutive_failures = 0, last_error = null, updated_at = now() where id = $1`, [query.id, String(Math.max(1, query.cadenceHours)), cursor ?? null]);
}

async function failQuery(client: PoolClient, query: TaxonomyDiscoveryQuery, error: string): Promise<void> {
  const failures = query.consecutiveFailures + 1;
  await client.query(`update source_discovery_queries set status = 'failed', next_run_at = now() + ($2 || ' hours')::interval, consecutive_failures = $3, last_error = $4, updated_at = now() where id = $1`, [query.id, nextRunExpression(query.cadenceHours, failures), failures, error.slice(0, 500)]);
}

async function existingUrls(client: PoolClient, urls: string[]): Promise<Set<string>> {
  if (!urls.length) return new Set();
  const result = await client.query<{ normalized_url: string }>(`select normalized_url from source_discovery_candidates where normalized_url = any($1::text[])
    union select lower(regexp_replace(data->>'url', '/$', '')) from radar_sources where lower(regexp_replace(data->>'url', '/$', '')) = any($1::text[])`, [urls]);
  return new Set(result.rows.map((row) => row.normalized_url));
}

async function persistCandidates(client: PoolClient, query: TaxonomyDiscoveryQuery, response: TaxonomySearchResponse): Promise<{ discovered: number; duplicates: number; blocked: number }> {
  const normalized = deduplicateCandidateUrls(response.results.map((result) => result.url));
  const byUrl = new Map(response.results.map((result) => [normalizeUrl(result.url), result] as const));
  const existing = await existingUrls(client, normalized);
  const seenThisTick = new Set<string>();
  let discovered = 0;
  let duplicates = 0;
  let blocked = 0;
  for (const url of normalized) {
    const result = byUrl.get(url);
    if (!result) continue;
    const policyBlocked = result.robotsAllowed === false || result.termsAllowed === false || Boolean(result.blockedReason);
    const duplicate = existing.has(url) || seenThisTick.has(url);
    const status = policyBlocked ? "blocked" : duplicate ? "duplicate" : "discovered";
    if (policyBlocked) blocked++;
    else if (duplicate) duplicates++;
    else discovered++;
    await client.query(`insert into source_discovery_candidates (id, query_id, url, normalized_url, title, snippet, proposed_kind, proposed_tier, status, score, rejection_reason, discovered_at, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
      on conflict (query_id, normalized_url) do update set title = coalesce(excluded.title, source_discovery_candidates.title), snippet = coalesce(excluded.snippet, source_discovery_candidates.snippet), proposed_kind = coalesce(excluded.proposed_kind, source_discovery_candidates.proposed_kind), proposed_tier = coalesce(excluded.proposed_tier, source_discovery_candidates.proposed_tier), score = greatest(source_discovery_candidates.score, excluded.score), updated_at = now()`, [candidateId(query.id, url), query.id, result.url, url, result.title ?? null, result.snippet ?? null, result.proposedKind ?? null, result.proposedTier ?? null, status, result.score ?? 25, policyBlocked ? (result.blockedReason ?? "robots or terms preflight blocked") : duplicate ? "duplicate candidate URL" : null]);
    seenThisTick.add(url);
    existing.add(url);
  }
  return { discovered, duplicates, blocked };
}

export async function runTaxonomyDiscoveryWorkerTick(options: TaxonomyDiscoveryWorkerOptions = {}): Promise<TaxonomyDiscoveryTickResult> {
  const provider = options.provider ?? taxonomySearchProviderFromEnv();
  if (!provider) return { status: "unavailable", queriesClaimed: 0, queriesCompleted: 0, candidatesDiscovered: 0, duplicates: 0, blocked: 0, failures: 0 };
  const logger = options.logger ?? console;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let locked = false;
  try {
    if (!(await taxonomyTablesPresent(client))) return { status: "unavailable", queriesClaimed: 0, queriesCompleted: 0, candidatesDiscovered: 0, duplicates: 0, blocked: 0, failures: 0 };
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_lock($1) locked", [LOCK_KEY]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) return { status: "skipped", queriesClaimed: 0, queriesCompleted: 0, candidatesDiscovered: 0, duplicates: 0, blocked: 0, failures: 0 };
    await client.query("begin");
    const queries = await claimQueries(client, bounded(options.maxQueries, taxonomyDiscoveryBatchSize(), MAX_BATCH_SIZE));
    await client.query("commit");
    const result: TaxonomyDiscoveryTickResult = { status: "completed", queriesClaimed: queries.length, queriesCompleted: 0, candidatesDiscovered: 0, duplicates: 0, blocked: 0, failures: 0 };
    const limit = bounded(options.resultLimit, taxonomyDiscoveryResultLimit(), MAX_RESULT_LIMIT);
    for (const query of queries) {
      try {
        const response = parseTaxonomySearchResponse(await provider.search({ query: query.query, locale: query.locale, cursor: query.cursor, limit, context: { opportunityType: query.opportunityType, geographyCode: query.geographyCode, languageCode: query.languageCode, sourceTier: query.sourceTier, taxonomyTerms: query.taxonomyTerms } }), limit);
        await client.query("begin");
        const counts = await persistCandidates(client, query, response);
        await completeQuery(client, query, response.nextCursor);
        await client.query("commit");
        result.queriesCompleted++;
        result.candidatesDiscovered += counts.discovered;
        result.duplicates += counts.duplicates;
        result.blocked += counts.blocked;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        result.failures++;
        await failQuery(client, query, error instanceof Error ? error.message : "search provider failed");
        logger.warn(`[missa-taxonomy-discovery] query ${query.id} failed`, error);
      }
    }
    logger.info(`[missa-taxonomy-discovery] claimed=${result.queriesClaimed} completed=${result.queriesCompleted} candidates=${result.candidatesDiscovered} duplicates=${result.duplicates} blocked=${result.blocked} failures=${result.failures}`);
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    logger.error("[missa-taxonomy-discovery] tick failed", error);
    throw error;
  } finally {
    if (locked) await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function runTaxonomyDiscoveryWorker(options: TaxonomyDiscoveryWorkerOptions & { intervalMs?: number; signal?: AbortSignal } = {}): Promise<void> {
  const intervalMs = Math.max(60_000, options.intervalMs ?? Number(process.env.MISSA_TAXONOMY_DISCOVERY_INTERVAL_MINUTES ?? 15) * 60_000);
  while (!options.signal?.aborted) {
    try { await runTaxonomyDiscoveryWorkerTick(options); }
    catch (error) { options.logger?.error("[missa-taxonomy-discovery] tick failed; retrying", error); }
    await sleep(intervalMs);
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required to run the Missa taxonomy discovery agent."); process.exitCode = 1; return; }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log("[missa-taxonomy-discovery] taxonomy query lane started");
  const telemetryPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const workerRunId = await startWorkerRun(telemetryPool, "taxonomy-discovery-worker");
  try {
    await runTaxonomyDiscoveryWorker({ signal: controller.signal, logger: console });
    await heartbeatWorkerRun(telemetryPool, workerRunId, "taxonomy-discovery-worker");
    await finishWorkerRun(telemetryPool, workerRunId, "taxonomy-discovery-worker", controller.signal.aborted ? "cancelled" : "completed");
  } catch (error) {
    await finishWorkerRun(telemetryPool, workerRunId, "taxonomy-discovery-worker", "failed", { lastError: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await telemetryPool.end();
  }
}

if (process.argv[1]?.endsWith("taxonomyDiscoveryWorker.js")) void main();
