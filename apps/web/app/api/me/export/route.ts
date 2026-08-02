import { NextResponse } from 'next/server';
import type { TrackerExportV1 } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { encodeTrackerCsv } from '@/lib/tracker-export';

const COOLDOWN_MS = 60_000;
const MAX_COOLDOWN_ENTRIES = 1_000;
const lastExportByAccount = new Map<string, number>();

function errorResponse(error: string, status: 400 | 401 | 404 | 409 | 429 | 500, extra?: Record<string, string>) {
  return NextResponse.json({ error }, {
    status,
    headers: { 'Cache-Control': 'private, no-store', ...extra },
  });
}

function clearExpiredCooldowns(now: number) {
  for (const [accountId, at] of lastExportByAccount) {
    if (now - at >= COOLDOWN_MS) lastExportByAccount.delete(accountId);
  }
  if (lastExportByAccount.size <= MAX_COOLDOWN_ENTRIES) return;
  const oldest = [...lastExportByAccount.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, lastExportByAccount.size - MAX_COOLDOWN_ENTRIES);
  for (const [accountId] of oldest) lastExportByAccount.delete(accountId);
}

function trackerForScope(exportData: TrackerExportV1, scope: 'all' | 'tracker'): TrackerExportV1 {
  return scope === 'tracker' ? { ...exportData, omitted: [] } : exportData;
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return errorResponse('Not authenticated', 401);

  const url = new URL(request.url);
  for (const key of url.searchParams.keys()) {
    if (key !== 'format' && key !== 'scope') return errorResponse('Unknown export parameter.', 400);
  }
  const format = url.searchParams.get('format') ?? 'json';
  const scope = url.searchParams.get('scope') ?? 'all';
  if (format !== 'json' && format !== 'csv') return errorResponse('Format must be json or csv.', 400);
  if (scope !== 'all' && scope !== 'tracker' && scope !== 'library') return errorResponse('Scope must be all, tracker, or library.', 400);
  if (scope === 'library') return errorResponse('Library export is not available yet.', 409);

  const userId = session.account.userId;
  if (!userId) return errorResponse('Profile not found', 404);

  const nowMs = Date.now();
  clearExpiredCooldowns(nowMs);
  const previous = lastExportByAccount.get(session.account.id);
  if (previous !== undefined && nowMs - previous < COOLDOWN_MS) {
    return errorResponse('Export cooldown active. Try again in a moment.', 429, { 'Retry-After': '60' });
  }

  const engine = await getEngine();
  let exportData: TrackerExportV1;
  try {
    exportData = trackerForScope(engine.exportTracker(userId, new Date(nowMs)), scope);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown user:')) return errorResponse('Profile not found', 404);
    console.error('Tracker export projection failed', error);
    return errorResponse('We could not prepare your export. Please try again.', 500);
  }

  const body = format === 'csv' ? encodeTrackerCsv(exportData) : JSON.stringify(exportData, null, 2);
  const date = new Date(nowMs).toISOString().slice(0, 10);
  const extension = format === 'csv' ? 'csv' : 'json';
  const contentType = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8';

  // The audit is written only after projection and encoding succeeded. Failed
  // validation, unavailable scopes, cooldowns, and encoding errors emit none.
  engine.recordAudit(
    session.account.id,
    'data.exported',
    'user_profile',
    userId,
    JSON.stringify({ format, scope, rowCount: exportData.tracker.length }),
  );
  try {
    await persistRadar();
  } catch (error) {
    console.error('Tracker export audit persistence failed', error);
    return errorResponse('We could not prepare your export. Please try again.', 500);
  }
  lastExportByAccount.set(session.account.id, nowMs);

  return new Response(body, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="missa-tracker-${date}.${extension}"`,
    },
  });
}
