import Link from 'next/link';
import { CheckCircle2, CircleAlert, CircleDashed, CircleX } from 'lucide-react';
import { WEB_VITAL_THRESHOLDS, readAlerts } from '@missa/radar-adapters';
import { AdminPageFrame } from '@/components/platform-admin';
import TimeSeriesChart from '@/components/admin-time-series';
import { AnalyticsHeader, BarList, NotConnected, Panel, PeriodPicker, StatTile, formatCount, formatPercent } from '@/components/admin-observability-ui';
import { getHealthPage, parsePeriod } from '@/lib/platformAdminObservability';
import { getPlatformAdminView } from '@/lib/platformAdmin';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';

const VITAL_LABELS: Record<string, { name: string; help: string }> = {
  LCP: { name: 'Largest content paint', help: 'How long until the main content shows' },
  INP: { name: 'Interaction delay', help: 'How quickly the page responds to taps and clicks' },
  CLS: { name: 'Layout shift', help: 'How much the page jumps while loading' },
  FCP: { name: 'First paint', help: 'How long until anything appears' },
  TTFB: { name: 'Server response', help: 'How long the server takes to start replying' },
};

function vitalRating(name: string, value: number | null): 'good' | 'warn' | 'poor' | 'none' {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value === null || !threshold) return 'none';
  return value <= threshold.good ? 'good' : value <= threshold.poor ? 'warn' : 'poor';
}

function vitalValue(name: string, value: number | null): string {
  if (value === null) return '—';
  if (name === 'CLS') return value.toFixed(2);
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

const ratingStyle = {
  good: { icon: CheckCircle2, text: 'text-success', label: 'Good' },
  warn: { icon: CircleAlert, text: 'text-warning', label: 'Needs work' },
  poor: { icon: CircleX, text: 'text-destructive', label: 'Poor' },
  none: { icon: CircleDashed, text: 'text-muted-foreground', label: 'No data' },
} as const;

function when(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export default async function AdminHealthPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days, 7);
  const connectionString = platformAnalyticsDatabaseUrl();
  const [health, alerts, operations] = await Promise.all([
    getHealthPage(days),
    connectionString ? readAlerts(connectionString).catch(() => []) : Promise.resolve([]),
    getPlatformAdminView('operations').catch(() => undefined),
  ]);
  const data = health.data;
  const firing = alerts.filter((alert) => alert.state === 'firing');
  const worker = operations?.data.worker;

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Health" description="Is the site up, fast, and error-free, and are emails and background jobs working?">
          <PeriodPicker basePath="/admin/health" days={days} options={[7, 30, 90]} />
        </AnalyticsHeader>

        <Panel title="Alerts" description="Checked every 15 minutes. You get an email when an alert starts and when it clears.">
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-success" aria-hidden="true" />No alerts have fired yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.slice(0, 10).map((alert) => {
                const Icon = alert.state === 'firing' ? CircleAlert : CheckCircle2;
                return (
                  <li key={alert.key} className="flex items-start gap-3 py-2.5">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${alert.state === 'firing' ? 'text-destructive' : 'text-success'}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{alert.title} <span className={`ml-1 text-xs font-normal ${alert.state === 'firing' ? 'text-destructive' : 'text-muted-foreground'}`}>{alert.state === 'firing' ? 'Active' : 'Resolved'}</span></p>
                      {alert.detail && <p className="text-xs leading-5 text-muted-foreground">{alert.detail}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{when(alert.state === 'firing' ? alert.firstFiredAt : alert.resolvedAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {firing.length === 0 && alerts.length > 0 && <p className="mt-2 text-xs text-success">Nothing is firing right now.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Alerts go to ADMIN_ALERT_EMAILS, or to every platform admin if that is not set.</p>
        </Panel>

        {!health.available ? (
          <NotConnected reason={health.reason} />
        ) : (
          <>
            <section aria-labelledby="uptime-title" className="space-y-3">
              <h2 id="uptime-title" className="text-base font-semibold text-foreground">Uptime</h2>
              {data.uptime.length === 0 ? (
                <NotConnected reason="Uptime checks start once the /api/cron/observability job runs (every 15 minutes on Vercel)." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                  {data.uptime.map((target) => {
                    const up = target.last?.ok !== false;
                    const Icon = up ? CheckCircle2 : CircleX;
                    return (
                      <div key={target.target} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><Icon className={`size-4 ${up ? 'text-success' : 'text-destructive'}`} aria-hidden="true" />{target.target}</p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{target.url}</p>
                          </div>
                          <span className={`text-xs font-medium ${up ? 'text-success' : 'text-destructive'}`}>{up ? 'Up' : 'Down'}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div><dt className="text-muted-foreground">24 hours</dt><dd className="mt-0.5 font-mono text-sm text-foreground">{formatPercent(target.uptime24h, 2)}</dd></div>
                          <div><dt className="text-muted-foreground">30 days</dt><dd className="mt-0.5 font-mono text-sm text-foreground">{formatPercent(target.uptime30d, 2)}</dd></div>
                          <div><dt className="text-muted-foreground">Response</dt><dd className="mt-0.5 font-mono text-sm text-foreground">{target.avgLatencyMs === null ? '—' : `${Math.round(target.avgLatencyMs)}ms`}</dd></div>
                        </dl>
                        <div className="mt-3 flex h-6 items-end gap-px" role="img" aria-label={`Daily uptime for ${target.target} over the last ${target.daily.length} days`}>
                          {target.daily.map((day) => (
                            <span key={day.day} title={`${day.day}: ${formatPercent(day.uptime, 2)}`} className={`flex-1 rounded-sm ${day.uptime === null ? 'h-2 bg-muted' : day.uptime >= 0.999 ? 'h-full bg-success/70' : day.uptime >= 0.95 ? 'h-full bg-warning/70' : 'h-full bg-destructive/70'}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {data.incidents.length > 0 && (
                <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">{data.incidents.length} failed checks in the last 7 days</summary>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {data.incidents.map((incident) => <li key={`${incident.target}-${incident.at}`}><span className="font-mono">{when(incident.at)}</span> · {incident.target} · {incident.status ?? 'no response'} {incident.error ? `· ${incident.error}` : ''}</li>)}
                  </ul>
                </details>
              )}
            </section>

            <section aria-labelledby="speed-title" className="space-y-3">
              <h2 id="speed-title" className="text-base font-semibold text-foreground">Page speed for real visitors</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {data.vitals.map((vital) => {
                  const rating = ratingStyle[vitalRating(vital.name, vital.p75)];
                  const Icon = rating.icon;
                  return (
                    <div key={vital.name} className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground" title={VITAL_LABELS[vital.name]?.help}>{VITAL_LABELS[vital.name]?.name ?? vital.name} <span className="font-mono">({vital.name})</span></p>
                      <p className="mt-2 font-mono text-2xl tabular-nums text-foreground">{vitalValue(vital.name, vital.p75)}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs ${rating.text}`}><Icon className="size-3.5" aria-hidden="true" />{rating.label}<span className="text-muted-foreground">· {formatCount(vital.samples)} samples</span></p>
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Main content load time" description="75th percentile each day. Under 2.5s is good.">
                  <TimeSeriesChart data={(data.vitals.find((vital) => vital.name === 'LCP')?.daily ?? []).map((day) => ({ day: day.day, p75: day.p75 === null ? null : Math.round(day.p75) }))} kind="line" series={[{ key: 'p75', label: 'LCP p75 (ms)' }]} height={200} caption="Largest contentful paint, 75th percentile per day" />
                </Panel>
                <Panel title="Slowest pages" description="Pages with the slowest main content load (75th percentile).">
                  <BarList rows={data.slowPages.map((page) => ({ label: page.path, value: Math.round(page.p75Lcp), secondary: page.samples }))} valueLabel="ms" secondaryLabel="Samples" empty="Not enough speed samples yet." />
                </Panel>
              </div>
              <p className="text-xs text-muted-foreground">Measured in visitors&apos; browsers. The 75th percentile means three in four visits were at least this fast.</p>
            </section>

            <section aria-labelledby="errors-title" className="space-y-3">
              <h2 id="errors-title" className="text-base font-semibold text-foreground">Browser errors</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatTile label="Errors" value={formatCount(data.errors.total)} hint={`In the last ${days} days`} />
                <StatTile label="Visitors affected" value={formatCount(data.errors.affectedVisitors)} hint="Saw at least one error" />
                <StatTile label="Errors per 100 page views" value={data.errors.errorRate === null ? '—' : (data.errors.errorRate * 100).toFixed(2)} hint="Lower is better" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Errors per day">
                  <TimeSeriesChart data={data.errors.daily} kind="bar" series={[{ key: 'errors', label: 'Errors' }]} height={200} caption="Browser errors per day" />
                </Panel>
                <Panel title="Most common errors">
                  {data.errors.top.length ? (
                    <ul className="divide-y divide-border">
                      {data.errors.top.map((error) => (
                        <li key={error.message} className="py-2">
                          <p className="break-words font-mono text-xs text-foreground">{error.message}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{error.count}× · {error.visitors} visitors · mostly on {error.path} · last {when(error.lastAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-success" aria-hidden="true" />No browser errors recorded.</p>
                  )}
                </Panel>
              </div>
              <p className="text-xs text-muted-foreground">For full stack traces and server errors, set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN to turn on Sentry.</p>
            </section>

            <section aria-labelledby="email-title" className="space-y-3">
              <h2 id="email-title" className="text-base font-semibold text-foreground">Email delivery</h2>
              {!data.email.available ? (
                <NotConnected reason="Email delivery records appear once the application database is connected." />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <StatTile label="Sent" value={formatCount(data.email.sent)} hint={`Last ${days} days`} />
                    <StatTile label="Delivered" value={data.email.sent ? formatPercent(data.email.delivered / data.email.sent) : '—'} hint={`${formatCount(data.email.delivered)} emails`} />
                    <StatTile label="Bounced" value={formatCount(data.email.bounced)} hint="Address did not accept it" />
                    <StatTile label="Spam complaints" value={formatCount(data.email.complained)} hint="Keep this at zero" />
                    <StatTile label="Failed to send" value={formatCount(data.email.failed)} hint="Provider rejected it" />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Emails sent per day">
                      <TimeSeriesChart data={data.email.daily} kind="bar" stacked series={[{ key: 'sent', label: 'Sent', tone: 'primary' }, { key: 'failed', label: 'Failed', tone: 'comparison' }]} height={200} caption="Emails sent and failed per day" />
                    </Panel>
                    <Panel title="By email type">
                      <BarList rows={data.email.byKind.map((row) => ({ label: row.kind, value: row.sent, secondary: row.failed }))} valueLabel="Sent" secondaryLabel="Failed" empty="No emails sent in this period." />
                    </Panel>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <section aria-labelledby="jobs-title" className="space-y-3">
          <h2 id="jobs-title" className="text-base font-semibold text-foreground">Background jobs</h2>
          {worker ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground">Worker status: <span className="font-medium capitalize">{worker.status === 'unknown' ? 'not reporting' : worker.status}</span></p>
                <Link href="/admin/agents" className="text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">Worker details</Link>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div><dt className="text-muted-foreground">Running lanes</dt><dd className="mt-0.5 font-mono text-base text-foreground">{worker.running}</dd></div>
                <div><dt className="text-muted-foreground">Failed lanes</dt><dd className="mt-0.5 font-mono text-base text-foreground">{worker.failed}</dd></div>
                <div><dt className="text-muted-foreground">Completed runs</dt><dd className="mt-0.5 font-mono text-base text-foreground">{worker.completed}</dd></div>
              </dl>
              {worker.lanes.length > 0 && (
                <ul className="mt-3 divide-y divide-border border-t border-border text-xs">
                  {worker.lanes.map((lane) => <li key={lane.workerKind} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-medium text-foreground">{lane.workerKind}</span><span className={lane.status === 'running' ? 'text-success' : lane.status === 'failed' || lane.status === 'stale' ? 'text-destructive' : 'text-muted-foreground'}>{lane.status}</span><span className="font-mono text-muted-foreground">{when(lane.lastHeartbeatAt)}</span></li>)}
                </ul>
              )}
            </div>
          ) : (
            <NotConnected reason="Worker status is unavailable." />
          )}
        </section>
      </div>
    </AdminPageFrame>
  );
}
