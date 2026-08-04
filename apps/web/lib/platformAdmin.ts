import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  readPlatformAdminDurableSummary,
  type DurableQueueMetric,
  type PlatformAdminDurableSummary,
} from '@missa/radar-adapters';
import type { RadarStore } from '@missa/radar-engine';
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

export interface PlatformAdminOperationsData {
  worker: {
    status: 'running' | 'healthy' | 'failed' | 'unknown';
    latestStatus?: string;
    latestKind?: string;
    latestAt?: string;
    running: number;
    failed: number;
    completed: number;
    caveat: string;
  };
  throughput: { sourcesAttempted: number; successfulFetches: number; processedSources: number; activeOpportunities: number; submissions: number; decisions: number; completedDelivery: number };
  pipeline: Array<{ stage: 'due' | 'check' | 'fetch' | 'process' | 'review' | 'publish'; count: number; source: string }>;
  compatibilityQueues: { verification: number; claims: number; emailReview: number; gmailJobs: Record<string, number>; delivery: Record<string, number> };
  durable: PlatformAdminDurableSummary;
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
  domain: 'radar' | 'workspace';
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
  };
}

function runtimeMaturity(): AdminMaturity {
  return 'live';
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

  const reviewQueueCount = (metricCount(durable.reviewJobs, 'queued') + metricCount(durable.reviewJobs, 'processing') + metricCount(durable.reviewJobs, 'needs-human')) || radarData.queues.verification;
  const workerRunning = metricCount(durable.agentRuns, 'running');
  const workerFailed = metricCount(durable.agentRuns, 'failed');
  const workerCompleted = metricCount(durable.agentRuns, 'completed');
  const workerStatus: PlatformAdminOperationsData['worker']['status'] = workerRunning > 0 ? 'running' : workerFailed > 0 ? 'failed' : 'unknown';
  const hasExplicitWorkerSignal = workerStatus !== 'unknown';
  const operationsData: PlatformAdminOperationsData = {
    worker: {
      status: workerStatus,
      ...(durable.agentRuns.latest?.status ? { latestStatus: durable.agentRuns.latest.status } : {}),
      ...(durable.agentRuns.latest?.kind ? { latestKind: durable.agentRuns.latest.kind } : {}),
      ...(durable.agentRuns.latest?.at ? { latestAt: durable.agentRuns.latest.at } : {}),
      running: workerRunning,
      failed: workerFailed,
      completed: workerCompleted,
      caveat: hasExplicitWorkerSignal ? 'Observed durable agent-run signal; this does not establish Railway liveness or productive throughput.' : 'No explicit running, failure, or heartbeat signal is available; agent-run history does not establish Railway liveness.',
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
  };

  const durableTables = durable.tables.map((table) => ({ name: table.name, status: table.available ? 'deployed' as const : 'missing' as const }));
  const systemWarnings = [
    ...(databaseConfigured ? [] : ['DATABASE_URL is not configured; stores are demo-scoped in-memory compatibility stores.']),
    'Worker health is separate from productive throughput; a healthy run does not prove publication or delivery progress.',
    ...durable.warnings,
  ];
  const systemData: PlatformAdminSystemData = {
    persistenceMode: databaseConfigured ? 'postgres-compatibility' : 'demo-in-memory',
    databaseConfigured,
    sessionSecretConfigured: Boolean(process.env.MISSA_SESSION_SECRET),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    runtimeTruth: 'RadarEngine and WorkspaceEngine compatibility stores are the current runtime read model. Additive relational/agent tables are reported separately.',
    workerCaveat: 'The web app does not infer an always-on worker from configuration or completed run history. Running or failed run records are explicit signals; a heartbeat is not currently exposed.',
    durableTables,
    warnings: systemWarnings,
  };

  const auditEntries: PlatformAdminAuditEntry[] = [
    ...radar.auditLog.map((entry) => ({ id: entry.id, domain: 'radar' as const, at: entry.at, ...(entry.accountId ? { actorAccountId: entry.accountId } : {}), action: entry.action, targetType: entry.targetType, targetId: entry.targetId })),
    ...workspace.auditLog.map((entry) => ({ id: entry.id, domain: 'workspace' as const, at: entry.at, ...(entry.accountId ? { actorAccountId: entry.accountId } : {}), action: entry.action, targetType: entry.targetType, targetId: entry.targetId })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const auditData: PlatformAdminAuditData = {
    count: auditEntries.length,
    recent: auditEntries.slice(0, 50),
    limitation: 'Compatibility audit entries are shown without private detail payloads. This view does not claim to be a complete target-schema audit ledger.',
  };

  return {
    generatedAt,
    warnings,
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
      provenance: { maturity: 'partial', source: 'RadarEngine and WorkspaceEngine compatibility audit logs', freshness: `read at ${generatedAt}` },
      data: auditData,
      warnings: [auditData.limitation],
    },
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

export type PlatformAdminView = keyof Pick<PlatformAdminOverview, 'radar' | 'operations' | 'system' | 'audit'>;

export function getPlatformAdminView(view: PlatformAdminView): Promise<AdminArea<PlatformAdminRadarData | PlatformAdminOperationsData | PlatformAdminSystemData | PlatformAdminAuditData>>;
export function getPlatformAdminView(view: 'radar'): Promise<AdminArea<PlatformAdminRadarData>>;
export function getPlatformAdminView(view: 'operations'): Promise<AdminArea<PlatformAdminOperationsData>>;
export function getPlatformAdminView(view: 'system'): Promise<AdminArea<PlatformAdminSystemData>>;
export function getPlatformAdminView(view: 'audit'): Promise<AdminArea<PlatformAdminAuditData>>;
export async function getPlatformAdminView(view: PlatformAdminView): Promise<AdminArea<PlatformAdminRadarData | PlatformAdminOperationsData | PlatformAdminSystemData | PlatformAdminAuditData>> {
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
