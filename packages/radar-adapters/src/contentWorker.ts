#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  buildOpportunityContent,
  reviewOpportunityContent,
  type OpportunityContent,
  type OpportunityContentBuildInput,
  type OpportunityContentDecision,
} from '@missa/radar-engine';
import {
  writeOpportunityEditorial,
  writeOrganizationEditorial,
} from './editorialWriter.js';
import { ensureAgentGraphSchema } from './agentGraphSchema.js';
import { ensureContentReviewSchema } from './contentReviewSchema.js';
import { finishWorkerRun, heartbeatWorkerRun, startWorkerRun } from './workerTelemetry.js';

type ContentJobStatus = 'queued' | 'building' | 'pending-review' | 'processing' | 'completed' | 'failed' | 'needs-human' | 'blocked';
type ContentJob = { id: string; opportunityId: string; inputVersion: string; attempts: number };

interface ContentRow extends QueryResultRow {
  id: string;
  title: string;
  type: string;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  organization_data: Record<string, unknown> | null;
  discipline: string | null;
  genres: string[] | null;
  deadline_kind: string;
  deadline_date: string | null;
  deadline_raw: string | null;
  fee_status: string;
  fee_cents: number | null;
  fee_currency: string | null;
  prize: string | null;
  location: string | null;
  submission_url: string | null;
  guidelines_url: string | null;
  submission_state: string;
  source_url: string;
  processing_succeeded_at: Date | string | null;
  organization_confirmed: boolean;
  accepted_formats: string[] | null;
  required_materials: unknown;
  description: string | null;
  guidelines_text: string | null;
  editorial_focus: string | null;
  eligibility_summary: string | null;
  reading_period_kind: string | null;
}

interface ContentInputResult {
  input: OpportunityContentBuildInput;
  organizationId: string | null;
  organizationData: Record<string, unknown> | null;
}

interface ReviewRow extends QueryResultRow {
  content: OpportunityContent;
  source_url: string;
  processing_succeeded_at: Date | string | null;
  organization_confirmed: boolean;
  submission_state: string;
}

const CONTENT_INTERVAL_MINUTES = 2;
const BACKLOG_DRAIN_DELAY_MS = 2_000;

function batchSize(): number {
  const value = Number(process.env.RADAR_CONTENT_BATCH_SIZE ?? 50);
  return Number.isFinite(value) ? Math.max(1, Math.min(200, Math.floor(value))) : 50;
}

function intervalMs(): number {
  const value = Number(process.env.RADAR_CONTENT_INTERVAL_MINUTES ?? CONTENT_INTERVAL_MINUTES);
  return Number.isFinite(value) && value > 0 ? Math.max(15_000, Math.round(value * 60_000)) : CONTENT_INTERVAL_MINUTES * 60_000;
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function materialArray(value: unknown): Array<{ label: string; limit?: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { label?: unknown; limit?: unknown };
    if (typeof row.label !== 'string' || !row.label.trim()) return [];
    return [{ label: row.label.trim(), ...(typeof row.limit === 'string' && row.limit.trim() ? { limit: row.limit.trim() } : {}) }];
  });
}

async function seedContentJobs(pool: Pool): Promise<void> {
  await pool.query(
    `insert into radar_content_review_jobs (id, opportunity_id, priority, input_version)
     select md5('content:' || o.id), o.id,
       case 
         when o.deadline_date is not null and o.deadline_date between current_date and current_date + 30 then 30
         when o.deadline_date is not null and o.deadline_date >= current_date then 20
         when o.deadline_date is null then 10
         else 0 
       end,
       coalesce(o.last_changed_at, o.updated_at, o.created_at)::text
     from opportunities o
     where o.publication_state in ('published', 'reviewable')
       and not exists (
         select 1 from opportunity_contents c
         where c.opportunity_id = o.id
           and c.input_version = coalesce(o.last_changed_at, o.updated_at, o.created_at)::text
           and c.builder_version = 'editorial-writer.v2'
       )
     on conflict (opportunity_id) do update
       set status = case when radar_content_review_jobs.status in ('building', 'processing') and radar_content_review_jobs.lease_until > now() then radar_content_review_jobs.status else 'queued' end,
           priority = excluded.priority,
           input_version = excluded.input_version,
           next_attempt_at = now(), lease_until = case when radar_content_review_jobs.status in ('building', 'processing') and radar_content_review_jobs.lease_until > now() then radar_content_review_jobs.lease_until else null end,
           last_error = null, updated_at = now()
       where radar_content_review_jobs.input_version is distinct from excluded.input_version
          or not exists (
            select 1 from opportunity_contents c
            where c.opportunity_id = radar_content_review_jobs.opportunity_id
              and c.builder_version = 'editorial-writer.v2'
          )`,
  );
  await pool.query(
    `update radar_content_review_jobs j
     set status = 'pending-review', next_attempt_at = now(), lease_until = null,
         last_error = null, updated_at = now()
     from opportunity_contents c
     where c.opportunity_id = j.opportunity_id
       and c.input_version = j.input_version
       and c.review_status = 'pending'
       and j.status = 'failed'`,
  );
}

async function claimBuildJobs(pool: Pool, limit: number): Promise<ContentJob[]> {
  const result = await pool.query<ContentJob>(
    `with next_jobs as (
       select id from radar_content_review_jobs
       where status in ('queued', 'failed', 'building') and next_attempt_at <= now()
         and (lease_until is null or lease_until < now())
       order by priority desc, created_at asc
       for update skip locked limit $1
     )
     update radar_content_review_jobs j
     set status = 'building', attempts = j.attempts + 1,
         lease_until = now() + interval '5 minutes', updated_at = now(), last_error = null
     from next_jobs n
     where j.id = n.id
     returning j.id, j.opportunity_id as "opportunityId", j.input_version as "inputVersion", j.attempts`,
    [limit],
  );
  return result.rows;
}

async function claimReviewJobs(pool: Pool, limit: number): Promise<ContentJob[]> {
  const result = await pool.query<ContentJob>(
    `with next_jobs as (
       select id from radar_content_review_jobs
       where status in ('pending-review', 'processing') and next_attempt_at <= now()
         and (lease_until is null or lease_until < now())
       order by priority desc, created_at asc
       for update skip locked limit $1
     )
     update radar_content_review_jobs j
     set status = 'processing', attempts = j.attempts + 1,
         lease_until = now() + interval '5 minutes',
         updated_at = now(), last_error = null
     from next_jobs n
     where j.id = n.id
     returning j.id, j.opportunity_id as "opportunityId", j.input_version as "inputVersion", j.attempts`,
    [limit],
  );
  return result.rows;
}

async function contentInput(pool: Pool, opportunityId: string): Promise<ContentInputResult | null> {
  const result = await pool.query<ContentRow>(
    `select o.id, o.title, o.type, o.status, o.discipline, o.genres,
       coalesce(c.content->>'description', (select obs.description from gary_call_observations obs where obs.opportunity_id = o.id and obs.description is not null order by obs.observed_at desc limit 1)) as description,
       o.organization_id,
       org.data->>'name' as organization_name,
       org.data as organization_data,
       o.deadline_kind, o.deadline_date::text as deadline_date,
       nullif(o.deadline_date::text, '') as deadline_raw,
       o.fee_status, o.fee_cents, o.fee_currency, o.prize, o.location,
       o.submission_url, o.guidelines_url, o.submission_state,
       s.url as source_url,
       coalesce(evidence.processing_succeeded_at, o.processing_succeeded_at) as processing_succeeded_at,
       coalesce(evidence.organization_confirmed, false) as organization_confirmed,
       coalesce(profile.accepted_formats, '{}') as accepted_formats,
       coalesce((select jsonb_agg(jsonb_build_object('label', m.label, 'limit', m."limit") order by m.sort_order)
                 from opportunity_required_materials m where m.opportunity_id = o.id), '[]'::jsonb) as required_materials,
       profile.eligibility_summary,
       profile.reading_period_kind,
       org.data->>'description' as editorial_focus
     from opportunities o
     join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join opportunity_contents c on c.opportunity_id = o.id
     left join lateral (
       select e.processing_succeeded_at, e.organization_confirmed
       from opportunity_source_evidence e
       where e.opportunity_id = o.id order by e.checked_at desc limit 1
     ) evidence on true
     left join opportunity_call_profiles profile on profile.opportunity_id = o.id
     where o.id = $1 and o.publication_state in ('published', 'reviewable')`,
    [opportunityId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    organizationId: row.organization_id,
    organizationData: row.organization_data,
    input: {
      title: row.title,
      type: row.type,
      status: row.status,
      organizationName: row.organization_name ?? undefined,
      discipline: row.discipline ?? undefined,
      genres: row.genres ?? [],
      deadline: { kind: row.deadline_kind, date: row.deadline_date ?? undefined, raw: row.deadline_raw ?? undefined },
      fee: { status: row.fee_status, amountCents: row.fee_cents ?? undefined, currency: row.fee_currency ?? undefined },
      prize: row.prize ?? undefined,
      location: row.location ?? undefined,
      submissionUrl: row.submission_url ?? undefined,
      guidelinesUrl: row.guidelines_url ?? undefined,
      submissionState: row.submission_state,
      requiredMaterials: materialArray(row.required_materials),
      acceptedFormats: row.accepted_formats ?? [],
      sourceUrl: row.source_url,
      sourceProcessedAt: iso(row.processing_succeeded_at),
      organizationConfirmed: row.organization_confirmed,
      generatedAt: new Date().toISOString(),
      description: row.description ?? undefined,
      guidelinesText: row.guidelines_text ?? undefined,
      editorialFocus: row.editorial_focus ?? undefined,
      organizationSummary: typeof row.organization_data?.description === 'string' ? row.organization_data.description : undefined,
      eligibilitySummary: row.eligibility_summary ?? undefined,
      readingPeriodKind: row.reading_period_kind ?? undefined,
    },
  };
}

async function failJob(pool: Pool, job: ContentJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(job.attempts, 8));
  await pool.query(
    `update radar_content_review_jobs
     set status = case when attempts >= 8 then 'blocked' else 'failed' end,
         last_error = $2, next_attempt_at = now() + ($3 || ' minutes')::interval,
         lease_until = null, updated_at = now()
     where id = $1`,
    [job.id, message.slice(0, 500), String(delayMinutes)],
  );
}

async function writeHandoff(client: PoolClient, runId: string, opportunityId: string, fromAgent: string, toAgent: string, kind: string, status: string, payload: Record<string, unknown>): Promise<void> {
  await client.query(
    `insert into radar_agent_handoffs (id, run_id, opportunity_id, from_agent, to_agent, kind, status, payload)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     on conflict (run_id, opportunity_id, to_agent, kind) do update
       set status = excluded.status, payload = excluded.payload,
           completed_at = case when excluded.status = 'completed' then now() else null end`,
    [randomUUID(), runId, opportunityId, fromAgent, toAgent, kind, status, JSON.stringify(payload)],
  );
}

async function buildJob(pool: Pool, runId: string, job: ContentJob): Promise<boolean> {
  const fetched = await contentInput(pool, job.opportunityId);
  if (!fetched) {
    await pool.query(`update radar_content_review_jobs set status = 'blocked', last_error = 'Opportunity is no longer content-buildable', lease_until = null, updated_at = now() where id = $1`, [job.id]);
    return false;
  }
  const { input, organizationId, organizationData } = fetched;

  // 1. Synthesize curatorial dossier using AI (DeepSeek / OpenAI) or elevated deterministic writer
  const content = await writeOpportunityEditorial(input);

  // 2. If the host institution has not had an editorial profile written yet, craft one
  if (organizationId && organizationData && !organizationData.editorialProfile) {
    try {
      const orgEditorial = await writeOrganizationEditorial({
        name: input.organizationName || String(organizationData.name || ''),
        websiteUrl: String(organizationData.website_url || organizationData.websiteUrl || ''),
        kind: String(organizationData.kind || ''),
        location: input.location,
        rawDescription: String(organizationData.description || organizationData.biography || ''),
        editorialFocus: input.editorialFocus,
        sampleCalls: [input.title],
      });
      await pool.query(
        `update radar_organizations
         set data = jsonb_set(data, '{editorialProfile}', $2::jsonb),
             updated_at = now()
         where id = $1`,
        [organizationId, JSON.stringify(orgEditorial)],
      );
    } catch (orgErr) {
      console.warn(`[content-worker] Failed to generate organization editorial profile for ${organizationId}:`, orgErr);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into opportunity_contents
         (opportunity_id, input_version, builder_version, content, review_status, review_score, review_reasons, review_checks, generated_at, reviewed_at, updated_at)
       values ($1, $2, $3, $4::jsonb, 'pending', 0, '[]'::jsonb, '{}'::jsonb, $5, null, now())
       on conflict (opportunity_id) do update set
         input_version = excluded.input_version, builder_version = excluded.builder_version,
         content = excluded.content, review_status = 'pending', review_score = 0,
         review_reasons = '[]'::jsonb, review_checks = '{}'::jsonb,
         generated_at = excluded.generated_at, reviewed_at = null, updated_at = now()`,
      [job.opportunityId, job.inputVersion, content.builderVersion, JSON.stringify(content), content.generatedAt],
    );
    await client.query(`update radar_content_review_jobs set status = 'pending-review', lease_until = null, next_attempt_at = now(), updated_at = now() where id = $1`, [job.id]);
    await writeHandoff(client, runId, job.opportunityId, 'content-builder', 'content-review', 'content-built', 'queued', { builderVersion: content.builderVersion, inputVersion: job.inputVersion });
    await client.query('commit');
    return true;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function reviewRow(pool: Pool, opportunityId: string): Promise<ReviewRow | null> {
  const result = await pool.query<ReviewRow>(
    `select c.content, s.url as source_url,
       coalesce(evidence.processing_succeeded_at, o.processing_succeeded_at) as processing_succeeded_at,
       coalesce(evidence.organization_confirmed, false) as organization_confirmed,
       o.submission_state
     from opportunity_contents c
     join opportunities o on o.id = c.opportunity_id
     join opportunity_sources s on s.id = o.source_id
     left join lateral (
       select e.processing_succeeded_at, e.organization_confirmed
       from opportunity_source_evidence e
       where e.opportunity_id = o.id order by e.checked_at desc limit 1
     ) evidence on true
     where c.opportunity_id = $1 and o.publication_state in ('published', 'reviewable')`,
    [opportunityId],
  );
  return result.rows[0] ?? null;
}

async function reviewJob(pool: Pool, runId: string, job: ContentJob): Promise<OpportunityContentDecision> {
  const row = await reviewRow(pool, job.opportunityId);
  if (!row) {
    await pool.query(`update radar_content_review_jobs set status = 'blocked', last_error = 'Content projection is missing', lease_until = null, updated_at = now() where id = $1`, [job.id]);
    return 'error';
  }
  const result = reviewOpportunityContent(row.content, {
    sourceUrl: row.source_url,
    sourceProcessedAt: iso(row.processing_succeeded_at),
    organizationConfirmed: row.organization_confirmed,
    submissionState: row.submission_state,
  });
  const reviewedContent: OpportunityContent = {
    ...row.content,
    review: {
      status: result.decision === 'approved' ? 'approved' : result.decision === 'needs-human' ? 'needs-human' : 'blocked',
      score: result.score,
      reasons: result.reasons,
      checks: result.checks,
      reviewedAt: new Date().toISOString(),
    },
  };
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into radar_content_review_decisions (id, job_id, opportunity_id, run_id, decision, score, reasons, checks)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [randomUUID(), job.id, job.opportunityId, runId, result.decision, result.score, JSON.stringify(result.reasons), JSON.stringify(result.checks)],
    );
    const jobStatus: ContentJobStatus = result.decision === 'approved' ? 'completed' : result.decision === 'needs-human' ? 'needs-human' : 'blocked';
    const contentStatus = reviewedContent.review.status;
    await client.query(
      `update opportunity_contents
       set content = $2::jsonb, review_status = $3, review_score = $4,
           review_reasons = $5::jsonb, review_checks = $6::jsonb,
           reviewed_at = now(), updated_at = now()
       where opportunity_id = $1`,
      [job.opportunityId, JSON.stringify(reviewedContent), contentStatus, result.score, JSON.stringify(result.reasons), JSON.stringify(result.checks)],
    );
    await client.query(`update radar_content_review_jobs set status = $2, lease_until = null, updated_at = now() where id = $1`, [job.id, jobStatus]);
    if (result.decision === 'approved') {
      await writeHandoff(client, runId, job.opportunityId, 'content-review', 'publisher', 'content-approved', 'completed', { score: result.score, builderVersion: row.content.builderVersion });
    } else {
      await writeHandoff(client, runId, job.opportunityId, 'content-review', 'human-review', 'content-needs-review', 'queued', { decision: result.decision, score: result.score, reasons: result.reasons });
    }
    await client.query('commit');
    return result.decision;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function runContentReviewTick(pool: Pool, limit = batchSize()): Promise<{ built: number; reviewed: number; decisions: Record<OpportunityContentDecision, number> }> {
  await ensureAgentGraphSchema(pool);
  await ensureContentReviewSchema(pool);
  const runId = await startWorkerRun(pool, 'content-worker');
  if (!runId) throw new Error('Unable to start the content worker run telemetry record');
  try {
    await heartbeatWorkerRun(pool, runId, 'content-worker');
    await seedContentJobs(pool);
    const buildJobs = await claimBuildJobs(pool, limit);
    let built = 0;
    for (const job of buildJobs) {
      try { if (await buildJob(pool, runId, job)) built++; } catch (error) { await failJob(pool, job, error); }
    }
    const reviewJobs = await claimReviewJobs(pool, limit);
    const decisions: Record<OpportunityContentDecision, number> = { approved: 0, 'needs-human': 0, blocked: 0, error: 0 };
    for (const job of reviewJobs) {
      try { decisions[await reviewJob(pool, runId, job)]++; } catch (error) { await failJob(pool, job, error); decisions.error++; }
    }
    await heartbeatWorkerRun(pool, runId, 'content-worker', { inputCount: buildJobs.length + reviewJobs.length, outputCount: built + reviewJobs.length });
    await finishWorkerRun(pool, runId, 'content-worker', 'completed', { inputCount: buildJobs.length + reviewJobs.length, outputCount: built + reviewJobs.length });
    return { built, reviewed: reviewJobs.length, decisions };
  } catch (error) {
    await heartbeatWorkerRun(pool, runId, 'content-worker', { lastError: error instanceof Error ? error.message : String(error) });
    await finishWorkerRun(pool, runId, 'content-worker', 'failed', { lastError: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to run the Missa content worker.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const limit = batchSize();
  const delay = intervalMs();
  console.log(`[missa-content-worker] running every ${Math.round(delay / 60_000)} minutes, batch=${limit}`);
  try {
    while (!controller.signal.aborted) {
      let hasMore = false;
      try {
        const result = await runContentReviewTick(pool, limit);
        console.log(`[missa-content-worker] tick: built=${result.built} reviewed=${result.reviewed} decisions=${JSON.stringify(result.decisions)}`);
        hasMore = result.built >= limit || result.reviewed >= limit;
      } catch (error) {
        console.error('[missa-content-worker] tick failed; retrying after interval', error);
      }
      const sleepDuration = hasMore ? BACKLOG_DRAIN_DELAY_MS : delay;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, sleepDuration);
        controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('contentWorker.js')) {
  main().catch((error) => { console.error('[missa-content-worker] stopped unexpectedly', error); process.exitCode = 1; });
}
