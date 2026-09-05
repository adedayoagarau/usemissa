import { NextResponse } from 'next/server';
import { radarWorkerBatchSize, runRadarWorkerTick, runCoverageWorkerTick, runTaxonomyDiscoveryWorkerTick } from '@missa/radar-adapters';
import { deliverPendingAlertEmails, deliverPendingDeadlineEmails } from '@/lib/alert-delivery';

/**
 * Vercel Cron target (Story 1.5) -- replaces the manual "Check for updates"
 * button as the production ingestion trigger. The button stays functional
 * for local/admin manual triggering (packages/radar-engine/src/server/ui.ts);
 * this route is what a production deployment actually schedules.
 *
 * Configured in apps/web/vercel.json's "crons" array (every 15 minutes).
 *
 * The route uses the same bounded worker tick as the self-hosted process. The
 * Postgres advisory lock means this fallback can safely overlap a hosted
 * worker while the latter is being rolled out; it will simply return skipped.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  const provided = new URL(request.url).searchParams.get('secret');
  const isAuthorized = auth === `Bearer ${cronSecret}` || provided === cronSecret;
  if (!isAuthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let emailDelivery: Awaited<ReturnType<typeof deliverPendingAlertEmails>> | undefined;
  let deadlineDelivery: Awaited<ReturnType<typeof deliverPendingDeadlineEmails>> | undefined;
  const result = await runRadarWorkerTick({
    maxSources: radarWorkerBatchSize(),
    afterTick: async (engine) => {
      emailDelivery = await deliverPendingAlertEmails(engine);
      deadlineDelivery = await deliverPendingDeadlineEmails(engine);
    },
  });
  if (result.status === 'skipped') {
    return NextResponse.json({ status: 'skipped', reason: 'another ingestion tick is running' }, { status: 202 });
  }

  const report = result.report!;
  const coverage = await runCoverageWorkerTick({ logger: console });
  const discovery = await runTaxonomyDiscoveryWorkerTick({ logger: console });
  return NextResponse.json({
    status: 'completed',
    sourcesChecked: report.sourcesChecked,
    sourcesFailed: report.sourcesFailed,
    changes: report.changes.length,
    alerts: report.alerts.length,
    emailDelivery,
    deadlineDelivery,
    coverage,
    discovery,
  });
}
