#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { ensureEnrichmentSchema } from "./enrichmentSchema.js";

type JobKind = "media" | "winners" | "guidelines";
type ClaimedJob = {
  id: string;
  opportunityId: string;
  kind: JobKind;
  attempts: number;
  sourceUrl: string;
  title: string;
};

const USER_AGENT = "MissaRadar/1.0 (+https://www.usemissa.com; enrichment; evidence-only)";

function batchSize(value = process.env.RADAR_ENRICHMENT_BATCH_SIZE): number {
  const parsed = Number(value ?? 20);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.floor(parsed))) : 20;
}

function intervalMs(): number {
  const minutes = Number(process.env.RADAR_ENRICHMENT_INTERVAL_MINUTES ?? 10);
  return Number.isFinite(minutes) && minutes > 0 ? Math.max(60_000, Math.round(minutes * 60_000)) : 600_000;
}

function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 900);
}

function metaContent(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2];
}

function pageTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : undefined;
}

function extractImage(html: string, sourceUrl: string): string | undefined {
  const candidate = metaContent(html, "og:image") ?? metaContent(html, "twitter:image") ?? html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1];
  return absoluteUrl(candidate, sourceUrl);
}

function extractLinks(html: string, sourceUrl: string, pattern: RegExp): Array<{ url: string; title?: string }> {
  const results: Array<{ url: string; title?: string }> = [];
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = absoluteUrl(match[1], sourceUrl);
    const label = cleanText(match[2]);
    if (!url || (!pattern.test(url) && !pattern.test(label))) continue;
    results.push({ url, title: label || undefined });
    if (results.length >= 10) break;
  }
  return results;
}

function excerptFor(html: string, pattern: RegExp): string | undefined {
  const text = cleanText(html);
  return text.match(new RegExp(`.{0,180}${pattern.source}.{0,420}`, "i"))?.[0]?.trim();
}

async function fetchHtml(sourceUrl: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.RADAR_ENRICHMENT_TIMEOUT_MS ?? 8_000));
  try {
    const response = await fetch(sourceUrl, {
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error(`unsupported content type: ${contentType || "unknown"}`);
    return { html: (await response.text()).slice(0, 2_000_000), finalUrl: response.url || sourceUrl };
  } finally {
    clearTimeout(timeout);
  }
}

async function seedJobs(client: PoolClient): Promise<void> {
  await client.query(
    `insert into radar_enrichment_jobs (id, opportunity_id, kind, priority, payload)
     select md5(o.id || ':' || kinds.kind), o.id, kinds.kind,
       case when o.deadline_date is not null and o.deadline_date <= current_date + 30 then 20 else 0 end,
       jsonb_build_object('title', o.title)
     from opportunities o
     cross join (values ('media'::text), ('winners'::text), ('guidelines'::text)) as kinds(kind)
     where o.publication_state in ('published', 'reviewable')
     on conflict (opportunity_id, kind) do nothing`,
  );
}

async function claimJobs(client: PoolClient, limit: number): Promise<ClaimedJob[]> {
  const { rows } = await client.query<ClaimedJob>(
    `with next_jobs as (
       select j.id
       from radar_enrichment_jobs j
       where j.status in ('queued', 'failed')
         and j.next_attempt_at <= now()
         and (j.lease_until is null or j.lease_until < now())
       order by j.priority desc, j.created_at asc
       for update skip locked
       limit $1
     )
     update radar_enrichment_jobs j
     set status = 'processing', attempts = j.attempts + 1,
         lease_until = now() + interval '5 minutes', updated_at = now(), last_error = null
     from next_jobs n, opportunities o
     left join opportunity_sources s on s.id = o.source_id
     where j.id = n.id and o.id = j.opportunity_id
     returning j.id, j.opportunity_id as "opportunityId", j.kind,
       j.attempts, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl", o.title`,
    [limit],
  );
  return rows.filter((row) => Boolean(row.sourceUrl));
}

async function writeEvidence(client: PoolClient, job: ClaimedJob, evidence: { url: string; title?: string; excerpt?: string; mediaUrl?: string; kind: "media" | "winner" | "guideline"; confidence?: "confirmed" | "probable" | "unknown" }): Promise<void> {
  await client.query(
    `insert into radar_opportunity_enrichment_evidence
       (id, opportunity_id, job_id, kind, url, title, excerpt, media_url, confidence, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     on conflict (opportunity_id, kind, url) do update set
       title = excluded.title, excerpt = excluded.excerpt, media_url = excluded.media_url,
       confidence = excluded.confidence, metadata = excluded.metadata, retrieved_at = now()`,
    [randomUUID(), job.opportunityId, job.id, evidence.kind, evidence.url, evidence.title ?? null, evidence.excerpt ?? null, evidence.mediaUrl ?? null, evidence.confidence ?? "unknown", JSON.stringify({ source: "public-page", jobKind: job.kind })],
  );
  if (evidence.kind === "media" && evidence.mediaUrl) {
    await client.query(
      `insert into opportunity_identity_assets (id, opportunity_id, url, alt, kind, rights_status, source_url)
       values ($1, $2, $3, $4, 'organization-mark', 'unknown', $5)
       on conflict do nothing`,
      [randomUUID(), job.opportunityId, evidence.mediaUrl, evidence.title ?? job.title, evidence.url],
    );
  }
}

async function completeJob(client: PoolClient, job: ClaimedJob, payload: Record<string, unknown>): Promise<void> {
  await client.query(
    `update radar_enrichment_jobs set status = 'completed', completed_at = now(), lease_until = null, payload = payload || $2::jsonb, updated_at = now() where id = $1`,
    [job.id, JSON.stringify(payload)],
  );
}

async function failJob(client: PoolClient, job: ClaimedJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(job.attempts, 8));
  await client.query(
    `update radar_enrichment_jobs set status = case when attempts >= 8 then 'blocked' else 'failed' end, last_error = $2, next_attempt_at = now() + ($3 || ' minutes')::interval, lease_until = null, updated_at = now() where id = $1`,
    [job.id, message.slice(0, 500), String(delayMinutes)],
  );
}

async function processJob(client: PoolClient, job: ClaimedJob): Promise<void> {
  const { html, finalUrl } = await fetchHtml(job.sourceUrl);
  if (job.kind === "media") {
    const mediaUrl = extractImage(html, finalUrl);
    if (mediaUrl) await writeEvidence(client, job, { kind: "media", url: finalUrl, mediaUrl, title: pageTitle(html), confidence: "probable" });
    await completeJob(client, job, { mediaFound: Boolean(mediaUrl), checkedUrl: finalUrl });
    return;
  }
  if (job.kind === "winners") {
    const links = extractLinks(html, finalUrl, /winner|alumni|recipient|selected|honou?r|past[- ]?award/i);
    for (const link of links) await writeEvidence(client, job, { kind: "winner", url: link.url, title: link.title, excerpt: excerptFor(html, /winner|recipient|alumni/i), confidence: "probable" });
    await completeJob(client, job, { winnerLinks: links.length, checkedUrl: finalUrl });
    return;
  }
  const links = extractLinks(html, finalUrl, /guideline|submission|apply|application/i);
  for (const link of links) await writeEvidence(client, job, { kind: "guideline", url: link.url, title: link.title, excerpt: excerptFor(html, /guideline|submission|application/i), confidence: "probable" });
  await completeJob(client, job, { guidelineLinks: links.length, checkedUrl: finalUrl });
}

async function tick(pool: Pool, limit: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await seedJobs(client);
    const jobs = await claimJobs(client, limit);
    await client.query("commit");
    let completed = 0;
    for (const job of jobs) {
      const worker = await pool.connect();
      try { await processJob(worker, job); completed++; } catch (error) { await failJob(worker, job, error); } finally { worker.release(); }
    }
    console.log(`[missa-enrichment-worker] tick: claimed=${jobs.length} completed=${completed}`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run the Missa enrichment worker.");
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  await ensureEnrichmentSchema(pool);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  const limit = batchSize(); const delay = intervalMs();
  console.log(`[missa-enrichment-worker] running every ${Math.round(delay / 60_000)} minutes, batch=${limit}`);
  try {
    while (!controller.signal.aborted) {
      try { await tick(pool, limit); } catch (error) { console.error("[missa-enrichment-worker] tick failed", error); }
      await new Promise<void>((resolve) => { const timer = setTimeout(resolve, delay); controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); });
    }
  } finally { await pool.end(); }
}

main().catch((error) => { console.error("[missa-enrichment-worker] stopped unexpectedly", error); process.exitCode = 1; });
