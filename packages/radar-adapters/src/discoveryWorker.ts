#!/usr/bin/env node

/**
 * High-throughput discovery lane.
 *
 * Directory and feed pages are not canonical opportunities. We fetch them in
 * a bounded fan-out pass, extract only links that look like actual calls, and
 * register those links as tier-0 sources for Radar's normal evidence pipeline.
 * Nothing discovered here is published directly.
 */
import { contentHash, type Source } from "@missa/radar-engine";
import { DISCOVERY_INGESTION_LOCK, releaseAdvisoryLock, tryAdvisoryLock } from "./radarWorker.js";
import { Pool, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun, type RadarWorkerKind } from "./workerTelemetry.js";

const USER_AGENT = "MissaRadar/1.0 (+https://www.usemissa.com; discovery; evidence-only)";
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 250;
const DEFAULT_LINKS_PER_PAGE = 50;
const MAX_LINKS_PER_PAGE = 100;
const MAX_NEW_SOURCES_PER_TICK = 500;
const MAX_HTML_BYTES = 2_000_000;

export interface DiscoveryWorkerOptions {
  maxSources?: number;
  maxLinksPerSource?: number;
  maxNewSources?: number;
  intervalMs?: number;
  signal?: AbortSignal;
  logger?: Pick<Console, "info" | "error" | "warn">;
  workerKind?: RadarWorkerKind;
}

export interface DiscoveryLink {
  url: string;
  title?: string;
}

export interface DiscoveryTickResult {
  status: "completed" | "skipped";
  sourcesChecked: number;
  linksFound: number;
  sourcesAdded: number;
  failures: number;
}

function bounded(value: string | number | undefined, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function discoveryBatchSize(value: string | number | undefined = process.env.RADAR_DISCOVERY_BATCH_SIZE): number {
  return bounded(value, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
}

export function discoveryLinkLimit(value: string | number | undefined = process.env.RADAR_DISCOVERY_LINKS_PER_PAGE): number {
  return bounded(value, DEFAULT_LINKS_PER_PAGE, MAX_LINKS_PER_PAGE);
}

/** Only explicit Postgres source metadata may opt a page into outbound fan-out. */
export function isDiscoverySource(source: Pick<Source, "active" | "followsOutboundLinks">): boolean {
  return source.active && source.followsOutboundLinks === true;
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function absoluteHttpUrl(value: string, base: string): string | undefined {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    const lowerPath = url.pathname.toLowerCase();
    if (/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js|woff2?)(?:$|\?)/i.test(lowerPath)) return undefined;
    if (/^(?:mailto|javascript):/i.test(value)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

const CALL_WORDS = /(?:apply|application|submit|submission|open[- ]?call|opportunit|contest|prize|award|fellowship|grant|residen|fund|deadline|entry|call[- ]?for|reading[- ]?period|artist[- ]?program)/i;

/** Extract bounded, evidence-oriented outbound call links from a directory page. */
export function extractDiscoveryLinks(html: string, sourceUrl: string, limit = DEFAULT_LINKS_PER_PAGE): DiscoveryLink[] {
  const results: DiscoveryLink[] = [];
  const seen = new Set<string>();
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = absoluteHttpUrl(match[1]!, sourceUrl);
    const title = match[2]!.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 240);
    if (!url || (!CALL_WORDS.test(url) && !CALL_WORDS.test(title))) continue;
    const key = normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ url, title: title || undefined });
    if (results.length >= limit) break;
  }
  return results;
}

async function fetchHtml(sourceUrl: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(sourceUrl, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(Number(process.env.RADAR_DISCOVERY_TIMEOUT_MS ?? 15_000)),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error(`unsupported content type: ${contentType}`);
  }
  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  return { html, finalUrl: response.url || sourceUrl };
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

type FetchedDirectory = {
  source: Source;
  checkedAt: string;
  html?: string;
  finalUrl?: string;
  links: DiscoveryLink[];
  error?: string;
};

export function discoverySourceUpdatePlaceholders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index * 3;
    return `($${offset + 1}::text, $${offset + 2}::boolean, $${offset + 3}::jsonb)`;
  });
}

export function discoverySourceInsertPlaceholders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index * 4;
    return `($${offset + 1}::text, $${offset + 2}::text, $${offset + 3}::boolean, $${offset + 4}::jsonb)`;
  });
}

async function fetchDirectory(source: Source, linkLimit: number): Promise<FetchedDirectory> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await fetchHtml(source.url);
    return {
      source,
      checkedAt,
      html: result.html,
      finalUrl: result.finalUrl,
      links: extractDiscoveryLinks(result.html, result.finalUrl, linkLimit),
    };
  } catch (error) {
    return { source, checkedAt, links: [], error: error instanceof Error ? error.message : "fetch failed" };
  }
}

function sourceName(link: DiscoveryLink, parent: Source): string {
  if (link.title) return link.title;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return `${parent.name} opportunity`;
  }
}

async function persistDiscoveryResults(
  fetched: FetchedDirectory[],
  maxNewSources: number,
  logger: Pick<Console, "info" | "warn">,
): Promise<{ linksFound: number; sourcesAdded: number }> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let lockClient: PoolClient | undefined;
  let locked = false;
  try {
    lockClient = await pool.connect();
    locked = await tryAdvisoryLock(lockClient, DISCOVERY_INGESTION_LOCK);
    if (!locked) return { linksFound: 0, sourcesAdded: 0 };

    const currentRows = await lockClient.query<{ data: Source }>("select data from radar_sources");
    const currentByUrl = new Map(currentRows.rows.map((row) => [normalizeUrl(row.data.url), row.data] as const));
    const existing = new Set(currentByUrl.keys());
    const linksFound = fetched.reduce((sum, item) => sum + item.links.length, 0);
    let sourcesAdded = 0;
    const newSources: Source[] = [];

    for (const item of fetched) {
      const source = currentRows.rows.find((row) => row.data.id === item.source.id)?.data;
      if (source) {
        source.discoveryLastCheckedAt = item.checkedAt;
        if (item.error) {
          source.discoveryConsecutiveFailures = (source.discoveryConsecutiveFailures ?? 0) + 1;
        } else {
          source.discoveryConsecutiveFailures = 0;
          if (item.html) source.lastFetchedContentHash = contentHash(item.html);
        }
      }
      for (const link of item.links) {
        if (sourcesAdded >= maxNewSources) break;
        const key = normalizeUrl(link.url);
        if (existing.has(key)) continue;
        const added: Source = {
          id: randomUUID(), name: sourceName(link, item.source), url: link.url,
          kind: "organization-website", active: true, checkIntervalHours: 168,
          consecutiveFailures: 0, consecutiveProcessingFailures: 0,
          registryVerticalId: item.source.registryVerticalId, registryGroup: item.source.registryGroup,
          registryDisciplines: item.source.registryDisciplines, registryGeography: item.source.registryGeography,
          registryOpportunityTypes: item.source.registryOpportunityTypes, registryTier: 0,
          followsOutboundLinks: false,
        };
        existing.add(key);
        newSources.push(added);
        sourcesAdded++;
        // Keep the provenance link in the source name only; the canonical page
        // itself is fetched and reviewed by Radar before publication.
        void added;
      }
    }
    // Discovery only mutates source rows. Write those rows directly rather
    // than invoking the full Radar snapshot delta writer (which also dual
    // writes every affected projection and is intentionally heavier).
    const updatedSources = fetched
      .map((item) => currentRows.rows.find((row) => row.data.id === item.source.id)?.data)
      .filter((source): source is Source => Boolean(source));
    if (updatedSources.length) {
      const updateValues = updatedSources.flatMap((source) => [source.id, source.active, JSON.stringify(source)]);
      await lockClient.query(
        `update radar_sources as target set active = incoming.active, data = incoming.data
         from (values ${discoverySourceUpdatePlaceholders(updatedSources.length).join(",")}) as incoming(id, active, data)
         where target.id = incoming.id`,
        updateValues,
      );
    }
    if (newSources.length) {
      const insertValues = newSources.flatMap((source) => [source.id, source.organizationId ?? null, source.active, JSON.stringify(source)]);
      await lockClient.query(
        `insert into radar_sources (id, organization_id, active, data)
         values ${discoverySourceInsertPlaceholders(newSources.length).join(",")}
         on conflict (id) do update set active = excluded.active, data = excluded.data`,
        insertValues,
      );
    }
    logger.info(`[missa-discovery-worker] ${linksFound} candidate links, ${sourcesAdded} new canonical sources`);
    return { linksFound, sourcesAdded };
  } finally {
    if (locked && lockClient) {
      try { await releaseAdvisoryLock(lockClient); } catch (error) { logger.warn("[missa-discovery-worker] failed to release advisory lock", error); }
    }
    lockClient?.release();
    await pool.end();
  }
}

function isDiscoveryDue(source: Source, now: Date): boolean {
  if (!source.discoveryLastCheckedAt) return true;
  const failures = Math.max(0, source.discoveryConsecutiveFailures ?? 0);
  const backoff = Math.min(2 ** failures, 8);
  const configuredHours = Number(process.env.RADAR_DISCOVERY_INTERVAL_HOURS ?? 48);
  const intervalHours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 48;
  return now.getTime() - Date.parse(source.discoveryLastCheckedAt) >= intervalHours * 60 * 60 * 1000 * backoff;
}

export async function runDiscoveryWorkerTick(options: Pick<DiscoveryWorkerOptions, "maxSources" | "maxLinksPerSource" | "maxNewSources" | "logger"> = {}): Promise<DiscoveryTickResult> {
  const logger = options.logger ?? console;
  const maxSources = discoveryBatchSize(options.maxSources);
  const linkLimit = discoveryLinkLimit(options.maxLinksPerSource);
  const maxNewSources = bounded(options.maxNewSources, MAX_NEW_SOURCES_PER_TICK, MAX_NEW_SOURCES_PER_TICK);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sourceRows = await pool.query<{ data: Source }>("select data from radar_sources");
  await pool.end();
  const now = new Date();
  const candidates = sourceRows.rows.map((row) => row.data)
    .filter((source) => isDiscoverySource(source) && isDiscoveryDue(source, now))
    .slice(0, maxSources);
  const fetched = await mapConcurrent(candidates, Number(process.env.RADAR_DISCOVERY_CONCURRENCY ?? 16), (source) => fetchDirectory(source, linkLimit));
  const failures = fetched.filter((item) => item.error).length;
  const persisted = await persistDiscoveryResults(fetched, maxNewSources, logger);
  return { status: "completed", sourcesChecked: candidates.length, linksFound: persisted.linksFound, sourcesAdded: persisted.sourcesAdded, failures };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

export async function runDiscoveryWorker(options: DiscoveryWorkerOptions = {}): Promise<void> {
  const logger = options.logger ?? console;
  const intervalMs = options.intervalMs ?? Math.max(60_000, Number(process.env.RADAR_DISCOVERY_INTERVAL_MINUTES ?? 5) * 60_000);
  const workerKind = options.workerKind ?? "discovery-worker";
  const telemetryPool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 1 }) : undefined;
  const workerRunId = telemetryPool ? await startWorkerRun(telemetryPool, workerKind) : undefined;
  try {
    while (!options.signal?.aborted) {
      try {
        await heartbeatWorkerRun(telemetryPool!, workerRunId, workerKind);
        const result = await runDiscoveryWorkerTick(options);
        await heartbeatWorkerRun(telemetryPool!, workerRunId, workerKind, { inputCount: result.sourcesChecked, outputCount: result.sourcesAdded });
        logger.info(`[missa-discovery-worker] checked=${result.sourcesChecked} failures=${result.failures} added=${result.sourcesAdded}`);
      } catch (error) {
        await heartbeatWorkerRun(telemetryPool!, workerRunId, workerKind, { lastError: error instanceof Error ? error.message : String(error) });
        logger.error("[missa-discovery-worker] tick failed; retrying after interval", error);
      }
      await sleep(intervalMs, options.signal);
    }
  } finally {
    await finishWorkerRun(telemetryPool!, workerRunId, workerKind, "cancelled");
    await telemetryPool?.end();
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to run the Missa discovery agent.");
    process.exitCode = 1;
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log("[missa-discovery-worker] fan-out lane started");
  await runDiscoveryWorker({ signal: controller.signal });
}

if (process.argv[1]?.endsWith("discoveryWorker.js")) void main();
