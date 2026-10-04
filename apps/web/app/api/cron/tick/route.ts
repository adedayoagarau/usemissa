import { tickGoals } from '@/lib/goal-engine';
import { NextResponse } from 'next/server';
import { createProductionEngine, radarWorkerBatchSize, runRadarWorkerTick, runCoverageWorkerTick, runTaxonomyDiscoveryWorkerTick } from '@missa/radar-adapters';
import { deliverPendingAlertEmails, deliverPendingDeadlineEmails } from '@/lib/alert-delivery';
import { cronAuthorization } from '@/lib/cron-auth';

// Not 300: Vercel bundles routes with the same configuration into one
// function, and with the default this route shared Fluid instances with
// public pages. Its full-store load ran out of memory (SIGABRT) and stalled
// the page requests beside it. A value of its own gives it its own function.
export const maxDuration = 290;

/**
 * Vercel Cron target (Story 1.5). Configured in apps/web/vercel.json's
 * "crons" array (every 15 minutes).
 *
 * Radar ingestion belongs to the Railway radar-worker
 * (docs/railway-topology.md, "Operational rules" 1). It runs here only when
 * MISSA_VERCEL_RADAR_INGESTION=1 is set as an explicit fallback; Railway runs
 * without the advisory lock, so the two would otherwise overlap. By default
 * this route delivers the engine alert emails, which no Railway lane sends
 * yet, and runs the coverage and taxonomy passes, which feed the
 * taxonomy-discovery-worker's queue.
 */
export async function GET(request: Request) {
  const auth = cronAuthorization(request);
  if (auth === 'unconfigured') {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  if (auth !== 'authorized') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const goals = await tickGoals();
  let emailDelivery: Awaited<ReturnType<typeof deliverPendingAlertEmails>> | undefined;
  let deadlineDelivery: Awaited<ReturnType<typeof deliverPendingDeadlineEmails>> | undefined;

  if (process.env.MISSA_VERCEL_RADAR_INGESTION !== '1') {
    const production = await createProductionEngine();
    try {
      emailDelivery = await deliverPendingAlertEmails(production.engine);
      deadlineDelivery = await deliverPendingDeadlineEmails(production.engine);
      await production.persist();
    } finally {
      await production.close();
    }
    const coverage = await runCoverageWorkerTick({ logger: console });
    const discovery = await runTaxonomyDiscoveryWorkerTick({ logger: console });
    return NextResponse.json({ status: 'alerts-only', goals, emailDelivery, deadlineDelivery, coverage, discovery });
  }

  const result = await runRadarWorkerTick({
    maxSources: radarWorkerBatchSize(),
    afterTick: async (engine) => {
      emailDelivery = await deliverPendingAlertEmails(engine);
      deadlineDelivery = await deliverPendingDeadlineEmails(engine);
    },
  });
  if (result.status === 'skipped') {
    return NextResponse.json({ status: 'skipped', reason: 'another ingestion tick is running', goals }, { status: 202 });
  }

  const report = result.report!;
  const coverage = await runCoverageWorkerTick({ logger: console });
  const discovery = await runTaxonomyDiscoveryWorkerTick({ logger: console });
  return NextResponse.json({
    status: 'completed',
    goals,
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
