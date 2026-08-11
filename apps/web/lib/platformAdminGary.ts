import { readGaryDashboard, type GaryDashboardData } from '@missa/radar-adapters';
import type { AdminArea, AdminMaturity } from './platformAdmin';

export async function getPlatformAdminGary(): Promise<AdminArea<GaryDashboardData>> {
  const generatedAt = new Date().toISOString();
  if (!process.env.DATABASE_URL) {
    return {
      provenance: { maturity: 'unavailable', source: 'gary_* durable harness tables', freshness: `read at ${generatedAt}` },
      data: {
        available: false,
        generatedAt,
        warnings: ['DATABASE_URL is not configured.'],
        summary: { total: 0, queued: 0, processing: 0, published: 0, needsHuman: 0, failed: 0, estimatedCostUsd: 0 },
        readiness: { crawler: false, reviewer: false, email: false, model: 'deepseek-v4-flash', publishThreshold: 0.85, reviewHour: 8, timezone: 'America/Los_Angeles' },
        heartbeats: [], sources: [], rows: [], retention: [],
      },
      warnings: ['DATABASE_URL is not configured; Gary cannot be monitored from this environment.'],
    };
  }
  const dashboard = await readGaryDashboard(process.env.DATABASE_URL);
  const maturity: AdminMaturity = !dashboard.available ? 'unavailable' : dashboard.warnings.length > 0 ? 'partial' : 'durable';
  return {
    provenance: { maturity, source: 'gary review queue + heartbeats + decisions + digests', freshness: `read at ${dashboard.generatedAt}` },
    data: dashboard,
    warnings: dashboard.warnings,
  };
}
