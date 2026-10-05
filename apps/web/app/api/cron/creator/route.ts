import { NextResponse } from 'next/server';
import { runCreatorTick } from '@/lib/creator-tick';

// Reminder email, goal check-ins and the 30s calendar export budget can run
// well past the platform default. 300s is within Vercel's limit for every
// plan with Fluid compute.
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Creator scheduling is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await runCreatorTick(), { headers: { 'Cache-Control': 'no-store' } });
}
