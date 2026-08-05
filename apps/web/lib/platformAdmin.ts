import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  agentGraphSnapshot,
  readPlatformAdminDurableSummary,
  type DurableQueueMetric,
  type PlatformAdminDurableSummary,
} from '@missa/radar-adapters';
import type { OrganizationBillingStatus, OrganizationBillingTier, RadarStore } from '@missa/radar-engine';
import { createStore } from '@missa/radar-engine';
import type { WorkspaceStore } from '@missa/workspace-engine';
import { createStore as createWorkspaceStore } from '@missa/workspace-engine';
import { getSessionAccount, getSessionAccountFromToken, SESSION_COOKIE, type SessionAccount } from './auth';
import { getEngine } from './engine';
import { getWorkspaceEngine } from './workspaceEngine';
import { authorizePlatformAdmin, type PlatformAdminAuthorization } from './platformAdminAuth';

export type AdminMaturity = 'live' | 'durable' | 'derived' | 'latest-run-only' | 'target-schema' | 'partial' | 'unavailable';

export interface AdminProvenance {
  maturity: AdminMaturity;
  source: string;
  freshness: string;
}

export interface AdminArea<T> {
  provenance: AdminProvenance;
  data: T;
  warnings: string[];
}

export interface SourceHealthRow {
  id: string;
  name: string;
  url: string;
  checkIntervalHours?: number;
  active: boolean;
  attempted: boolean;
  successfulFetch: boolean;
  processed: boolean;
  stale: boolean;
  lastCheckedAt?: string;
  lastSuccessfulFetchAt?: string;
  lastProcessedAt?: string;
  consecutiveFailures: number;
  consecutiveProcessingFailures: number;
  freshness: string;
}

export interface PlatformAdminRadarData {
  stats: {
    opportunitiesDiscovered: number;
    opportunitiesOpen: number;
    opportunitiesClaimed: number;
    staleListings: number;
    duplicateRate: number;
    duplicateRecords: number;
    openVerificationTasks: number;
    alertsEmitted: number;
    unreadAlerts: number;
    trustDistribution: { high: number; medium: number; low: number };
  };
  lifecycle: Record<string, number>;
  publication: { active: number; needsVerification: number; closed: number; archived: number; duplicate: number };
  claims: Record<string, number>;
  sourceHealth: {
    summary: { active: number; attempted: number; successfulFetch: number; processed: number; stale: number; fetchFailures: number; processingFailures: number };
    rows: SourceHealthRow[];
  };
  queues: { verification: number; claims: number; staleSources: number; lowTrust: number };
}

export interface PlatformAdminWorkspaceData {
  organizations: number;
  accounts: { total: number; active: number; inactive: number };
  members: number;
  openCalls: Record<string, number>;
  submissions: Record<string, number>;
  drafts: number;
  reviews: { rounds: number; assignments: number; completedAssignments: number; recommendations: number };
  decisions: Record<string, number>;
  delivery: Record<string, number>;
}

export type PlatformAdminCustomerAvailability = 'available' | 'partial' | 'empty' | 'unavailable';
export type PlatformAdminCustomerActivityState = 'active' | 'attention' | 'quiet' | 'unknown';
export type PlatformAdminCustomerBillingTier = OrganizationBillingTier | 'unknown';
export type PlatformAdminCustomerBillingStatus = OrganizationBillingStatus | 'unknown';
export type PlatformAdminCustomerCount = number | null;

export interface PlatformAdminCustomerActivity {
  at: string;
  source: string;
  freshness: string;
}

export interface PlatformAdminCustomerRow {
  organizationId: string;
  organizationName: string;
  verified: boolean;
  memberCount: PlatformAdminCustomerCount;
  distinctAccountCount: PlatformAdminCustomerCount;
  openCallCount: PlatformAdminCustomerCount;
  submissionCount: PlatformAdminCustomerCount;
  decisionCount: PlatformAdminCustomerCount;
  deliveryCount: PlatformAdminCustomerCount;
  pendingDeliveryCount: PlatformAdminCustomerCount;
  billingTier: PlatformAdminCustomerBillingTier;
  billingStatus: PlatformAdminCustomerBillingStatus;
  activityState: PlatformAdminCustomerActivityState;
  latestObservedActivity?: PlatformAdminCustomerActivity;
}

export interface PlatformAdminCustomersData {
  availability: PlatformAdminCustomerAvailability;
  organizationCount: PlatformAdminCustomerCount;
  rows: PlatformAdminCustomerRow[];
  plannedCrmFields: string[];
}

export interface PlatformAdminOperationsData {
  worker: {
    status: 'running' | 'stale' | 'healthy' | 'failed' | 'unknown';
    latestStatus?: string;
    latestKind?: string;
    latestAt?: string;
    running: number;
    failed: number;
    completed: number;
    caveat: string;
    lanes: Array<{
      workerKind: string;
      status: 'running' | 'stale' | 'failed' | 'stopped' | 'unknown';
      runId?: string;
      lastHeartbeatAt?: string;
      startedAt?: string;
      completedAt?: string;
      error?: string;
    }>;
  };
  throughput: { sourcesAttempted: number; successfulFetches: number; processedSources: number; activeOpportunities: number; submissions: number; decisions: number; completedDelivery: number };
  pipeline: Array<{ stage: 'due' | 'check' | 'fetch' | 'process' | 'review' | 'publish'; count: number; source: string }>;
  compatibilityQueues: { verification: number; claims: number; emailReview: number; gmailJobs: Record<string, number>; delivery: Record<string, number> };
  durable: PlatformAdminDurableSummary;
  agentGraph: ReturnType<typeof agentGraphSnapshot>;
  queue: PlatformAdminQueueData;
}

export type PlatformAdminQueueSeverity = 'high' | 'medium' | 'low';
export type PlatformAdminQueueName = 'source-health' | 'verification' | 'claims' | 'review' | 'enrichment' | 'agents' | 'outbox' | 'workspace';

export type PlatformAdminQueueAction =
  | { type: 'link'; label: string; href: string }
  | { type: 'operation'; label: string; action: 'retry' | 'release-stale'; queue: 'review' | 'enrichment' | 'outbox'; id?: string };

export interface PlatformAdminQueueDetail {
  why: string;
  evidence: Array<{ label: string; value: string }>;
  related: Array<{ label: string; value: string; href?: string }>;
  recovery?: string;
}

export interface PlatformAdminQueueRow {
  id: string;
  kind: string;
  queue: PlatformAdminQueueName;
  title: string;
  subtitle?: string;
  reason: string;
  lane: string;
  owner?: string;
  age: string;
  ageAt?: string;
  status: string;
  severity: PlatformAdminQueueSeverity;
  maturity: AdminMaturity;
  source: string;
  action?: PlatformAdminQueueAction;
  detail: PlatformAdminQueueDetail;
}

export interface PlatformAdminQueueData {
  summary: {
    open: number;
    attention: number;
    inProgress: number;
    oldest?: { title: string; age: string; at?: string };
  };
  rows: PlatformAdminQueueRow[];
}

export interface PlatformAdminSystemData {
  persistenceMode: 'postgres-compatibility' | 'demo-in-memory';
  databaseConfigured: boolean;
  sessionSecretConfigured: boolean;
  cronSecretConfigured: boolean;
  runtimeTruth: string;
  workerCaveat: string;
  durableTables: Array<{ name: string; status: 'deployed' | 'missing' }>;
  warnings: string[];
}

export interface PlatformAdminAuditEntry {
  id: string;
  domain: 'radar' | 'workspace' | 'platform';
  at: string;
  actorAccountId?: string;
  action: string;
  targetType: string;
  targetId: string;
}

export interface PlatformAdminAuditData {
  count: number;
  recent: PlatformAdminAuditEntry[];
  limitation: string;
}

export interface PlatformAdminOverview {
  generatedAt: string;
  warnings: string[];
  radar: AdminArea<PlatformAdminRadarData>;
  workspace: AdminArea<PlatformAdminWorkspaceData>;
  operations: AdminArea<PlatformAdminOperationsData>;
  system: AdminArea<PlatformAdminSystemData>;
  audit: AdminArea<PlatformAdminAuditData>;
  customers: AdminArea<PlatformAdminCustomersData>;
}

function countBy<T>(items: Iterable<T>, key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function freshness(value: string | undefined, nowMs: number, staleAfterMs = 24 * 60 * 60 * 1_000): string {
  const time = parseTime(value);
  if (time === undefined) return 'not yet observed';
  const ageMs = Math.max(0, nowMs - time);
  if (ageMs < 60_000) return 'less than a minute ago';
  const minutes = Math.floor(ageMs / 60_000);
  if (ageMs < staleAfterMs) return `${minutes}m ago`;
  const hours = Math.floor(ageMs / (60 * 60 * 1_000));
  if (ageMs < 7 * 24 * 60 * 60 * 1_000) return `${hours}h ago`;
  return `${Math.floor(ageMs / (7 * 24 * 60 * 60 * 1_000))}w ago`;
}

function isStale(lastCheckedAt: string | undefined, intervalHours: number, nowMs: number): boolean {
  const time = parseTime(lastCheckedAt);
  return time === undefined || nowMs - time > Math.max(1, intervalHours) * 60 * 60 * 1_000;
}

function metricCount(metric: DurableQueueMetric, key: string): number {
  return metric.counts[key] ?? 0;
}

const CUSTOMER_CRM_PLANNED_FIELDS = [
  'Notes',
  'Contacts',
  'Segments',
  'Tasks',
  'Interaction timelines',
  'Health snapshots',
  'Merge/dedupe controls',
];

interface CustomerActivityObservation {
  at: string;
  source: string;
}

function addCustomerActivity(
  activities: Map<string, CustomerActivityObservation[]>,
  organizationId: string | undefined,
  at: string | undefined,
  source: string,
): void {
  if (!organizationId || !at || parseTime(at) === undefined) return;
  const rows = activities.get(organizationId) ?? [];
  rows.push({ at, source });
  activities.set(organizationId, rows);
}

function incrementCustomerCount(counts: Map<string, number>, organizationId: string | undefined): void {
  if (!organizationId) return;
  counts.set(organizationId, (counts.get(organizationId) ?? 0) + 1);
}

function customerActivityState(
  latest: PlatformAdminCustomerActivity | undefined,
  pendingDeliveryCount: PlatformAdminCustomerCount,
  nowMs: number,
): PlatformAdminCustomerActivityState {
  if (pendingDeliveryCount !== null && pendingDeliveryCount > 0) return 'attention';
  if (!latest) return 'unknown';
  const latestMs = parseTime(latest.at);
  if (latestMs === undefined) return 'unknown';
  return nowMs - latestMs <= 30 * 24 * 60 * 60 * 1_000 ? 'active' : 'quiet';
}

function buildPlatformAdminCustomers(
  radarInput: RadarStore | undefined,
  workspaceInput: WorkspaceStore | undefined,
  generatedAt: string,
  databaseConfigured: boolean,
): AdminArea<PlatformAdminCustomersData> {
  const radarAvailable = radarInput !== undefined;
  const workspaceAvailable = workspaceInput !== undefined;
  const radar = radarInput ?? createStore();
  const workspace = workspaceInput ?? createWorkspaceStore();
  const nowMs = parseTime(generatedAt) ?? Date.now();
  const activities = new Map<string, CustomerActivityObservation[]>();
  const memberCounts = new Map<string, number>();
  const accountIds = new Map<string, Set<string>>();
  const openCallCounts = new Map<string, number>();
  const submissionCounts = new Map<string, number>();
  const decisionCounts = new Map<string, number>();
  const deliveryCounts = new Map<string, number>();
  const pendingDeliveryCounts = new Map<string, number>();

  for (const organization of radar.organizations.values()) activities.set(organization.id, []);

  for (const membership of radar.memberships) {
    if (!radar.organizations.has(membership.organizationId)) continue;
    incrementCustomerCount(memberCounts, membership.organizationId);
    const ids = accountIds.get(membership.organizationId) ?? new Set<string>();
    ids.add(membership.accountId);
    accountIds.set(membership.organizationId, ids);
    addCustomerActivity(activities, membership.organizationId, membership.grantedAt, 'Radar membership granted');
    addCustomerActivity(activities, membership.organizationId, radar.accounts.get(membership.accountId)?.createdAt, 'Radar account created');
  }

  for (const claim of radar.claims.values()) {
    if (!radar.organizations.has(claim.organizationId)) continue;
    addCustomerActivity(activities, claim.organizationId, claim.requestedAt, 'Radar claim requested');
    addCustomerActivity(activities, claim.organizationId, claim.decidedAt, 'Radar claim decided');
  }

  for (const entry of radar.auditLog) {
    const targetType = entry.targetType.toLowerCase();
    if (radar.organizations.has(entry.targetId) && (targetType === 'org' || targetType.includes('organization'))) {
      addCustomerActivity(activities, entry.targetId, entry.at, 'Radar organization audit');
    }
  }

  if (workspaceAvailable) {
    const entityOrganizations = new Map<string, string>();
    const programOrganizations = new Map<string, string>();
    const openCallOrganizations = new Map<string, string>();
    const submissionPathOrganizations = new Map<string, string>();
    const submissionOrganizations = new Map<string, string>();
    const workOrganizations = new Map<string, string>();

    for (const entity of workspace.entities.values()) {
      if (!radar.organizations.has(entity.organizationId)) continue;
      entityOrganizations.set(entity.id, entity.organizationId);
      addCustomerActivity(activities, entity.organizationId, entity.createdAt, 'Workspace entity created');
    }
    for (const program of workspace.programs.values()) {
      const organizationId = entityOrganizations.get(program.entityId);
      if (!organizationId) continue;
      programOrganizations.set(program.id, organizationId);
      addCustomerActivity(activities, organizationId, program.createdAt, 'Workspace program created');
    }
    for (const openCall of workspace.openCalls.values()) {
      const organizationId = programOrganizations.get(openCall.programId);
      if (!organizationId) continue;
      openCallOrganizations.set(openCall.id, organizationId);
      incrementCustomerCount(openCallCounts, organizationId);
      addCustomerActivity(activities, organizationId, openCall.createdAt, 'Workspace open call created');
      addCustomerActivity(activities, organizationId, openCall.publishedAt, 'Workspace open call published');
    }
    for (const path of workspace.submissionPaths.values()) {
      const organizationId = openCallOrganizations.get(path.openCallId);
      if (!organizationId) continue;
      submissionPathOrganizations.set(path.id, organizationId);
      addCustomerActivity(activities, organizationId, path.createdAt, 'Workspace submission path created');
    }
    for (const submission of workspace.submissions.values()) {
      const organizationId = submissionPathOrganizations.get(submission.submissionPathId);
      if (!organizationId) continue;
      submissionOrganizations.set(submission.id, organizationId);
      incrementCustomerCount(submissionCounts, organizationId);
      addCustomerActivity(activities, organizationId, submission.submittedAt, 'Workspace submission received');
    }
    for (const work of workspace.works.values()) {
      const organizationId = submissionOrganizations.get(work.submissionId);
      if (organizationId) workOrganizations.set(work.id, organizationId);
    }
    for (const round of workspace.reviewRounds.values()) {
      addCustomerActivity(activities, openCallOrganizations.get(round.openCallId), round.createdAt, 'Workspace review round created');
    }
    for (const assignment of workspace.reviewAssignments.values()) {
      addCustomerActivity(activities, submissionOrganizations.get(assignment.submissionId), assignment.completedAt, 'Workspace review completed');
    }
    for (const decision of workspace.decisions.values()) {
      const organizationId = workOrganizations.get(decision.workId);
      if (!organizationId) continue;
      incrementCustomerCount(decisionCounts, organizationId);
      addCustomerActivity(activities, organizationId, decision.decidedAt, 'Workspace decision recorded');
    }
    for (const task of workspace.deliveryTasks.values()) {
      const organizationId = workOrganizations.get(task.workId);
      if (!organizationId) continue;
      incrementCustomerCount(deliveryCounts, organizationId);
      if (task.status === 'pending') incrementCustomerCount(pendingDeliveryCounts, organizationId);
      addCustomerActivity(activities, organizationId, task.completedAt, 'Workspace delivery completed');
    }
  }

  const rows = [...radar.organizations.values()].map((organization): PlatformAdminCustomerRow => {
    const latestObservation = [...(activities.get(organization.id) ?? [])]
      .sort((a, b) => (parseTime(b.at) ?? 0) - (parseTime(a.at) ?? 0) || a.source.localeCompare(b.source))[0];
    const latestObservedActivity = latestObservation
      ? { ...latestObservation, freshness: freshness(latestObservation.at, nowMs) }
      : undefined;
    const pendingDeliveryCount = workspaceAvailable ? pendingDeliveryCounts.get(organization.id) ?? 0 : null;
    return {
      organizationId: organization.id,
      organizationName: organization.name,
      verified: organization.verified,
      memberCount: memberCounts.get(organization.id) ?? 0,
      distinctAccountCount: accountIds.get(organization.id)?.size ?? 0,
      openCallCount: workspaceAvailable ? openCallCounts.get(organization.id) ?? 0 : null,
      submissionCount: workspaceAvailable ? submissionCounts.get(organization.id) ?? 0 : null,
      decisionCount: workspaceAvailable ? decisionCounts.get(organization.id) ?? 0 : null,
      deliveryCount: workspaceAvailable ? deliveryCounts.get(organization.id) ?? 0 : null,
      pendingDeliveryCount,
      billingTier: organization.billingTier ?? 'unknown',
      billingStatus: organization.billingStatus ?? 'unknown',
      activityState: customerActivityState(latestObservedActivity, pendingDeliveryCount, nowMs),
      ...(latestObservedActivity ? { latestObservedActivity } : {}),
    };
  }).sort((a, b) => {
    const activityRank: Record<PlatformAdminCustomerActivityState, number> = { attention: 4, active: 3, quiet: 2, unknown: 1 };
    return activityRank[b.activityState] - activityRank[a.activityState]
      || a.organizationName.localeCompare(b.organizationName)
      || a.organizationId.localeCompare(b.organizationId);
  });

  const availability: PlatformAdminCustomerAvailability = !radarAvailable
    ? 'unavailable'
    : radar.organizations.size === 0
      ? 'empty'
      : !workspaceAvailable
        ? 'partial'
        : 'available';
  const warnings = [
    ...(!radarAvailable ? ['Radar compatibility store could not be read; the customer directory is unavailable.'] : []),
    ...(!workspaceAvailable ? ['Workspace compatibility store could not be read; Workspace counts and activity are unavailable.'] : []),
  ];
  const source = radarAvailable && workspaceAvailable
    ? databaseConfigured
      ? 'RadarEngine organizations/memberships plus WorkspaceEngine activity compatibility stores backed by Postgres snapshots'
      : 'RadarEngine organizations/memberships plus WorkspaceEngine activity compatibility stores'
    : !radarAvailable
      ? 'RadarEngine organization compatibility store unavailable'
      : 'RadarEngine organizations/memberships with WorkspaceEngine activity compatibility store unavailable';
  const maturity: AdminMaturity = !radarAvailable ? 'unavailable' : !workspaceAvailable ? 'partial' : 'live';

  return {
    provenance: { maturity, source, freshness: `read at ${generatedAt}` },
    data: {
      availability,
      organizationCount: radarAvailable ? radar.organizations.size : null,
      rows,
      plannedCrmFields: [...CUSTOMER_CRM_PLANNED_FIELDS],
    },
    warnings,
  };
}

export function emptyPlatformAdminDurableSummary(generatedAt = new Date().toISOString()): PlatformAdminDurableSummary {
  const unavailable = (): DurableQueueMetric => ({ maturity: 'unavailable', counts: {} });
  return {
    available: false,
    generatedAt,
    source: 'optional-durable-tables',
    tables: [],
    warnings: ['DATABASE_URL is not configured; optional durable queues are unavailable.'],
    agentRuns: unavailable(),
    agentHandoffs: unavailable(),
    reviewJobs: unavailable(),
    reviewDecisions: unavailable(),
    enrichmentJobs: unavailable(),
    outbox: unavailable(),
    auditEvents: unavailable(),
    agentRunRows: [],
    agentHandoffRows: [],
    reviewJobRows: [],
    enrichmentJobRows: [],
    outboxRows: [],
    auditEventRows: [],
  };
}

function runtimeMaturity(): AdminMaturity {
  return 'live';
}

const WORKER_STALE_AFTER_MS = 30 * 60 * 1_000;

function workerLanes(durable: PlatformAdminDurableSummary, nowMs: number): PlatformAdminOperationsData['worker']['lanes'] {
  const rowsByKind = new Map<string, typeof durable.agentRunRows[number]>();
  for (const row of durable.agentRunRows) {
    const kind = row.workerKind ?? (row.agentKind.endsWith('-worker') ? row.agentKind : undefined);
    if (!kind) continue;
    const previous = rowsByKind.get(kind);
    const previousAt = parseTime(previous?.heartbeatAt ?? previous?.startedAt) ?? 0;
    const currentAt = parseTime(row.heartbeatAt ?? row.startedAt) ?? 0;
    if (!previous || currentAt > previousAt) rowsByKind.set(kind, row);
  }
  return [...rowsByKind.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([workerKind, row]) => {
    const lastSeen = parseTime(row.heartbeatAt ?? row.startedAt);
    const status: PlatformAdminOperationsData['worker']['lanes'][number]['status'] = row.status === 'running'
      ? lastSeen !== undefined && nowMs - lastSeen <= WORKER_STALE_AFTER_MS ? 'running' : 'stale'
      : row.status === 'failed' ? 'failed' : row.status === 'completed' || row.status === 'cancelled' ? 'stopped' : 'unknown';
    return {
      workerKind,
      status,
      runId: row.id,
      ...(row.heartbeatAt ? { lastHeartbeatAt: row.heartbeatAt } : {}),
      ...(row.startedAt ? { startedAt: row.startedAt } : {}),
      ...(row.completedAt ? { completedAt: row.completedAt } : {}),
      ...(row.error ? { error: row.error } : {}),
    };
  });
}

const TERMINAL_QUEUE_STATUSES = new Set(['complete', 'completed', 'cancelled', 'canceled', 'dismissed', 'resolved', 'approved', 'rejected', 'processed', 'succeeded', 'success']);

function queueAge(value: string | undefined, nowMs: number): string {
  const timestamp = parseTime(value);
  if (timestamp === undefined) return 'Not observed';
  const ageMs = Math.max(0, nowMs - timestamp);
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function humanizeQueueValue(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function queueStatusIsTerminal(status: string): boolean {
  return TERMINAL_QUEUE_STATUSES.has(status.toLowerCase());
}

function durableMaturity(metric: DurableQueueMetric): AdminMaturity {
  return metric.maturity === 'durable' ? 'durable' : metric.maturity === 'partial' ? 'partial' : 'unavailable';
}

function queuePriority(status: string, lastError?: string): PlatformAdminQueueSeverity {
  const normalized = status.toLowerCase();
  if (lastError || normalized === 'failed' || normalized === 'blocked') return 'high';
  if (normalized === 'needs-human' || normalized === 'stale' || normalized === 'queued' || normalized === 'pending') return 'medium';
  return 'low';
}

function queueActionHref(queue: PlatformAdminQueueName): string {
  return `/admin/operations?queue=${queue}`;
}

function buildPlatformAdminQueue(
  radar: RadarStore,
  workspace: WorkspaceStore,
  durable: PlatformAdminDurableSummary,
  generatedAt: string,
  radarMaturity: AdminMaturity,
  workspaceMaturity: AdminMaturity,
): PlatformAdminQueueData {
  const nowMs = parseTime(generatedAt) ?? Date.now();
  const rows: PlatformAdminQueueRow[] = [];
  const sourceRows = [...radar.sources.values()].map((source): SourceHealthRow => {
    const stale = source.active && isStale(source.lastCheckedAt, source.checkIntervalHours, nowMs);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      checkIntervalHours: source.checkIntervalHours,
      active: source.active,
      attempted: Boolean(source.lastCheckedAt),
      successfulFetch: Boolean(source.lastSuccessfulFetchAt),
      processed: Boolean(source.lastProcessedAt || source.lastContentHash),
      stale,
      ...(source.lastCheckedAt ? { lastCheckedAt: source.lastCheckedAt } : {}),
      ...(source.lastSuccessfulFetchAt ? { lastSuccessfulFetchAt: source.lastSuccessfulFetchAt } : {}),
      ...(source.lastProcessedAt ? { lastProcessedAt: source.lastProcessedAt } : {}),
      consecutiveFailures: source.consecutiveFailures,
      consecutiveProcessingFailures: source.consecutiveProcessingFailures ?? 0,
      freshness: freshness(source.lastCheckedAt, nowMs, Math.max(1, source.checkIntervalHours) * 60 * 60 * 1_000),
    };
  });

  for (const source of sourceRows) {
    if (!source.active || (!source.stale && source.consecutiveFailures === 0 && source.consecutiveProcessingFailures === 0)) continue;
    const failureCount = source.consecutiveFailures + source.consecutiveProcessingFailures;
    const problem = source.consecutiveFailures > 0
      ? `Fetch failed ${source.consecutiveFailures} time${source.consecutiveFailures === 1 ? '' : 's'}`
      : source.consecutiveProcessingFailures > 0
        ? `Processing failed ${source.consecutiveProcessingFailures} time${source.consecutiveProcessingFailures === 1 ? '' : 's'}`
        : `Last check ${source.freshness}`;
    const ageAt = source.lastCheckedAt ?? source.lastSuccessfulFetchAt;
    rows.push({
      id: `source:${source.id}`,
      kind: 'source-health',
      queue: 'source-health',
      title: `Source ${source.name}`,
      subtitle: source.id,
      reason: problem,
      lane: 'Source health',
      age: queueAge(ageAt, nowMs),
      ...(ageAt ? { ageAt } : {}),
      status: failureCount > 0 ? 'failed' : 'stale',
      severity: failureCount > 0 ? 'high' : 'medium',
      maturity: radarMaturity,
      source: 'RadarEngine source health',
      action: { type: 'link', label: 'Open Radar', href: '/admin/radar?focus=stale-sources' },
      detail: {
        why: source.consecutiveFailures > 0
          ? `Radar recorded ${source.consecutiveFailures} consecutive fetch failure${source.consecutiveFailures === 1 ? '' : 's'} for this active source.`
          : source.consecutiveProcessingFailures > 0
            ? `Radar recorded ${source.consecutiveProcessingFailures} consecutive processing failure${source.consecutiveProcessingFailures === 1 ? '' : 's'} after fetching this source.`
            : `The source is past its configured ${source.freshness} check cadence.`,
        evidence: [
          { label: 'Last check', value: source.lastCheckedAt ?? 'Not observed' },
          { label: 'Last successful fetch', value: source.lastSuccessfulFetchAt ?? 'Not observed' },
          { label: 'Last processed', value: source.lastProcessedAt ?? 'Not observed' },
          { label: 'Check cadence', value: source.checkIntervalHours ? `Every ${source.checkIntervalHours}h` : 'Not configured' },
        ],
        related: [
          { label: 'Source ID', value: source.id },
          { label: 'URL', value: source.url, href: source.url },
        ],
        recovery: 'Inspect the source in Radar before changing its cadence or retrying the worker. A successful fetch does not prove processing completed.',
      },
    });
  }

  const verificationTasks = [...radar.verificationTasks.values()].filter((task) => task.status === 'open');
  for (const task of verificationTasks) {
    const opportunity = task.opportunityId ? radar.opportunities.get(task.opportunityId) : undefined;
    const title = opportunity?.fields.title ?? `Verification ${task.id}`;
    const reason = humanizeQueueValue(task.reason);
    rows.push({
      id: `verification:${task.id}`,
      kind: 'verification',
      queue: 'verification',
      title: `Verification ${task.id}`,
      subtitle: title,
      reason: `${reason} · ${task.details}`,
      lane: 'Verification',
      age: queueAge(task.createdAt, nowMs),
      ageAt: task.createdAt,
      status: task.status,
      severity: task.reason === 'page-gone' || task.reason === 'conflicting-data' ? 'high' : 'medium',
      maturity: radarMaturity,
      source: 'RadarEngine verification tasks',
      action: { type: 'link', label: 'Open Radar', href: '/admin/radar?focus=verification' },
      detail: {
        why: task.details,
        evidence: [
          { label: 'Reason', value: reason },
          { label: 'Created', value: task.createdAt },
          { label: 'Status', value: task.status },
        ],
        related: [
          { label: 'Task ID', value: task.id },
          ...(task.opportunityId ? [{ label: 'Opportunity', value: task.opportunityId, href: `/admin/radar?focus=verification` }] : []),
          ...(task.claimRequestId ? [{ label: 'Claim request', value: task.claimRequestId, href: '/admin/radar?focus=claims' }] : []),
        ],
        recovery: 'Review the source evidence and resolve or dismiss the task in the Radar workflow. This dashboard does not mark verification complete by itself.',
      },
    });
  }

  const claims = [...radar.claims.values()].filter((claim) => claim.status === 'pending');
  for (const claim of claims) {
    const opportunity = radar.opportunities.get(claim.opportunityId);
    const organization = radar.organizations.get(claim.organizationId);
    rows.push({
      id: `claim:${claim.id}`,
      kind: 'claim',
      queue: 'claims',
      title: `Claim ${claim.id}`,
      subtitle: organization?.name ?? claim.organizationId,
      reason: 'Organization claim awaiting review',
      lane: 'Claims',
      age: queueAge(claim.requestedAt, nowMs),
      ageAt: claim.requestedAt,
      status: claim.status,
      severity: claim.verificationMethod === 'manual-review' ? 'high' : 'medium',
      maturity: radarMaturity,
      source: 'RadarEngine organization claims',
      action: { type: 'link', label: 'Open claims', href: '/admin/radar?focus=claims' },
      detail: {
        why: `An organization requested ownership of this opportunity through ${claim.verificationMethod}.`,
        evidence: [
          { label: 'Requested', value: claim.requestedAt },
          { label: 'Verification method', value: claim.verificationMethod },
          { label: 'Status', value: claim.status },
        ],
        related: [
          { label: 'Claim ID', value: claim.id },
          { label: 'Organization', value: organization?.name ?? claim.organizationId },
          { label: 'Opportunity', value: opportunity?.fields.title ?? claim.opportunityId },
        ],
        recovery: 'Open the claim review view to compare the organization domain and source evidence before approving or rejecting it.',
      },
    });
  }

  const addJobRows = (queue: 'review' | 'enrichment', jobRows: PlatformAdminDurableSummary['reviewJobRows'], metric: DurableQueueMetric, label: string) => {
    for (const job of jobRows) {
      if (queueStatusIsTerminal(job.status)) continue;
      const status = job.status.toLowerCase();
      const ageAt = job.updatedAt ?? job.createdAt ?? job.nextAttemptAt;
      const severity = queuePriority(job.status, job.lastError);
      rows.push({
        id: `${queue}:${job.id}`,
        kind: queue,
        queue,
        title: `${label} ${job.id}`,
        subtitle: job.opportunityId ?? job.kind ?? 'Not linked to an opportunity',
        reason: job.lastError ?? `${humanizeQueueValue(job.status)} job`,
        lane: label,
        age: queueAge(ageAt, nowMs),
        ...(ageAt ? { ageAt } : {}),
        status: job.status,
        severity,
        maturity: durableMaturity(metric),
        source: `Durable ${label.toLowerCase()} queue`,
        action: status === 'failed' || status === 'blocked'
          ? { type: 'operation', label: 'Retry', action: 'retry', queue, id: job.id }
          : { type: 'link', label: 'Open queue', href: queueActionHref(queue) },
        detail: {
          why: job.lastError ?? `This ${label.toLowerCase()} job is ${job.status} and remains in the durable queue.`,
          evidence: [
            { label: 'Status', value: job.status },
            { label: 'Attempts', value: String(job.attempts) },
            { label: 'Next attempt', value: job.nextAttemptAt ?? 'Not scheduled' },
            { label: 'Updated', value: job.updatedAt ?? job.createdAt ?? 'Not observed' },
          ],
          related: [
            { label: 'Job ID', value: job.id },
            ...(job.opportunityId ? [{ label: 'Opportunity', value: job.opportunityId, href: '/admin/radar' }] : []),
          ],
          recovery: status === 'failed' || status === 'blocked' ? 'Retry is limited to this durable item and is written to the platform audit trail.' : 'Let the owning worker continue; use Operations for queue-level recovery controls.',
        },
      });
    }
  };
  addJobRows('review', durable.reviewJobRows, durable.reviewJobs, 'Review');
  addJobRows('enrichment', durable.enrichmentJobRows, durable.enrichmentJobs, 'Enrichment');

  for (const event of durable.outboxRows) {
    if (queueStatusIsTerminal(event.status)) continue;
    const status = event.status.toLowerCase();
    const ageAt = event.createdAt ?? event.availableAt ?? event.lockedAt;
    rows.push({
      id: `outbox:${event.id}`,
      kind: 'outbox',
      queue: 'outbox',
      title: `Outbox ${event.id}`,
      subtitle: event.topic,
      reason: event.lastError ?? `${humanizeQueueValue(event.status)} event`,
      lane: 'Outbox',
      age: queueAge(ageAt, nowMs),
      ...(ageAt ? { ageAt } : {}),
      status: event.status,
      severity: queuePriority(event.status, event.lastError),
      maturity: durableMaturity(durable.outbox),
      source: 'Durable outbox events',
      action: status === 'failed'
        ? { type: 'operation', label: 'Retry', action: 'retry', queue: 'outbox', id: event.id }
        : { type: 'link', label: 'Open outbox', href: queueActionHref('outbox') },
      detail: {
        why: event.lastError ?? `This outbox event is ${event.status} and has not reached its processed state.`,
        evidence: [
          { label: 'Topic', value: event.topic },
          { label: 'Status', value: event.status },
          { label: 'Attempts', value: String(event.attempts) },
          { label: 'Available', value: event.availableAt ?? 'Not observed' },
        ],
        related: [
          { label: 'Event ID', value: event.id },
          { label: 'Aggregate', value: `${event.aggregateType}:${event.aggregateId}` },
        ],
        recovery: status === 'failed' ? 'Retry is limited to this event and is audited. Confirm the downstream contract before repeating a persistent failure.' : 'Let the outbox worker continue and inspect the event detail in Operations.',
      },
    });
  }

  for (const handoff of durable.agentHandoffRows) {
    if (queueStatusIsTerminal(handoff.status)) continue;
    const ageAt = handoff.createdAt ?? handoff.completedAt;
    rows.push({
      id: `handoff:${handoff.id}`,
      kind: 'agent-handoff',
      queue: 'agents',
      title: `Agent handoff ${handoff.id}`,
      subtitle: `${handoff.fromAgent} → ${handoff.toAgent}`,
      reason: `Awaiting ${humanizeQueueValue(handoff.status)}`,
      lane: 'Agent handoff',
      age: queueAge(ageAt, nowMs),
      ...(ageAt ? { ageAt } : {}),
      status: handoff.status,
      severity: queuePriority(handoff.status),
      maturity: durableMaturity(durable.agentHandoffs),
      source: 'Durable agent handoffs',
      action: { type: 'link', label: 'Open agents', href: queueActionHref('agents') },
      detail: {
        why: `The ${handoff.kind} handoff from ${handoff.fromAgent} to ${handoff.toAgent} is ${handoff.status}.`,
        evidence: [
          { label: 'Kind', value: handoff.kind },
          { label: 'Created', value: handoff.createdAt ?? 'Not observed' },
          { label: 'Completed', value: handoff.completedAt ?? 'Not completed' },
        ],
        related: [
          { label: 'Handoff ID', value: handoff.id },
          ...(handoff.opportunityId ? [{ label: 'Opportunity', value: handoff.opportunityId, href: '/admin/radar' }] : []),
        ],
        recovery: 'Inspect the receiving agent lane and evidence contract before replaying work. Handoffs are observed here; execution remains owned by the worker graph.',
      },
    });
  }

  const workerMaturity = durableMaturity(durable.agentRuns);
  const lanes = workerLanes(durable, nowMs);
  for (const lane of lanes.filter((item) => item.status === 'failed' || item.status === 'stale')) {
    const ageAt = lane.lastHeartbeatAt ?? lane.startedAt;
    rows.push({
      id: `lane:${lane.workerKind}`,
      kind: 'agent-run',
      queue: 'agents',
      title: `Worker lane ${lane.workerKind}`,
      subtitle: lane.runId ?? 'No run ID',
      reason: lane.error ?? `Lane heartbeat is ${lane.status}`,
      lane: 'Agent run',
      owner: lane.workerKind,
      age: queueAge(ageAt, nowMs),
      ...(ageAt ? { ageAt } : {}),
      status: lane.status,
      severity: lane.status === 'failed' ? 'high' : 'medium',
      maturity: workerMaturity,
      source: 'Durable worker heartbeat records',
      action: { type: 'link', label: 'Open agents', href: queueActionHref('agents') },
      detail: {
        why: lane.error ?? `The latest ${lane.workerKind} heartbeat is older than the 30-minute liveness window.`,
        evidence: [
          { label: 'Status', value: lane.status },
          { label: 'Last heartbeat', value: lane.lastHeartbeatAt ?? 'Not observed' },
          { label: 'Started', value: lane.startedAt ?? 'Not observed' },
        ],
        related: [
          { label: 'Worker lane', value: lane.workerKind },
          ...(lane.runId ? [{ label: 'Run ID', value: lane.runId }] : []),
        ],
        recovery: 'A stale heartbeat does not prove productive work stopped. Inspect worker logs and durable run state before restarting a lane.',
      },
    });
  }

  for (const task of workspace.deliveryTasks.values()) {
    if (task.status !== 'pending') continue;
    const work = workspace.works.get(task.workId);
    const ageAt = task.dueDate ? `${task.dueDate}T00:00:00.000Z` : undefined;
    rows.push({
      id: `workspace:${task.id}`,
      kind: 'workspace-delivery',
      queue: 'workspace',
      title: `Workspace delivery ${task.id}`,
      subtitle: work?.title ?? task.workId,
      reason: 'Delivery task pending',
      lane: 'Workspace delivery',
      age: task.dueDate ? `Due ${task.dueDate}` : 'No due date',
      ...(ageAt ? { ageAt } : {}),
      status: task.status,
      severity: 'low',
      maturity: workspaceMaturity,
      source: 'WorkspaceEngine delivery tasks',
      action: { type: 'link', label: 'Open Workspace', href: '/home?tab=workspace' },
      detail: {
        why: 'The accepted Work has a delivery task that has not been marked complete.',
        evidence: [
          { label: 'Status', value: task.status },
          { label: 'Due date', value: task.dueDate ?? 'No due date' },
        ],
        related: [
          { label: 'Delivery task', value: task.id },
          { label: 'Work', value: work?.title ?? task.workId, href: '/home?tab=workspace' },
        ],
        recovery: 'Open Workspace to review the delivery task and mark it complete only when the organization-facing handoff is confirmed.',
      },
    });
  }

  const severityRank: Record<PlatformAdminQueueSeverity, number> = { high: 3, medium: 2, low: 1 };
  const sortedRows = rows.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || (parseTime(a.ageAt) ?? nowMs) - (parseTime(b.ageAt) ?? nowMs));
  const loadedByQueue = new Map<PlatformAdminQueueName, number>();
  const loadedRows = sortedRows.filter((row) => {
    const loaded = loadedByQueue.get(row.queue) ?? 0;
    if (loaded >= 100) return false;
    loadedByQueue.set(row.queue, loaded + 1);
    return true;
  });
  const oldest = [...rows].filter((row) => row.ageAt).sort((a, b) => (parseTime(a.ageAt) ?? nowMs) - (parseTime(b.ageAt) ?? nowMs))[0];
  return {
    summary: {
      open: rows.length,
      attention: rows.filter((row) => row.severity === 'high').length,
      inProgress: rows.filter((row) => ['processing', 'running', 'in-progress', 'leased'].includes(row.status.toLowerCase())).length,
      ...(oldest ? { oldest: { title: oldest.title, age: oldest.age, ...(oldest.ageAt ? { at: oldest.ageAt } : {}) } } : {}),
    },
    rows: loadedRows,
  };
}

export interface BuildPlatformAdminReadModelInput {
  radarStore?: RadarStore;
  workspaceStore?: WorkspaceStore;
  durable?: PlatformAdminDurableSummary;
  generatedAt?: string;
  warnings?: string[];
  databaseConfigured?: boolean;
}

export function buildPlatformAdminReadModel(input: BuildPlatformAdminReadModelInput): PlatformAdminOverview {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const nowMs = parseTime(generatedAt) ?? Date.now();
  const radarAvailable = input.radarStore !== undefined;
  const workspaceAvailable = input.workspaceStore !== undefined;
  const radar = input.radarStore ?? createStore();
  const workspace = input.workspaceStore ?? createWorkspaceStore();
  const databaseConfigured = input.databaseConfigured ?? Boolean(process.env.DATABASE_URL);
  const durable = input.durable ?? emptyPlatformAdminDurableSummary(generatedAt);
  const warnings = [...(input.warnings ?? []), ...durable.warnings];

  const opportunities = [...radar.opportunities.values()];
  const canonicalOpportunities = opportunities.filter((opportunity) => !opportunity.duplicateOfId);
  const openStatuses = new Set(['open', 'closing-soon', 'deadline-extended', 'opening-soon']);
  const trustDistribution = { high: 0, medium: 0, low: 0 };
  for (const opportunity of canonicalOpportunities) {
    if (opportunity.scores.trust >= 70) trustDistribution.high++;
    else if (opportunity.scores.trust >= 40) trustDistribution.medium++;
    else trustDistribution.low++;
  }
  const verificationTasks = [...radar.verificationTasks.values()];
  const claims = [...radar.claims.values()];
  const sources = [...radar.sources.values()];
  const sourceRows = sources.map((source): SourceHealthRow => {
    const stale = source.active && isStale(source.lastCheckedAt, source.checkIntervalHours, nowMs);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      active: source.active,
      attempted: Boolean(source.lastCheckedAt),
      successfulFetch: Boolean(source.lastSuccessfulFetchAt),
      processed: Boolean(source.lastProcessedAt || source.lastContentHash),
      stale,
      ...(source.lastCheckedAt ? { lastCheckedAt: source.lastCheckedAt } : {}),
      ...(source.lastSuccessfulFetchAt ? { lastSuccessfulFetchAt: source.lastSuccessfulFetchAt } : {}),
      ...(source.lastProcessedAt ? { lastProcessedAt: source.lastProcessedAt } : {}),
      consecutiveFailures: source.consecutiveFailures,
      consecutiveProcessingFailures: source.consecutiveProcessingFailures ?? 0,
      freshness: freshness(source.lastCheckedAt, nowMs, Math.max(1, source.checkIntervalHours) * 60 * 60 * 1_000),
    };
  }).sort((a, b) => Number(b.stale) - Number(a.stale) || a.name.localeCompare(b.name));
  const lifecycle = countBy(opportunities, (opportunity) => opportunity.status);
  const publication = {
    active: canonicalOpportunities.filter((opportunity) => openStatuses.has(opportunity.status)).length,
    needsVerification: (lifecycle['needs-verification'] ?? 0) + verificationTasks.filter((task) => task.status === 'open').length,
    closed: lifecycle.closed ?? 0,
    archived: lifecycle.archived ?? 0,
    duplicate: opportunities.filter((opportunity) => Boolean(opportunity.duplicateOfId)).length,
  };
  const radarData: PlatformAdminRadarData = {
    stats: {
      opportunitiesDiscovered: canonicalOpportunities.length,
      opportunitiesOpen: canonicalOpportunities.filter((opportunity) => openStatuses.has(opportunity.status)).length,
      opportunitiesClaimed: canonicalOpportunities.filter((opportunity) => Boolean(opportunity.claimedByOrganizationId)).length,
      staleListings: canonicalOpportunities.filter((opportunity) => opportunity.status === 'uncertain').length,
      duplicateRate: opportunities.length === 0 ? 0 : opportunities.filter((opportunity) => Boolean(opportunity.duplicateOfId)).length / opportunities.length,
      duplicateRecords: opportunities.filter((opportunity) => Boolean(opportunity.duplicateOfId)).length,
      openVerificationTasks: verificationTasks.filter((task) => task.status === 'open').length,
      alertsEmitted: radar.alerts.size,
      unreadAlerts: [...radar.alerts.values()].filter((alert) => !alert.read).length,
      trustDistribution,
    },
    lifecycle,
    publication,
    claims: countBy(claims, (claim) => claim.status),
    sourceHealth: {
      summary: {
        active: sources.filter((source) => source.active).length,
        attempted: sourceRows.filter((source) => source.attempted).length,
        successfulFetch: sourceRows.filter((source) => source.successfulFetch).length,
        processed: sourceRows.filter((source) => source.processed).length,
        stale: sourceRows.filter((source) => source.stale).length,
        fetchFailures: sources.filter((source) => source.consecutiveFailures > 0).length,
        processingFailures: sources.filter((source) => (source.consecutiveProcessingFailures ?? 0) > 0).length,
      },
      rows: sourceRows,
    },
    queues: {
      verification: verificationTasks.filter((task) => task.status === 'open').length,
      claims: claims.filter((claim) => claim.status === 'pending').length,
      staleSources: sourceRows.filter((source) => source.stale).length,
      lowTrust: canonicalOpportunities.filter((opportunity) => opportunity.scores.trust < 40).length,
    },
  };

  const openCalls = [...workspace.openCalls.values()];
  const submissions = [...workspace.submissions.values()];
  const reviews = {
    rounds: workspace.reviewRounds.size,
    assignments: workspace.reviewAssignments.size,
    completedAssignments: [...workspace.reviewAssignments.values()].filter((assignment) => Boolean(assignment.completedAt)).length,
    recommendations: workspace.reviewRecommendations.size,
  };
  const workspaceData: PlatformAdminWorkspaceData = {
    organizations: radar.organizations.size,
    accounts: {
      total: radar.accounts.size,
      active: [...radar.accounts.values()].filter((account) => account.active !== false).length,
      inactive: [...radar.accounts.values()].filter((account) => account.active === false).length,
    },
    members: radar.memberships.length,
    openCalls: countBy(openCalls, (call) => call.status),
    submissions: countBy(submissions, (submission) => submission.status),
    drafts: workspace.submissionDrafts.size,
    reviews,
    decisions: countBy(workspace.decisions.values(), (decision) => decision.outcome),
    delivery: countBy(workspace.deliveryTasks.values(), (task) => task.status),
  };
  const customers = buildPlatformAdminCustomers(input.radarStore, input.workspaceStore, generatedAt, databaseConfigured);

  const reviewQueueCount = (metricCount(durable.reviewJobs, 'queued') + metricCount(durable.reviewJobs, 'processing') + metricCount(durable.reviewJobs, 'needs-human')) || radarData.queues.verification;
  const lanes = workerLanes(durable, nowMs);
  const workerRunning = lanes.filter((lane) => lane.status === 'running').length;
  const workerFailed = lanes.filter((lane) => lane.status === 'failed').length;
  const workerCompleted = metricCount(durable.agentRuns, 'completed');
  const workerStatus: PlatformAdminOperationsData['worker']['status'] = workerRunning > 0
    ? 'running'
    : lanes.some((lane) => lane.status === 'stale')
      ? 'stale'
      : workerFailed > 0
        ? 'failed'
        : 'unknown';
  const latestLane = lanes[0];
  const hasExplicitWorkerSignal = lanes.length > 0;
  const operationsData: PlatformAdminOperationsData = {
    worker: {
      status: workerStatus,
      ...(latestLane?.status ? { latestStatus: latestLane.status } : {}),
      ...(latestLane?.workerKind ? { latestKind: latestLane.workerKind } : {}),
      ...(latestLane?.lastHeartbeatAt ?? latestLane?.startedAt ? { latestAt: latestLane.lastHeartbeatAt ?? latestLane.startedAt } : {}),
      running: workerRunning,
      failed: workerFailed,
      completed: workerCompleted,
      lanes,
      caveat: hasExplicitWorkerSignal ? 'Observed durable worker heartbeat records. A stale lane means its last heartbeat exceeded 30 minutes; productive throughput remains a separate signal.' : 'No durable worker heartbeat is available; configuration or completed agent-run history does not establish Railway liveness.',
    },
    throughput: {
      sourcesAttempted: radarData.sourceHealth.summary.attempted,
      successfulFetches: radarData.sourceHealth.summary.successfulFetch,
      processedSources: radarData.sourceHealth.summary.processed,
      activeOpportunities: radarData.stats.opportunitiesOpen,
      submissions: submissions.length,
      decisions: workspace.decisions.size,
      completedDelivery: metricCount({ maturity: 'durable', counts: workspaceData.delivery }, 'complete'),
    },
    pipeline: [
      { stage: 'due', count: radarData.sourceHealth.summary.stale, source: 'Derived from source cadence and last attempt.' },
      { stage: 'check', count: radarData.sourceHealth.summary.attempted, source: 'Radar compatibility source lastCheckedAt.' },
      { stage: 'fetch', count: radarData.sourceHealth.summary.successfulFetch, source: 'Radar compatibility source lastSuccessfulFetchAt.' },
      { stage: 'process', count: radarData.sourceHealth.summary.processed, source: 'Radar compatibility source lastProcessedAt/content hash.' },
      { stage: 'review', count: reviewQueueCount, source: durable.reviewJobs.maturity === 'unavailable' ? 'Radar verification tasks; durable review jobs unavailable.' : 'Durable review jobs plus compatibility verification tasks.' },
      { stage: 'publish', count: radarData.publication.active, source: 'Compatibility active opportunity statuses; not target publication_state.' },
    ],
    compatibilityQueues: {
      verification: radarData.queues.verification,
      claims: radarData.queues.claims,
      emailReview: radar.emailCandidates.filter((candidate) => candidate.state === 'pending' || candidate.classification === 'needs-review').length,
      gmailJobs: countBy(radar.gmailSyncJobs, (job) => job.status),
      delivery: workspaceData.delivery,
    },
    durable,
    agentGraph: agentGraphSnapshot(),
    queue: buildPlatformAdminQueue(radar, workspace, durable, generatedAt, radarAvailable ? runtimeMaturity() : 'unavailable', workspaceAvailable ? runtimeMaturity() : 'unavailable'),
  };

  const durableTables = durable.tables.map((table) => ({ name: table.name, status: table.available ? 'deployed' as const : 'missing' as const }));
  const systemWarnings = [
    ...(databaseConfigured ? [] : ['DATABASE_URL is not configured; stores are demo-scoped in-memory compatibility stores.']),
    'Worker health is separate from productive throughput; a live heartbeat does not prove publication or delivery progress.',
    ...durable.warnings,
  ];
  const systemData: PlatformAdminSystemData = {
    persistenceMode: databaseConfigured ? 'postgres-compatibility' : 'demo-in-memory',
    databaseConfigured,
    sessionSecretConfigured: Boolean(process.env.MISSA_SESSION_SECRET),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    runtimeTruth: 'RadarEngine and WorkspaceEngine compatibility stores are the current runtime read model. Additive relational/agent tables are reported separately.',
    workerCaveat: 'Worker liveness is based on durable heartbeat metadata from the Railway/container lane. A lane older than 30 minutes is stale; completed history does not establish that a process is running now.',
    durableTables,
    warnings: systemWarnings,
  };

  const auditEntries: PlatformAdminAuditEntry[] = [
    ...radar.auditLog.map((entry) => ({ id: entry.id, domain: 'radar' as const, at: entry.at, ...(entry.accountId ? { actorAccountId: entry.accountId } : {}), action: entry.action, targetType: entry.targetType, targetId: entry.targetId })),
    ...workspace.auditLog.map((entry) => ({ id: entry.id, domain: 'workspace' as const, at: entry.at, ...(entry.accountId ? { actorAccountId: entry.accountId } : {}), action: entry.action, targetType: entry.targetType, targetId: entry.targetId })),
    ...durable.auditEventRows.map((entry) => ({ id: entry.id, domain: 'platform' as const, at: entry.createdAt ?? generatedAt, ...(entry.actorAccountId ? { actorAccountId: entry.actorAccountId } : {}), action: entry.action, targetType: entry.targetType, targetId: entry.targetId })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const auditData: PlatformAdminAuditData = {
    count: auditEntries.length,
    recent: auditEntries.slice(0, 50),
    limitation: 'Recent compatibility and platform audit entries are shown without private detail payloads. The view remains capped at the latest 50 rows.',
  };
  return {
    generatedAt,
    warnings: [...warnings, ...customers.warnings],
    radar: {
      provenance: { maturity: radarAvailable ? runtimeMaturity() : 'unavailable', source: radarAvailable ? databaseConfigured ? 'RadarEngine compatibility store backed by Postgres snapshot' : 'RadarEngine demo compatibility store' : 'RadarEngine compatibility store unavailable', freshness: `read at ${generatedAt}` },
      data: radarData,
      warnings: radarAvailable ? [] : ['Radar compatibility store could not be read; these zero counts are unavailable, not a healthy empty state.'],
    },
    workspace: {
      provenance: { maturity: workspaceAvailable ? runtimeMaturity() : 'unavailable', source: workspaceAvailable ? databaseConfigured ? 'WorkspaceEngine compatibility store backed by Postgres snapshot' : 'WorkspaceEngine compatibility store' : 'WorkspaceEngine compatibility store unavailable', freshness: `read at ${generatedAt}` },
      data: workspaceData,
      warnings: workspaceAvailable ? [] : ['Workspace compatibility store could not be read; these zero counts are unavailable, not a healthy empty state.'],
    },
    operations: {
      provenance: { maturity: durable.available ? durable.warnings.length ? 'partial' : 'durable' : databaseConfigured ? 'partial' : 'latest-run-only', source: durable.available ? 'Optional durable agent/enrichment/review tables plus compatibility stores' : 'Compatibility queues and optional durable tables', freshness: `read at ${generatedAt}` },
      data: operationsData,
      warnings: durable.warnings,
    },
    system: {
      provenance: { maturity: 'derived', source: 'Runtime configuration and durable table probes', freshness: `read at ${generatedAt}` },
      data: systemData,
      warnings: systemWarnings,
    },
    audit: {
      provenance: { maturity: durable.auditEvents.maturity === 'durable' ? 'durable' : 'partial', source: 'RadarEngine, WorkspaceEngine, and optional audit_events records', freshness: `read at ${generatedAt}` },
      data: auditData,
      warnings: [auditData.limitation],
    },
    customers,
  };
}

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverview> {
  const generatedAt = new Date().toISOString();
  const [radarResult, workspaceResult, durableResult] = await Promise.all([
    getEngine().then((engine) => engine.store).catch(() => undefined),
    getWorkspaceEngine().then((engine) => engine.store).catch(() => undefined),
    process.env.DATABASE_URL
      ? readPlatformAdminDurableSummary(process.env.DATABASE_URL).catch(() => emptyPlatformAdminDurableSummary(generatedAt))
      : Promise.resolve(emptyPlatformAdminDurableSummary(generatedAt)),
  ]);
  const warnings: string[] = [];
  if (!radarResult) warnings.push('Radar compatibility store could not be read; Radar metrics are unavailable.');
  if (!workspaceResult) warnings.push('Workspace compatibility store could not be read; Workspace metrics are unavailable.');
  return buildPlatformAdminReadModel({ radarStore: radarResult, workspaceStore: workspaceResult, durable: durableResult, generatedAt, warnings });
}

export type PlatformAdminView = keyof Pick<PlatformAdminOverview, 'radar' | 'operations' | 'system' | 'audit' | 'customers'>;

export function getPlatformAdminView(view: PlatformAdminView): Promise<AdminArea<PlatformAdminRadarData | PlatformAdminOperationsData | PlatformAdminSystemData | PlatformAdminAuditData | PlatformAdminCustomersData>>;
export function getPlatformAdminView(view: 'radar'): Promise<AdminArea<PlatformAdminRadarData>>;
export function getPlatformAdminView(view: 'operations'): Promise<AdminArea<PlatformAdminOperationsData>>;
export function getPlatformAdminView(view: 'system'): Promise<AdminArea<PlatformAdminSystemData>>;
export function getPlatformAdminView(view: 'audit'): Promise<AdminArea<PlatformAdminAuditData>>;
export function getPlatformAdminView(view: 'customers'): Promise<AdminArea<PlatformAdminCustomersData>>;
export async function getPlatformAdminView(view: PlatformAdminView): Promise<AdminArea<PlatformAdminRadarData | PlatformAdminOperationsData | PlatformAdminSystemData | PlatformAdminAuditData | PlatformAdminCustomersData>> {
  const overview = await getPlatformAdminOverview();
  return overview[view];
}

export async function requirePlatformAdmin(request: Request): Promise<PlatformAdminAuthorization> {
  return authorizePlatformAdmin(await getSessionAccount(request.headers.get('cookie')));
}

export function platformAdminAuthResponse(auth: PlatformAdminAuthorization): NextResponse | undefined {
  if (auth.ok) return undefined;
  return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'cache-control': 'private, no-store' } });
}

/** Page boundary: redirect unauthenticated users to login and non-admins home. */
export async function requirePlatformAdminPage(): Promise<SessionAccount> {
  const cookieStore = await cookies();
  const auth = authorizePlatformAdmin(await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value));
  if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/home');
  return auth.session;
}
