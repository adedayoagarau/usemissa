import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { ensureEnrichmentSchema } from "./enrichmentSchema.js";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from "./workerTelemetry.js";
import { fetchWithPolicy, USER_AGENT } from "./mediaFetcher.js";
import { extractMediaCandidates } from "./mediaExtractor.js";
import type { SourceRole } from "./mediaExtractionContracts.js";

type JobKind = "media" | "winners" | "guidelines" | "call-profile";
export type ClaimedJob = {
  id: string;
  opportunityId: string;
  kind: JobKind;
  attempts: number;
  sourceUrl: string;
  title: string;
  opportunityType: string;
  genres: string[];
  organizationId?: string;
  sourceKind?: string;
  sourceAuthorityKind?: string;
  organizationConfirmed?: boolean;
};

const BACKLOG_DRAIN_DELAY_MS = 5_000;

function batchSize(value = process.env.RADAR_ENRICHMENT_BATCH_SIZE): number {
  const parsed = Number(value ?? 30);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.floor(parsed))) : 30;
}

function intervalMs(): number {
  const minutes = Number(process.env.RADAR_ENRICHMENT_INTERVAL_MINUTES ?? 3);
  return Number.isFinite(minutes) && minutes > 0 ? Math.max(30_000, Math.round(minutes * 60_000)) : 180_000;
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

export function inferSourceRole(sourceUrl: string, job: ClaimedJob): SourceRole {
  if (job.sourceAuthorityKind === "directory") return "discovery-directory";
  if (
    job.sourceAuthorityKind === "platform" ||
    /submittable\.com|slideroom\.com|callforentry\.org|typeform\.com|forms\.gle|airtable\.com/i.test(sourceUrl)
  ) {
    return "application-portal";
  }
  if (/\.(?:pdf|docx?|zip)(?:[?#]|$)/i.test(sourceUrl)) {
    return "attachment";
  }
  if (job.sourceKind === "organization" || (job.organizationId && sourceUrl.includes(job.organizationId))) {
    return "organization-page";
  }
  return "official-opportunity-page";
}

async function seedJobs(client: PoolClient): Promise<void> {
  await client.query(
    `insert into radar_enrichment_jobs (id, opportunity_id, kind, priority, payload)
     select md5(o.id || ':' || kinds.kind), o.id, kinds.kind,
       (case when kinds.kind = 'call-profile' then 10 else 0 end) +
       (case when o.deadline_date is not null and o.deadline_date <= current_date + 30 then 20 else 0 end) +
       (case when kinds.kind = 'media' and not exists (
         select 1 from opportunity_identity_assets a
         where a.opportunity_id = o.id and a.rights_status in ('cleared', 'permitted')
       ) and (
         o.status in ('open', 'closing-soon', 'deadline-extended') or
         (o.deadline_date is not null and o.deadline_date <= current_date + 30)
       ) then 40 else 0 end),
       jsonb_build_object('title', o.title)
     from opportunities o
       cross join (values ('media'::text), ('winners'::text), ('guidelines'::text), ('call-profile'::text)) as kinds(kind)
     where o.publication_state in ('published', 'reviewable')
     on conflict (opportunity_id, kind) do update set
       priority = excluded.priority`,
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
     left join opportunity_source_evidence e on e.opportunity_id = o.id
     left join lateral (
       select true as confirmed
       from opportunity_profile_links link
       where link.opportunity_id = o.id and link.status = 'confirmed'
         and link.verified_until > now()
       limit 1
     ) profile_identity on true
     where j.id = n.id and o.id = j.opportunity_id
     returning j.id, j.opportunity_id as "opportunityId", j.kind,
       j.attempts, coalesce(o.guidelines_url, o.submission_url, s.url) as "sourceUrl", o.title,
       o.type as "opportunityType", o.genres,
       o.organization_id as "organizationId",
       s.kind as "sourceKind",
       s.authority_kind as "sourceAuthorityKind",
       (coalesce(e.organization_confirmed, false) or coalesce(profile_identity.confirmed, false)) as "organizationConfirmed"`,
    [limit],
  );
  return rows.filter((row) => Boolean(row.sourceUrl));
}

function firstNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : undefined;
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function inferMarketKind(job: ClaimedJob, text: string): string {
  if (job.opportunityType === "contest") return "contest";
  if (job.opportunityType === "award") return "award";
  if (includesAny(text, ["contest", "competition", "prize"])) return "contest";
  if (includesAny(text, ["journal", "academic journal"])) return "journal";
  if (includesAny(text, ["literary magazine", "magazine", "review"])) return "magazine";
  if (includesAny(text, ["anthology", "book prize", "chapbook"])) return "anthology";
  if (includesAny(text, ["press", "publisher"])) return "press";
  return "unknown";
}

function inferCallKind(job: ClaimedJob, text: string): string {
  if (job.opportunityType === "contest") return "contest";
  if (job.opportunityType === "award") return "prize";
  if (job.opportunityType === "fellowship") return "fellowship";
  if (job.opportunityType === "grant") return "grant";
  if (job.opportunityType === "residency") return "residency";
  if (includesAny(text, ["contest", "competition"])) return "contest";
  if (includesAny(text, ["prize", "award"])) return "prize";
  if (includesAny(text, ["call for submissions", "submissions open", "reading period"])) return "general-submission";
  return "open-call";
}

async function writeCallProfile(client: PoolClient, job: ClaimedJob, html: string, finalUrl: string): Promise<void> {
  const text = cleanText(html).toLowerCase();
  const marketKind = inferMarketKind(job, text);
  const callKind = inferCallKind(job, text);
  const readingPeriodKind = text.includes("year-round") || text.includes("year round")
    ? "year-round"
    : text.includes("rolling")
      ? "rolling"
      : "unknown";
  const acceptedFormats = job.genres.length ? job.genres : [
    ...(text.includes("poetry") ? ["poetry"] : []),
    ...(text.includes("fiction") ? ["fiction"] : []),
    ...(text.includes("nonfiction") || text.includes("non-fiction") ? ["nonfiction"] : []),
    ...(text.includes("translation") ? ["translation"] : []),
    ...(text.includes("photography") ? ["photography"] : []),
    ...(text.includes("comics") ? ["comics"] : []),
  ];
  const wordLimitMax = firstNumber(text, /(?:up to|max(?:imum)?|less than)\s+([\d,]+)\s+words?/i);
  const pageLimitMax = firstNumber(text, /(?:up to|max(?:imum)?|less than)\s+([\d,]+)\s+pages?/i);
  const paymentType = includesAny(text, ["pay contributors", "pays", "payment", "honorarium", "honoraria"])
    ? "varies"
    : text.includes("no payment") || text.includes("does not pay")
      ? "none"
      : "unknown";
  const reprintsAllowed = includesAny(text, ["reprints accepted", "previously published work welcome"])
    ? true
    : includesAny(text, ["no reprints", "previously unpublished only"])
      ? false
      : undefined;
  const previouslyUnpublishedRequired = includesAny(text, ["previously unpublished", "never been published"])
    ? true
    : undefined;
  const multipleSubmissionsAllowed = includesAny(text, ["simultaneous submissions accepted", "simultaneous submissions welcome", "sim subs accepted"])
    ? true
    : includesAny(text, ["no simultaneous submissions", "no sim subs"])
      ? false
      : undefined;
  const judgeName = html.match(/(?:judge|judged by|final judge)[:\s]+([^<.]{2,120})/i)?.[1]?.trim();
  const prizes = extractLinks(html, finalUrl, /prize|award|winner|judge/i).slice(0, 8);

  await client.query(
    `insert into opportunity_call_profiles
      (opportunity_id, call_kind, market_kind, publication_formats, accepted_formats,
       subgenres, reading_period_kind, payment_type, reprints_allowed,
       previously_unpublished_required, multiple_submissions_allowed,
       word_limit_max, page_limit_max, judge_name, confidence, source_url,
       last_verified_at, metadata, updated_at)
     values ($1, $2, $3, '{}', $4, '{}', $5, $6, $7, $8, $9, $10, $11, $12,
       'probable', $13, now(), $14::jsonb, now())
     on conflict (opportunity_id) do update set
       call_kind = excluded.call_kind, market_kind = excluded.market_kind,
       accepted_formats = excluded.accepted_formats, reading_period_kind = excluded.reading_period_kind,
       payment_type = excluded.payment_type, reprints_allowed = excluded.reprints_allowed,
       previously_unpublished_required = excluded.previously_unpublished_required,
       multiple_submissions_allowed = excluded.multiple_submissions_allowed,
       word_limit_max = excluded.word_limit_max, page_limit_max = excluded.page_limit_max,
       judge_name = excluded.judge_name, confidence = excluded.confidence,
       source_url = excluded.source_url, last_verified_at = now(), metadata = excluded.metadata,
       updated_at = now()`,
    [job.opportunityId, callKind, marketKind, acceptedFormats, readingPeriodKind, paymentType, reprintsAllowed ?? null, previouslyUnpublishedRequired ?? null, multipleSubmissionsAllowed ?? null, wordLimitMax ?? null, pageLimitMax ?? null, judgeName ?? null, finalUrl, JSON.stringify({ parserVersion: "call-profile-v1", sourceTitle: pageTitle(html) ?? job.title })],
  );
  await client.query("delete from opportunity_call_prizes where opportunity_id = $1", [job.opportunityId]);
  for (const [index, prize] of prizes.entries()) {
    await client.query(
      `insert into opportunity_call_prizes (id, opportunity_id, rank, title, source_url, confidence, updated_at)
       values ($1, $2, $3, $4, $5, 'probable', now())`,
      [`${job.opportunityId}:prize:${index}`, job.opportunityId, index + 1, prize.title ?? undefined, prize.url],
    );
  }
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
  if (job.kind === "media") {
    const sourceRole = inferSourceRole(job.sourceUrl, job);
    let fetchResult;
    try {
      fetchResult = await fetchWithPolicy(job.sourceUrl, { expectedType: "html", checkRobots: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === "robots-blocked") {
        await client.query(
          `update radar_enrichment_jobs set status = 'blocked', last_error = 'robots-blocked', lease_until = null, updated_at = now() where id = $1`,
          [job.id],
        );
        return;
      }
      throw err;
    }

    const html = typeof fetchResult.body === "string" ? fetchResult.body : fetchResult.body.toString("utf-8");
    const finalUrl = fetchResult.finalUrl;

    const extraction = extractMediaCandidates(
      html,
      {
        opportunityId: job.opportunityId,
        title: job.title,
        pageUrl: finalUrl,
        sourceRole,
        organizationId: job.organizationId,
        organizationConfirmed: job.organizationConfirmed,
      },
      fetchResult.redirectChain,
      fetchResult.httpStatus,
    );

    let reviewableCount = 0;
    let rejectedCount = 0;

    for (const candidate of extraction.candidates) {
      const candidateId = randomUUID();
      await client.query(
        `insert into opportunity_media_candidates
           (id, opportunity_id, job_id, original_url, resolved_url, page_url,
            source_role, candidate_kind, alt, caption, title, width, height,
            mime_type, file_size, retrieved_at, http_status, redirect_chain,
            content_hash, attribution_text, inheritance_level,
            linked_organization_id, linked_program_id, extraction_method,
            parser_version, confidence, rejection_reasons, status, rights_status,
            metadata, created_at, updated_at)
         values
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            now(), $16, $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25,
            $26, $27, 'unknown', $28::jsonb, now(), now())
         on conflict (opportunity_id, resolved_url) do update set
           updated_at = now(),
           http_status = excluded.http_status,
           redirect_chain = excluded.redirect_chain,
           rejection_reasons = excluded.rejection_reasons,
           metadata = opportunity_media_candidates.metadata || excluded.metadata`,
        [
          candidateId,
          job.opportunityId,
          job.id,
          candidate.originalUrl,
          candidate.resolvedUrl,
          candidate.pageUrl,
          candidate.sourceRole,
          candidate.candidateKind,
          candidate.alt ?? null,
          candidate.caption ?? null,
          candidate.title ?? null,
          candidate.width ?? null,
          candidate.height ?? null,
          candidate.mimeType ?? null,
          candidate.fileSize ?? null,
          candidate.httpStatus ?? null,
          JSON.stringify(candidate.redirectChain ?? []),
          candidate.contentHash ?? null,
          candidate.attributionText ?? null,
          candidate.inheritanceLevel,
          candidate.linkedOrganizationId ?? null,
          candidate.linkedProgramId ?? null,
          candidate.extractionMethod,
          candidate.parserVersion,
          candidate.confidence,
          candidate.rejectionReasons,
          candidate.status,
          JSON.stringify(candidate.metadata ?? {}),
        ],
      );

      if (candidate.status === "reviewable") {
        reviewableCount++;
        await client.query(
          `insert into radar_opportunity_enrichment_evidence
             (id, opportunity_id, job_id, kind, url, title, excerpt, media_url, confidence, rights_status, metadata, retrieved_at)
           values ($1, $2, $3, 'media', $4, $5, $6, $7, $8, 'unknown', $9::jsonb, now())
           on conflict (opportunity_id, kind, url) do update set
             title = excluded.title, excerpt = excluded.excerpt, media_url = excluded.media_url,
             confidence = excluded.confidence, metadata = excluded.metadata, retrieved_at = now()`,
          [
            randomUUID(),
            job.opportunityId,
            job.id,
            candidate.resolvedUrl,
            candidate.alt ?? pageTitle(html) ?? job.title,
            candidate.caption ?? candidate.attributionText ?? null,
            candidate.resolvedUrl,
            candidate.confidence,
            JSON.stringify({
              extractionMethod: candidate.extractionMethod,
              candidateKind: candidate.candidateKind,
              inheritanceLevel: candidate.inheritanceLevel,
              sourceRole,
              pageUrl: finalUrl,
            }),
          ],
        );
      } else {
        rejectedCount++;
      }
    }

    await completeJob(client, job, {
      checked: 1,
      found: extraction.totalDiscovered,
      rejected: rejectedCount,
      reviewable: reviewableCount,
      cleared: 0,
      blocked: 0,
      failed: 0,
      checkedUrl: finalUrl,
      rejectionBreakdown: extraction.rejectionCounts,
    });
    return;
  }

  const { html, finalUrl } = await fetchHtml(job.sourceUrl);
  if (job.kind === "winners") {
    const links = extractLinks(html, finalUrl, /winner|alumni|recipient|selected|honou?r|past[- ]?award/i);
    for (const link of links) await writeEvidence(client, job, { kind: "winner", url: link.url, title: link.title, excerpt: excerptFor(html, /winner|recipient|alumni/i), confidence: "probable" });
    await completeJob(client, job, { winnerLinks: links.length, checkedUrl: finalUrl });
    return;
  }
  if (job.kind === "call-profile") {
    await writeCallProfile(client, job, html, finalUrl);
    await completeJob(client, job, { profileExtracted: true, checkedUrl: finalUrl });
    return;
  }
  const links = extractLinks(html, finalUrl, /guideline|submission|apply|application/i);
  for (const link of links) await writeEvidence(client, job, { kind: "guideline", url: link.url, title: link.title, excerpt: excerptFor(html, /guideline|submission|application/i), confidence: "probable" });
  await completeJob(client, job, { guidelineLinks: links.length, checkedUrl: finalUrl });
}

async function tick(pool: Pool, limit: number): Promise<{ claimed: number; completed: number }> {
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
    return { claimed: jobs.length, completed };
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
  const workerRunId = await startWorkerRun(pool, "enrichment-worker");
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  const limit = batchSize(); const delay = intervalMs();
  console.log(`[missa-enrichment-worker] running every ${Math.round(delay / 60_000)} minutes, batch=${limit}`);
  try {
    while (!controller.signal.aborted) {
      let hasMore = false;
      try {
        await heartbeatWorkerRun(pool, workerRunId, "enrichment-worker");
        const result = await tick(pool, limit);
        await heartbeatWorkerRun(pool, workerRunId, "enrichment-worker", { inputCount: result.claimed, outputCount: result.completed });
        hasMore = result.claimed >= limit;
      } catch (error) {
        await heartbeatWorkerRun(pool, workerRunId, "enrichment-worker", { lastError: error instanceof Error ? error.message : String(error) });
        console.error("[missa-enrichment-worker] tick failed", error);
      }
      const sleepDuration = hasMore ? BACKLOG_DRAIN_DELAY_MS : delay;
      await new Promise<void>((resolve) => { const timer = setTimeout(resolve, sleepDuration); controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); });
    }
  } finally {
    await finishWorkerRun(pool, workerRunId, "enrichment-worker", "cancelled");
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("enrichmentWorker.js")) {
  main().catch((error) => {
    console.error("[missa-enrichment-worker] stopped unexpectedly", error);
    process.exitCode = 1;
  });
}
