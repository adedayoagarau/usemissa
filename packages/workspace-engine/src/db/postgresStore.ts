import type { Pool } from 'pg';
import { createStore, type WorkspaceStore } from '../store/store.js';
import type {
  Entity,
  Program,
  OpenCall,
  SubmissionPath,
  SubmissionField,
  Submission,
  Work,
  ReviewRound,
  ReviewAssignment,
  ReviewRecommendation,
} from '../domain/types.js';
import { postgresSchema } from './postgresSchema.js';

/** Creates the Workspace tables (idempotent — safe to call on every boot). */
export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(postgresSchema);
}

/**
 * Postgres-backed persistence for `WorkspaceStore` -- same read-whole/
 * write-whole contract as radar-adapters/src/postgresStore.ts, but mapping
 * to the fully-typed columns db/schema.ts defines (no jsonb envelope column
 * the way Radar's store does) since every field here already has a proper
 * column.
 */
export async function saveStoreToPostgres(store: WorkspaceStore, pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    // Children first, so foreign keys never point at a row we're about to delete.
    await client.query('delete from review_recommendations');
    await client.query('delete from review_assignments');
    await client.query('delete from review_rounds');
    await client.query('delete from works');
    await client.query('delete from submissions');
    await client.query('delete from submission_paths');
    await client.query('delete from open_calls');
    await client.query('delete from programs');
    await client.query('delete from entities');

    // Parents first, so each insert's foreign key already exists.
    for (const e of store.entities.values()) {
      await client.query(
        'insert into entities (id, organization_id, name, label, created_at) values ($1, $2, $3, $4, $5)',
        [e.id, e.organizationId, e.name, e.label ?? null, e.createdAt],
      );
    }

    for (const p of store.programs.values()) {
      await client.query('insert into programs (id, entity_id, name, created_at) values ($1, $2, $3, $4)', [
        p.id,
        p.entityId,
        p.name,
        p.createdAt,
      ]);
    }

    for (const o of store.openCalls.values()) {
      await client.query(
        'insert into open_calls (id, program_id, title, status, radar_opportunity_id, created_at, published_at) values ($1, $2, $3, $4, $5, $6, $7)',
        [o.id, o.programId, o.title, o.status, o.radarOpportunityId ?? null, o.createdAt, o.publishedAt ?? null],
      );
    }

    for (const s of store.submissionPaths.values()) {
      await client.query(
        'insert into submission_paths (id, open_call_id, categories, fields, fee_cents, created_at) values ($1, $2, $3, $4, $5, $6)',
        [s.id, s.openCallId, JSON.stringify(s.categories), JSON.stringify(s.fields), s.feeCents ?? null, s.createdAt],
      );
    }

    for (const s of store.submissions.values()) {
      await client.query(
        'insert into submissions (id, submission_path_id, submitter_account_id, status, submitted_at) values ($1, $2, $3, $4, $5)',
        [s.id, s.submissionPathId, s.submitterAccountId, s.status, s.submittedAt],
      );
    }

    for (const w of store.works.values()) {
      await client.query('insert into works (id, submission_id, title, file_url, "order") values ($1, $2, $3, $4, $5)', [
        w.id,
        w.submissionId,
        w.title,
        w.fileUrl ?? null,
        w.order,
      ]);
    }

    for (const r of store.reviewRounds.values()) {
      await client.query('insert into review_rounds (id, open_call_id, name, created_at) values ($1, $2, $3, $4)', [
        r.id,
        r.openCallId,
        r.name,
        r.createdAt,
      ]);
    }

    for (const a of store.reviewAssignments.values()) {
      await client.query(
        'insert into review_assignments (id, review_round_id, submission_id, reviewer_account_id, completed_at) values ($1, $2, $3, $4, $5)',
        [a.id, a.reviewRoundId, a.submissionId, a.reviewerAccountId, a.completedAt ?? null],
      );
    }

    for (const r of store.reviewRecommendations.values()) {
      await client.query(
        'insert into review_recommendations (review_assignment_id, score, notes, recorded_at) values ($1, $2, $3, $4)',
        [r.reviewAssignmentId, r.score ?? null, r.notes ?? null, r.recordedAt],
      );
    }

    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function loadStoreFromPostgres(pool: Pool): Promise<WorkspaceStore> {
  const store = createStore();

  const entities = await pool.query<{ id: string; organization_id: string; name: string; label: string | null; created_at: Date }>(
    'select * from entities',
  );
  for (const row of entities.rows) {
    const entity: Entity = {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
    store.entities.set(entity.id, entity);
  }

  const programs = await pool.query<{ id: string; entity_id: string; name: string; created_at: Date }>('select * from programs');
  for (const row of programs.rows) {
    const program: Program = { id: row.id, entityId: row.entity_id, name: row.name, createdAt: row.created_at.toISOString() };
    store.programs.set(program.id, program);
  }

  const openCalls = await pool.query<{
    id: string;
    program_id: string;
    title: string;
    status: OpenCall['status'];
    radar_opportunity_id: string | null;
    created_at: Date;
    published_at: Date | null;
  }>('select * from open_calls');
  for (const row of openCalls.rows) {
    const openCall: OpenCall = {
      id: row.id,
      programId: row.program_id,
      title: row.title,
      status: row.status,
      radarOpportunityId: row.radar_opportunity_id ?? undefined,
      createdAt: row.created_at.toISOString(),
      publishedAt: row.published_at?.toISOString(),
    };
    store.openCalls.set(openCall.id, openCall);
  }

  const submissionPaths = await pool.query<{
    id: string;
    open_call_id: string;
    categories: string[];
    fields: SubmissionField[];
    fee_cents: number | null;
    created_at: Date;
  }>('select * from submission_paths');
  for (const row of submissionPaths.rows) {
    const path: SubmissionPath = {
      id: row.id,
      openCallId: row.open_call_id,
      categories: row.categories,
      fields: row.fields,
      feeCents: row.fee_cents ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
    store.submissionPaths.set(path.id, path);
  }

  const submissions = await pool.query<{
    id: string;
    submission_path_id: string;
    submitter_account_id: string;
    status: Submission['status'];
    submitted_at: Date;
  }>('select * from submissions');
  for (const row of submissions.rows) {
    const submission: Submission = {
      id: row.id,
      submissionPathId: row.submission_path_id,
      submitterAccountId: row.submitter_account_id,
      status: row.status,
      submittedAt: row.submitted_at.toISOString(),
    };
    store.submissions.set(submission.id, submission);
  }

  const works = await pool.query<{ id: string; submission_id: string; title: string; file_url: string | null; order: number }>(
    'select * from works',
  );
  for (const row of works.rows) {
    const work: Work = { id: row.id, submissionId: row.submission_id, title: row.title, fileUrl: row.file_url ?? undefined, order: row.order };
    store.works.set(work.id, work);
  }

  const reviewRounds = await pool.query<{ id: string; open_call_id: string; name: string; created_at: Date }>('select * from review_rounds');
  for (const row of reviewRounds.rows) {
    const round: ReviewRound = { id: row.id, openCallId: row.open_call_id, name: row.name, createdAt: row.created_at.toISOString() };
    store.reviewRounds.set(round.id, round);
  }

  const reviewAssignments = await pool.query<{
    id: string;
    review_round_id: string;
    submission_id: string;
    reviewer_account_id: string;
    completed_at: Date | null;
  }>('select * from review_assignments');
  for (const row of reviewAssignments.rows) {
    const assignment: ReviewAssignment = {
      id: row.id,
      reviewRoundId: row.review_round_id,
      submissionId: row.submission_id,
      reviewerAccountId: row.reviewer_account_id,
      completedAt: row.completed_at?.toISOString(),
    };
    store.reviewAssignments.set(assignment.id, assignment);
  }

  const reviewRecommendations = await pool.query<{
    review_assignment_id: string;
    score: number | null;
    notes: string | null;
    recorded_at: Date;
  }>('select * from review_recommendations');
  for (const row of reviewRecommendations.rows) {
    const recommendation: ReviewRecommendation = {
      reviewAssignmentId: row.review_assignment_id,
      score: row.score ?? undefined,
      notes: row.notes ?? undefined,
      recordedAt: row.recorded_at.toISOString(),
    };
    store.reviewRecommendations.set(recommendation.reviewAssignmentId, recommendation);
  }

  return store;
}
