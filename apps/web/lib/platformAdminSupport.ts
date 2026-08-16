import {
  readProfileIssueReportQueue,
  readPlatformAdminSupportQueue,
  type PlatformAdminSupportSummary,
} from '@missa/radar-adapters';
import type { AdminArea, AdminMaturity } from './platformAdmin';

export interface PlatformAdminSupportData {
  availability: 'available' | 'empty' | 'unavailable';
  summary: PlatformAdminSupportSummary;
  rows: PlatformAdminSupportRow[];
  planned: string[];
}
export interface PlatformAdminSupportRow {
  id: string;
  kind: 'opportunity' | 'profile';
  accountId?: string;
  accountEmail?: string;
  opportunityId?: string;
  opportunityTitle?: string;
  opportunitySlug?: string;
  profileUserId?: string;
  profileDisplayName?: string;
  reason: string;
  note?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
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

  const [opportunityQueue, profileQueue] = await Promise.all([
    readPlatformAdminSupportQueue(process.env.DATABASE_URL),
    readProfileIssueReportQueue(process.env.DATABASE_URL),
  ]);
  const rows: PlatformAdminSupportRow[] = [
    ...opportunityQueue.rows.map((row) => ({ ...row, kind: 'opportunity' as const })),
    ...profileQueue.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      ...(row.reporterAccountId ? { accountId: row.reporterAccountId } : {}),
      ...(row.reporterEmail ? { accountEmail: row.reporterEmail } : {}),
      profileUserId: row.profileUserId,
      ...(row.profileDisplayName ? { profileDisplayName: row.profileDisplayName } : {}),
      reason: row.reason,
      ...(row.note ? { note: row.note } : {}),
      status: row.status,
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
    })),
  ].sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
  const summary: PlatformAdminSupportSummary = { total: rows.length, byStatus: {} };
  for (const row of rows) summary.byStatus[row.status] = (summary.byStatus[row.status] ?? 0) + 1;
  const available = opportunityQueue.available || profileQueue.available;
  const warnings = [...opportunityQueue.warnings, ...profileQueue.warnings];
  const maturity: AdminMaturity = !available ? 'unavailable' : warnings.length > 0 ? 'partial' : 'durable';
  return {
    provenance: {
      maturity,
      source: 'opportunity_issue_reports + profile_issue_reports + audit_events + outbox_events',
      freshness: `read at ${profileQueue.generatedAt}`,
    },
    data: {
      availability: !available ? 'unavailable' : rows.length === 0 ? 'empty' : 'available',
      summary,
      rows,
      planned: PLANNED_SUPPORT_CAPABILITIES,
    },
    warnings,
  };
}
