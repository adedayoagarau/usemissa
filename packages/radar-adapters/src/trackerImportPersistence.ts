import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  cloneStore,
  commitTrackerImport,
  planTrackerImport,
  type AuditEntry,
  type ImportMapping,
  type ImportRowDecision,
  type ManualTrackerEntry,
  type Opportunity,
  type ParsedTrackerCsv,
  type RadarStore,
  type TrackedOpportunity,
  type TrackerImportResult,
} from '@missa/radar-engine';
import { uuidIds } from './uuidIds.js';

export type TrackerImportPersistenceErrorCode = 'conflict' | 'idempotency-conflict' | 'rate-limit' | 'review';

export class TrackerImportPersistenceError extends Error {
  constructor(message: string, readonly code: TrackerImportPersistenceErrorCode, readonly retryAfter?: number) {
    super(message);
    this.name = 'TrackerImportPersistenceError';
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function trackerImportCandidateHash(candidateSet: string[]): string {
  return createHash('sha256').update([...candidateSet].sort().join('|')).digest('hex');
}

export function trackerImportStateHash(store: RadarStore, userId: string): string {
  const tracked = store.tracked.filter((row) => row.userId === userId).sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
  const manual = store.manualTrackerEntries.filter((row) => row.userId === userId).sort((left, right) => left.id.localeCompare(right.id));
  return createHash('sha256').update(stableJson({ tracked, manual })).digest('hex');
}

export function trackerImportRequestHash(input: { sourceHash: string; mapping: ImportMapping; decisions: Record<string, ImportRowDecision> }): string {
  return createHash('sha256').update(stableJson(input)).digest('hex');
}

async function rateLimitInTransaction(client: PoolClient, input: { accountId: string; kind: 'preview' | 'commit'; limit: number; windowMs: number; now: Date }): Promise<void> {
  const key = `tracker-import-rate:${input.accountId}:${input.kind}`;
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [key]);
  const cutoff = new Date(input.now.getTime() - input.windowMs);
  await client.query('delete from tracker_import_rate_events where occurred_at < $1', [cutoff]);
  const count = await client.query<{ count: string; oldest: Date | string | null }>(
    `select count(*)::text as count, min(occurred_at) as oldest
       from tracker_import_rate_events
      where account_id = $1 and kind = $2 and occurred_at >= $3`,
    [input.accountId, input.kind, cutoff],
  );
  const used = Number(count.rows[0]?.count ?? 0);
  if (used >= input.limit) {
    const oldest = count.rows[0]?.oldest ? new Date(count.rows[0].oldest).getTime() : input.now.getTime();
    const retryAfter = Math.max(1, Math.ceil((input.windowMs - (input.now.getTime() - oldest)) / 1000));
    throw new TrackerImportPersistenceError('Too many import requests. Try again later.', 'rate-limit', retryAfter);
  }
  await client.query(
    'insert into tracker_import_rate_events (id, account_id, kind, occurred_at) values ($1, $2, $3, $4)',
    [`tracker_rate_${randomUUID()}`, input.accountId, input.kind, input.now],
  );
}

export async function consumeTrackerImportPreviewRateLimit(pool: Pool, input: { accountId: string; limit: number; windowMs: number; now?: Date }): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await rateLimitInTransaction(client, { ...input, kind: 'preview', now: input.now ?? new Date() });
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export interface DurableTrackerImportInput {
  accountId: string;
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  sourceHash: string;
  expectedCandidateHash: string;
  expectedTrackerHash: string;
  parsed: ParsedTrackerCsv;
  mapping: ImportMapping;
  decisions: Record<string, ImportRowDecision>;
  baseStore: RadarStore;
  now?: Date;
}

export interface DurableTrackerImportResult {
  result: TrackerImportResult;
  idempotent: boolean;
  tracked: TrackedOpportunity[];
  manualTrackerEntries: ManualTrackerEntry[];
  auditEntry?: AuditEntry;
  snapshotVersion: number;
}

async function currentUserTracker(client: PoolClient, userId: string): Promise<{ tracked: TrackedOpportunity[]; manual: ManualTrackerEntry[] }> {
  const [tracked, manual] = await Promise.all([
    client.query<{ data: TrackedOpportunity }>('select data from radar_tracked where user_id = $1 order by opportunity_id', [userId]),
    client.query<{ data: ManualTrackerEntry }>('select data from radar_manual_tracker_entries where user_id = $1 order by id', [userId]),
  ]);
  return { tracked: tracked.rows.map((row) => row.data), manual: manual.rows.map((row) => row.data) };
}

export async function commitTrackerImportTransaction(pool: Pool, input: DurableTrackerImportInput): Promise<DurableTrackerImportResult> {
  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 240) throw new TrackerImportPersistenceError('A valid idempotency key is required.', 'idempotency-conflict');
  const now = input.now ?? new Date();
  const client = await pool.connect();
  let working: RadarStore | undefined;
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('missa.radar.snapshot'))");
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`tracker-import:${input.accountId}:${idempotencyKey}`]);
    const versionRow = await client.query<{ version: string }>('select version from missa_snapshot_versions where domain = $1 for update', ['radar']);
    const snapshotVersion = Number(versionRow.rows[0]?.version ?? 0);
    const existing = await client.query<{ request_hash: string; result: TrackerImportResult }>(
      'select request_hash, result from tracker_import_receipts where account_id = $1 and idempotency_key = $2',
      [input.accountId, idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== input.requestHash) throw new TrackerImportPersistenceError('This confirmation key belongs to a different import.', 'idempotency-conflict');
      const current = await currentUserTracker(client, input.userId);
      await client.query('commit');
      return { result: existing.rows[0].result, idempotent: true, tracked: current.tracked, manualTrackerEntries: current.manual, snapshotVersion };
    }

    await rateLimitInTransaction(client, { accountId: input.accountId, kind: 'commit', limit: 3, windowMs: 10 * 60_000, now });
    const [current, opportunityRows] = await Promise.all([
      currentUserTracker(client, input.userId),
      client.query<{ data: Opportunity }>('select data from radar_opportunities'),
    ]);
    working = cloneStore(input.baseStore);
    working.opportunities = new Map(opportunityRows.rows.map((row) => [row.data.id, row.data]));
    working.tracked = [...working.tracked.filter((row) => row.userId !== input.userId), ...current.tracked];
    working.manualTrackerEntries = [...working.manualTrackerEntries.filter((row) => row.userId !== input.userId), ...current.manual];
    if (trackerImportStateHash(working, input.userId) !== input.expectedTrackerHash) {
      throw new TrackerImportPersistenceError('Your Tracker changed after this preview. Prepare a new preview to compare the latest state.', 'conflict');
    }
    const plan = planTrackerImport(working, input.userId, input.parsed, input.mapping);
    if (trackerImportCandidateHash(plan.candidateSet) !== input.expectedCandidateHash) {
      throw new TrackerImportPersistenceError('Opportunity matches changed after this preview. Prepare a new preview.', 'conflict');
    }
    const result = commitTrackerImport(working, uuidIds(), input.userId, plan, input.decisions, now, input.sourceHash);
    if (result.needsReview > 0) throw new TrackerImportPersistenceError('Resolve every row issue before importing.', 'review');

    const nextTracked = working.tracked.filter((row) => row.userId === input.userId);
    const nextManual = working.manualTrackerEntries.filter((row) => row.userId === input.userId);
    await client.query('delete from radar_tracked where user_id = $1', [input.userId]);
    for (const row of nextTracked) await client.query('insert into radar_tracked (user_id, opportunity_id, data) values ($1, $2, $3)', [row.userId, row.opportunityId, row]);
    await client.query('delete from radar_manual_tracker_entries where user_id = $1', [input.userId]);
    for (const row of nextManual) await client.query('insert into radar_manual_tracker_entries (id, user_id, data) values ($1, $2, $3)', [row.id, row.userId, row]);

    const auditEntry: AuditEntry = {
      id: `audit_${randomUUID()}`,
      at: now.toISOString(),
      accountId: input.accountId,
      action: 'tracker.imported',
      targetType: 'user_profile',
      targetId: input.userId,
      detail: JSON.stringify({ importId: result.importId, sourceKind: 'csv', imported: result.imported, matched: result.matched, createdManual: result.createdManual, skipped: result.skipped, unresolvedTaxonomy: result.unresolvedTaxonomy, idempotencyKey }),
    };
    await client.query('insert into radar_audit_log (id, at, data) values ($1, $2, $3)', [auditEntry.id, auditEntry.at, auditEntry]);
    await client.query(
      `insert into tracker_import_receipts
        (id, account_id, user_id, idempotency_key, request_hash, source_hash, created_at, result)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [result.importId, input.accountId, input.userId, idempotencyKey, input.requestHash, input.sourceHash, now, result],
    );
    const nextVersion = snapshotVersion + 1;
    await client.query('update missa_snapshot_versions set version = $2, updated_at = now() where domain = $1', ['radar', nextVersion]);
    await client.query('commit');
    return { result, idempotent: false, tracked: nextTracked, manualTrackerEntries: nextManual, auditEntry, snapshotVersion: nextVersion };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
