import { createBenchmarkSources, createIngestionCatalog, createIngestionV2Pool, createQueueBundle, PostgresShadowRunStore, readRecentIngestionV2Runs, startRun } from '@missa/ingestion-v2';
import { NextResponse } from 'next/server';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { recordPlatformAdminAudit } from '@missa/radar-adapters';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';

export const runtime = 'nodejs';

function catalogView() {
  return createIngestionCatalog().map(({ id, name, kind, adapterId, registryTier, trustStatus, trustScore, eligible, skipReason }) => ({ id, name, kind, adapterId, registryTier, trustStatus, trustScore, eligible, skipReason }));
}

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  const sources = catalogView();
  if (!process.env.DATABASE_URL) return NextResponse.json({ runs: [], sources, historyAvailable: false, warning: 'A staging database is required for v2 run history. The source catalog is available.' }, { headers: { 'cache-control': 'private, no-store' } });
  const pool = createIngestionV2Pool(process.env.DATABASE_URL);
  try {
    const runId = new URL(request.url).searchParams.get('run');
    if (runId) {
      const artifact = await new PostgresShadowRunStore(pool).get(runId);
      if (!artifact) return NextResponse.json({ error: 'That ingestion run was not found.' }, { status: 404 });
      return NextResponse.json({
        run: artifact.run,
        source: sources.find((source) => source.id === artifact.run.sourceId) ?? { id: artifact.run.sourceId, name: artifact.run.sourceId },
        snapshots: [artifact.snapshot, ...(artifact.relatedSnapshots ?? [])].map(({ id, url: sourceUrl, finalUrl, fetchedAt, statusCode, contentType, rendered }) => ({ id, url: sourceUrl, finalUrl, fetchedAt, statusCode, contentType, rendered })),
        fields: artifact.extraction.fields,
        candidateLinks: artifact.extraction.candidateLinks,
        warnings: artifact.extraction.warnings,
        quality: artifact.quality,
        published: artifact.published,
      }, { headers: { 'cache-control': 'private, no-store' } });
    }
    return NextResponse.json({ runs: await readRecentIngestionV2Runs(pool), sources, historyAvailable: true }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    console.error('[admin/ingestion-v2] history failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'V2 run history is unavailable.', sources }, { status: 503 });
  } finally {
    await pool.end();
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) return NextResponse.json({ error: 'V2 requires both a staging DATABASE_URL and REDIS_URL.' }, { status: 503 });

  const body = await request.json().catch(() => null) as { sourceId?: unknown; scope?: unknown; limit?: unknown } | null;
  const scope = body?.scope === 'eligible' ? 'eligible' : 'single';
  const sourceId = typeof body?.sourceId === 'string' ? body.sourceId : 'benchmark-pw-grants';
  const allSources = [...createIngestionCatalog(), ...createBenchmarkSources()];
  const singleSource = allSources.find((candidate) => candidate.id === sourceId);
  if (scope === 'single' && !singleSource) return NextResponse.json({ error: 'Unknown v2 source.' }, { status: 400 });
  const limit = Math.min(Math.max(typeof body?.limit === 'number' ? Math.trunc(body.limit) : 1000, 1), 1000);
  const selectedSources = scope === 'eligible' ? createIngestionCatalog().filter((candidate) => candidate.eligible).slice(0, limit) : singleSource ? [singleSource] : [];
  if (selectedSources.length === 0) return NextResponse.json({ error: 'No eligible v2 sources are available to queue.' }, { status: 400 });

  const queues = createQueueBundle(process.env.REDIS_URL);
  try {
    const runs: Array<{ runId: string; sourceId: string; status: string }> = [];
    for (const source of selectedSources) {
      const run = await startRun(queues, source, { trigger: scope === 'eligible' ? 'scheduled' : 'manual', mode: 'shadow' });
      runs.push({ runId: run.id, sourceId: run.sourceId, status: run.status });
      await recordPlatformAdminAudit(process.env.DATABASE_URL, auth.session.account.id, 'platform_admin.ingestion_v2_run', 'ingestion_v2_run', run.id, { sourceId: run.sourceId, mode: run.mode, scope }).catch(() => undefined);
    }
    await trackPlatformAnalytics({ eventName: scope === 'eligible' ? 'ingestion_shadow_batch_requested' : 'ingestion_shadow_run_requested', source: 'admin-api', accountId: auth.session.account.id, path: '/admin/ingestion-v2', properties: { scope, queued_count: runs.length, request_result: 'accepted' }, idempotencyKey: `ingestion-shadow-batch:${runs[0]?.runId ?? Date.now()}` });
    return NextResponse.json({ batchId: `ingbatch_${Date.now().toString(36)}`, scope, queuedCount: runs.length, runs }, { status: 202, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[admin/ingestion-v2] queue failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'The v2 shadow batch could not be queued.' }, { status: 503 });
  } finally {
    await queues.close();
  }
}
