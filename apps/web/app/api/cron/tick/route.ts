import { NextResponse } from 'next/server';
import { createProductionEngine } from '@missa/radar-adapters';

/**
 * Vercel Cron target (Story 1.5) -- replaces the manual "Check for updates"
 * button as the production ingestion trigger. The button stays functional
 * for local/admin manual triggering (packages/radar-engine/src/server/ui.ts);
 * this route is what a production deployment actually schedules.
 *
 * Configured in apps/web/vercel.json's "crons" array (every 15 minutes).
 *
 * KNOWN RISK (flagged, not resolved by this story): @missa/radar-adapters
 * depends on `playwright`, which is a heavy dependency not generally meant
 * to be bundled into a Vercel serverless function. The default fetcher here
 * is HttpFetcher (Playwright is opt-in via MISSA_USE_PLAYWRIGHT), but the
 * *bundle* likely still includes playwright's package since the branch is
 * only eliminated at runtime, not statically. Before enabling
 * MISSA_USE_PLAYWRIGHT in this route in production, this needs a real look
 * (next.config's serverExternalPackages, or moving actual browser-based
 * fetching to a separate long-running worker instead of inline in Cron).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  const provided = new URL(request.url).searchParams.get('secret');
  const isAuthorized = auth === `Bearer ${cronSecret}` || provided === cronSecret;
  if (!isAuthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { engine, persist, close } = await createProductionEngine();
  try {
    const report = await engine.tick();
    await persist();
    return NextResponse.json({
      sourcesChecked: report.sourcesChecked,
      changes: report.changes.length,
      alerts: report.alerts.length,
    });
  } finally {
    await close();
  }
}
