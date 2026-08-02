import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  detectTrackerImportMapping,
  parseTrackerCsv,
  planTrackerImport,
  TrackerImportError,
  TRACKER_IMPORT_MAX_BYTES,
  type ImportDecision,
  type ImportMapping,
} from '@missa/radar-engine';
import type { RadarStore } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { stableMappingHash, verifyTrackerImportPreviewToken } from '@/lib/tracker-import-token';

const COMMIT_LIMIT = 3;
const COMMIT_WINDOW_MS = 10 * 60_000;
const commitRequests = new Map<string, number[]>();

function jsonError(error: string, status: 400 | 401 | 404 | 409 | 413 | 429 | 500, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store', ...extra } });
}

function sourceHash(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
function candidateHash(candidateSet: string[]): string { return createHash('sha256').update(candidateSet.join('|')).digest('hex'); }
function fileLooksLikeCsv(file: File): boolean { return file.name.toLowerCase().endsWith('.csv') || file.type.toLowerCase() === 'text/csv'; }

function consumeCommitLimit(accountId: string): number | undefined {
  const now = Date.now();
  const recent = (commitRequests.get(accountId) ?? []).filter((at) => now - at < COMMIT_WINDOW_MS);
  if (recent.length >= COMMIT_LIMIT) return Math.max(1, Math.ceil((COMMIT_WINDOW_MS - (now - recent[0]!)) / 1000));
  recent.push(now); commitRequests.set(accountId, recent);
  if (commitRequests.size > 1_000) for (const [key, values] of commitRequests) if (!values.length || now - values[values.length - 1]! >= COMMIT_WINDOW_MS) commitRequests.delete(key);
  return undefined;
}

function mappingFrom(value: string | null, columns: string[]): ImportMapping {
  if (!value) return detectTrackerImportMapping(columns);
  try { return { ...detectTrackerImportMapping(columns), ...(JSON.parse(value) as Partial<ImportMapping>) } as ImportMapping; }
  catch { throw new TrackerImportError('Mapping must be valid JSON.', 'mapping'); }
}

function restoreStore(target: RadarStore, snapshot: RadarStore) {
  for (const key of ['sources', 'snapshots', 'opportunities', 'versions', 'changes', 'organizations', 'claims', 'verificationTasks', 'radarProfiles', 'users', 'alerts', 'accounts'] as const) {
    const targetMap = target[key] as Map<string, unknown>;
    const snapshotMap = snapshot[key] as Map<string, unknown>;
    targetMap.clear();
    for (const [id, value] of snapshotMap) targetMap.set(id, value);
  }
  target.follows = snapshot.follows;
  target.tracked = snapshot.tracked;
  target.manualTrackerEntries = snapshot.manualTrackerEntries;
  target.emittedAlertKeys = snapshot.emittedAlertKeys;
  target.memberships = snapshot.memberships;
  target.auditLog = snapshot.auditLog;
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return jsonError('Not authenticated', 401);
  if (!session.account.userId) return jsonError('Profile not found', 404);
  const retryAfter = consumeCommitLimit(session.account.id);
  if (retryAfter !== undefined) return jsonError('Too many imports. Try again later.', 429, { 'Retry-After': String(retryAfter) });
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > TRACKER_IMPORT_MAX_BYTES + 600_000) return jsonError('CSV file is larger than 5 MiB.', 413);

  let form: FormData;
  let bytes: Uint8Array;
  let token: string;
  let mapping: ImportMapping;
  let decisions: Record<string, ImportDecision | { action: ImportDecision; opportunityId?: string }>;
  try {
    form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !fileLooksLikeCsv(file)) return jsonError('Choose a .csv file.', 400);
    bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > TRACKER_IMPORT_MAX_BYTES) return jsonError('CSV file is larger than 5 MiB.', 413);
    token = String(form.get('previewToken') ?? '');
    const mappingValue = form.get('mapping');
    const decisionsValue = form.get('decisions');
    if (typeof mappingValue !== 'string' || typeof decisionsValue !== 'string') return jsonError('Preview mapping and row decisions are required.', 400);
    const parsedDecisions = JSON.parse(decisionsValue) as unknown;
    if (!parsedDecisions || typeof parsedDecisions !== 'object' || Array.isArray(parsedDecisions)) return jsonError('Row decisions must be an object.', 400);
    decisions = parsedDecisions as typeof decisions;
  } catch (error) {
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    return jsonError('We could not read that CSV file. Please try again.', 400);
  }

  const preview = verifyTrackerImportPreviewToken(token);
  if (!preview || preview.userId !== session.account.userId) return jsonError('Preview is out of date. Please preview again.', 409);
  const hash = sourceHash(bytes);
  if (hash !== preview.sourceHash) return jsonError('Preview is out of date. Please preview again.', 409);

  try {
    const parsed = parseTrackerCsv(bytes);
    mapping = mappingFrom(String(form.get('mapping')), parsed.columns);
    if (stableMappingHash(mapping) !== preview.mappingHash) return jsonError('Preview is out of date. Please preview again.', 409);
    const engine = await getEngine();
    const plan = planTrackerImport(engine.store, session.account.userId, parsed, mapping);
    if (candidateHash(plan.candidateSet) !== preview.candidateHash) return jsonError('Preview is out of date. Please preview again.', 409);
    const before = structuredClone(engine.store);
    let result;
    try {
      result = engine.commitTrackerImport(session.account.userId, plan, decisions, new Date(), hash);
      if (result.needsReview > 0) {
        restoreStore(engine.store, before);
        return jsonError('Resolve row issues before importing.', 400);
      }
      if (result.imported > 0) {
        engine.recordAudit(session.account.id, 'tracker.imported', 'user_profile', session.account.userId, JSON.stringify({ userId: session.account.userId, sourceKind: 'csv', sourceHash: hash, imported: result.imported, matched: result.matched, createdManual: result.createdManual, skipped: result.skipped, needsReview: result.needsReview }));
        await persistRadar();
      }
    } catch (error) {
      restoreStore(engine.store, before);
      console.error('Tracker import commit failed', error);
      return jsonError('Nothing was changed in your Tracker. Please try again.', 500);
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    console.error('Tracker import commit validation failed', error);
    return jsonError('We could not validate this import. Please preview again.', 400);
  }
}
