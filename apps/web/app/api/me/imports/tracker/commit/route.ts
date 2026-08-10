import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  detectTrackerImportMapping,
  parseTrackerCsv,
  TrackerImportError,
  TRACKER_IMPORT_MAX_BYTES,
  type ImportRowDecision,
  type ImportMapping,
} from '@missa/radar-engine';
import { trackerImportRequestHash, TrackerImportPersistenceError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { commitTrackerImportWithReceipt } from '@/lib/engine';
import { stableMappingHash, verifyTrackerImportPreviewToken } from '@/lib/tracker-import-token';

function jsonError(error: string, status: 400 | 401 | 404 | 409 | 413 | 429 | 500, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store', ...extra } });
}

function sourceHash(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
function fileLooksLikeCsv(file: File): boolean { return file.name.toLowerCase().endsWith('.csv') || file.type.toLowerCase() === 'text/csv'; }

function mappingFrom(value: string | null, columns: string[]): ImportMapping {
  if (!value) return detectTrackerImportMapping(columns);
  try { return { ...detectTrackerImportMapping(columns), ...(JSON.parse(value) as Partial<ImportMapping>) } as ImportMapping; }
  catch { throw new TrackerImportError('Mapping must be valid JSON.', 'mapping'); }
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return jsonError('Not authenticated', 401);
  if (!session.account.userId) return jsonError('Profile not found', 404);
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > TRACKER_IMPORT_MAX_BYTES + 600_000) return jsonError('CSV file is larger than 5 MiB.', 413);

  let form: FormData;
  let bytes: Uint8Array;
  let token: string;
  let idempotencyKey: string;
  let mapping: ImportMapping;
  let decisions: Record<string, ImportRowDecision>;
  try {
    form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !fileLooksLikeCsv(file)) return jsonError('Choose a .csv file.', 400);
    bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > TRACKER_IMPORT_MAX_BYTES) return jsonError('CSV file is larger than 5 MiB.', 413);
    token = String(form.get('previewToken') ?? '');
    idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (idempotencyKey.length < 8 || idempotencyKey.length > 240) return jsonError('A valid confirmation key is required.', 400);
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
    const committed = await commitTrackerImportWithReceipt({
      accountId: session.account.id,
      userId: session.account.userId,
      idempotencyKey,
      requestHash: trackerImportRequestHash({ sourceHash: hash, mapping, decisions }),
      sourceHash: hash,
      expectedCandidateHash: preview.candidateHash,
      expectedTrackerHash: preview.trackerHash,
      parsed,
      mapping,
      decisions,
    });
    return NextResponse.json({ ...committed.result, idempotent: committed.idempotent }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof TrackerImportPersistenceError) {
      if (error.code === 'rate-limit') return jsonError('Too many imports. Try again later.', 429, { 'Retry-After': String(error.retryAfter ?? 60) });
      if (error.code === 'conflict' || error.code === 'idempotency-conflict') return jsonError(error.message, 409);
      if (error.code === 'review') return jsonError(error.message, 400);
    }
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    console.error('Tracker import commit failed', error);
    return jsonError('Nothing was changed in your Tracker. Please try this confirmation again.', 500);
  }
}
