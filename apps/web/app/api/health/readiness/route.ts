import { NextResponse } from 'next/server';
import { readinessReport } from '@/lib/readiness';

export const dynamic = 'force-dynamic';

/**
 * Non-secret deployment/readiness probe. It reports only whether configuration
 * is present, never the configuration values themselves.
 */
export async function GET() {
  const report = readinessReport();
  return NextResponse.json(report, {
    status: report.status === 'ready' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
