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

function libraryForScope(engine: Awaited<ReturnType<typeof getEngine>>, userId: string) {
  const library = engine.library(userId);
  return {
    exportVersion: 1 as const,
    included: ['library'] as const,
    works: library.works.map((work) => ({ ...work })),
    files: library.files.map((file) => ({ ...file })),
    savedAnswers: library.savedAnswers.map((answer) => ({ ...answer })),
  };
}

function profileForScope(engine: Awaited<ReturnType<typeof getEngine>>, userId: string) {
  const user = engine.store.users.get(userId);
  if (!user) return undefined;
  return {
    exportVersion: 1 as const,
    included: ['profile'] as const,
    profile: {
      id: user.id,
      displayName: user.displayName,
      ...(user.bio ? { bio: user.bio } : {}),
      privacy: engine.profilePrivacy(userId),
      attributes: { ...user.attributes },
      genres: [...user.genres],
      taxonomyPreferences: user.taxonomyPreferences?.map((item) => ({ ...item })) ?? [],
      ...(user.opportunityPreferences ? { opportunityPreferences: { ...user.opportunityPreferences } } : {}),
      ...(user.publicProfilePublishedAt ? { publicProfilePublishedAt: user.publicProfilePublishedAt } : {}),
      ...(user.publicPortfolio ? { publicPortfolio: structuredClone(user.publicPortfolio) } : {}),
    },
  };
}

function encodeLibraryCsv(library: ReturnType<typeof libraryForScope>): string {
  const cell = (value: unknown) => { const text = value == null ? '' : String(value); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe; };
  const rows = [['kind', 'id', 'name', 'body_or_title', 'storage_key', 'created_at', 'updated_at']];
  for (const work of library.works) rows.push(['work', work.id, '', work.title, '', work.createdAt, work.updatedAt]);
  for (const file of library.files) rows.push(['file', file.id, file.filename, '', file.storageKey, file.createdAt, '']);
  for (const answer of library.savedAnswers) rows.push(['saved_answer', answer.id, answer.name, answer.body, '', answer.createdAt, answer.updatedAt]);
  return rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
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
  let libraryData: ReturnType<typeof libraryForScope> | undefined;
  let profileData: ReturnType<typeof profileForScope> | undefined;
  try {
    exportData = trackerForScope(engine.exportTracker(userId, new Date(nowMs)), scope === 'library' ? 'all' : scope);
    libraryData = libraryForScope(engine, userId);
    profileData = profileForScope(engine, userId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown user:')) return errorResponse('Profile not found', 404);
    console.error('Tracker export projection failed', error);
    return errorResponse('We could not prepare your export. Please try again.', 500);
  }

  const body = scope === 'library'
    ? (format === 'csv' ? encodeLibraryCsv(libraryData!) : JSON.stringify(libraryData, null, 2))
    : (format === 'csv' ? encodeTrackerCsv(exportData) : JSON.stringify(scope === 'all' ? { ...exportData, included: ['profile', 'tracker', 'library'], omitted: [], profile: profileData?.profile, library: libraryData } : exportData, null, 2));
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
    JSON.stringify({ format, scope, rowCount: exportData.tracker.length, libraryRows: (libraryData?.works.length ?? 0) + (libraryData?.files.length ?? 0) + (libraryData?.savedAnswers.length ?? 0) }),
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
      'Content-Disposition': `attachment; filename="missa-${scope === 'library' ? 'library' : scope === 'all' && format === 'json' ? 'all-data' : 'tracker'}-${date}.${extension}"`,
    },
  });
}
