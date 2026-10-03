import { NextResponse } from 'next/server';
import { sendWeeklyDigest } from '@/lib/observabilityMonitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Monday morning summary email to the founders. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'The weekly digest is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await sendWeeklyDigest(), { headers: { 'Cache-Control': 'no-store' } });
}
