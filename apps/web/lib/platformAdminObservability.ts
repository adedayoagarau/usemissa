import {
  creatorPoolFor,
  listChartNotes,
  readGrowthMetrics,
  readMonthlyMetrics,
  readPlatformAdminAnalyticsEvents,
  readSiteFunnels,
  readSiteHealth,
  readSiteTraffic,
  readSmsHealth,
  type ChartNote,
  type FunnelDefinition,
  type FunnelResult,
  type GrowthData,
  type MonthlyMetricsRow,
  type SiteHealthData,
  type SiteTrafficData,
  type SmsHealthData,
} from '@missa/radar-adapters';
import { ANALYTICS_EVENT_NAMES, SERVER_ANALYTICS_EVENT_NAMES } from './analytics-contract';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';
import { smsConfig } from './sms';

export const PERIOD_OPTIONS = [7, 30, 90, 365] as const;
export type PeriodDays = (typeof PERIOD_OPTIONS)[number];

export function parsePeriod(value: string | undefined, fallback: PeriodDays = 30): PeriodDays {
  const parsed = Number(value);
  return (PERIOD_OPTIONS as readonly number[]).includes(parsed) ? (parsed as PeriodDays) : fallback;
}

export const NOT_CONNECTED = 'Connect a database (DATABASE_URL or MISSA_ANALYTICS_DATABASE_URL) to start collecting this data.';

export interface Loaded<T> {
  available: boolean;
  reason?: string;
  data: T;
}

async function load<T>(empty: T, read: (connectionString: string) => Promise<T & { available?: boolean }>): Promise<Loaded<T>> {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return { available: false, reason: NOT_CONNECTED, data: empty };
  try {
    const data = await read(connectionString);
    return data.available === false ? { available: false, reason: 'The analytics tables are not deployed yet. Run the database migrations.', data } : { available: true, data };
  } catch (error) {
    console.error('Admin observability read failed', error instanceof Error ? error.message : error);
    return { available: false, reason: 'The analytics database could not be read right now.', data: empty };
  }
}

function startDay(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function notesSince(days: number): Promise<ChartNote[]> {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return [];
  return listChartNotes(connectionString, { from: startDay(days) }).catch(() => []);
}

const emptyTraffic: SiteTrafficData = { available: false, generatedAt: new Date(0).toISOString(), days: 30, current: { visitors: 0, visits: 0, pageviews: 0, bounceRate: null, avgVisitSeconds: null, pagesPerVisit: null }, previous: { visitors: 0, visits: 0, pageviews: 0, bounceRate: null, avgVisitSeconds: null, pagesPerVisit: null }, live: 0, countriesReached: 0, daily: [], hourly: [], topPages: [], entryPages: [], exitPages: [], referrers: [], sources: [], campaigns: [], countries: [], devices: [], browsers: [], operatingSystems: [], goals: [] };

export async function getTrafficPage(days: PeriodDays) {
  const [traffic, notes] = await Promise.all([load(emptyTraffic, (url) => readSiteTraffic(url, { days })), notesSince(days)]);
  return { traffic, notes };
}

const emptyGrowth: GrowthData = { available: false, generatedAt: new Date(0).toISOString(), days: 30, totals: { accounts: 0, signupsCurrent: 0, signupsPrevious: 0, waitlist: null }, signupsDaily: [], signupMethods: [], signupSources: [], activation: { cohort: 0, activated: 0, rate: null, definition: '' }, active: { dau: 0, wau: 0, mau: 0, stickiness: null }, activeDaily: [], retention: [], recentSignups: [] };

export async function getGrowthPage(days: PeriodDays) {
  const [growth, notes] = await Promise.all([load(emptyGrowth, (url) => readGrowthMetrics(url, { days })), notesSince(days)]);
  return { growth, notes };
}

export const SITE_FUNNELS: FunnelDefinition[] = [
  {
    key: 'signup',
    label: 'Visit to sign-up',
    description: 'Everyone who visited, how many opened the sign-up page, and how many created an account.',
    steps: [
      { label: 'Visited the site', match: { type: 'any-pageview' } },
      { label: 'Opened sign-up', match: { type: 'page', path: '/signup', prefix: true } },
      { label: 'Created an account', match: { type: 'goal', name: 'signup' } },
    ],
  },
  {
    key: 'discovery',
    label: 'Opportunity to sign-up',
    description: 'Visitors who viewed an opportunity and then went on to sign up.',
    steps: [
      { label: 'Visited the site', match: { type: 'any-pageview' } },
      { label: 'Viewed an opportunity', match: { type: 'page', path: '/opportunities/', prefix: true } },
      { label: 'Opened sign-up', match: { type: 'page', path: '/signup', prefix: true } },
      { label: 'Created an account', match: { type: 'goal', name: 'signup' } },
    ],
  },
  {
    key: 'waitlist',
    label: 'Waitlist',
    description: 'Visitors who opened the waitlist page and joined it.',
    steps: [
      { label: 'Visited the site', match: { type: 'any-pageview' } },
      { label: 'Opened the waitlist page', match: { type: 'page', path: '/waitlist', prefix: true } },
      { label: 'Joined the waitlist', match: { type: 'goal', name: 'waitlist_join' } },
    ],
  },
  {
    key: 'upgrade',
    label: 'Upgrade to Plus',
    description: 'Visitors who looked at the plan page and started a Plus checkout.',
    steps: [
      { label: 'Opened the plan page', match: { type: 'page', path: '/plan', prefix: true } },
      { label: 'Started checkout', match: { type: 'goal', name: 'checkout_started' } },
    ],
  },
];

export interface ProductJourneyStep {
  key: string;
  label: string;
  actors: number;
  conversionFromPrevious: number | null;
}

export async function getFunnelsPage(days: PeriodDays) {
  const [site, journey] = await Promise.all([
    load<{ available: boolean; funnels: FunnelResult[] }>({ available: false, funnels: [] }, (url) => readSiteFunnels(url, SITE_FUNNELS, { days })),
    load<{ available: boolean; steps: ProductJourneyStep[] }>({ available: false, steps: [] }, async (url) => {
      const events = await readPlatformAdminAnalyticsEvents(url, { days: Math.min(days, 90), knownEventNames: ANALYTICS_EVENT_NAMES, serverEventNames: SERVER_ANALYTICS_EVENT_NAMES });
      return { available: events.available, steps: events.journeyFunnel };
    }),
  ]);
  return { site, journey };
}

const emptyHealth: SiteHealthData = { available: false, generatedAt: new Date(0).toISOString(), uptime: [], incidents: [], vitals: [], slowPages: [], errors: { total: 0, affectedVisitors: 0, errorRate: null, daily: [], top: [] }, email: { available: false, sent: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, opened: 0, clicked: 0, daily: [], byKind: [] } };

export async function getHealthPage(days: PeriodDays) {
  return load(emptyHealth, (url) => readSiteHealth(url, { days: Math.min(days, 90) }));
}

const emptySms: SmsHealthData = { available: false, days: 30, pause: { paused: false }, sent: 0, delivered: 0, failed: 0, skipped: 0, costs: [], optedIn: 0, optedOut: 0, recentProblems: [] };

/**
 * Text message delivery for the Health page. The SMS ledger lives in the
 * application database, so this reads DATABASE_URL rather than the analytics
 * binding. configured says whether Telnyx credentials are set.
 */
export async function getSmsHealth(days = 30): Promise<Loaded<SmsHealthData> & { configured: boolean }> {
  const configured = smsConfig() !== null;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured, available: false, reason: 'Text messages need the application database (DATABASE_URL).', data: emptySms };
  try {
    const data = await readSmsHealth(creatorPoolFor(connectionString), { days });
    return data.available
      ? { configured, available: true, data }
      : { configured, available: false, reason: 'The text message tables are not deployed yet. Run migration 0085.', data };
  } catch (error) {
    console.error('Admin SMS read failed', error instanceof Error ? error.message : error);
    return { configured, available: false, reason: 'Text message records could not be read right now.', data: emptySms };
  }
}

export async function getMonthlyMetrics(months = 12): Promise<Loaded<{ available: boolean; rows: MonthlyMetricsRow[] }>> {
  return load<{ available: boolean; rows: MonthlyMetricsRow[] }>({ available: false, rows: [] }, (url) => readMonthlyMetrics(url, { months }));
}

/** Percentage change from previous to current, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
