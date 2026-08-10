import { readPlatformAdminMessageHistory, readTaxonomyAdminDashboard, type PlatformAdminMessageHistory, type TaxonomyAdminDashboard } from '@missa/radar-adapters';
import { createStore as createRadarStore, organizationSeatLimit, type RadarStore } from '@missa/radar-engine';
import { createStore as createWorkspaceStore, type WorkspaceStore } from '@missa/workspace-engine';
import { getEngine } from './engine';
import { getWorkspaceEngine } from './workspaceEngine';
import { getPlatformAdminOverview, type AdminArea, type AdminMaturity, type PlatformAdminOverview } from './platformAdmin';

type Count = number | null;

interface RuntimeStores {
  radar: RadarStore;
  workspace: WorkspaceStore;
  radarAvailable: boolean;
  workspaceAvailable: boolean;
  maturity: AdminMaturity;
  warnings: string[];
}

async function readRuntimeStores(): Promise<RuntimeStores> {
  const [radarResult, workspaceResult] = await Promise.all([
    getEngine().then((engine) => engine.store).catch(() => undefined),
    getWorkspaceEngine().then((engine) => engine.store).catch(() => undefined),
  ]);
  const radarAvailable = Boolean(radarResult);
  const workspaceAvailable = Boolean(workspaceResult);
  return {
    radar: radarResult ?? createRadarStore(),
    workspace: workspaceResult ?? createWorkspaceStore(),
    radarAvailable,
    workspaceAvailable,
    maturity: radarAvailable && workspaceAvailable ? 'live' : radarAvailable || workspaceAvailable ? 'partial' : 'unavailable',
    warnings: [
      ...(!radarAvailable ? ['Opportunity records could not be read; organization identity and messaging metrics are unavailable.'] : []),
      ...(!workspaceAvailable ? ['Organization records could not be read; workflow and delivery metrics are unavailable.'] : []),
    ],
  };
}

function countBy<T>(items: Iterable<T>, key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const value = key(item);
    result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}

function increment(map: Map<string, number>, key: string | undefined): void {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function observe(latest: Map<string, string>, key: string | undefined, value: string | undefined): void {
  if (!key || !value || !Number.isFinite(Date.parse(value))) return;
  const current = latest.get(key);
  if (!current || Date.parse(value) > Date.parse(current)) latest.set(key, value);
}

function latest(values: Array<string | undefined>): string | undefined {
  const valid = values.filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)));
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function area<T>(data: T, source: string, maturity: AdminMaturity, generatedAt: string, warnings: string[] = []): AdminArea<T> {
  return { provenance: { maturity, source, freshness: `read at ${generatedAt}` }, data, warnings };
}

export interface PlatformAdminOrganizationRow {
  id: string;
  name: string;
  domains: string[];
  verified: boolean;
  memberCount: Count;
  activeMemberCount: Count;
  seatLimit: Count;
  openCallCount: Count;
  publishedOpenCallCount: Count;
  submissionCount: Count;
  inReviewCount: Count;
  decisionCount: Count;
  acceptedWorkCount: Count;
  pendingDeliveryCount: Count;
  billingTier: string;
  billingStatus: string;
  stripeConnectStatus: string;
  latestObservedAt?: string;
}

export interface PlatformAdminOrganizationsData {
  availability: 'available' | 'partial' | 'empty' | 'unavailable';
  summary: {
    organizationCount: Count;
    activeOrganizationCount: Count;
    publishedOpenCallCount: Count;
    pendingDeliveryCount: Count;
    pastDueCount: Count;
  };
  rows: PlatformAdminOrganizationRow[];
  planned: string[];
}

function buildOrganizationData(stores: RuntimeStores): PlatformAdminOrganizationsData {
  const { radar, workspace, radarAvailable, workspaceAvailable } = stores;
  const memberCounts = new Map<string, number>();
  const activeMemberCounts = new Map<string, number>();
  const openCallCounts = new Map<string, number>();
  const publishedOpenCallCounts = new Map<string, number>();
  const submissionCounts = new Map<string, number>();
  const inReviewCounts = new Map<string, number>();
  const decisionCounts = new Map<string, number>();
  const acceptedWorkCounts = new Map<string, number>();
  const pendingDeliveryCounts = new Map<string, number>();
  const latestActivity = new Map<string, string>();
  const entityOrganizations = new Map<string, string>();
  const programOrganizations = new Map<string, string>();
  const openCallOrganizations = new Map<string, string>();
  const submissionPathOrganizations = new Map<string, string>();
  const submissionOrganizations = new Map<string, string>();
  const workOrganizations = new Map<string, string>();

  for (const membership of radar.memberships) {
    if (!radar.organizations.has(membership.organizationId)) continue;
    increment(memberCounts, membership.organizationId);
    if (radar.accounts.get(membership.accountId)?.active !== false) increment(activeMemberCounts, membership.organizationId);
    observe(latestActivity, membership.organizationId, membership.grantedAt);
  }
  for (const entry of radar.auditLog) {
    if (radar.organizations.has(entry.targetId)) observe(latestActivity, entry.targetId, entry.at);
  }

  if (workspaceAvailable) {
    for (const entity of workspace.entities.values()) {
      if (!radar.organizations.has(entity.organizationId)) continue;
      entityOrganizations.set(entity.id, entity.organizationId);
      observe(latestActivity, entity.organizationId, entity.createdAt);
    }
    for (const program of workspace.programs.values()) {
      const organizationId = entityOrganizations.get(program.entityId);
      if (!organizationId) continue;
      programOrganizations.set(program.id, organizationId);
      observe(latestActivity, organizationId, program.createdAt);
    }
    for (const openCall of workspace.openCalls.values()) {
      const organizationId = programOrganizations.get(openCall.programId);
      if (!organizationId) continue;
      openCallOrganizations.set(openCall.id, organizationId);
      increment(openCallCounts, organizationId);
      if (openCall.status === 'published') increment(publishedOpenCallCounts, organizationId);
      observe(latestActivity, organizationId, openCall.publishedAt ?? openCall.createdAt);
    }
    for (const path of workspace.submissionPaths.values()) {
      const organizationId = openCallOrganizations.get(path.openCallId);
      if (organizationId) submissionPathOrganizations.set(path.id, organizationId);
    }
    for (const submission of workspace.submissions.values()) {
      const organizationId = submissionPathOrganizations.get(submission.submissionPathId);
      if (!organizationId) continue;
      submissionOrganizations.set(submission.id, organizationId);
      increment(submissionCounts, organizationId);
      if (submission.status === 'in-review') increment(inReviewCounts, organizationId);
      observe(latestActivity, organizationId, submission.submittedAt);
    }
    for (const work of workspace.works.values()) {
      const organizationId = submissionOrganizations.get(work.submissionId);
      if (organizationId) workOrganizations.set(work.id, organizationId);
    }
    for (const decision of workspace.decisions.values()) {
      const organizationId = workOrganizations.get(decision.workId);
      if (!organizationId) continue;
      increment(decisionCounts, organizationId);
      if (decision.outcome === 'accepted') increment(acceptedWorkCounts, organizationId);
      observe(latestActivity, organizationId, decision.decidedAt);
    }
    for (const task of workspace.deliveryTasks.values()) {
      const organizationId = workOrganizations.get(task.workId);
      if (!organizationId) continue;
      if (task.status === 'pending') increment(pendingDeliveryCounts, organizationId);
      observe(latestActivity, organizationId, task.completedAt ?? (task.dueDate ? `${task.dueDate}T00:00:00.000Z` : undefined));
    }
  }

  const rows = [...radar.organizations.values()].map((organization): PlatformAdminOrganizationRow => ({
    id: organization.id,
    name: organization.name,
    domains: organization.domains,
    verified: organization.verified,
    memberCount: radarAvailable ? memberCounts.get(organization.id) ?? 0 : null,
    activeMemberCount: radarAvailable ? activeMemberCounts.get(organization.id) ?? 0 : null,
    seatLimit: radarAvailable ? organizationSeatLimit(organization) : null,
    openCallCount: workspaceAvailable ? openCallCounts.get(organization.id) ?? 0 : null,
    publishedOpenCallCount: workspaceAvailable ? publishedOpenCallCounts.get(organization.id) ?? 0 : null,
    submissionCount: workspaceAvailable ? submissionCounts.get(organization.id) ?? 0 : null,
    inReviewCount: workspaceAvailable ? inReviewCounts.get(organization.id) ?? 0 : null,
    decisionCount: workspaceAvailable ? decisionCounts.get(organization.id) ?? 0 : null,
    acceptedWorkCount: workspaceAvailable ? acceptedWorkCounts.get(organization.id) ?? 0 : null,
    pendingDeliveryCount: workspaceAvailable ? pendingDeliveryCounts.get(organization.id) ?? 0 : null,
    billingTier: organization.billingTier ?? 'unknown',
    billingStatus: organization.billingStatus ?? 'unknown',
    stripeConnectStatus: organization.stripeConnectStatus ?? 'not-connected',
    ...(latestActivity.get(organization.id) ? { latestObservedAt: latestActivity.get(organization.id) } : {}),
  })).sort((a, b) => (b.pendingDeliveryCount ?? -1) - (a.pendingDeliveryCount ?? -1) || a.name.localeCompare(b.name));

  const availability = !radarAvailable && !workspaceAvailable ? 'unavailable' : !radarAvailable || !workspaceAvailable ? 'partial' : rows.length === 0 ? 'empty' : 'available';
  return {
    availability,
    summary: {
      organizationCount: radarAvailable ? rows.length : null,
      activeOrganizationCount: radarAvailable ? rows.filter((row) => (row.activeMemberCount ?? 0) > 0).length : null,
      publishedOpenCallCount: workspaceAvailable ? rows.reduce((sum, row) => sum + (row.publishedOpenCallCount ?? 0), 0) : null,
      pendingDeliveryCount: workspaceAvailable ? rows.reduce((sum, row) => sum + (row.pendingDeliveryCount ?? 0), 0) : null,
      pastDueCount: radarAvailable ? rows.filter((row) => row.billingStatus === 'past_due').length : null,
    },
    rows,
    planned: ['Organization notes and contacts', 'Health snapshots and lifecycle segments', 'Support cases and account timelines', 'Dedupe, merge, suspend, and governed impersonation actions'],
  };
}

export interface PlatformAdminMessagingChannel {
  id: string;
  label: string;
  status: 'configured' | 'attention' | 'idle' | 'unconfigured' | 'unknown';
  pending: Count;
  completed: Count;
  lastObservedAt?: string;
  detail: string;
  source: string;
  maturity: AdminMaturity;
}

export interface PlatformAdminMessagingData {
  summary: {
    pendingAlertEmails: Count;
    pendingEmailReviews: Count;
    syncFailures: Count;
    pendingDelivery: Count;
  };
  configuration: Array<{ label: string; configured: boolean; detail: string }>;
  channels: PlatformAdminMessagingChannel[];
  history: PlatformAdminMessageHistory;
  boundaries: string[];
}

const emptyMessageHistory: PlatformAdminMessageHistory = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_message_effects + platform_message_attempts',
  warnings: [],
  summary: { effects: 0, attempts: 0, byStatus: {}, attemptsByStatus: {} },
  effects: [],
  attempts: [],
};

function buildMessagingData(stores: RuntimeStores, history: PlatformAdminMessageHistory = emptyMessageHistory): PlatformAdminMessagingData {
  const { radar, workspace } = stores;
  const alerts = [...radar.alerts.values()];
  const candidates = radar.emailCandidates;
  const forwarding = radar.forwardingAddresses;
  const gmailConnections = radar.gmailConnections;
  const syncJobs = radar.gmailSyncJobs;
  const deliveryTasks = [...workspace.deliveryTasks.values()];
  const decisionEmailSent = radar.auditLog.filter((entry) => entry.action === 'decision.email.sent');
  const pendingAlertEmails = alerts.filter((alert) => alert.audience === 'user' && !alert.emailSentAt).length;
  const sentAlertEmails = alerts.filter((alert) => alert.audience === 'user' && Boolean(alert.emailSentAt)).length;
  const pendingEmailReviews = candidates.filter((candidate) => candidate.state === 'pending' || candidate.classification === 'needs-review').length;
  const confirmedEmailReviews = candidates.filter((candidate) => candidate.state === 'confirmed').length;
  const syncFailures = syncJobs.filter((job) => job.status === 'failed').length;
  const pendingDelivery = deliveryTasks.filter((task) => task.status === 'pending').length;
  const configuration = [
    { label: 'Outbound email', configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM), detail: 'Required for alert and decision email delivery.' },
    { label: 'Inbound signature', configured: Boolean(process.env.MISSA_INBOUND_EMAIL_SECRET), detail: 'Authenticates provider callbacks before email candidates are accepted.' },
    { label: 'Forwarding secret', configured: Boolean(process.env.MISSA_FORWARDING_SECRET), detail: 'Protects forwarding-address tokens in production.' },
    { label: 'Gmail OAuth', configured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET), detail: 'Required before Gmail Sync can be authorized.' },
  ];
  const channelMaturity = stores.maturity;
  const channels: PlatformAdminMessagingChannel[] = [
    {
      id: 'alert-email', label: 'Alert email digest', status: process.env.RESEND_API_KEY && process.env.RESEND_FROM ? pendingAlertEmails > 0 ? 'attention' : 'idle' : 'unconfigured', pending: pendingAlertEmails, completed: sentAlertEmails,
      lastObservedAt: latest(alerts.map((alert) => alert.emailSentAt ?? alert.createdAt)), detail: 'User alerts awaiting or already included in an outbound digest; alert content is not shown here.', source: 'Opportunity alerts + alert delivery worker', maturity: channelMaturity,
    },
    {
      id: 'email-review', label: 'Email review queue', status: pendingEmailReviews > 0 ? 'attention' : candidates.length > 0 ? 'idle' : 'unknown', pending: pendingEmailReviews, completed: confirmedEmailReviews,
      lastObservedAt: latest(candidates.map((candidate) => candidate.receivedAt)), detail: 'Forwarded/Gmail messages awaiting a user-owned review decision; body and recipient details are intentionally omitted.', source: 'Email candidates', maturity: channelMaturity,
    },
    {
      id: 'forwarding', label: 'Forwarding addresses', status: forwarding.some((item) => item.status === 'paused') ? 'attention' : forwarding.some((item) => item.status === 'active') ? 'configured' : 'idle', pending: forwarding.filter((item) => item.status === 'paused').length, completed: forwarding.filter((item) => item.status === 'active').length,
      lastObservedAt: latest(forwarding.map((item) => item.lastReceivedAt ?? item.createdAt)), detail: 'Active and paused forwarding configuration; opaque addresses and token material are never exposed.', source: 'Forwarding addresses', maturity: channelMaturity,
    },
    {
      id: 'gmail-sync', label: 'Gmail Sync', status: syncFailures > 0 || gmailConnections.some((connection) => connection.status === 'error') ? 'attention' : gmailConnections.length > 0 ? 'configured' : 'idle', pending: syncJobs.filter((job) => job.status === 'queued' || job.status === 'running').length, completed: syncJobs.filter((job) => job.status === 'succeeded').length,
      lastObservedAt: latest([...gmailConnections.map((connection) => connection.lastSyncAt), ...syncJobs.map((job) => job.completedAt ?? job.requestedAt)]), detail: 'Connection mode, sync lifecycle, and failures are visible without tokens, provider IDs, or message content.', source: 'Gmail connections and sync jobs', maturity: channelMaturity,
    },
    {
      id: 'decision-email', label: 'Decision email', status: process.env.RESEND_API_KEY && process.env.RESEND_FROM ? 'configured' : 'unconfigured', pending: 0, completed: decisionEmailSent.length,
      lastObservedAt: latest(decisionEmailSent.map((entry) => entry.at)), detail: 'Organization-triggered decision email sends recorded in the compatibility audit; there is no durable delivery log yet.', source: 'Decision activity + Resend configuration', maturity: channelMaturity,
    },
    {
      id: 'workspace-delivery', label: 'Organization delivery', status: pendingDelivery > 0 ? 'attention' : deliveryTasks.length > 0 ? 'idle' : 'unknown', pending: pendingDelivery, completed: deliveryTasks.filter((task) => task.status === 'complete').length,
      lastObservedAt: latest(deliveryTasks.map((task) => task.completedAt ?? (task.dueDate ? `${task.dueDate}T00:00:00.000Z` : undefined))), detail: 'Accepted Work delivery tasks; completing a task remains an organization workflow action, not an automated send.', source: 'Organization delivery tasks', maturity: channelMaturity,
    },
  ];
  return {
    summary: { pendingAlertEmails: stores.radarAvailable ? pendingAlertEmails : null, pendingEmailReviews: stores.radarAvailable ? pendingEmailReviews : null, syncFailures: stores.radarAvailable ? syncFailures : null, pendingDelivery: stores.workspaceAvailable ? pendingDelivery : null },
    configuration,
    channels,
    history,
    boundaries: ['No private email body, recipient address, provider token, or attachment payload is rendered.', 'Decision and alert sends write durable effects only when the additive platform ledger is deployed; compatibility alert state remains separate.', 'A pending organization delivery task is not evidence that an email or external handoff was attempted.', 'Provider webhook reconciliation, templates, preferences, and message suppression policy remain separate governed capabilities.'],
  };
}

export interface PlatformAdminGovernanceData {
  support: {
    highAttention: number;
    verificationOpen: number;
    claimsPending: number;
    emailReviewPending: number;
    auditEntries: number;
  };
  billing: {
    byTier: Record<string, number>;
    byStatus: Record<string, number>;
    pastDue: number;
    canceled: number;
    connectPending: number;
    stripeConfigured: boolean;
  };
  policy: {
    available: boolean;
    maturity: AdminMaturity;
    scheme?: string;
    openProposals: Count;
    coverageGaps: Count;
    discoveryFailures: Count;
    candidatesAwaitingReview: Count;
  };
  agentLoop: {
    graph: PlatformAdminOverview['operations']['data']['agentGraph'];
    workerStatus: PlatformAdminOverview['operations']['data']['worker']['status'];
    lanes: PlatformAdminOverview['operations']['data']['worker']['lanes'];
    handoffs: Array<{ id: string; from: string; to: string; kind: string; status: string; createdAt?: string }>;
    durableQueues: Array<{ label: string; status: string; counts: Record<string, number>; maturity: AdminMaturity }>;
  };
  planned: string[];
}

function buildGovernanceData(overview: PlatformAdminOverview, taxonomy: TaxonomyAdminDashboard | undefined): PlatformAdminGovernanceData {
  const radar = overview.radar.data;
  const operations = overview.operations.data;
  const organizations = overview.customers.data.rows;
  const durable = operations.durable;
  const byTier = countBy(organizations, (row) => row.billingTier);
  const byStatus = countBy(organizations, (row) => row.billingStatus);
  const queues = [
    ['Agent runs', durable.agentRuns], ['Agent handoffs', durable.agentHandoffs], ['Review jobs', durable.reviewJobs], ['Review decisions', durable.reviewDecisions], ['Enrichment jobs', durable.enrichmentJobs], ['Outbox events', durable.outbox],
  ] as const;
  return {
    support: {
      highAttention: operations.queue.summary.attention,
      verificationOpen: radar.queues.verification,
      claimsPending: radar.queues.claims,
      emailReviewPending: operations.compatibilityQueues.emailReview,
      auditEntries: overview.audit.data.count,
    },
    billing: {
      byTier,
      byStatus,
      pastDue: organizations.filter((row) => row.billingStatus === 'past_due').length,
      canceled: organizations.filter((row) => row.billingStatus === 'canceled').length,
      connectPending: organizations.filter((row) => row.stripeConnectStatus === 'pending').length,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    },
    policy: {
      available: taxonomy?.available === true,
      maturity: taxonomy?.available ? 'target-schema' : 'unavailable',
      ...(taxonomy?.scheme?.key ? { scheme: `${taxonomy.scheme.key} v${taxonomy.scheme.version}` } : {}),
      openProposals: taxonomy ? taxonomy.proposals.open + taxonomy.proposals.researching : null,
      coverageGaps: taxonomy ? taxonomy.coverage.gap + taxonomy.coverage.thin : null,
      discoveryFailures: taxonomy ? taxonomy.discovery.failed + taxonomy.discovery.blocked : null,
      candidatesAwaitingReview: taxonomy?.discovery.candidatesAwaitingReview ?? null,
    },
    agentLoop: {
      graph: operations.agentGraph,
      workerStatus: operations.worker.status,
      lanes: operations.worker.lanes,
      handoffs: durable.agentHandoffRows.slice(0, 20).map((row) => ({ id: row.id, from: row.fromAgent, to: row.toAgent, kind: row.kind, status: row.status, ...(row.createdAt ? { createdAt: row.createdAt } : {}) })),
      durableQueues: queues.map(([label, metric]) => ({ label, status: metric.maturity === 'durable' ? 'deployed' : metric.maturity, counts: metric.counts, maturity: metric.maturity === 'durable' ? 'durable' : metric.maturity === 'partial' ? 'partial' : 'unavailable' })),
    },
    planned: ['Support cases, notes, and customer-facing issue timelines', 'Governed billing overrides, refunds, and entitlement changes', 'Taxonomy proposal review and publish controls on the canonical policy surface', 'Agent-loop replay, pause, and policy controls with explicit operator approvals'],
  };
}

export async function getPlatformAdminOrganizations(): Promise<AdminArea<PlatformAdminOrganizationsData>> {
  const generatedAt = new Date().toISOString();
  const stores = await readRuntimeStores();
  return area(buildOrganizationData(stores), 'Organization records, memberships, and workflow aggregates', stores.maturity, generatedAt, stores.warnings);
}

export async function getPlatformAdminMessaging(): Promise<AdminArea<PlatformAdminMessagingData>> {
  const generatedAt = new Date().toISOString();
  const [stores, history] = await Promise.all([
    readRuntimeStores(),
    process.env.DATABASE_URL ? readPlatformAdminMessageHistory(process.env.DATABASE_URL) : Promise.resolve(emptyMessageHistory),
  ]);
  const historyWarnings = history.warnings;
  return area(buildMessagingData(stores, history), 'Compatibility notification state plus durable provider effect and attempt history', stores.maturity, generatedAt, [...stores.warnings, ...historyWarnings]);
}

export async function getPlatformAdminGovernance(): Promise<AdminArea<PlatformAdminGovernanceData>> {
  const generatedAt = new Date().toISOString();
  const [overview, taxonomy] = await Promise.all([
    getPlatformAdminOverview(),
    process.env.DATABASE_URL ? readTaxonomyAdminDashboard(process.env.DATABASE_URL).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const warnings = [...overview.warnings];
  if (!taxonomy?.available) warnings.push('Canonical taxonomy governance is not live in this environment; compatibility policy signals remain visible without publish controls.');
  return area(buildGovernanceData(overview, taxonomy), 'Platform audit/read model, organization billing fields, optional taxonomy dashboard, and durable agent-loop telemetry', taxonomy?.available ? 'derived' : 'partial', generatedAt, warnings);
}

export { buildGovernanceData, buildMessagingData, buildOrganizationData };
