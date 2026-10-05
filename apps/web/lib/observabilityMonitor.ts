import {
  listPlatformAdminEmails,
  purgeSiteObservability,
  readAlertSignals,
  readGrowthMetrics,
  readSiteHealth,
  readSiteTraffic,
  readUptimeFailureStreak,
  recordUptimeCheck,
  upsertAlertState,
  type AlertSignals,
  type AlertTransition,
} from '@missa/radar-adapters';
import { renderAdminAlertEmail, renderAdminWeeklyDigest, type WeeklyDigestMetric } from '@/emails/admin-observability';
import { sendMail } from './mail-service';
import { getPlatformAdminView } from './platformAdmin';
import { platformAnalyticsDatabaseUrl } from './platformAnalyticsDatabase';
import { getRevenue } from './platformAdminRevenue';
import { siteUrl } from './siteUrl';

export const UPTIME_TARGETS = [
  { target: 'home', label: 'Home page', path: '/' },
  { target: 'opportunities', label: 'Opportunities page', path: '/opportunities' },
  { target: 'readiness', label: 'App readiness check', path: '/api/health/readiness' },
] as const;

export interface AlertRuleResult {
  key: string;
  title: string;
  firing: boolean;
  detail: string;
}

/**
 * Pure alert rules over current signals. Thresholds favour fewer, meaningful
 * emails: a rule needs a real baseline before it can call something a drop.
 */
export function evaluateAlertRules(input: { signals: AlertSignals; uptimeStreaks: Record<string, number>; workerStatus?: string }): AlertRuleResult[] {
  const { signals } = input;
  const rules: AlertRuleResult[] = UPTIME_TARGETS.map(({ target, label }) => {
    const streak = input.uptimeStreaks[target] ?? 0;
    return {
      key: `uptime:${target}`,
      title: `${label} is down`,
      firing: streak >= 2,
      detail: streak >= 2 ? `The last ${streak} checks failed.` : 'Responding normally again.',
    };
  });
  const errorThreshold = Math.max(10, signals.avgErrorsPerHour * 3);
  rules.push({
    key: 'errors:spike',
    title: 'Error spike on the website',
    firing: signals.errorsLastHour >= errorThreshold,
    detail: `${signals.errorsLastHour} browser errors in the last hour (usual: about ${Math.round(signals.avgErrorsPerHour)} an hour).`,
  });
  rules.push({
    key: 'traffic:drop',
    title: 'Traffic dropped sharply',
    firing: signals.avgDailyVisitors >= 20 && signals.visitorsLast24h < signals.avgDailyVisitors * 0.4,
    detail: `${signals.visitorsLast24h} visitors in the last 24 hours, against a usual ${Math.round(signals.avgDailyVisitors)} a day.`,
  });
  rules.push({
    key: 'signups:stopped',
    title: 'Sign-ups stopped',
    firing: signals.avgDailySignups >= 3 && signals.signupsLast24h === 0,
    detail: `No new accounts in the last 24 hours, against a usual ${signals.avgDailySignups.toFixed(1)} a day. Check the sign-up page and email delivery.`,
  });
  rules.push({
    key: 'email:failures',
    title: 'Emails are failing',
    firing: signals.failedEmailsLast24h >= 5,
    detail: `${signals.failedEmailsLast24h} emails failed to send in the last 24 hours.`,
  });
  if (input.workerStatus) {
    rules.push({
      key: 'worker:stopped',
      title: 'Background worker stopped',
      firing: input.workerStatus === 'failed' || input.workerStatus === 'stale',
      detail: input.workerStatus === 'failed' ? 'A worker lane reported a failure.' : input.workerStatus === 'stale' ? 'The worker heartbeat is late, so sources and jobs may not be processing.' : 'The worker is reporting normally.',
    });
  }
  return rules;
}

async function alertRecipients(connectionString: string): Promise<string[]> {
  const configured = (process.env.ADMIN_ALERT_EMAILS ?? '').split(',').map((email) => email.trim()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email));
  if (configured.length) return configured;
  return listPlatformAdminEmails(connectionString).catch(() => []);
}

async function probe(url: string): Promise<{ ok: boolean; status?: number; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10_000), headers: { 'user-agent': 'MissaUptimeMonitor/1.0' } });
    return { ok: response.status < 400, status: response.status, latencyMs: Date.now() - started, ...(response.status >= 400 ? { error: `HTTP ${response.status}` } : {}) };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? (error.name === 'TimeoutError' ? 'Timed out after 10 seconds' : error.message) : 'Request failed' };
  }
}

export interface MonitorRunResult {
  uptime: Array<{ target: string; ok: boolean; status?: number; latencyMs: number }>;
  transitions: AlertTransition[];
  notified: number;
  purged: { salts: number; events: number; checks: number };
}

/** One monitoring pass: probe uptime, evaluate alert rules, email on changes, purge old data. */
export async function runObservabilityMonitor(options: { baseUrl?: string; now?: Date } = {}): Promise<MonitorRunResult | { skipped: string }> {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return { skipped: 'No database is configured.' };
  const base = (options.baseUrl ?? siteUrl()).replace(/\/$/u, '');
  const now = options.now ?? new Date();

  const uptime = await Promise.all(UPTIME_TARGETS.map(async ({ target, path }) => {
    const url = `${base}${path}`;
    const result = await probe(url);
    await recordUptimeCheck(connectionString, { target, url, ok: result.ok, status: result.status, latencyMs: result.latencyMs, error: result.error, at: now });
    return { target, ...result };
  }));
  const streakEntries = await Promise.all(UPTIME_TARGETS.map(async ({ target }) => [target, await readUptimeFailureStreak(connectionString, target)] as const));
  const [signals, workerStatus] = await Promise.all([
    readAlertSignals(connectionString, now),
    process.env.DATABASE_URL ? getPlatformAdminView('operations').then((area) => area.data.worker.status).catch(() => undefined) : Promise.resolve(undefined),
  ]);

  const rules = evaluateAlertRules({ signals, uptimeStreaks: Object.fromEntries(streakEntries), workerStatus: workerStatus === 'unknown' ? undefined : workerStatus });
  const transitions = await Promise.all(rules.map((rule) => upsertAlertState(connectionString, { key: rule.key, firing: rule.firing, title: rule.title, detail: rule.detail, now })));
  const changed = transitions.filter((transition) => transition.transition !== 'unchanged');

  let notified = 0;
  if (changed.length) {
    const recipients = await alertRecipients(connectionString);
    const email = renderAdminAlertEmail({ items: changed.map((item) => ({ title: item.title, detail: item.detail, state: item.transition === 'fired' ? 'fired' : 'resolved' })), adminUrl: base });
    const stamp = now.toISOString().slice(0, 16);
    for (const recipient of recipients) {
      const report = await sendMail({ recipientEmail: recipient, kind: 'admin-alert', idempotencyKey: `admin-alert:${stamp}:${changed.map((item) => `${item.key}:${item.transition}`).join(',')}:${recipient}`, category: 'security_critical', ...email }).catch(() => undefined);
      if (report?.status === 'sent' || report?.status === 'replayed') notified++;
    }
  }

  const purged = await purgeSiteObservability(connectionString, now).catch(() => ({ salts: 0, events: 0, checks: 0 }));
  return { uptime: uptime.map(({ target, ok, status, latencyMs }) => ({ target, ok, ...(status ? { status } : {}), latencyMs })), transitions: changed, notified, purged };
}

function change(current: number, previous: number): { change?: string; good?: boolean } {
  if (!previous) return {};
  const ratio = (current - previous) / previous;
  return { change: `${ratio >= 0 ? '+' : ''}${Math.round(ratio * 100)}%`, good: ratio >= 0 };
}

/** Builds the Monday summary from the last seven days. Exported for previews and tests. */
export async function buildWeeklyDigest(now = new Date()) {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return undefined;
  const [traffic, growth, health, revenue] = await Promise.all([
    readSiteTraffic(connectionString, { days: 7, now }),
    readGrowthMetrics(connectionString, { days: 7, now }),
    readSiteHealth(connectionString, { days: 7, now }),
    getRevenue(7),
  ]);
  const metrics: WeeklyDigestMetric[] = [
    { label: 'Visitors', value: traffic.current.visitors.toLocaleString('en-GB'), ...change(traffic.current.visitors, traffic.previous.visitors) },
    { label: 'New sign-ups', value: growth.totals.signupsCurrent.toLocaleString('en-GB'), ...change(growth.totals.signupsCurrent, growth.totals.signupsPrevious) },
    { label: 'Total users', value: growth.totals.accounts.toLocaleString('en-GB') },
    { label: 'Weekly active users', value: growth.active.wau.toLocaleString('en-GB') },
  ];
  if (revenue.available) metrics.push({ label: 'MRR', value: new Intl.NumberFormat('en-GB', { style: 'currency', currency: revenue.currency, maximumFractionDigits: 0 }).format(revenue.mrr) }, { label: 'Paying customers', value: String(revenue.payingCustomers) });
  const highlights: string[] = [];
  const topSource = traffic.sources.find((source) => source.label !== 'Direct / none');
  if (topSource) highlights.push(`Top traffic source: ${topSource.label} (${topSource.visitors} visitors).`);
  const topPage = traffic.topPages[0];
  if (topPage) highlights.push(`Most viewed page: ${topPage.label}.`);
  if (growth.activation.rate !== null) highlights.push(`${Math.round(growth.activation.rate * 100)}% of new users did something useful in their first week.`);
  const slowestUptime = health.uptime.filter((target) => target.uptime24h !== null && target.uptime24h < 1);
  if (slowestUptime.length) highlights.push(`Downtime detected on ${slowestUptime.map((target) => target.target).join(', ')}.`);
  if (health.errors.total) highlights.push(`${health.errors.total} browser errors this week. Top: ${health.errors.top[0]?.message ?? 'see the health page'}.`);
  const weekOf = new Date(now.getTime() - 7 * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return { metrics, highlights, weekOf };
}

export async function sendWeeklyDigest(now = new Date()): Promise<{ sent: number } | { skipped: string }> {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return { skipped: 'No database is configured.' };
  const digest = await buildWeeklyDigest(now);
  if (!digest) return { skipped: 'No data.' };
  const email = renderAdminWeeklyDigest({ ...digest, adminUrl: siteUrl().replace(/\/$/u, '') });
  const recipients = await alertRecipients(connectionString);
  const week = now.toISOString().slice(0, 10);
  let sent = 0;
  for (const recipient of recipients) {
    const report = await sendMail({ recipientEmail: recipient, kind: 'admin-weekly-digest', idempotencyKey: `admin-weekly-digest:${week}:${recipient}`, category: 'notification_digest', ...email }).catch(() => undefined);
    if (report?.status === 'sent' || report?.status === 'replayed') sent++;
  }
  return { sent };
}
