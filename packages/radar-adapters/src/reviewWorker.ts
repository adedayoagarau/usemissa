#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { ensureAgentGraphSchema } from "./agentGraphSchema.js";
import { ensureContentReviewSchema } from "./contentReviewSchema.js";
import { ensurePublicationRubricSchema } from "./publicationRubricSchema.js";
import { evaluatePublicationRubric, type PublicationRubricCandidate } from "./publicationRubric.js";
import { syncProfileOpportunityLinks } from "./profileIdentityMatcher.js";
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from "./workerTelemetry.js";

type ReviewDecision = "publish" | "needs-human" | "suppress" | "error";
type ReviewJob = { id: string; opportunityId: string; inputVersion: string };

const ACTIVE_STATUSES = ["opening-soon", "open", "closing-soon", "deadline-extended"];
const REVIEW_INTERVAL_MINUTES = 2;
const BACKLOG_DRAIN_DELAY_MS = 2_000;

function batchSize(): number {
  const value = Number(process.env.RADAR_REVIEW_BATCH_SIZE ?? 50);
  return Number.isFinite(value) ? Math.max(1, Math.min(200, Math.floor(value))) : 50;
}

function intervalMs(): number {
  const value = Number(process.env.RADAR_REVIEW_INTERVAL_MINUTES ?? REVIEW_INTERVAL_MINUTES);
  return Number.isFinite(value) && value > 0 ? Math.max(15_000, Math.round(value * 60_000)) : REVIEW_INTERVAL_MINUTES * 60_000;
}

async function startRun(pool: Pool): Promise<string> {
  const id = await startWorkerRun(pool, "review-worker");
  if (!id) throw new Error("Unable to start the review worker run telemetry record");
  return id;
}

async function finishRun(pool: Pool, runId: string, status: "completed" | "failed", inputCount: number, outputCount: number, error?: string): Promise<void> {
  await pool.query(
    `update radar_agent_runs
     set status = $2, input_count = $3, output_count = $4, error = $5, completed_at = now()
     where id = $1`,
    [runId, status, inputCount, outputCount, error ?? null],
  );
}

async function seedReviewJobs(pool: Pool): Promise<void> {
  await pool.query(
    `insert into radar_review_jobs (id, opportunity_id, priority, input_version)
     select md5('review:' || o.id), o.id,
       case when o.deadline_date is not null and o.deadline_date <= current_date + 30 then 20 else 0 end,
       coalesce(o.last_changed_at, o.created_at)::text
     from opportunities o
     where o.publication_state = 'reviewable'
     on conflict (opportunity_id) do update
       set status = 'queued', input_version = excluded.input_version,
           next_attempt_at = now(), lease_until = null, last_error = null, updated_at = now()
       where radar_review_jobs.input_version is distinct from excluded.input_version`,
  );
}

async function claimJobs(pool: Pool, limit: number): Promise<ReviewJob[]> {
  const result = await pool.query<ReviewJob>(
    `with next_jobs as (
       select id from radar_review_jobs
       where status in ('queued', 'failed') and next_attempt_at <= now()
         and (lease_until is null or lease_until < now())
       order by priority desc, created_at asc
       for update skip locked limit $1
     )
     update radar_review_jobs j
     set status = 'processing', attempts = j.attempts + 1,
         lease_until = now() + interval '5 minutes', updated_at = now(), last_error = null
     from next_jobs n
     where j.id = n.id
     returning j.id, j.opportunity_id as "opportunityId", j.input_version as "inputVersion"`,
    [limit],
  );
  return result.rows;
}

export type ReviewCandidate = PublicationRubricCandidate & {
  opportunityId: string;
  title: string;
  status: string;
  submissionState: string;
  deadlineDate: string | null;
  openDate?: string | null;
  submissionUrl: string | null;
  guidelinesUrl: string | null;
  sourceUrl: string | null;
  callProfilePresent: boolean;
};

async function candidate(pool: Pool, opportunityId: string): Promise<ReviewCandidate | null> {
  const result = await pool.query<ReviewCandidate>(
    `select o.id as "opportunityId", o.title, o.status, o.submission_state as "submissionState",
       o.deadline_date::text as "deadlineDate", o.open_date::text as "openDate", o.deadline_kind as "deadlineKind", o.submission_url as "submissionUrl",
       o.guidelines_url as "guidelinesUrl", s.url as "sourceUrl",
       evidence.processing_succeeded_at as "processingSucceededAt",
       (coalesce(evidence.organization_confirmed, false) or profile_identity.confirmed or (o.organization_id is not null and exists(select 1 from gary_profiles p where p.id = o.organization_id))) as "organizationConfirmed",
       coalesce(evidence.destination_reconciled, false) as "destinationReconciled",
       (coalesce((evidence.destination_reconciliation->>'v2ReviewOnly')::boolean, false)
         or (o.id like 'opp_v2_%' and o.source_id like 'v2_source_%')) as "reviewOnly",
       coalesce(content.review_status = 'approved', false) as "contentApproved",
       (profile.opportunity_id is not null) as "callProfilePresent",
       profile.reading_period_kind as "readingPeriodKind",
       coalesce(enrichment.evidence_count, 0)::int as "evidenceCount"
     from opportunities o
     left join opportunity_sources s on s.id = o.source_id
     left join lateral (
       select checked_at, processing_succeeded_at, organization_confirmed, destination_reconciled, destination_reconciliation
       from opportunity_source_evidence
       where opportunity_id = o.id order by checked_at desc limit 1
     ) evidence on true
       left join lateral (
       select review_status from opportunity_contents
       where opportunity_id = o.id order by updated_at desc limit 1
     ) content on true
     left join lateral (
       select exists (
         select 1 from opportunity_profile_links link
         where link.opportunity_id = o.id and link.status = 'confirmed'
           and link.verified_until > now()
       ) as confirmed
     ) profile_identity on true
     left join opportunity_call_profiles profile on profile.opportunity_id = o.id
     left join lateral (
       select count(*) as evidence_count
       from radar_opportunity_enrichment_evidence
       where opportunity_id = o.id
     ) enrichment on true
     where o.id = $1 and o.publication_state = 'reviewable'`,
    [opportunityId],
  );
  return result.rows[0] ?? null;
}

export function reviewCandidate(candidate: ReviewCandidate): { decision: ReviewDecision; score: number; reasons: string[]; checks: Record<string, unknown> } {
  return evaluatePublicationRubric(candidate);
}

export function isDurablePublicationGateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "23514" && typeof candidate.message === "string" && candidate.message.includes("Publication gates failed for opportunity");
}

async function writeHandoff(client: PoolClient, runId: string, opportunityId: string, toAgent: string, kind: string, status: string, payload: Record<string, unknown>): Promise<void> {
  await client.query(
    `insert into radar_agent_handoffs (id, run_id, opportunity_id, from_agent, to_agent, kind, status, payload)
     values ($1, $2, $3, 'review', $4, $5, $6, $7::jsonb)
     on conflict (run_id, opportunity_id, to_agent, kind) do update set status = excluded.status, payload = excluded.payload, completed_at = case when excluded.status = 'completed' then now() else null end`,
    [randomUUID(), runId, opportunityId, toAgent, kind, status, JSON.stringify(payload)],
  );
}

async function routeDurableGateConflictToHuman(pool: Pool, runId: string, job: ReviewJob, result: ReturnType<typeof reviewCandidate>, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const reasons = [...result.reasons, "The durable database publication gate requires human review."];
  const checks = { ...result.checks, durablePublicationGate: "review" };
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into radar_review_decisions (id, job_id, opportunity_id, run_id, decision, score, reasons, checks)
       values ($1, $2, $3, $4, 'needs-human', $5, $6::jsonb, $7::jsonb)`,
      [randomUUID(), job.id, job.opportunityId, runId, result.score, JSON.stringify(reasons), JSON.stringify(checks)],
    );
    await client.query("update radar_review_jobs set status = 'needs-human', last_error = $2, lease_until = null, updated_at = now() where id = $1", [job.id, message.slice(0, 500)]);
    await writeHandoff(client, runId, job.opportunityId, "human-review", "durable-publication-gate", "queued", { score: result.score, reasons, checks });
    await client.query("commit");
  } catch (fallbackError) {
    await client.query("rollback");
    throw fallbackError;
  } finally {
    client.release();
  }
}

async function processJob(pool: Pool, runId: string, job: ReviewJob): Promise<ReviewDecision> {
  const item = await candidate(pool, job.opportunityId);
  if (!item) {
    await pool.query("update radar_review_jobs set status = 'blocked', last_error = 'Opportunity is no longer reviewable', lease_until = null, updated_at = now() where id = $1", [job.id]);
    return "error";
  }
  const result = reviewCandidate(item);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into radar_review_decisions (id, job_id, opportunity_id, run_id, decision, score, reasons, checks)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [randomUUID(), job.id, job.opportunityId, runId, result.decision, result.score, JSON.stringify(result.reasons), JSON.stringify(result.checks)],
    );
    if (result.decision === "publish") {
      await client.query("update opportunities set publication_state = 'published', last_changed_at = now() where id = $1 and publication_state = 'reviewable'", [job.opportunityId]);
      await client.query("update radar_review_jobs set status = 'completed', lease_until = null, updated_at = now() where id = $1", [job.id]);
      await writeHandoff(client, runId, job.opportunityId, "publisher", "publication-decision", "completed", { score: result.score });
    } else if (result.decision === "suppress") {
      await client.query("update opportunities set publication_state = 'suppressed', last_changed_at = now() where id = $1 and publication_state = 'reviewable'", [job.opportunityId]);
      await client.query("update radar_review_jobs set status = 'blocked', lease_until = null, updated_at = now() where id = $1", [job.id]);
      await writeHandoff(client, runId, job.opportunityId, "publisher", "suppression-decision", "completed", { score: result.score });
    } else {
      await client.query("update radar_review_jobs set status = 'needs-human', lease_until = null, updated_at = now() where id = $1", [job.id]);
      await writeHandoff(client, runId, job.opportunityId, "human-review", "needs-review", "queued", { score: result.score, reasons: result.reasons });
    }
    await client.query("commit");
    return result.decision;
  } catch (error) {
    await client.query("rollback");
    if (isDurablePublicationGateError(error)) {
      try {
        await routeDurableGateConflictToHuman(pool, runId, job, result, error);
        return "needs-human";
      } catch {
        // Fall through to the bounded retry path if the human-review handoff fails.
      }
    }
    await pool.query("update radar_review_jobs set status = 'failed', last_error = $2, next_attempt_at = now() + interval '10 minutes', lease_until = null, updated_at = now() where id = $1", [job.id, error instanceof Error ? error.message.slice(0, 500) : String(error)]);
    return "error";
  } finally {
    client.release();
  }
}

export async function runReviewTick(pool: Pool, limit = batchSize()): Promise<{ claimed: number; decisions: Record<ReviewDecision, number> }> {
  await ensureAgentGraphSchema(pool);
  await ensureContentReviewSchema(pool);
  await ensurePublicationRubricSchema(pool);
  // Refresh durable profile identity evidence before review. This is bounded,
  // idempotent, and fails closed if matching cannot be completed.
  await syncProfileOpportunityLinks(pool, Math.max(limit * 5, 100));
  await seedReviewJobs(pool);
  const runId = await startRun(pool);
  const jobs = await claimJobs(pool, limit);
  const decisions: Record<ReviewDecision, number> = { publish: 0, "needs-human": 0, suppress: 0, error: 0 };
  for (const job of jobs) decisions[await processJob(pool, runId, job)]++;
  await finishRun(pool, runId, "completed", jobs.length, jobs.length);
  return { claimed: jobs.length, decisions };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run the Missa review agent.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await ensureAgentGraphSchema(pool);
  const workerRunId = await startWorkerRun(pool, "review-worker");
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log(`[missa-review-agent] running every ${Math.round(intervalMs() / 60_000)} minutes, batch=${batchSize()}`);
  try {
    while (!controller.signal.aborted) {
      let hasMore = false;
      try {
        await heartbeatWorkerRun(pool, workerRunId, "review-worker");
        const result = await runReviewTick(pool);
        const outputs = Object.values(result.decisions).reduce((sum, count) => sum + count, 0);
        await heartbeatWorkerRun(pool, workerRunId, "review-worker", { inputCount: result.claimed, outputCount: outputs });
        console.log(`[missa-review-agent] tick: claimed=${result.claimed} decisions=${JSON.stringify(result.decisions)}`);
        hasMore = result.claimed >= batchSize();
      } catch (error) {
        await heartbeatWorkerRun(pool, workerRunId, "review-worker", { lastError: error instanceof Error ? error.message : String(error) });
        console.error("[missa-review-agent] tick failed; retrying after interval", error);
      }
      const sleepDuration = hasMore ? BACKLOG_DRAIN_DELAY_MS : intervalMs();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, sleepDuration);
        controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
  } finally {
    await finishWorkerRun(pool, workerRunId, "review-worker", "cancelled");
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("reviewWorker.js")) {
  main().catch((error) => { console.error("[missa-review-agent] stopped unexpectedly", error); process.exitCode = 1; });
}
