import {
  readPlatformAdminSupportQueue,
  type PlatformAdminSupportCase,
  type PlatformAdminSupportSummary,
} from '@missa/radar-adapters';
import type { AdminArea, AdminMaturity } from './platformAdmin';

export interface PlatformAdminSupportData {
  availability: 'available' | 'empty' | 'unavailable';
  summary: PlatformAdminSupportSummary;
  rows: PlatformAdminSupportCase[];
  planned: string[];
}
const PLANNED_SUPPORT_CAPABILITIES = [
  'Case ownership, priority, SLA, and escalation state',
  'Internal notes and append-only customer timeline',
  'Incident linking and deduplicated case relationships',
  'Customer contact preferences and governed outbound replies',
];

function unavailableData(): PlatformAdminSupportData {
  return {
    availability: 'unavailable',
    summary: { total: 0, byStatus: {} },
    rows: [],
    planned: PLANNED_SUPPORT_CAPABILITIES,
  };
}

export async function getPlatformAdminSupport(): Promise<AdminArea<PlatformAdminSupportData>> {
  const generatedAt = new Date().toISOString();
  if (!process.env.DATABASE_URL) {
    return {
      provenance: {
        maturity: 'unavailable',
        source: 'opportunity_issue_reports + audit_events + outbox_events',
        freshness: `read at ${generatedAt}`,
      },
      data: unavailableData(),
      warnings: ['DATABASE_URL is not configured; durable support cases are unavailable in this environment.'],
    };
  }

  const queue = await readPlatformAdminSupportQueue(process.env.DATABASE_URL);
  const maturity: AdminMaturity = !queue.available ? 'unavailable' : queue.warnings.length > 0 ? 'partial' : 'durable';
  return {
    provenance: {
      maturity,
      source: 'opportunity_issue_reports + audit_events + outbox_events',
      freshness: `read at ${queue.generatedAt}`,
    },
    data: {
      availability: !queue.available ? 'unavailable' : queue.summary.total === 0 ? 'empty' : 'available',
      summary: queue.summary,
      rows: queue.rows,
      planned: PLANNED_SUPPORT_CAPABILITIES,
    },
    warnings: queue.warnings,
  };
}
