import {
  readPlatformAdminAnalyticsEvents,
  readWaitlistSignups,
  type PlatformAdminAnalyticsEventsData,
  type WaitlistSignupReadModel,
} from '@missa/radar-adapters';
import { ANALYTICS_EVENT_NAMES, SERVER_ANALYTICS_EVENT_NAMES } from './analytics-contract';
import { getPlatformAdminOverview, type PlatformAdminOverview, type PlatformAdminQueueRow } from './platformAdmin';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';

/**
 * The admin dashboard is a plain-language summary over the existing read models.
 * Every number keeps a `null` when its store could not be read, so the UI can say
 * "Not connected" instead of showing a misleading zero.
 */

export type DashboardHealth = 'ok' | 'warn' | 'down' | 'unknown';

export interface DashboardHealthCheck {
  key: string;
  label: string;
  status: DashboardHealth;
  detail: string;
  href: string;
}

export interface DashboardKpi {
  key: string;
  label: string;
  value: number | null;
  detail: string;
  href: string;
  /** Daily series for a small trend line; empty when no history exists. */
  series: number[];
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  reason: string;
  area: string;
  age: string;
  urgent: boolean;
  href: string;
}

export interface DashboardFailedJob {
  queue: 'review' | 'enrichment' | 'outbox';
  id: string;
}

export interface DashboardActivityItem {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export interface PlatformAdminDashboardData {
  generatedAt: string;
  health: DashboardHealthCheck[];
  overall: DashboardHealth;
  kpis: DashboardKpi[];
  activity: { available: boolean; daily: Array<{ day: string; events: number; signups: number }> };
  topEvents: Array<{ name: string; count: number }>;
  attention: DashboardAttentionItem[];
  attentionTotal: number;
  controls: {
    databaseConnected: boolean;
    failedJobs: DashboardFailedJob[];
    stuckJobs: number;
  };
  recent: DashboardActivityItem[];
}

const emptyEvents: PlatformAdminAnalyticsEventsData = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'platform_analytics_events',
  warnings: [],
  windowDays: 30,
  summary: { events: 0, last24h: 0, last7d: 0, uniqueAccounts: 0, uniqueOrganizations: 0 },
  byEvent: [],
  daily: [],
  recent: [],
  journeyFunnel: [],
  segments: [],
  retention: [],
  dimensions: [],
  users: [],
  quality: { missingActor: 0, anonymousEvents: 0, unregisteredEvents: 0, authorityMismatches: 0 },
};

const emptySignups: WaitlistSignupReadModel = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  source: 'waitlist_signups',
  warnings: [],
  rows: [],
  total: 0,
};

const QUEUE_AREA: Record<PlatformAdminQueueRow['queue'], string> = {
  'source-health': 'Opportunity sources',
  verification: 'Verification',
  claims: 'Organization claims',
  review: 'Review jobs',
  enrichment: 'Enrichment jobs',
  agents: 'Agents',
  outbox: 'Outgoing events',
  workspace: 'Organizations',
};

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

function lastDays(count: number, now: Date): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function humanEventName(name: string): string {
  const spaced = name.replace(/[._-]+/g, ' ').trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : name;
}

function humanAction(action: string): string {
  return humanEventName(action.replace(/^platform_admin\./, ''));
}

export function buildPlatformAdminDashboard(
  overview: PlatformAdminOverview,
  events: PlatformAdminAnalyticsEventsData = emptyEvents,
  signups: WaitlistSignupReadModel = emptySignups,
  now = new Date(),
): PlatformAdminDashboardData {
  const operations = overview.operations.data;
  const radar = overview.radar.data;
  const workspace = overview.workspace.data;
  const system = overview.system.data;
  const sources = radar.sourceHealth.summary;
  const durable = operations.durable;

  const workerStatus: DashboardHealth = operations.worker.status === 'running' || operations.worker.status === 'healthy'
    ? 'ok'
    : operations.worker.status === 'failed'
      ? 'down'
      : operations.worker.status === 'stale'
        ? 'warn'
        : 'unknown';
  const sourceFailures = radar.sourceHealth.rows.filter((row) => row.active && row.consecutiveFailures + row.consecutiveProcessingFailures > 0).length;
  const sourceStatus: DashboardHealth = sources.active === 0
    ? 'unknown'
    : sourceFailures >= Math.max(1, sources.active / 2)
      ? 'down'
      : sources.stale > 0 || sourceFailures > 0
        ? 'warn'
        : 'ok';

  const failedJobs: DashboardFailedJob[] = [
    ...durable.reviewJobRows.filter((row) => row.status === 'failed' || row.status === 'blocked').map((row) => ({ queue: 'review' as const, id: row.id })),
    ...durable.enrichmentJobRows.filter((row) => row.status === 'failed' || row.status === 'blocked').map((row) => ({ queue: 'enrichment' as const, id: row.id })),
    ...durable.outboxRows.filter((row) => row.status === 'failed').map((row) => ({ queue: 'outbox' as const, id: row.id })),
  ];
  const stuckJobs = (durable.reviewJobs.counts.processing ?? 0) + (durable.enrichmentJobs.counts.processing ?? 0) + (durable.outbox.counts.processing ?? 0);
  const jobStatus: DashboardHealth = !durable.available ? 'unknown' : failedJobs.length > 0 ? 'warn' : 'ok';

  const health: DashboardHealthCheck[] = [
    {
      key: 'database',
      label: 'Database',
      status: system.databaseConfigured ? 'ok' : 'down',
      detail: system.databaseConfigured ? 'Connected' : 'Not configured: data is in demo memory and resets on restart',
      href: '/admin/system',
    },
    {
      key: 'worker',
      label: 'Background worker',
      status: workerStatus,
      detail: workerStatus === 'ok'
        ? `Running${operations.worker.latestAt ? ` · last seen ${operations.worker.latestAt}` : ''}`
        : workerStatus === 'unknown'
          ? 'No heartbeat seen yet'
          : workerStatus === 'warn'
            ? 'Heartbeat is late'
            : `${operations.worker.failed} lane${operations.worker.failed === 1 ? '' : 's'} failed`,
      href: '/admin/agents',
    },
    {
      key: 'sources',
      label: 'Opportunity sources',
      status: sourceStatus,
      detail: sources.active === 0
        ? 'No sources configured'
        : `${sources.processed} of ${sources.active} up to date · ${sources.stale} stale · ${sourceFailures} failing`,
      href: '/admin/radar',
    },
    {
      key: 'jobs',
      label: 'Job queues',
      status: jobStatus,
      detail: !durable.available
        ? 'Queue tables not available'
        : failedJobs.length
          ? `${failedJobs.length} failed job${failedJobs.length === 1 ? '' : 's'} waiting for a retry`
          : 'No failed jobs',
      href: '/admin/operations',
    },
  ];
  const rank: Record<DashboardHealth, number> = { down: 3, warn: 2, unknown: 1, ok: 0 };
  const overall = health.reduce<DashboardHealth>((worst, check) => (rank[check.status] > rank[worst] ? check.status : worst), 'ok');

  const days = lastDays(30, now);
  const eventsByDay = new Map(events.daily.map((row) => [row.day.slice(0, 10), row.count]));
  const signupsByDay = new Map<string, number>();
  for (const row of signups.rows) {
    const day = row.createdAt?.slice(0, 10);
    if (day) signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + 1);
  }
  const daily = days.map((day) => ({ day, events: eventsByDay.get(day) ?? 0, signups: signupsByDay.get(day) ?? 0 }));
  const weekAgo = days[days.length - 7];
  const signupsThisWeek = daily.filter((row) => row.day >= weekAgo).reduce((total, row) => total + row.signups, 0);

  const customerCount = overview.customers.data.organizationCount;
  const kpis: DashboardKpi[] = [
    {
      key: 'active-users',
      label: 'Active users (7 days)',
      value: events.available ? events.users.filter((user) => user.lastSeenAt && user.lastSeenAt.slice(0, 10) >= weekAgo).length : null,
      detail: `${workspace.accounts.total} accounts in total`,
      href: '/admin/analytics',
      series: events.available ? daily.map((row) => row.events) : [],
    },
    {
      key: 'organizations',
      label: 'Organizations',
      value: customerCount ?? workspace.organizations,
      detail: `${workspace.members} member${workspace.members === 1 ? '' : 's'}`,
      href: '/admin/customers',
      series: [],
    },
    {
      key: 'opportunities',
      label: 'Open opportunities',
      value: radar.stats.opportunitiesOpen,
      detail: `${radar.stats.opportunitiesDiscovered} discovered · ${radar.stats.staleListings} stale`,
      href: '/admin/content',
      series: [],
    },
    {
      key: 'submissions',
      label: 'Submissions',
      value: sum(workspace.submissions),
      detail: `${workspace.submissions['in-review'] ?? 0} in review · ${workspace.decisions.accepted ?? 0} accepted`,
      href: '/admin/analytics',
      series: [],
    },
    {
      key: 'waitlist',
      label: 'Waitlist signups',
      value: signups.available ? signups.total : null,
      detail: signups.available ? `${signupsThisWeek} this week` : 'Waitlist database not connected',
      href: '/admin/waitlist',
      series: signups.available ? daily.map((row) => row.signups) : [],
    },
  ];

  const severity = { high: 0, medium: 1, low: 2 } as const;
  const attentionRows = operations.queue.rows
    .filter((row) => row.severity !== 'low')
    .sort((a, b) => severity[a.severity] - severity[b.severity] || (a.ageAt ?? '').localeCompare(b.ageAt ?? ''));
  const attention = attentionRows.slice(0, 6).map((row) => ({
    id: row.id,
    title: row.title,
    reason: row.reason,
    area: QUEUE_AREA[row.queue] ?? row.lane,
    age: row.age,
    urgent: row.severity === 'high',
    href: `/admin/operations?item=${encodeURIComponent(row.id)}`,
  }));

  const recent = overview.audit.data.recent.slice(0, 8).map((entry) => ({
    id: `${entry.domain}:${entry.id}`,
    at: entry.at,
    actor: entry.actorAccountId ?? 'System',
    action: humanAction(entry.action),
    target: `${entry.targetType} ${entry.targetId}`,
  }));

  return {
    generatedAt: overview.generatedAt,
    health,
    overall,
    kpis,
    activity: { available: events.available || signups.available, daily },
    topEvents: events.byEvent.slice(0, 5).map((row) => ({ name: humanEventName(row.eventName), count: row.count })),
    attention,
    attentionTotal: attentionRows.length,
    controls: { databaseConnected: system.databaseConfigured, failedJobs, stuckJobs },
    recent,
  };
}

export async function getPlatformAdminDashboard(): Promise<PlatformAdminDashboardData> {
  const analyticsDatabaseUrl = platformAnalyticsDatabaseUrl();
  const [overview, events, signups] = await Promise.all([
    getPlatformAdminOverview({ readDatabaseUrl: analyticsDatabaseUrl }),
    analyticsDatabaseUrl
      ? readPlatformAdminAnalyticsEvents(analyticsDatabaseUrl, { days: 30, knownEventNames: ANALYTICS_EVENT_NAMES, serverEventNames: SERVER_ANALYTICS_EVENT_NAMES }).catch(() => emptyEvents)
      : Promise.resolve(emptyEvents),
    analyticsDatabaseUrl ? readWaitlistSignups(analyticsDatabaseUrl, { limit: 2_000 }).catch(() => emptySignups) : Promise.resolve(emptySignups),
  ]);
  return buildPlatformAdminDashboard(overview, events, signups);
}
