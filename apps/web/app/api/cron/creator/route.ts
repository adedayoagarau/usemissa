import { NextResponse } from 'next/server';
import { runCreatorTick } from '@/lib/creator-tick';
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Creator scheduling is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await runCreatorTick(), { headers: { 'Cache-Control': 'no-store' } });
}
