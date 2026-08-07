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
  Decision,
  DeliveryTask,
} from '../domain/types.js';
import { postgresSchema } from './postgresSchema.js';

async function taxonomyAssignmentsAvailable(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<{ ready: boolean }> }> }): Promise<boolean> {
  if (process.env.MISSA_TAXONOMY_PERSISTENCE === '0') return false;
  const result = await client.query(
    `select to_regclass('public.taxonomy_terms') is not null
      and to_regclass('public.work_taxonomy_terms') is not null
      and to_regclass('public.submission_path_taxonomy_terms') is not null as ready`,
  );
  return result.rows[0]?.ready === true;
}

async function writeTaxonomyAssignments(client: { query: (text: string, values?: unknown[]) => Promise<unknown> }, path: SubmissionPath | undefined, work: Work | undefined): Promise<void> {
  if (path) {
    await client.query('delete from submission_path_taxonomy_terms where submission_path_id = $1', [path.id]);
    for (const assignment of path.taxonomyAssignments ?? []) {
      await client.query(
        `insert into submission_path_taxonomy_terms (submission_path_id, term_id, rule, required)
         values ($1, $2, $3, $4) on conflict (submission_path_id, term_id, rule) do update set required = excluded.required`,
        [path.id, assignment.termId, assignment.rule, assignment.required ?? assignment.rule === 'required'],
      );
    }
  }
  if (work) {
    await client.query('delete from work_taxonomy_terms where work_id = $1', [work.id]);
    for (const [index, termId] of (work.taxonomyTermIds ?? []).entries()) {
      await client.query(
        `insert into work_taxonomy_terms (work_id, term_id, "primary", assignment_origin)
         values ($1, $2, $3, 'user') on conflict (work_id, term_id) do update set "primary" = excluded."primary"`,
        [work.id, termId, index === 0],
      );
    }
  }
}

export const WORKSPACE_SNAPSHOT_DOMAIN = 'workspace';

export class SnapshotConflictError extends Error {
  readonly domain: string;
  readonly expectedVersion: number;
  readonly currentVersion: number;

  constructor(domain: string, expectedVersion: number, currentVersion: number) {
    super(`The ${domain} snapshot changed before this write completed`);
    this.name = 'SnapshotConflictError';
    this.domain = domain;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

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
export async function saveStoreToPostgres(store: WorkspaceStore, pool: Pool, expectedVersion?: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('missa.workspace.snapshot'))");
    const versionRow = await client.query<{ version: string }>(
      'select version from missa_snapshot_versions where domain = $1 for update',
      [WORKSPACE_SNAPSHOT_DOMAIN],
    );
    const currentVersion = Number(versionRow.rows[0]?.version ?? 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new SnapshotConflictError(WORKSPACE_SNAPSHOT_DOMAIN, expectedVersion, currentVersion);
    }
    const taxonomyEnabled = await taxonomyAssignmentsAvailable(client);

    // Children first, so foreign keys never point at a row we're about to delete.
    await client.query('delete from review_recommendations');
    await client.query('delete from review_assignments');
    await client.query('delete from review_rounds');
    await client.query('delete from decisions');
    await client.query('delete from delivery_tasks');
    await client.query('delete from works');
    await client.query('delete from submissions');
    await client.query('delete from submission_drafts');
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
        'insert into open_calls (id, program_id, title, status, radar_opportunity_id, created_at, published_at, guideline_url, guideline_text, guideline_source_type, guideline_imported_at, guideline_import_report) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [o.id, o.programId, o.title, o.status, o.radarOpportunityId ?? null, o.createdAt, o.publishedAt ?? null, o.guidelineUrl ?? null, o.guidelineText ?? null, o.guidelineSourceType ?? null, o.guidelineImportedAt ?? null, o.guidelineImportReport ? JSON.stringify(o.guidelineImportReport) : null],
      );
    }

    for (const s of store.submissionPaths.values()) {
      await client.query(
        'insert into submission_paths (id, open_call_id, categories, fields, fee_cents, created_at) values ($1, $2, $3, $4, $5, $6)',
        [s.id, s.openCallId, JSON.stringify(s.categories), JSON.stringify(s.fields), s.feeCents ?? null, s.createdAt],
      );
      if (taxonomyEnabled) await writeTaxonomyAssignments(client, s, undefined);
    }

    for (const s of store.submissions.values()) {
      await client.query(
        'insert into submissions (id, submission_path_id, submitter_account_id, status, submitted_at, payment_status, payment_session_id, fee_cents, idempotency_key, answers, category) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [s.id, s.submissionPathId, s.submitterAccountId, s.status, s.submittedAt, s.paymentStatus ?? 'not-required', s.paymentSessionId ?? null, s.feeCents ?? null, s.idempotencyKey ?? null, s.answers ? JSON.stringify(s.answers) : null, s.category ?? null],
      );
    }

    for (const w of store.works.values()) {
      await client.query('insert into works (id, submission_id, title, file_url, file_urls, "order") values ($1, $2, $3, $4, $5, $6)', [
        w.id,
        w.submissionId,
        w.title,
        w.fileUrl ?? null,
        w.fileUrls ? JSON.stringify(w.fileUrls) : null,
        w.order,
      ]);
      if (taxonomyEnabled) await writeTaxonomyAssignments(client, undefined, w);
    }

    for (const draft of store.submissionDrafts.values()) {
      await client.query('insert into submission_drafts (id, submission_path_id, submitter_account_id, answers, category, work_titles, idempotency_key, payment_session_id, updated_at, expires_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [draft.id, draft.submissionPathId, draft.submitterAccountId, JSON.stringify(draft.answers), draft.category ?? null, JSON.stringify(draft.workTitles), draft.idempotencyKey ?? null, draft.paymentSessionId ?? null, draft.updatedAt, draft.expiresAt]);
    }

    for (const d of store.decisions.values()) {
      await client.query(
        'insert into decisions (id, work_id, outcome, decided_by_account_id, decided_at) values ($1, $2, $3, $4, $5)',
        [d.id, d.workId, d.outcome, d.decidedByAccountId, d.decidedAt],
      );
    }

    for (const task of store.deliveryTasks.values()) {
      await client.query('insert into delivery_tasks (id, work_id, status, due_date, completed_at) values ($1, $2, $3, $4, $5)', [task.id, task.workId, task.status, task.dueDate ?? null, task.completedAt ?? null]);
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

    for (const entry of store.auditLog) {
      await client.query(
        'insert into workspace_audit_log (id, at, account_id, action, target_type, target_id, detail) values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing',
        [entry.id, entry.at, entry.accountId ?? null, entry.action, entry.targetType, entry.targetId, entry.detail ?? null],
      );
    }

    const nextVersion = currentVersion + 1;
    await client.query(
      'insert into missa_snapshot_versions (domain, version, updated_at) values ($1, $2, now()) on conflict (domain) do update set version = excluded.version, updated_at = excluded.updated_at',
      [WORKSPACE_SNAPSHOT_DOMAIN, nextVersion],
    );
    await client.query('commit');
    return nextVersion;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function readSnapshotVersion(pool: Pool): Promise<number> {
  const result = await pool.query<{ version: string }>(
    'select version from missa_snapshot_versions where domain = $1',
    [WORKSPACE_SNAPSHOT_DOMAIN],
  );
  return Number(result.rows[0]?.version ?? 0);
}

type MapDelta<T> = { upserts: T[]; deletes: string[] };

function mapDelta<T>(before: Map<string, T>, after: Map<string, T>): MapDelta<T & { id: string }> {
  const upserts: Array<T & { id: string }> = [];
  for (const [id, value] of after) {
    const previous = before.get(id);
    if (previous === undefined || JSON.stringify(previous) !== JSON.stringify(value)) {
      upserts.push({ ...(value as T), id } as T & { id: string });
    }
  }
  const deletes = [...before.keys()].filter((id) => !after.has(id));
  return { upserts, deletes };
}

/**
 * Applies only the changes between two Workspace snapshots. This is the
 * production write path: independent serverless instances can merge changes
 * to different rows, while same-row edits remain last-writer-wins.
 */
export async function saveStoreDeltaToPostgres(
  current: WorkspaceStore,
  previous: WorkspaceStore,
  pool: Pool,
  expectedVersion?: number,
): Promise<number> {
  const delta = {
    entities: mapDelta(previous.entities, current.entities),
    programs: mapDelta(previous.programs, current.programs),
    openCalls: mapDelta(previous.openCalls, current.openCalls),
    submissionPaths: mapDelta(previous.submissionPaths, current.submissionPaths),
    submissions: mapDelta(previous.submissions, current.submissions),
    submissionDrafts: mapDelta(previous.submissionDrafts, current.submissionDrafts),
    works: mapDelta(previous.works, current.works),
    reviewRounds: mapDelta(previous.reviewRounds, current.reviewRounds),
    reviewAssignments: mapDelta(previous.reviewAssignments, current.reviewAssignments),
    reviewRecommendations: mapDelta(previous.reviewRecommendations, current.reviewRecommendations),
    decisions: mapDelta(previous.decisions, current.decisions),
    deliveryTasks: mapDelta(previous.deliveryTasks, current.deliveryTasks),
  };
  const previousAuditIds = new Set(previous.auditLog.map((entry) => entry.id));
  const newAuditEntries = current.auditLog.filter((entry) => !previousAuditIds.has(entry.id));
  const changed = Object.values(delta).some((item) => item.upserts.length > 0 || item.deletes.length > 0) || newAuditEntries.length > 0;
  if (!changed) return expectedVersion ?? await readSnapshotVersion(pool);

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('missa.workspace.snapshot'))");
    const versionRow = await client.query<{ version: string }>(
      'select version from missa_snapshot_versions where domain = $1 for update',
      [WORKSPACE_SNAPSHOT_DOMAIN],
    );
    const currentVersion = Number(versionRow.rows[0]?.version ?? 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new SnapshotConflictError(WORKSPACE_SNAPSHOT_DOMAIN, expectedVersion, currentVersion);
    }
    const taxonomyEnabled = await taxonomyAssignmentsAvailable(client);

    // Delete children before parents where a caller explicitly removed rows.
    for (const id of delta.reviewRecommendations.deletes) await client.query('delete from review_recommendations where review_assignment_id = $1', [id]);
    for (const id of delta.reviewAssignments.deletes) await client.query('delete from review_assignments where id = $1', [id]);
    for (const id of delta.reviewRounds.deletes) await client.query('delete from review_rounds where id = $1', [id]);
    for (const id of delta.decisions.deletes) await client.query('delete from decisions where id = $1', [id]);
    for (const id of delta.deliveryTasks.deletes) await client.query('delete from delivery_tasks where id = $1', [id]);
    for (const id of delta.works.deletes) await client.query('delete from works where id = $1', [id]);
    for (const id of delta.submissions.deletes) await client.query('delete from submissions where id = $1', [id]);
    for (const id of delta.submissionDrafts.deletes) await client.query('delete from submission_drafts where id = $1', [id]);
    for (const id of delta.submissionPaths.deletes) await client.query('delete from submission_paths where id = $1', [id]);
    for (const id of delta.openCalls.deletes) await client.query('delete from open_calls where id = $1', [id]);
    for (const id of delta.programs.deletes) await client.query('delete from programs where id = $1', [id]);
    for (const id of delta.entities.deletes) await client.query('delete from entities where id = $1', [id]);

    for (const e of delta.entities.upserts) await client.query(
      'insert into entities (id, organization_id, name, label, created_at) values ($1, $2, $3, $4, $5) on conflict (id) do update set organization_id = excluded.organization_id, name = excluded.name, label = excluded.label, created_at = excluded.created_at',
      [e.id, e.organizationId, e.name, e.label ?? null, e.createdAt],
    );
    for (const p of delta.programs.upserts) await client.query(
      'insert into programs (id, entity_id, name, created_at) values ($1, $2, $3, $4) on conflict (id) do update set entity_id = excluded.entity_id, name = excluded.name, created_at = excluded.created_at',
      [p.id, p.entityId, p.name, p.createdAt],
    );
    for (const o of delta.openCalls.upserts) await client.query(
      'insert into open_calls (id, program_id, title, status, radar_opportunity_id, created_at, published_at, guideline_url, guideline_text, guideline_source_type, guideline_imported_at, guideline_import_report) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) on conflict (id) do update set program_id = excluded.program_id, title = excluded.title, status = excluded.status, radar_opportunity_id = excluded.radar_opportunity_id, created_at = excluded.created_at, published_at = excluded.published_at, guideline_url = excluded.guideline_url, guideline_text = excluded.guideline_text, guideline_source_type = excluded.guideline_source_type, guideline_imported_at = excluded.guideline_imported_at, guideline_import_report = excluded.guideline_import_report',
      [o.id, o.programId, o.title, o.status, o.radarOpportunityId ?? null, o.createdAt, o.publishedAt ?? null, o.guidelineUrl ?? null, o.guidelineText ?? null, o.guidelineSourceType ?? null, o.guidelineImportedAt ?? null, o.guidelineImportReport ? JSON.stringify(o.guidelineImportReport) : null],
    );
    for (const s of delta.submissionPaths.upserts) await client.query(
      'insert into submission_paths (id, open_call_id, categories, fields, fee_cents, created_at) values ($1, $2, $3, $4, $5, $6) on conflict (id) do update set open_call_id = excluded.open_call_id, categories = excluded.categories, fields = excluded.fields, fee_cents = excluded.fee_cents, created_at = excluded.created_at',
      [s.id, s.openCallId, JSON.stringify(s.categories), JSON.stringify(s.fields), s.feeCents ?? null, s.createdAt],
    );
    if (taxonomyEnabled) for (const s of delta.submissionPaths.upserts) await writeTaxonomyAssignments(client, s, undefined);
    for (const s of delta.submissions.upserts) await client.query(
      'insert into submissions (id, submission_path_id, submitter_account_id, status, submitted_at, payment_status, payment_session_id, fee_cents, idempotency_key, answers, category) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) on conflict (submitter_account_id, submission_path_id, idempotency_key) where idempotency_key is not null do update set status = excluded.status, submitted_at = excluded.submitted_at, payment_status = excluded.payment_status, payment_session_id = excluded.payment_session_id, fee_cents = excluded.fee_cents, answers = excluded.answers, category = excluded.category',
      [s.id, s.submissionPathId, s.submitterAccountId, s.status, s.submittedAt, s.paymentStatus ?? 'not-required', s.paymentSessionId ?? null, s.feeCents ?? null, s.idempotencyKey ?? null, s.answers ? JSON.stringify(s.answers) : null, s.category ?? null],
    );
    for (const w of delta.works.upserts) await client.query(
      'insert into works (id, submission_id, title, file_url, file_urls, "order") values ($1, $2, $3, $4, $5, $6) on conflict (id) do update set submission_id = excluded.submission_id, title = excluded.title, file_url = excluded.file_url, file_urls = excluded.file_urls, "order" = excluded."order"',
      [w.id, w.submissionId, w.title, w.fileUrl ?? null, w.fileUrls ? JSON.stringify(w.fileUrls) : null, w.order],
    );
    if (taxonomyEnabled) for (const w of delta.works.upserts) await writeTaxonomyAssignments(client, undefined, w);
    for (const draft of delta.submissionDrafts.upserts) await client.query(
      'insert into submission_drafts (id, submission_path_id, submitter_account_id, answers, category, work_titles, idempotency_key, payment_session_id, updated_at, expires_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (id) do update set submission_path_id = excluded.submission_path_id, submitter_account_id = excluded.submitter_account_id, answers = excluded.answers, category = excluded.category, work_titles = excluded.work_titles, idempotency_key = excluded.idempotency_key, payment_session_id = excluded.payment_session_id, updated_at = excluded.updated_at, expires_at = excluded.expires_at',
      [draft.id, draft.submissionPathId, draft.submitterAccountId, JSON.stringify(draft.answers), draft.category ?? null, JSON.stringify(draft.workTitles), draft.idempotencyKey ?? null, draft.paymentSessionId ?? null, draft.updatedAt, draft.expiresAt],
    );
    for (const round of delta.reviewRounds.upserts) await client.query(
      'insert into review_rounds (id, open_call_id, name, created_at) values ($1, $2, $3, $4) on conflict (id) do update set open_call_id = excluded.open_call_id, name = excluded.name, created_at = excluded.created_at',
      [round.id, round.openCallId, round.name, round.createdAt],
    );
    for (const assignment of delta.reviewAssignments.upserts) await client.query(
      'insert into review_assignments (id, review_round_id, submission_id, reviewer_account_id, completed_at) values ($1, $2, $3, $4, $5) on conflict (id) do update set review_round_id = excluded.review_round_id, submission_id = excluded.submission_id, reviewer_account_id = excluded.reviewer_account_id, completed_at = excluded.completed_at',
      [assignment.id, assignment.reviewRoundId, assignment.submissionId, assignment.reviewerAccountId, assignment.completedAt ?? null],
    );
    for (const recommendation of delta.reviewRecommendations.upserts) await client.query(
      'insert into review_recommendations (review_assignment_id, score, notes, recorded_at) values ($1, $2, $3, $4) on conflict (review_assignment_id) do update set score = excluded.score, notes = excluded.notes, recorded_at = excluded.recorded_at',
      [recommendation.reviewAssignmentId, recommendation.score ?? null, recommendation.notes ?? null, recommendation.recordedAt],
    );
    for (const decision of delta.decisions.upserts) await client.query(
      'insert into decisions (id, work_id, outcome, decided_by_account_id, decided_at) values ($1, $2, $3, $4, $5) on conflict (work_id) do update set outcome = excluded.outcome, decided_by_account_id = excluded.decided_by_account_id, decided_at = excluded.decided_at',
      [decision.id, decision.workId, decision.outcome, decision.decidedByAccountId, decision.decidedAt],
    );
    for (const task of delta.deliveryTasks.upserts) await client.query(
      'insert into delivery_tasks (id, work_id, status, due_date, completed_at) values ($1, $2, $3, $4, $5) on conflict (work_id) do update set status = excluded.status, due_date = excluded.due_date, completed_at = excluded.completed_at',
      [task.id, task.workId, task.status, task.dueDate ?? null, task.completedAt ?? null],
    );
    for (const entry of newAuditEntries) await client.query(
      'insert into workspace_audit_log (id, at, account_id, action, target_type, target_id, detail) values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing',
      [entry.id, entry.at, entry.accountId ?? null, entry.action, entry.targetType, entry.targetId, entry.detail ?? null],
    );

    const nextVersion = currentVersion + 1;
    await client.query(
      'insert into missa_snapshot_versions (domain, version, updated_at) values ($1, $2, now()) on conflict (domain) do update set version = excluded.version, updated_at = excluded.updated_at',
      [WORKSPACE_SNAPSHOT_DOMAIN, nextVersion],
    );
    await client.query('commit');
    return nextVersion;
  } catch (error) {
    await client.query('rollback');
    throw error;
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
    guideline_url: string | null;
    guideline_text: string | null;
    guideline_source_type: OpenCall['guidelineSourceType'] | null;
    guideline_imported_at: Date | null;
    guideline_import_report: OpenCall['guidelineImportReport'] | null;
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
      guidelineUrl: row.guideline_url ?? undefined,
      guidelineText: row.guideline_text ?? undefined,
      guidelineSourceType: row.guideline_source_type ?? undefined,
      guidelineImportedAt: row.guideline_imported_at?.toISOString(),
      guidelineImportReport: row.guideline_import_report ?? undefined,
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
  const taxonomyReady = (await pool.query<{ ready: boolean }>(
    `select to_regclass('public.taxonomy_terms') is not null
      and to_regclass('public.work_taxonomy_terms') is not null
      and to_regclass('public.submission_path_taxonomy_terms') is not null as ready`,
  )).rows[0]?.ready === true;
  if (taxonomyReady) {
    const pathTerms = await pool.query<{ submission_path_id: string; term_id: string; rule: NonNullable<SubmissionPath['taxonomyAssignments']>[number]['rule']; required: boolean }>(
      'select submission_path_id, term_id, rule, required from submission_path_taxonomy_terms',
    );
    for (const row of pathTerms.rows) {
      const path = store.submissionPaths.get(row.submission_path_id);
      if (path) (path.taxonomyAssignments ??= []).push({ termId: row.term_id, rule: row.rule, required: row.required });
    }
  }

  const submissions = await pool.query<{
    id: string;
    submission_path_id: string;
    submitter_account_id: string;
    status: Submission['status'];
    submitted_at: Date;
    payment_status: 'not-required' | 'paid' | 'failed' | 'refunded' | 'disputed' | null;
    payment_session_id: string | null;
    fee_cents: number | null;
    idempotency_key: string | null;
    answers: Record<string, string | string[]> | null;
    category: string | null;
  }>('select * from submissions');
  for (const row of submissions.rows) {
    const submission: Submission = {
      id: row.id,
      submissionPathId: row.submission_path_id,
      submitterAccountId: row.submitter_account_id,
      status: row.status,
      submittedAt: row.submitted_at.toISOString(),
      paymentStatus: row.payment_status ?? 'not-required',
      paymentSessionId: row.payment_session_id ?? undefined,
      feeCents: row.fee_cents ?? undefined,
      idempotencyKey: row.idempotency_key ?? undefined,
      answers: row.answers ?? undefined,
      category: row.category ?? undefined,
    };
    store.submissions.set(submission.id, submission);
  }

  const works = await pool.query<{ id: string; submission_id: string; title: string; file_url: string | null; file_urls: string[] | null; order: number }>(
    'select * from works',
  );
  for (const row of works.rows) {
    const work: Work = { id: row.id, submissionId: row.submission_id, title: row.title, fileUrl: row.file_url ?? undefined, fileUrls: row.file_urls ?? undefined, order: row.order };
    store.works.set(work.id, work);
  }
  if (taxonomyReady) {
    const workTerms = await pool.query<{ work_id: string; term_id: string; primary: boolean }>(
      'select work_id, term_id, "primary" from work_taxonomy_terms order by work_id, "primary" desc, term_id',
    );
    for (const row of workTerms.rows) {
      const work = store.works.get(row.work_id);
      if (work) (work.taxonomyTermIds ??= []).push(row.term_id);
    }
  }

  const drafts = await pool.query<{ id: string; submission_path_id: string; submitter_account_id: string; answers: Record<string, string | string[]>; category: string | null; work_titles: string[]; idempotency_key: string | null; payment_session_id: string | null; updated_at: Date; expires_at: Date }>('select * from submission_drafts');
  for (const row of drafts.rows) {
    store.submissionDrafts.set(row.id, { id: row.id, submissionPathId: row.submission_path_id, submitterAccountId: row.submitter_account_id, answers: row.answers, category: row.category ?? undefined, workTitles: row.work_titles, idempotencyKey: row.idempotency_key ?? undefined, paymentSessionId: row.payment_session_id ?? undefined, updatedAt: row.updated_at.toISOString(), expiresAt: row.expires_at.toISOString() });
  }

  const decisions = await pool.query<{
    id: string;
    work_id: string;
    outcome: Decision['outcome'];
    decided_by_account_id: string;
    decided_at: Date;
  }>('select * from decisions');
  for (const row of decisions.rows) {
    const decision: Decision = {
      id: row.id,
      workId: row.work_id,
      outcome: row.outcome,
      decidedByAccountId: row.decided_by_account_id,
      decidedAt: row.decided_at.toISOString(),
    };
    store.decisions.set(decision.id, decision);
  }

  const deliveryTasks = await pool.query<{ id: string; work_id: string; status: DeliveryTask['status']; due_date: string | null; completed_at: Date | null }>('select * from delivery_tasks');
  for (const row of deliveryTasks.rows) {
    const task: DeliveryTask = { id: row.id, workId: row.work_id, status: row.status, dueDate: row.due_date as DeliveryTask['dueDate'], completedAt: row.completed_at?.toISOString() };
    store.deliveryTasks.set(task.id, task);
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

  const auditLog = await pool.query<{
    id: string;
    at: Date;
    account_id: string | null;
    action: string;
    target_type: string;
    target_id: string;
    detail: string | null;
  }>('select * from workspace_audit_log order by at asc');
  store.auditLog.push(...auditLog.rows.map((row) => ({
    id: row.id,
    at: row.at.toISOString(),
    accountId: row.account_id ?? undefined,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    detail: row.detail ?? undefined,
  })));

  return store;
}
