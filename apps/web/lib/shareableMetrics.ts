import { readGrowthMetrics, readMonthlyMetrics, readSiteTraffic, type MonthlyMetricsRow } from '@missa/radar-adapters';
import { getPlatformAdminOverview } from './platformAdmin';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';
import { getRevenue } from './platformAdminRevenue';

/**
 * Headline numbers safe to share outside the company (investors, social posts).
 * Each has a plain label, a formatted value, and a 30-day change where one exists.
 */

export const SHAREABLE_METRIC_KEYS = [
  'total-users',
  'new-users-30d',
  'monthly-active-users',
  'monthly-visitors',
  'countries',
  'waitlist',
  'opportunities',
  'organizations',
  'mrr',
  'paying-customers',
] as const;
export type ShareableMetricKey = (typeof SHAREABLE_METRIC_KEYS)[number];

export interface ShareableMetric {
  key: ShareableMetricKey;
  label: string;
  value: number | null;
  formatted: string;
  /** Fractional change against the previous 30 days, when there is a baseline. */
  change: number | null;
  caption: string;
  sensitive: boolean;
}

export function isShareableMetricKey(value: string): value is ShareableMetricKey {
  return (SHAREABLE_METRIC_KEYS as readonly string[]).includes(value);
}

function count(value: number | null): string {
  if (value === null) return '—';
  return value >= 10_000 ? new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : value.toLocaleString('en-GB');
}

function changeOf(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

export function formatChange(change: number | null): string | null {
  if (change === null) return null;
  return `${change >= 0 ? '+' : ''}${Math.round(change * 100)}%`;
}

let cache: { at: number; value: { metrics: ShareableMetric[]; monthly: MonthlyMetricsRow[]; mrrByMonth: Map<string, number> } } | undefined;

/** Computes every shareable metric once; cached for a minute so public pages and images stay cheap. */
export async function getShareableMetrics(): Promise<{ metrics: ShareableMetric[]; monthly: MonthlyMetricsRow[]; mrrByMonth: Map<string, number> }> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const connectionString = platformAnalyticsDatabaseUrl();
  const [traffic, growth, monthly, overview, revenue] = await Promise.all([
    connectionString ? readSiteTraffic(connectionString, { days: 30 }).catch(() => undefined) : Promise.resolve(undefined),
    connectionString ? readGrowthMetrics(connectionString, { days: 30 }).catch(() => undefined) : Promise.resolve(undefined),
    connectionString ? readMonthlyMetrics(connectionString, { months: 12 }).catch(() => undefined) : Promise.resolve(undefined),
    getPlatformAdminOverview({ readDatabaseUrl: connectionString }).catch(() => undefined),
    getRevenue(30),
  ]);
  const allMonths = monthly?.rows ?? [];
  const firstActive = allMonths.findIndex((row) => row.totalUsers > 0 || (row.visitors ?? 0) > 0 || (row.waitlistJoins ?? 0) > 0);
  // Drop the empty months before launch so charts and the investor table start where the story starts.
  const monthlyRows = firstActive > 0 ? allMonths.slice(firstActive) : allMonths;
  const lastTwo = monthlyRows.slice(-2);
  const mau = growth?.available ? growth.active.mau : null;
  const previousMau = lastTwo.length === 2 ? lastTwo[0]!.monthlyActiveUsers : null;
  const previousMrr = revenue.mrrHistory.at(-2)?.mrr ?? 0;
  const metrics: ShareableMetric[] = [
    { key: 'total-users', label: 'Total users', value: growth?.available ? growth.totals.accounts : null, change: growth?.available ? changeOf(growth.totals.accounts, growth.totals.accounts - growth.totals.signupsCurrent) : null, caption: 'Creators with a Missa account', sensitive: false },
    { key: 'new-users-30d', label: 'New users this month', value: growth?.available ? growth.totals.signupsCurrent : null, change: growth?.available ? changeOf(growth.totals.signupsCurrent, growth.totals.signupsPrevious) : null, caption: 'Sign-ups in the last 30 days', sensitive: false },
    { key: 'monthly-active-users', label: 'Monthly active users', value: mau, change: mau !== null && previousMau ? changeOf(mau, previousMau) : null, caption: 'Signed-in users active in the last 30 days', sensitive: false },
    { key: 'monthly-visitors', label: 'Monthly visitors', value: traffic?.available ? traffic.current.visitors : null, change: traffic?.available ? changeOf(traffic.current.visitors, traffic.previous.visitors) : null, caption: 'Visits to Missa in the last 30 days', sensitive: false },
    { key: 'countries', label: 'Countries reached', value: traffic?.available ? traffic.countriesReached : null, change: null, caption: 'Countries visitors came from in the last 30 days', sensitive: false },
    { key: 'waitlist', label: 'Waitlist', value: growth?.totals.waitlist ?? null, change: null, caption: 'People waiting to join', sensitive: false },
    { key: 'opportunities', label: 'Opportunities listed', value: overview ? overview.radar.data.stats.opportunitiesDiscovered : null, change: null, caption: 'Calls, prizes, residencies, and grants tracked', sensitive: false },
    { key: 'organizations', label: 'Organizations', value: overview?.customers.data.organizationCount ?? overview?.workspace.data.organizations ?? null, change: null, caption: 'Publishers and programmes on Missa', sensitive: false },
    { key: 'mrr', label: 'Monthly recurring revenue', value: revenue.available ? revenue.mrr : null, change: revenue.available ? changeOf(revenue.mrr, previousMrr) : null, caption: 'Subscription revenue per month', sensitive: true },
    { key: 'paying-customers', label: 'Paying customers', value: revenue.available ? revenue.payingCustomers : null, change: null, caption: 'Active paid subscriptions', sensitive: true },
  ].map((metric) => ({
    ...metric,
    key: metric.key as ShareableMetricKey,
    formatted: metric.key === 'mrr' && metric.value !== null ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: revenue.currency, maximumFractionDigits: 0 }).format(metric.value) : count(metric.value),
  }));
  const value = { metrics, monthly: monthlyRows, mrrByMonth: new Map(revenue.mrrHistory.map((row) => [row.month, row.mrr])) };
  cache = { at: Date.now(), value };
  return value;
}

/** Investor-friendly monthly table as CSV. */
export function monthlyMetricsCsv(rows: MonthlyMetricsRow[], mrrByMonth: Map<string, number>): string {
  const header = ['Month', 'New sign-ups', 'Total users', 'Monthly active users', 'Visitors', 'Waitlist joins', 'Opportunities added', 'MRR'];
  const cell = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
  const lines = rows.map((row) => [row.month, cell(row.signups), cell(row.totalUsers), cell(row.monthlyActiveUsers), cell(row.visitors), cell(row.waitlistJoins), cell(row.opportunitiesAdded), cell(mrrByMonth.get(row.month))].join(','));
  return `${[header.join(','), ...lines].join('\n')}\n`;
}
