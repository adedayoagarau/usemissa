#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import { ensureAgentGraphSchema } from "./agentGraphSchema.js";
import { ensureEvidenceRepairSchema } from "./evidenceRepairSchema.js";
import { ensurePublicationRubricSchema } from "./publicationRubricSchema.js";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from "./workerTelemetry.js";

const USER_AGENT = "MissaEvidenceRepair/1.0 (+https://www.usemissa.com)";
const DATE_PATTERN = /(?:deadline|closing date|application closes|submissions? close(?:s)?)[^\n]{0,120}?\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/i;

type Candidate = QueryResultRow & {
  job_id: string;
  opportunity_id: string;
  source_url: string;
  destination_url: string | null;
  source_id: string;
  input_version: string;
};

type FetchEvidence = {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  deadlineDate: string | null;
};

function limit(): number {
  const value = Number(process.env.MISSA_EVIDENCE_REPAIR_BATCH_SIZE ?? 25);
  return Number.isFinite(value) ? Math.max(1, Math.min(50, Math.floor(value))) : 25;
}

function intervalMs(): number {
  const value = Number(process.env.MISSA_EVIDENCE_REPAIR_INTERVAL_MINUTES ?? 10);
  return Number.isFinite(value) && value > 0 ? Math.max(60_000, Math.round(value * 60_000)) : 600_000;
}

function normalizedUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}

function parseDate(html: string): string | null {
  const match = DATE_PATTERN.exec(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  if (!match) return null;
  const parsed = new Date(match[1]!);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function destinationIsProven(sourceUrl: string, sourceHtml: string, destinationUrl: string): boolean {
  const source = new URL(sourceUrl);
  const destination = new URL(destinationUrl, sourceUrl);
  if (source.hostname === destination.hostname) return true;
  const absolute = normalizedUrl(destination.href);
  const escaped = absolute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i").test(sourceHtml.replace(/&amp;/g, "&"));
}

async function fetchEvidence(url: string): Promise<FetchEvidence> {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const html = (await response.text()).replace(/\u0000/g, "").slice(0, 2_000_000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { url, finalUrl: response.url || url, statusCode: response.status, html, deadlineDate: parseDate(html) };
}

async function seedJobs(pool: Pool): Promise<void> {
  await pool.query(`
    insert into missa_evidence_repair_jobs (id, opportunity_id, input_version)
    select md5('evidence-repair:' || o.id), o.id,
      coalesce(o.last_changed_at, o.updated_at, o.created_at)::text
    from opportunities o
    where o.publication_state = 'reviewable'
      and (
        o.deadline_date is null
        or not exists (select 1 from opportunity_contents c where c.opportunity_id = o.id and c.review_status = 'approved')
        or not exists (select 1 from opportunity_source_evidence e where e.opportunity_id = o.id and e.organization_confirmed and e.destination_reconciled)
      )
    on conflict (opportunity_id) do update set input_version = excluded.input_version,
      status = case when missa_evidence_repair_jobs.status in ('completed','needs-human')
        and missa_evidence_repair_jobs.input_version is distinct from excluded.input_version then 'queued'
        else missa_evidence_repair_jobs.status end,
      next_attempt_at = case when missa_evidence_repair_jobs.input_version is distinct from excluded.input_version then now() else missa_evidence_repair_jobs.next_attempt_at end,
      lease_until = null, updated_at = now()
  `);
}

async function claim(pool: Pool, batch: number): Promise<Candidate[]> {
  const result = await pool.query<Candidate>(`
    with next_jobs as (
      select j.id from missa_evidence_repair_jobs j
      where j.status in ('queued','failed') and j.next_attempt_at <= now()
        and (j.lease_until is null or j.lease_until < now())
      order by j.updated_at asc
      for update skip locked limit $1
    )
    update missa_evidence_repair_jobs j
    set status='processing', attempts=j.attempts+1, lease_until=now()+interval '5 minutes', updated_at=now()
    from next_jobs n where j.id=n.id
    returning j.id as job_id, j.opportunity_id, j.input_version,
      (select s.url from opportunities o join opportunity_sources s on s.id=o.source_id where o.id=j.opportunity_id) as source_url,
      (select coalesce(o.submission_url,o.guidelines_url) from opportunities o where o.id=j.opportunity_id) as destination_url,
      (select source_id from opportunities where id=j.opportunity_id) as source_id
  `, [batch]);
  return result.rows.filter((row) => Boolean(row.source_url));
}

async function writeAttempt(pool: Pool, runId: string, candidate: Candidate, status: string, stage: string, facts: Record<string, unknown>, reason?: string): Promise<void> {
  await pool.query(
    `insert into missa_evidence_repair_attempts (id,job_id,opportunity_id,run_id,stage,status,source_url,destination_url,facts,reason)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
    [randomUUID(), candidate.job_id, candidate.opportunity_id, runId, stage, status, candidate.source_url, candidate.destination_url, JSON.stringify(facts), reason ?? null],
  );
}

async function repair(pool: Pool, runId: string, candidate: Candidate): Promise<"completed" | "needs-human" | "failed"> {
  let source: FetchEvidence;
  try {
    source = await fetchEvidence(candidate.source_url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await writeAttempt(pool, runId, candidate, "failed", "source-fetch", {}, reason);
    await pool.query(`update missa_evidence_repair_jobs set status='failed', last_stage='source-fetch', last_reason=$2, next_attempt_at=now()+interval '1 hour', lease_until=null, updated_at=now() where id=$1`, [candidate.job_id, reason.slice(0, 500)]);
    return "failed";
  }

  let destination: FetchEvidence | null = null;
  let destinationProven = false;
  if (candidate.destination_url) {
    try {
      destination = await fetchEvidence(candidate.destination_url);
      destinationProven = destinationIsProven(source.finalUrl, source.html, candidate.destination_url);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await writeAttempt(pool, runId, candidate, "needs-human", "destination-fetch", { sourceStatus: source.statusCode }, reason);
      await pool.query(`update missa_evidence_repair_jobs set status='needs-human', last_stage='destination-fetch', last_reason=$2, lease_until=null, updated_at=now() where id=$1`, [candidate.job_id, reason.slice(0, 500)]);
      return "needs-human";
    }
  }

  const deadlineDate = destination?.deadlineDate ?? source.deadlineDate;
  const organizationConfirmed = new URL(source.finalUrl).hostname === (destination ? new URL(destination.finalUrl).hostname : new URL(source.finalUrl).hostname);
  const facts = { sourceStatus: source.statusCode, sourceFinalUrl: source.finalUrl, destinationStatus: destination?.statusCode ?? null, destinationFinalUrl: destination?.finalUrl ?? null, destinationProven, organizationConfirmed, deadlineDate };
  const evidenceOk = destinationProven && organizationConfirmed;
  if (!evidenceOk) {
    await writeAttempt(pool, runId, candidate, "needs-human", "reconciliation", facts, "Destination or organization could not be proven from source evidence.");
    await pool.query(`update missa_evidence_repair_jobs set status='needs-human', last_stage='reconciliation', last_reason=$2, lease_until=null, updated_at=now() where id=$1`, [candidate.job_id, "Destination or organization could not be proven from source evidence."]);
    return "needs-human";
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const evidence = await client.query<{ id: string }>(`select id from opportunity_source_evidence where opportunity_id=$1 order by checked_at desc limit 1 for update`, [candidate.opportunity_id]);
    if (evidence.rows[0]) {
      await client.query(`update opportunity_source_evidence set checked_at=now(), processing_succeeded_at=now(), organization_confirmed=true, destination_reconciled=true, destination_reconciliation=$2::jsonb, verified_until=now()+interval '7 days' where id=$1`, [evidence.rows[0].id, JSON.stringify(facts)]);
    } else {
      await client.query(`insert into opportunity_source_evidence (id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled,destination_reconciliation,verified_until) values ($1,$2,$3,'source',$4,$5,now(),now(),true,true,$6::jsonb,now()+interval '7 days')`, [randomUUID(), candidate.opportunity_id, candidate.source_id, "Evidence repair", candidate.source_url, JSON.stringify(facts)]);
    }
    if (deadlineDate) await client.query(`update opportunities set deadline_date=$2, deadline_kind='date', last_changed_at=now(), updated_at=now() where id=$1 and deadline_date is null`, [candidate.opportunity_id, deadlineDate]);
    await client.query(`update missa_evidence_repair_jobs set status='completed', last_stage='reconciled', last_reason=null, lease_until=null, updated_at=now() where id=$1`, [candidate.job_id]);
    await client.query(`update radar_content_review_jobs set status='queued', next_attempt_at=now(), lease_until=null, updated_at=now() where opportunity_id=$1 and status in ('needs-human','failed','blocked')`, [candidate.opportunity_id]);
    await client.query(`update radar_review_jobs set status='queued', next_attempt_at=now(), lease_until=null, updated_at=now() where opportunity_id=$1 and status in ('needs-human','failed','blocked')`, [candidate.opportunity_id]);
    await client.query("commit");
    await writeAttempt(pool, runId, candidate, "completed", "reconciled", facts);
    return "completed";
  } catch (error) {
    await client.query("rollback");
    const reason = error instanceof Error ? error.message : String(error);
    await writeAttempt(pool, runId, candidate, "failed", "persist", facts, reason);
    await pool.query(`update missa_evidence_repair_jobs set status='failed', last_stage='persist', last_reason=$2, next_attempt_at=now()+interval '1 hour', lease_until=null, updated_at=now() where id=$1`, [candidate.job_id, reason.slice(0, 500)]);
    return "failed";
  } finally {
    client.release();
  }
}

export async function runEvidenceRepairTick(pool: Pool, batch = limit()): Promise<Record<string, number>> {
  await ensureAgentGraphSchema(pool);
  await ensureEvidenceRepairSchema(pool);
  await ensurePublicationRubricSchema(pool);
  await seedJobs(pool);
  const runId = await startWorkerRun(pool, "evidence-repair-worker");
  if (!runId) throw new Error("Unable to start evidence repair telemetry run");
  const candidates = await claim(pool, batch);
  const counts = { claimed: candidates.length, completed: 0, needsHuman: 0, failed: 0 };
  for (const candidate of candidates) counts[({ completed: "completed", "needs-human": "needsHuman", failed: "failed" } as const)[await repair(pool, runId, candidate)] as "completed" | "needsHuman" | "failed"]!++;
  await heartbeatWorkerRun(pool, runId, "evidence-repair-worker", { inputCount: candidates.length, outputCount: candidates.length });
  await finishWorkerRun(pool, runId, "evidence-repair-worker", "completed", { inputCount: candidates.length, outputCount: candidates.length });
  return counts;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run the Missa evidence repair worker.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const runId = await startWorkerRun(pool, "evidence-repair-worker");
  if (!runId) throw new Error("Unable to start evidence repair worker telemetry record");
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  console.log(`[missa-evidence-repair] running every ${Math.round(intervalMs() / 60_000)} minutes, batch=${limit()}`);
  try {
    while (!controller.signal.aborted) {
      try { console.log(`[missa-evidence-repair] tick ${JSON.stringify(await runEvidenceRepairTick(pool))}`); }
      catch (error) { console.error("[missa-evidence-repair] tick failed", error); }
      await new Promise<void>((resolve) => { const timer = setTimeout(resolve, intervalMs()); controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); });
    }
  } finally { await finishWorkerRun(pool, runId, "evidence-repair-worker", "cancelled"); await pool.end(); }
}

if (process.argv[1]?.endsWith("evidenceRepairWorker.js")) main().catch((error) => { console.error(error); process.exitCode = 1; });
