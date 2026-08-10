import { NextResponse } from 'next/server';
import {
  mutatePlatformAdminQueue,
  radarWorkerBatchSize,
  recordPlatformAdminAudit,
  runRadarWorkerTick,
  type PlatformAdminQueue,
} from '@missa/radar-adapters';
import { platformAdminJson } from '@/lib/platformAdminApi';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';

export async function GET(request: Request) {
  return platformAdminJson(request, 'operations');
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.name === 'NotFoundError') return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof Error && error.name === 'ConflictError') return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof Error && error.message.startsWith('Invalid queue item')) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: 'The requested admin operation is unavailable.' }, { status: 503 });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  const value = body as Record<string, unknown>;

  if (value.action === 'run-radar-tick') {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed worker is required for manual ingestion.' }, { status: 503 });
    const requested = typeof value.maxSources === 'number' ? value.maxSources : undefined;
    try {
      const result = await runRadarWorkerTick({ maxSources: radarWorkerBatchSize(requested), logger: console });
      if (result.status === 'skipped') return NextResponse.json({ status: 'skipped', reason: 'another ingestion tick is running' }, { status: 202, headers: { 'cache-control': 'private, no-store' } });
      const summary = { status: 'completed', sourcesChecked: result.report?.sourcesChecked ?? 0, sourcesFailed: result.report?.sourcesFailed ?? 0, changes: result.report?.changes.length ?? 0 };
      await recordPlatformAdminAudit(process.env.DATABASE_URL, auth.session.account.id, 'platform_admin.radar_tick', 'radar_worker', 'manual', summary).catch(() => undefined);
      return NextResponse.json(summary, { headers: { 'cache-control': 'private, no-store' } });
    } catch {
      return NextResponse.json({ error: 'The bounded source check failed; inspect Operations for worker and queue state.' }, { status: 503 });
    }
  }

  const action = value.action === 'retry' || value.action === 'release-stale' ? value.action : undefined;
  const queue = value.queue === 'review' || value.queue === 'enrichment' || value.queue === 'outbox' ? value.queue as PlatformAdminQueue : undefined;
  if (!action || !queue) return NextResponse.json({ error: 'Unsupported admin operation' }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed queue is required for recovery actions.' }, { status: 503 });
  try {
    const result = await mutatePlatformAdminQueue(process.env.DATABASE_URL, auth.session.account.id, { action, queue, ...(typeof value.id === 'string' ? { id: value.id } : {}) });
    return NextResponse.json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
