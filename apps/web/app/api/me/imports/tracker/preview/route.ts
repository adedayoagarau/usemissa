import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  detectTrackerImportMapping,
  parseTrackerCsv,
  planTrackerImport,
  TrackerImportError,
  TRACKER_IMPORT_MAX_BYTES,
  type ImportMapping,
} from '@missa/radar-engine';
import { creatorPoolFor, creatorRelationalAuthorityEnabled, loadCanonicalTrackerImportStore, consumeTrackerImportPreviewRateLimit, trackerImportCandidateHash, trackerImportStateHash, TrackerImportPersistenceError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { consumeTrackerImportPreview, getEngine } from '@/lib/engine';
import { signTrackerImportPreviewToken, stableMappingHash } from '@/lib/tracker-import-token';

const PREVIEW_WINDOW_SECONDS = 15 * 60;

function jsonError(error: string, status: 400 | 401 | 404 | 409 | 413 | 429 | 500, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store', ...extra } });
}

function fileLooksLikeCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type.toLowerCase() === 'text/csv';
}

function sourceHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseMapping(value: FormDataEntryValue | null, columns: string[]): ImportMapping {
  if (!value || typeof value !== 'string') return detectTrackerImportMapping(columns);
  try {
    const parsed = JSON.parse(value) as Partial<ImportMapping>;
    return { ...detectTrackerImportMapping(columns), ...parsed } as ImportMapping;
  } catch {
    throw new TrackerImportError('Mapping must be valid JSON.', 'mapping');
  }
}

function previewResponse(plan: ReturnType<typeof planTrackerImport>, token: string, expiresAt: string) {
  return {
    previewToken: token,
    expiresAt,
    columns: plan.columns,
    detectedMapping: plan.mapping,
    rows: plan.rows.map((row) => ({
      rowNumber: row.rowNumber,
      values: row.values,
      state: row.classification === 'matched'
        ? 'exact-match'
        : row.classification === 'possible-match'
          ? 'possible-match'
          : row.classification === 'unmatched'
            ? 'no-match'
            : row.classification === 'duplicate-in-file'
              ? 'duplicate-row'
              : 'needs-correction',
      candidates: row.candidates.map(({ opportunityId, title, organizationName, matchKind, reasons }) => ({ opportunityId, title, organizationName, matchKind, reasons })),
      defaultAction: row.defaultAction,
      warnings: row.warnings,
      errors: row.errors,
      ...(row.taxonomy ? { taxonomy: row.taxonomy } : {}),
      ...(row.conflict ? { conflict: row.conflict } : {}),
    })),
    summary: plan.summary,
  };
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return jsonError('Not authenticated', 401);
  if (!session.account.userId) return jsonError('Profile not found', 404);
  try {
    if (creatorRelationalAuthorityEnabled(process.env) && process.env.DATABASE_URL) await consumeTrackerImportPreviewRateLimit(creatorPoolFor(process.env.DATABASE_URL),{accountId:session.account.id,limit:5,windowMs:10*60_000});
    else await consumeTrackerImportPreview(session.account.id);
  } catch (error) {
    if (error instanceof TrackerImportPersistenceError && error.code === 'rate-limit') return jsonError('Too many previews. Try again later.', 429, { 'Retry-After': String(error.retryAfter ?? 60) });
    return jsonError('We could not start this preview. Please try again.', 500);
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > TRACKER_IMPORT_MAX_BYTES + 512_000) return jsonError('CSV file is larger than 5 MiB.', 413);

  let file: File;
  let bytes: Uint8Array;
  let form: FormData;
  try {
    form = await request.formData();
    const entry = form.get('file');
    if (!(entry instanceof File)) return jsonError('Choose a CSV file to continue.', 400);
    file = entry;
    if (!fileLooksLikeCsv(file)) return jsonError('Choose a .csv file.', 400);
    bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > TRACKER_IMPORT_MAX_BYTES) return jsonError('CSV file is larger than 5 MiB.', 413);
  } catch (error) {
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    return jsonError('We could not read that CSV file. Please try again.', 400);
  }

  try {
    const parsed = parseTrackerCsv(bytes);
    const mapping = parseMapping(form.get('mapping'), parsed.columns);
    const store=creatorRelationalAuthorityEnabled(process.env) && process.env.DATABASE_URL
      ? await loadCanonicalTrackerImportStore(creatorPoolFor(process.env.DATABASE_URL),session.account.id,session.account.userId)
      : (await getEngine()).store;
    const plan = planTrackerImport(store, session.account.userId, parsed, mapping);
    const sourceHashValue = sourceHash(bytes);
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + PREVIEW_WINDOW_SECONDS;
    const token = signTrackerImportPreviewToken({ v: 1, userId: session.account.userId, sourceHash: sourceHashValue, mappingHash: stableMappingHash(mapping), candidateHash: trackerImportCandidateHash(plan.candidateSet), trackerHash: trackerImportStateHash(store, session.account.userId), exp: expiresAtSeconds });
    return NextResponse.json(previewResponse(plan, token, new Date(expiresAtSeconds * 1000).toISOString()), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    console.error('Tracker import preview failed', error);
    return jsonError('We could not prepare this import. Please try again.', 500);
  }
}
