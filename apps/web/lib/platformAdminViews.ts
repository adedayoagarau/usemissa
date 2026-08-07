import { createStore as createRadarStore, type RadarStore } from '@missa/radar-engine';
import { createStore as createWorkspaceStore, type WorkspaceStore } from '@missa/workspace-engine';
import {
  emptyContentReviewQueue,
  readContentReviewQueue,
  readPlatformAdminAnalyticsEvents,
  type ContentReviewQueueData,
  type PlatformAdminAnalyticsEventsData,
} from '@missa/radar-adapters';
import { getEngine } from './engine';
import { getWorkspaceEngine } from './workspaceEngine';
import { getPlatformAdminOverview, type AdminArea, type AdminMaturity, type PlatformAdminOverview } from './platformAdmin';

export interface PlatformAdminContentRow {
  id: string;
  type: 'Radar opportunity' | 'Workspace open call';
  title: string;
  organization?: string;
  organizationId?: string;
  status: string;
  source: string;
  maturity: AdminMaturity;
  lastObservedAt?: string;
  href: string;
}

export interface PlatformAdminContentData {
  summary: {
    canonicalRadar: number;
    duplicateRadar: number;
    workspaceOpenCalls: number;
    publishedOpenCalls: number;
    drafts: number;
  };
  rows: PlatformAdminContentRow[];
  reviewQueue: ContentReviewQueueData;
  planned: string[];
}

export interface PlatformAdminAnalyticsMetric {
  label: string;
  value: number | string;
  detail: string;
  grain: string;
  source: string;
}

export interface PlatformAdminAnalyticsTrend {
  month: string;
  submissions: number;
  decisions: number;
  acceptedWorks: number;
  completedDelivery: number;
}

export interface PlatformAdminAnalyticsData {
  metrics: PlatformAdminAnalyticsMetric[];
  funnel: Array<{ label: string; value: number; grain: string; calculation: string }>;
  trends: PlatformAdminAnalyticsTrend[];
  quality: Array<{ label: string; value: number; detail: string }>;
  definitions: string[];
  durable: PlatformAdminAnalyticsEventsData;
}

const emptyDurableAnalytics: PlatformAdminAnalyticsEventsData = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_analytics_events',
  warnings: [],
  summary: { events: 0, last24h: 0, last7d: 0, uniqueAccounts: 0, uniqueOrganizations: 0 },
  byEvent: [],
  daily: [],
  recent: [],
};

function area<T>(data: T, source: string, maturity: AdminMaturity, generatedAt: string, warnings: string[] = []): AdminArea<T> {
  return {
    provenance: { maturity, source, freshness: `read at ${generatedAt}` },
    data,
    warnings,
  };
}

async function readRuntimeStores(): Promise<{ radar: RadarStore; workspace: WorkspaceStore; warnings: string[]; maturity: AdminMaturity }> {
  const [radarResult, workspaceResult] = await Promise.all([
    getEngine().then((engine) => engine.store).catch(() => undefined),
    getWorkspaceEngine().then((engine) => engine.store).catch(() => undefined),
  ]);
  const warnings = [
    ...(!radarResult ? ['Radar compatibility store could not be read; Radar content metrics are unavailable.'] : []),
    ...(!workspaceResult ? ['Workspace compatibility store could not be read; Workspace content metrics are unavailable.'] : []),
  ];
  return {
    radar: radarResult ?? createRadarStore(),
    workspace: workspaceResult ?? createWorkspaceStore(),
    warnings,
    maturity: !radarResult && !workspaceResult ? 'unavailable' : !radarResult || !workspaceResult ? 'partial' : 'live',
  };
}

function workspaceOpenCallContext(workspace: WorkspaceStore, organizationNames: Map<string, string>) {
  const context = new Map<string, { organizationId: string; organization?: string; program: string }>();
  for (const entity of workspace.entities.values()) {
    for (const program of [...workspace.programs.values()].filter((candidate) => candidate.entityId === entity.id)) {
      for (const openCall of [...workspace.openCalls.values()].filter((candidate) => candidate.programId === program.id)) {
        context.set(openCall.id, { organizationId: entity.organizationId, organization: organizationNames.get(entity.organizationId), program: program.name });
      }
    }
  }
  return context;
}

function buildContentData(radar: RadarStore, workspace: WorkspaceStore, reviewQueue = emptyContentReviewQueue()): PlatformAdminContentData {
  const organizationNames = new Map([...radar.organizations.values()].map((organization) => [organization.id, organization.name]));
  const openCallContext = workspaceOpenCallContext(workspace, organizationNames);
  const opportunities = [...radar.opportunities.values()];
  const canonical = opportunities.filter((opportunity) => !opportunity.duplicateOfId);
  const rows: PlatformAdminContentRow[] = opportunities.map((opportunity) => ({
    id: `radar:${opportunity.id}`,
    type: 'Radar opportunity',
    title: opportunity.fields.title,
    ...(opportunity.claimedByOrganizationId ? { organizationId: opportunity.claimedByOrganizationId, organization: organizationNames.get(opportunity.claimedByOrganizationId) } : {}),
    status: opportunity.duplicateOfId ? 'duplicate' : opportunity.status,
    source: opportunity.sourceId,
    maturity: 'live',
    lastObservedAt: opportunity.lastChangedAt ?? opportunity.lastCheckedAt ?? opportunity.createdAt,
    href: `/admin/radar?focus=${opportunity.duplicateOfId ? 'duplicates' : 'lifecycle'}`,
  }));
  for (const openCall of workspace.openCalls.values()) {
    const context = openCallContext.get(openCall.id);
    rows.push({
      id: `workspace:${openCall.id}`,
      type: 'Workspace open call',
      title: openCall.title,
      ...(context?.organizationId ? { organizationId: context.organizationId } : {}),
      ...(context?.organization ? { organization: context.organization } : {}),
      status: openCall.status,
      source: context?.program ? `Workspace · ${context.program}` : 'WorkspaceEngine open calls',
      maturity: 'live',
      lastObservedAt: openCall.publishedAt ?? openCall.createdAt,
      href: context?.organizationId ? `/workspace?organizationId=${encodeURIComponent(context.organizationId)}` : '/workspace',
    });
  }
  rows.sort((a, b) => (Date.parse(b.lastObservedAt ?? '') || 0) - (Date.parse(a.lastObservedAt ?? '') || 0) || a.title.localeCompare(b.title));
  return {
    summary: {
      canonicalRadar: canonical.length,
      duplicateRadar: opportunities.length - canonical.length,
      workspaceOpenCalls: workspace.openCalls.size,
      publishedOpenCalls: [...workspace.openCalls.values()].filter((openCall) => openCall.status === 'published').length,
      drafts: [...workspace.openCalls.values()].filter((openCall) => openCall.status === 'draft').length,
    },
    rows,
    reviewQueue,
    planned: ['Organization-owned editorial drafts and revisions', 'Media assets and structured content blocks', 'Organization-owned scheduled publishing', 'Editorial roles, collections, and public content analytics'],
  };
}

function monthFor(value?: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}/.test(value)) return undefined;
  return value.slice(0, 7);
}

function buildAnalyticsData(radar: RadarStore, workspace: WorkspaceStore, overview: PlatformAdminOverview, durable: PlatformAdminAnalyticsEventsData = emptyDurableAnalytics): PlatformAdminAnalyticsData {
  const submissions = [...workspace.submissions.values()];
  const decisions = [...workspace.decisions.values()];
  const delivery = [...workspace.deliveryTasks.values()];
  const acceptedWorks = decisions.filter((decision) => decision.outcome === 'accepted');
  const byMonth = new Map<string, PlatformAdminAnalyticsTrend>();
  const ensureMonth = (month: string) => {
    const current = byMonth.get(month);
    if (current) return current;
    const next: PlatformAdminAnalyticsTrend = { month, submissions: 0, decisions: 0, acceptedWorks: 0, completedDelivery: 0 };
    byMonth.set(month, next);
    return next;
  };
  for (const submission of submissions) {
    const month = monthFor(submission.submittedAt);
    if (month) ensureMonth(month).submissions++;
  }
  for (const decision of decisions) {
    const month = monthFor(decision.decidedAt);
    if (month) {
      const row = ensureMonth(month);
      row.decisions++;
      if (decision.outcome === 'accepted') row.acceptedWorks++;
    }
  }
  for (const task of delivery) {
    if (task.status !== 'complete') continue;
    const month = monthFor(task.completedAt);
    if (month) ensureMonth(month).completedDelivery++;
  }
  const totalDecisions = decisions.length;
  const acceptedRate = totalDecisions ? `${Math.round((acceptedWorks.length / totalDecisions) * 100)}%` : '—';
  const deliveryRate = delivery.length ? `${Math.round((delivery.filter((task) => task.status === 'complete').length / delivery.length) * 100)}%` : '—';
  const metrics: PlatformAdminAnalyticsMetric[] = [
    { label: 'Active organizations', value: [...radar.organizations.values()].filter((organization) => [...radar.memberships].some((membership) => membership.organizationId === organization.id)).length, detail: 'Organizations with at least one membership', grain: 'organization', source: 'RadarStore organizations + memberships' },
    { label: 'Active accounts', value: [...radar.accounts.values()].filter((account) => account.active !== false).length, detail: 'Accounts not marked inactive', grain: 'account', source: 'RadarStore accounts' },
    { label: 'Open calls', value: workspace.openCalls.size, detail: `${[...workspace.openCalls.values()].filter((openCall) => openCall.status === 'published').length} published`, grain: 'open call', source: 'WorkspaceStore openCalls' },
    { label: 'Acceptance rate', value: acceptedRate, detail: 'Accepted decisions ÷ all decisions', grain: 'decision', source: 'WorkspaceStore decisions' },
    { label: 'Delivery completion', value: deliveryRate, detail: 'Completed tasks ÷ all delivery tasks', grain: 'delivery task', source: 'WorkspaceStore deliveryTasks' },
    { label: 'Queue attention', value: overview.operations.data.queue.summary.attention, detail: 'High-severity operational rows', grain: 'queue row', source: 'PlatformAdmin operations read model' },
  ];
  const quality = [
    { label: 'Active Radar sources', value: overview.radar.data.sourceHealth.summary.active, detail: 'Configured active sources' },
    { label: 'Stale Radar sources', value: overview.radar.data.sourceHealth.summary.stale, detail: 'Past configured check cadence' },
    { label: 'Open verification', value: overview.radar.data.queues.verification, detail: 'Compatibility verification tasks' },
    { label: 'Pending claims', value: overview.radar.data.queues.claims, detail: 'Organization claims awaiting review' },
    { label: 'Low-trust opportunities', value: overview.radar.data.queues.lowTrust, detail: 'Canonical trust score below 40' },
  ];
  return {
    metrics,
    funnel: [
      { label: 'Open calls', value: workspace.openCalls.size, grain: 'open call', calculation: 'All Workspace open calls' },
      { label: 'Submissions', value: submissions.length, grain: 'submission', calculation: 'All Workspace submissions' },
      { label: 'Decisions', value: decisions.length, grain: 'decision', calculation: 'All Work-level decisions' },
      { label: 'Accepted Works', value: acceptedWorks.length, grain: 'work decision', calculation: 'Decisions with outcome accepted' },
      { label: 'Delivery tasks', value: delivery.length, grain: 'delivery task', calculation: 'All delivery tasks' },
      { label: 'Completed delivery', value: delivery.filter((task) => task.status === 'complete').length, grain: 'delivery task', calculation: 'Tasks with status complete' },
    ],
    trends: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    quality,
    definitions: [
      'This is a derived read model over the current RadarEngine and WorkspaceEngine stores; it is not a product-event warehouse.',
      'Active organizations require at least one observed membership. Account activity uses the explicit active flag; missing flags are treated as active for compatibility.',
      'Acceptance and delivery rates show an em dash when their denominator is zero; no zero-denominator success is implied.',
      'Worker liveness, source freshness, and productive throughput remain separate measures.',
      'Retention, cohorts, attribution, experiment results, revenue recognition, and scheduled reports are not persisted by this view.',
    ],
    durable,
  };
}

export async function getPlatformAdminContent(): Promise<AdminArea<PlatformAdminContentData>> {
  const generatedAt = new Date().toISOString();
  const [stores, reviewQueue] = await Promise.all([
    readRuntimeStores(),
    process.env.DATABASE_URL
      ? readContentReviewQueue(process.env.DATABASE_URL)
      : Promise.resolve(emptyContentReviewQueue(generatedAt, 'DATABASE_URL is not configured; durable content review is unavailable.')),
  ]);
  return area(buildContentData(stores.radar, stores.workspace, reviewQueue), 'RadarStore opportunities/claims and WorkspaceStore open calls + durable content review', stores.maturity, generatedAt, [...stores.warnings, ...reviewQueue.warnings]);
}

export async function getPlatformAdminAnalytics(): Promise<AdminArea<PlatformAdminAnalyticsData>> {
  const generatedAt = new Date().toISOString();
  const [stores, overview, durable] = await Promise.all([
    readRuntimeStores(),
    getPlatformAdminOverview(),
    process.env.DATABASE_URL ? readPlatformAdminAnalyticsEvents(process.env.DATABASE_URL) : Promise.resolve(emptyDurableAnalytics),
  ]);
  const maturity = stores.maturity === 'unavailable' ? 'unavailable' : stores.maturity === 'partial' ? 'partial' : 'derived';
  return area(buildAnalyticsData(stores.radar, stores.workspace, overview, durable), 'Compatibility workflow records + platform_analytics_events', maturity, generatedAt, [...stores.warnings, ...overview.warnings, ...durable.warnings, 'Historical analytics are bounded by the records available in the current runtime stores and first-party event ledger.']);
}

export { buildAnalyticsData, buildContentData };
