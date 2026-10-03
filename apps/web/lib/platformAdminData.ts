import { readPlatformAdminAnalyticsEvents, readWaitlistSignups } from '@missa/radar-adapters';
import { ANALYTICS_EVENT_NAMES, SERVER_ANALYTICS_EVENT_NAMES } from './analytics-contract';
import { getPlatformAdminOverview, type PlatformAdminOverview } from './platformAdmin';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';
import { getPlatformAdminContent, type PlatformAdminContentData } from './platformAdminViews';

/** One browsable, exportable table on the admin Data page. Cells are plain values so the client can sort, search, and export them. */
export type DataCell = string | number | null;

export interface DataColumn {
  key: string;
  label: string;
  kind?: 'text' | 'number' | 'date' | 'mono';
}

export interface DataSet {
  key: string;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  columns: DataColumn[];
  rows: Array<Record<string, DataCell>>;
}

export interface PlatformAdminDataPage {
  generatedAt: string;
  datasets: DataSet[];
}

type Users = Awaited<ReturnType<typeof readPlatformAdminAnalyticsEvents>>['users'];
type Signups = Awaited<ReturnType<typeof readWaitlistSignups>>;

export function buildPlatformAdminDataPage(input: {
  overview: PlatformAdminOverview;
  content?: PlatformAdminContentData;
  users?: Users;
  signups?: Signups;
}): PlatformAdminDataPage {
  const { overview, content, users, signups } = input;
  const noAnalyticsDb = 'Set MISSA_ANALYTICS_DATABASE_URL to load this table.';

  const datasets: DataSet[] = [
    {
      key: 'opportunities',
      label: 'Opportunities',
      description: 'Every discovered opportunity and organization open call.',
      available: Boolean(content),
      unavailableReason: 'Opportunity records could not be read.',
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'organization', label: 'Organization' },
        { key: 'source', label: 'Source', kind: 'mono' },
        { key: 'updated', label: 'Last updated', kind: 'date' },
      ],
      rows: (content?.rows ?? []).map((row) => ({
        title: row.title,
        type: row.type,
        status: row.status,
        organization: row.organization ?? null,
        source: row.source,
        updated: row.lastObservedAt ?? null,
      })),
    },
    {
      key: 'sources',
      label: 'Sources',
      description: 'Websites Missa checks for opportunities, and how each one is doing.',
      available: true,
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'url', label: 'URL', kind: 'mono' },
        { key: 'state', label: 'State' },
        { key: 'lastChecked', label: 'Last checked', kind: 'date' },
        { key: 'lastSuccess', label: 'Last success', kind: 'date' },
        { key: 'failures', label: 'Failures in a row', kind: 'number' },
      ],
      rows: overview.radar.data.sourceHealth.rows.map((row) => ({
        name: row.name,
        url: row.url,
        state: !row.active ? 'Paused' : row.consecutiveFailures + row.consecutiveProcessingFailures > 0 ? 'Failing' : row.stale ? 'Stale' : 'OK',
        lastChecked: row.lastCheckedAt ?? null,
        lastSuccess: row.lastSuccessfulFetchAt ?? null,
        failures: row.consecutiveFailures + row.consecutiveProcessingFailures,
      })),
    },
    {
      key: 'organizations',
      label: 'Organizations',
      description: 'Customer organizations with their plan and activity.',
      available: overview.customers.data.availability !== 'unavailable',
      unavailableReason: 'Organization records could not be read.',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'verified', label: 'Verified' },
        { key: 'plan', label: 'Plan' },
        { key: 'billing', label: 'Billing status' },
        { key: 'members', label: 'Members', kind: 'number' },
        { key: 'openCalls', label: 'Open calls', kind: 'number' },
        { key: 'submissions', label: 'Submissions', kind: 'number' },
        { key: 'activity', label: 'Activity' },
        { key: 'lastActive', label: 'Last active', kind: 'date' },
      ],
      rows: overview.customers.data.rows.map((row) => ({
        name: row.organizationName,
        verified: row.verified ? 'Yes' : 'No',
        plan: row.billingTier,
        billing: row.billingStatus,
        members: row.memberCount,
        openCalls: row.openCallCount,
        submissions: row.submissionCount,
        activity: row.activityState,
        lastActive: row.latestObservedActivity?.at ?? null,
      })),
    },
    {
      key: 'users',
      label: 'Users',
      description: 'Signed-in people seen in the last 90 days, most recent first.',
      available: Boolean(users),
      unavailableReason: noAnalyticsDb,
      columns: [
        { key: 'email', label: 'Email' },
        { key: 'segment', label: 'Segment' },
        { key: 'stage', label: 'Journey stage' },
        { key: 'events', label: 'Events', kind: 'number' },
        { key: 'activeDays', label: 'Active days', kind: 'number' },
        { key: 'firstSeen', label: 'First seen', kind: 'date' },
        { key: 'lastSeen', label: 'Last seen', kind: 'date' },
      ],
      rows: (users ?? []).map((user) => ({
        email: user.email ?? user.accountId,
        segment: user.segment,
        stage: user.journeyStage,
        events: user.events,
        activeDays: user.activeDays,
        firstSeen: user.firstSeenAt ?? null,
        lastSeen: user.lastSeenAt ?? null,
      })),
    },
    {
      key: 'waitlist',
      label: 'Waitlist',
      description: 'People who joined the waitlist, newest first.',
      available: Boolean(signups?.available),
      unavailableReason: signups ? signups.warnings[0] ?? noAnalyticsDb : noAnalyticsDb,
      columns: [
        { key: 'email', label: 'Email' },
        { key: 'source', label: 'Source' },
        { key: 'campaign', label: 'Campaign' },
        { key: 'joined', label: 'Joined', kind: 'date' },
      ],
      rows: (signups?.rows ?? []).map((row) => ({
        email: row.email,
        source: row.source,
        campaign: Object.entries(row.campaign).map(([key, value]) => `${key}=${value}`).join(' ') || null,
        joined: row.createdAt ?? null,
      })),
    },
    {
      key: 'audit',
      label: 'Audit log',
      description: 'Who changed what, most recent first.',
      available: true,
      columns: [
        { key: 'at', label: 'Time', kind: 'date' },
        { key: 'actor', label: 'Actor', kind: 'mono' },
        { key: 'action', label: 'Action' },
        { key: 'target', label: 'Target', kind: 'mono' },
        { key: 'area', label: 'Area' },
      ],
      rows: overview.audit.data.recent.map((entry) => ({
        at: entry.at,
        actor: entry.actorAccountId ?? 'system',
        action: entry.action,
        target: `${entry.targetType}:${entry.targetId}`,
        area: entry.domain,
      })),
    },
  ];

  return { generatedAt: overview.generatedAt, datasets };
}

export async function getPlatformAdminDataPage(): Promise<PlatformAdminDataPage> {
  const analyticsDatabaseUrl = platformAnalyticsDatabaseUrl();
  const [overview, content, events, signups] = await Promise.all([
    getPlatformAdminOverview({ readDatabaseUrl: analyticsDatabaseUrl }),
    getPlatformAdminContent().then((area) => area.data).catch(() => undefined),
    analyticsDatabaseUrl
      ? readPlatformAdminAnalyticsEvents(analyticsDatabaseUrl, { days: 90, knownEventNames: ANALYTICS_EVENT_NAMES, serverEventNames: SERVER_ANALYTICS_EVENT_NAMES }).catch(() => undefined)
      : Promise.resolve(undefined),
    analyticsDatabaseUrl ? readWaitlistSignups(analyticsDatabaseUrl, { limit: 2_000 }).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  return buildPlatformAdminDataPage({ overview, content, users: events?.available ? events.users : undefined, signups });
}
