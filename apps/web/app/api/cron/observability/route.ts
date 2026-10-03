import { NextResponse } from 'next/server';
import { cronAuthorization } from '@/lib/cron-auth';
import { runObservabilityMonitor } from '@/lib/observabilityMonitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Every 15 minutes: uptime probes, alert rules (emailed on change), and data retention. */
export async function GET(request: Request) {
  const auth = cronAuthorization(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'Monitoring is not configured.' }, { status: 503 });
  if (auth === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await runObservabilityMonitor(), { headers: { 'Cache-Control': 'no-store' } });
}
