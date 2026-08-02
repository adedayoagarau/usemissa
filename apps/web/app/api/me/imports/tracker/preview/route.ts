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
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { signTrackerImportPreviewToken, stableMappingHash } from '@/lib/tracker-import-token';

const PREVIEW_WINDOW_SECONDS = 15 * 60;
const PREVIEW_LIMIT = 5;
const PREVIEW_WINDOW_MS = 10 * 60_000;
const previewRequests = new Map<string, number[]>();

function jsonError(error: string, status: 400 | 401 | 404 | 409 | 413 | 429 | 500, extra?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store', ...extra } });
}

function withinRateLimit(accountId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const recent = (previewRequests.get(accountId) ?? []).filter((at) => now - at < PREVIEW_WINDOW_MS);
  if (recent.length >= PREVIEW_LIMIT) {
    previewRequests.set(accountId, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((PREVIEW_WINDOW_MS - (now - recent[0]!)) / 1000)) };
  }
  recent.push(now);
  previewRequests.set(accountId, recent);
  if (previewRequests.size > 1_000) for (const [key, values] of previewRequests) if (!values.length || now - values[values.length - 1]! >= PREVIEW_WINDOW_MS) previewRequests.delete(key);
  return { ok: true };
}

function fileLooksLikeCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type.toLowerCase() === 'text/csv';
}

function sourceHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidateHash(candidateSet: string[]): string {
  return createHash('sha256').update(candidateSet.join('|')).digest('hex');
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

function previewResponse(plan: ReturnType<typeof planTrackerImport>, sourceHashValue: string, token: string, expiresAt: string) {
  return {
    previewToken: token,
    expiresAt,
    sourceHash: sourceHashValue,
    columns: plan.columns,
    detectedMapping: plan.mapping,
    rows: plan.rows.map((row) => ({
      rowNumber: row.rowNumber,
      values: row.values,
      normalized: row.normalized,
      classification: row.classification,
      candidates: row.candidates.map(({ opportunityId, title, organizationName, confidence, reason }) => ({ opportunityId, title, organizationName, confidence, reason })),
      defaultAction: row.defaultAction,
      warnings: row.warnings,
      errors: row.errors,
      ...(row.conflict ? { conflict: row.conflict } : {}),
    })),
    summary: plan.summary,
  };
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return jsonError('Not authenticated', 401);
  if (!session.account.userId) return jsonError('Profile not found', 404);
  const rate = withinRateLimit(session.account.id);
  if (!rate.ok) return jsonError('Too many previews. Try again later.', 429, { 'Retry-After': String(rate.retryAfter) });
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
    const engine = await getEngine();
    const plan = planTrackerImport(engine.store, session.account.userId, parsed, mapping);
    const sourceHashValue = sourceHash(bytes);
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + PREVIEW_WINDOW_SECONDS;
    const token = signTrackerImportPreviewToken({ v: 1, userId: session.account.userId, sourceHash: sourceHashValue, mappingHash: stableMappingHash(mapping), candidateHash: candidateHash(plan.candidateSet), exp: expiresAtSeconds });
    return NextResponse.json(previewResponse(plan, sourceHashValue, token, new Date(expiresAtSeconds * 1000).toISOString()), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof TrackerImportError) return jsonError(error.message, error.code === 'limit' ? 413 : 400);
    console.error('Tracker import preview failed', error);
    return jsonError('We could not prepare this import. Please try again.', 500);
  }
}
