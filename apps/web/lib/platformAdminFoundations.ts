import {
  readPlatformAdminAgentControls,
  readPlatformAdminBilling,
  readPlatformAdminCrm,
  readPlatformAdminMessageHistory,
  type PlatformAdminAgentControlsData,
  type PlatformAdminBillingData,
  type PlatformAdminCrmData,
  type PlatformAdminMessageHistory,
} from '@missa/radar-adapters';
import type { AdminArea } from './platformAdmin';

export type {
  PlatformAdminAgentControlsData,
  PlatformAdminBillingData,
  PlatformAdminCrmData,
  PlatformAdminMessageHistory,
} from '@missa/radar-adapters';

function noDatabase<T>(data: T, source: string): AdminArea<T> {
  const generatedAt = new Date().toISOString();
  return {
    provenance: { maturity: 'unavailable', source, freshness: `read at ${generatedAt}` },
    data,
    warnings: ['DATABASE_URL is not configured; this surface cannot read durable platform records.'],
  };
}

function area<T extends { available: boolean; generatedAt: string; source: string; warnings: string[] }>(data: T): AdminArea<T> {
  return {
    provenance: { maturity: data.available ? 'durable' : 'unavailable', source: data.source, freshness: `read at ${data.generatedAt}` },
    data,
    warnings: data.warnings,
  };
}

const emptyMessage: PlatformAdminMessageHistory = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_message_effects + platform_message_attempts',
  warnings: [],
  summary: { effects: 0, attempts: 0, byStatus: {}, attemptsByStatus: {} },
  effects: [],
  attempts: [],
};

const emptyCrm: PlatformAdminCrmData = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_crm_timeline_events + audit_events + contacts + tasks',
  warnings: [],
  summary: { timelineEvents: 0, notes: 0, accountsWithActivity: 0, organizationsWithActivity: 0, contacts: 0, tasks: 0, openTasks: 0 },
  rows: [],
  contacts: [],
  tasks: [],
};

const emptyBilling: PlatformAdminBillingData = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_billing_ledger',
  warnings: [],
  summary: { entries: 0, processed: 0, received: 0, failed: 0, ignored: 0, grossAmountCents: 0, byEntryType: {} },
  rows: [],
};

const emptyAgentControls: PlatformAdminAgentControlsData = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_agent_control_requests + agent graph tables',
  warnings: [],
  summary: { requests: 0, requested: 0, applied: 0, failed: 0, targets: 0, runs: 0, running: 0, paused: 0, stale: 0 },
  requests: [],
  runs: [],
};

export async function getPlatformAdminMessageHistory(): Promise<AdminArea<PlatformAdminMessageHistory>> {
  if (!process.env.DATABASE_URL) return noDatabase(emptyMessage, emptyMessage.source);
  return area(await readPlatformAdminMessageHistory(process.env.DATABASE_URL));
}

export async function getPlatformAdminCrm(): Promise<AdminArea<PlatformAdminCrmData>> {
  if (!process.env.DATABASE_URL) return noDatabase(emptyCrm, emptyCrm.source);
  return area(await readPlatformAdminCrm(process.env.DATABASE_URL));
}

export async function getPlatformAdminBilling(): Promise<AdminArea<PlatformAdminBillingData>> {
  if (!process.env.DATABASE_URL) return noDatabase(emptyBilling, emptyBilling.source);
  return area(await readPlatformAdminBilling(process.env.DATABASE_URL));
}

export async function getPlatformAdminAgentControls(): Promise<AdminArea<PlatformAdminAgentControlsData>> {
  if (!process.env.DATABASE_URL) return noDatabase(emptyAgentControls, emptyAgentControls.source);
  return area(await readPlatformAdminAgentControls(process.env.DATABASE_URL));
}
