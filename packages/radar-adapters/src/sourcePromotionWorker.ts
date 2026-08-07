#!/usr/bin/env node

/**
 * Verify and promote source-discovery candidates into Radar's canonical source
 * lane. This is a source gate only: it never creates or publishes an
 * opportunity. A promotion requires an HTML page, a canonical URL signal, a
 * robots allow decision, and no explicit anti-automation language in the page
 * or linked terms/policy page.
 */
import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { Source, SourceKind } from "@missa/radar-engine";
import { robotsAllowsPath } from "./sourcePolicy.js";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from "./workerTelemetry.js";

const USER_AGENT = "MissaRadar/1.0 (+https://www.usemissa.com; source-verification; evidence-only)";
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 250;
const DEFAULT_CONCURRENCY = 12;
const MAX_CONCURRENCY = 32;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TERMS_BYTES = 500_000;
const SOURCE_PROMOTION_LOCK = { namespace: 1984, key: 730 } as const;
const ACCEPTED_KINDS = new Set<SourceKind>([
  "organization-website",
  "directory",
  "feed",
  "newsletter",
  "user-suggested",
  "partner-feed",
]);

const CALL_SIGNAL = /(?:open[- ]?call|call for|submission|contest|prize|award|fellowship|grant|residen|fund|deadline|entry|reading[- ]?period|artist[- ]?program)/i;
const ACTION_SIGNAL = /(?:apply(?: now| here)?|submit(?: now| here)?|call for (?:submissions?|entries?|applications?|proposals?)|open[- ]?call|submissions? (?:are|is) (?:open|due)|application(?:s)? (?:are|is) (?:open|due)|deadline|nominate|enter(?: now| here)?)/i;
const ANTI_AUTOMATION_SIGNAL = /(?:do not|don't|no|not|never|prohibit|prohibited|forbidden|禁止).{0,80}(?:scrap(?:e|ing)|crawl(?:ing)?|bot|automated access|automated collection|data extraction)|(?:scrap(?:e|ing)|crawl(?:ing)?|bot|automated access|automated collection|data extraction).{0,80}(?:prohibit|forbidden|not allowed|not permitted|no automated)/i;
const IRRELEVANT_PATH = /(?:^|\/)(?:jobs?|careers?|employment|admissions?|volunteer|wiki|privacy|terms)(?:\/|$)/i;

export type SourcePromotionDecision = "accepted" | "rejected" | "needs-human";

export interface SourceVerificationEvidence {
  candidateUrl: string;
  finalUrl?: string;
  canonicalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  title?: string;
  robots: "allowed" | "blocked" | "review";
  terms: "allowed" | "blocked" | "review";
  callSignals: string[];
  reason: string;
  checkedAt: string;
}

export interface SourceVerificationResult {
  decision: SourcePromotionDecision;
  evidence: SourceVerificationEvidence;
  source?: Source;
}

export interface SourcePromotionWorkerOptions {
  maxCandidates?: number;
  concurrency?: number;
  intervalMs?: number;
  signal?: AbortSignal;
  logger?: Pick<Console, "info" | "warn" | "error">;
  workerKind?: "source-promotion-worker" | "research-worker";
  /** Explicit operator approval is required for writes to radar_sources. */
  promotionMode?: "review" | "promote";
}

export interface SourcePromotionTickResult {
  status: "completed" | "unavailable" | "skipped";
  candidatesClaimed: number;
  accepted: number;
  rejected: number;
  needsHuman: number;
  promoted: number;
  failures: number;
}

interface CandidateRow {
  id: string;
  url: string;
  normalized_url: string;
  title: string | null;
  proposed_kind: string | null;
  score: number;
}

interface DocumentResult {
  html: string;
  finalUrl: string;
  status: number;
  contentType: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      chunks.push(decoder.decode(next.value, { stream: bytes < maxBytes }));
      if (bytes >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return chunks.join("").slice(0, maxBytes);
}

function bounded(value: string | number | undefined, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function sourcePromotionBatchSize(value: string | number | undefined = process.env.MISSA_SOURCE_PROMOTION_BATCH_SIZE): number {
  return bounded(value, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
}

export function sourcePromotionConcurrency(value: string | number | undefined = process.env.MISSA_SOURCE_PROMOTION_CONCURRENCY): number {
  return bounded(value, DEFAULT_CONCURRENCY, MAX_CONCURRENCY);
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

function text(value: string, max: number): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function titleOf(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const value = match?.[1] ? text(match[1], 240) : "";
  return value || undefined;
}

function mainTextOf(html: string): string {
  const main = html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] ?? html;
  return text(main.replace(/<(?:nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside)>/gi, " "), 40_000);
}

function canonicalOf(html: string, baseUrl: string): string | undefined {
  const match = [...html.matchAll(/<link\b[^>]*>/gi)].find((item) => /\brel=["'][^"']*canonical[^"']*["']/i.test(item[0] ?? ""));
  const href = match?.[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) return undefined;
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

function linksForPolicy(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = text(match[2] ?? "", 120).toLowerCase();
    if (!/(?:terms|legal|policy|acceptable use|usage)/i.test(label)) continue;
    try {
      const url = new URL(match[1]!, baseUrl);
      if (url.origin === new URL(baseUrl).origin && (url.protocol === "https:" || url.protocol === "http:")) links.push(url.href);
    } catch { /* ignore malformed policy links */ }
  }
  return [...new Set(links)].slice(0, 3);
}

async function fetchDocument(fetchImpl: FetchLike, url: string, maxBytes: number): Promise<DocumentResult> {
  const response = await fetchImpl(url, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(Number(process.env.MISSA_SOURCE_PROMOTION_TIMEOUT_MS ?? 15_000)),
  });
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const html = await readLimitedText(response, maxBytes);
  return { html, finalUrl: response.url || url, status: response.status, contentType };
}

async function robotsDecision(fetchImpl: FetchLike, pageUrl: string): Promise<{ decision: "allowed" | "blocked" | "review"; detail: string }> {
  let origin: string;
  try { origin = new URL(pageUrl).origin; } catch { return { decision: "blocked", detail: "invalid source URL" }; }
  try {
    const response = await fetchImpl(`${origin}/robots.txt`, {
      headers: { accept: "text/plain", "user-agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 404 || response.status === 410) return { decision: "allowed", detail: "robots.txt not published" };
    if (!response.ok) return { decision: "review", detail: `robots.txt HTTP ${response.status}` };
    const body = await readLimitedText(response, 200_000);
    const path = new URL(pageUrl).pathname;
    return robotsAllowsPath(body, path, USER_AGENT)
      ? { decision: "allowed", detail: "robots.txt allows the candidate path" }
      : { decision: "blocked", detail: "robots.txt disallows the candidate path" };
  } catch (error) {
    return { decision: "review", detail: error instanceof Error ? `robots.txt unavailable: ${error.message}` : "robots.txt unavailable" };
  }
}

export async function verifySourceCandidate(
  candidate: Pick<CandidateRow, "url" | "title">,
  options: { fetchImpl?: FetchLike; now?: Date } = {},
): Promise<SourceVerificationResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const checkedAt = (options.now ?? new Date()).toISOString();
  const evidence: SourceVerificationEvidence = {
    candidateUrl: candidate.url,
    robots: "review",
    terms: "review",
    callSignals: [],
    ...(candidate.title ? { title: candidate.title } : {}),
    reason: "verification not completed",
    checkedAt,
  };
  const robots = await robotsDecision(fetchImpl, candidate.url);
  evidence.robots = robots.decision;
  if (robots.decision === "blocked") {
    evidence.reason = robots.detail;
    return { decision: "rejected", evidence };
  }
  if (robots.decision === "review") {
    evidence.reason = robots.detail;
    return { decision: "needs-human", evidence };
  }

  let document: DocumentResult;
  try {
    document = await fetchDocument(fetchImpl, candidate.url, MAX_HTML_BYTES);
  } catch (error) {
    evidence.reason = error instanceof Error ? `candidate fetch failed: ${error.message}` : "candidate fetch failed";
    return { decision: "needs-human", evidence };
  }
  evidence.finalUrl = document.finalUrl;
  evidence.httpStatus = document.status;
  evidence.contentType = document.contentType;
  evidence.canonicalUrl = canonicalOf(document.html, document.finalUrl);
  const visible = mainTextOf(document.html);
  const signals = [
    ...(ACTION_SIGNAL.test(visible) ? ["action"] : []),
    ...(CALL_SIGNAL.test(visible) ? ["opportunity"] : []),
    ...(canonicalOf(document.html, document.finalUrl) ? ["canonical-link"] : []),
  ];
  evidence.callSignals = signals;

  if (document.status === 404 || document.status === 410) {
    evidence.reason = `candidate page is gone (HTTP ${document.status})`;
    return { decision: "rejected", evidence };
  }
  if (document.status < 200 || document.status >= 400 || !/^(?:text\/(?:html|plain)|application\/xhtml\+xml)$/.test(document.contentType)) {
    evidence.reason = `not a usable HTML page (HTTP ${document.status}, ${document.contentType || "unknown content type"})`;
    return { decision: "rejected", evidence };
  }
  if (IRRELEVANT_PATH.test(new URL(document.finalUrl).pathname)) {
    evidence.reason = "page path is not an opportunity source page";
    return { decision: "rejected", evidence };
  }
  if (!ACTION_SIGNAL.test(visible) || !CALL_SIGNAL.test(visible)) {
    evidence.reason = "page lacks both an opportunity signal and an application/action signal";
    return { decision: "rejected", evidence };
  }

  const policyUrls = linksForPolicy(document.html, document.finalUrl);
  try {
    for (const policyUrl of policyUrls) {
      const policy = await fetchDocument(fetchImpl, policyUrl, MAX_TERMS_BYTES);
      if (ANTI_AUTOMATION_SIGNAL.test(text(policy.html, 40_000))) {
        evidence.terms = "blocked";
        evidence.reason = `linked policy explicitly restricts automated access: ${policyUrl}`;
        return { decision: "rejected", evidence };
      }
    }
    evidence.terms = "allowed";
  } catch (error) {
    evidence.reason = error instanceof Error ? `terms/policy check failed: ${error.message}` : "terms/policy check failed";
    return { decision: "needs-human", evidence };
  }
  if (ANTI_AUTOMATION_SIGNAL.test(visible)) {
    evidence.terms = "blocked";
    evidence.reason = "page explicitly restricts automated access";
    return { decision: "rejected", evidence };
  }
  if (!evidence.canonicalUrl) {
    evidence.reason = "page passed content and policy checks but has no canonical link; human confirmation required";
    return { decision: "needs-human", evidence };
  }

  evidence.reason = "canonical opportunity page passed HTML, robots, terms, and evidence checks";
  return { decision: "accepted", evidence };
}

function sourceIdFor(url: string): string {
  return `source_${createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 32)}`;
}

function sourceName(candidate: CandidateRow, finalUrl: string): string {
  if (candidate.title?.trim()) return candidate.title.trim().slice(0, 240);
  try { return new URL(finalUrl).hostname.replace(/^www\./, ""); } catch { return "Verified opportunity source"; }
}

function sourceKind(value: string | null): SourceKind {
  return value && ACCEPTED_KINDS.has(value as SourceKind) ? value as SourceKind : "organization-website";
}

async function claimCandidates(client: PoolClient, limit: number): Promise<CandidateRow[]> {
  const result = await client.query<CandidateRow>(`with due as (
      select id from source_discovery_candidates
      where status = 'discovered'
      order by score desc, discovered_at asc, id asc
      for update skip locked limit $1
    ), claimed as (
      update source_discovery_candidates c
      set status = 'reviewing', updated_at = now()
      from due where c.id = due.id returning c.*
    ) select id, url, normalized_url, title, proposed_kind, score from claimed`, [limit]);
  return result.rows;
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

async function persistResult(client: PoolClient, candidate: CandidateRow, result: SourceVerificationResult, promote: boolean): Promise<boolean> {
  const evidence = JSON.stringify({ verifier: "missa-source-verifier-v1", ...result.evidence });
  if (result.decision !== "accepted" || !promote) {
    await client.query(
      `update source_discovery_candidates
       set status = $2, rejection_reason = $3, reviewed_at = case when $2 in ('accepted', 'rejected') then now() else reviewed_at end, updated_at = now()
       where id = $1`,
      [candidate.id, result.decision === "accepted" ? "reviewing" : result.decision === "rejected" ? "rejected" : "reviewing", evidence],
    );
    return false;
  }
  const source = {
    id: sourceIdFor(result.evidence.canonicalUrl ?? result.evidence.finalUrl ?? candidate.url),
    name: sourceName(candidate, result.evidence.canonicalUrl ?? result.evidence.finalUrl ?? candidate.url),
    url: result.evidence.canonicalUrl ?? result.evidence.finalUrl ?? candidate.url,
    kind: sourceKind(candidate.proposed_kind),
    active: true,
    checkIntervalHours: 168,
    registryTier: 0,
    followsOutboundLinks: false,
    consecutiveFailures: 0,
    verification: { ...result.evidence, reviewer: "operator-approved", promotedAt: new Date().toISOString() },
  };
  await client.query(
    `insert into radar_sources (id, organization_id, active, data)
     values ($1, null, true, $2::jsonb)
     on conflict (id) do update set active = true, data = excluded.data`,
    [source.id, JSON.stringify(source)],
  );
  await client.query(
    `insert into opportunity_sources
       (id, name, url, canonical_url, normalized_url, source_tier, kind, active,
        follows_outbound_links, check_interval_hours, robots_status, terms_status, health_status)
     values ($1, $2, $3, $4, $5, 0, $6, true, false, 168, 'allowed', 'allowed', 'unknown')
     on conflict (id) do update set
       name = excluded.name, url = excluded.url, canonical_url = excluded.canonical_url,
       normalized_url = excluded.normalized_url, source_tier = 0, kind = excluded.kind,
       active = true, robots_status = 'allowed', terms_status = 'allowed', updated_at = now()`,
    [source.id, source.name, source.url, source.url, normalizeUrl(source.url), source.kind],
  );
  await client.query(
    `update source_discovery_candidates
     set status = 'accepted', promoted_source_id = $2, rejection_reason = $3,
         reviewed_at = now(), updated_at = now()
     where id = $1`,
    [candidate.id, source.id, evidence],
  );
  return true;
}

export async function runSourcePromotionWorkerTick(options: Omit<SourcePromotionWorkerOptions, "intervalMs" | "signal"> = {}): Promise<SourcePromotionTickResult> {
  const logger = options.logger ?? console;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client: PoolClient | undefined;
  let locked = false;
  try {
    client = await pool.connect();
    const tables = await client.query<{ ready: boolean }>(`select to_regclass('public.source_discovery_candidates') is not null and to_regclass('public.radar_sources') is not null and to_regclass('public.opportunity_sources') is not null as ready`);
    if (!tables.rows[0]?.ready) return { status: "unavailable", candidatesClaimed: 0, accepted: 0, rejected: 0, needsHuman: 0, promoted: 0, failures: 0 };
    await client.query("begin");
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_xact_lock($1, $2) as locked", [SOURCE_PROMOTION_LOCK.namespace, SOURCE_PROMOTION_LOCK.key]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) { await client.query("rollback"); return { status: "skipped", candidatesClaimed: 0, accepted: 0, rejected: 0, needsHuman: 0, promoted: 0, failures: 0 }; }
    const candidates = await claimCandidates(client, sourcePromotionBatchSize(options.maxCandidates));
    await client.query("commit");

    const results = await mapConcurrent(candidates, sourcePromotionConcurrency(options.concurrency), async (candidate) => {
      try { return { candidate, result: await verifySourceCandidate(candidate) }; }
      catch (error) {
        return { candidate, result: { decision: "needs-human" as const, evidence: { candidateUrl: candidate.url, robots: "review" as const, terms: "review" as const, callSignals: [], reason: error instanceof Error ? error.message : "verification failed", checkedAt: new Date().toISOString() } } };
      }
    });
    const counts = { accepted: 0, rejected: 0, needsHuman: 0, promoted: 0, failures: 0 };
    for (const item of results) {
      if (item.result.decision === "accepted") counts.accepted++;
      else if (item.result.decision === "rejected") counts.rejected++;
      else counts.needsHuman++;
      try {
        await client.query("begin");
        if (await persistResult(client, item.candidate, item.result, options.promotionMode === "promote")) counts.promoted++;
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        counts.failures++;
        logger.warn("[missa-source-promotion] failed to persist candidate", item.candidate.id, error);
      }
    }
    logger.info(`[missa-source-promotion] claimed=${candidates.length} accepted=${counts.accepted} rejected=${counts.rejected} needs-human=${counts.needsHuman} promoted=${counts.promoted} failures=${counts.failures} mode=${options.promotionMode ?? "review"}`);
    return { status: "completed", candidatesClaimed: candidates.length, ...counts };
  } finally {
    if (client) {
      if (locked) await client.query("rollback").catch(() => undefined);
      client.release();
    }
    await pool.end();
  }
}

export async function runSourcePromotionWorker(options: SourcePromotionWorkerOptions = {}): Promise<void> {
  const logger = options.logger ?? console;
  const intervalMs = options.intervalMs ?? Math.max(60_000, Number(process.env.MISSA_SOURCE_PROMOTION_INTERVAL_MINUTES ?? 5) * 60_000);
  const workerKind = options.workerKind ?? "source-promotion-worker";
  const telemetryPool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 1 }) : undefined;
  const runId = telemetryPool ? await startWorkerRun(telemetryPool, workerKind) : undefined;
  try {
    while (!options.signal?.aborted) {
      try {
        const result = await runSourcePromotionWorkerTick(options);
        await heartbeatWorkerRun(telemetryPool!, runId, workerKind, { inputCount: result.candidatesClaimed, outputCount: result.promoted });
      } catch (error) {
        await heartbeatWorkerRun(telemetryPool!, runId, workerKind, { lastError: error instanceof Error ? error.message : String(error) });
        logger.error("[missa-source-promotion] tick failed; retrying", error);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } finally {
    await finishWorkerRun(telemetryPool!, runId, workerKind, "cancelled");
    await telemetryPool?.end();
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to run the Missa source-promotion worker.");
    process.exitCode = 1;
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log(`[missa-source-promotion] running every ${process.env.MISSA_SOURCE_PROMOTION_INTERVAL_MINUTES ?? 5} minutes, batch=${sourcePromotionBatchSize()}, mode=${process.env.MISSA_SOURCE_PROMOTION_MODE ?? "review"}`);
  await runSourcePromotionWorker({
    maxCandidates: sourcePromotionBatchSize(),
    concurrency: sourcePromotionConcurrency(),
    intervalMs: Math.max(60_000, Number(process.env.MISSA_SOURCE_PROMOTION_INTERVAL_MINUTES ?? 5) * 60_000),
    promotionMode: process.env.MISSA_SOURCE_PROMOTION_MODE === "promote" ? "promote" : "review",
    signal: controller.signal,
    logger: console,
  });
}

if (process.argv[1]?.endsWith("sourcePromotionWorker.js")) void main();
