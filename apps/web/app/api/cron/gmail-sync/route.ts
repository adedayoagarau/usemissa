import { NextResponse } from 'next/server';
import { GoogleGmailProvider } from '@missa/radar-adapters';
import { getEngine, persistRadar } from '@/lib/engine';
import { processGmailSyncJobs } from '@/lib/gmail-sync-worker';

async function run(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!expected || authorization !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const engine = await getEngine();
    const summary = await processGmailSyncJobs(engine, new GoogleGmailProvider());
    await persistRadar();
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Gmail sync unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}

export const GET = run;
export const POST = run;
