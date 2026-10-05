import { NextResponse } from 'next/server';
import { creatorPoolFor, readWorkerTickHealth } from '@missa/radar-adapters';
import { creatorTickStaleAfterMs, creatorWorkerCheck, readinessReport, type ReadinessCheck } from '@/lib/readiness';

export const dynamic = 'force-dynamic';

async function creatorWorker(): Promise<ReadinessCheck | undefined> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  try {
    const health = await Promise.race([
      readWorkerTickHealth(creatorPoolFor(connectionString), 'creator-worker'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3_000)),
    ]);
    return creatorWorkerCheck(health?.lastSuccessAt, Date.now(), creatorTickStaleAfterMs());
  } catch {
    return { state: 'degraded', required: false };
  }
}

/**
 * Non-secret deployment/readiness probe. It reports only whether configuration
 * is present and whether the creator worker has run recently, never the
 * configuration values, timestamps or errors themselves.
 */
export async function GET() {
  const report = readinessReport();
  const worker = await creatorWorker();
  if (worker) report.checks.creatorWorker = worker;
  return NextResponse.json(report, {
    status: report.status === 'ready' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
