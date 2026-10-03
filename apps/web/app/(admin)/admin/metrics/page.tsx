import { ArrowDownRight, ArrowUpRight, Download, ImageDown, Lock } from 'lucide-react';
import { listMetricShares } from '@missa/radar-adapters';
import { AdminPageFrame } from '@/components/platform-admin';
import AdminMetricShares from '@/components/admin-metric-shares';
import TimeSeriesChart from '@/components/admin-time-series';
import { AnalyticsHeader, Panel } from '@/components/admin-observability-ui';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';
import { formatChange, getShareableMetrics } from '@/lib/shareableMetrics';

const linkClass = 'inline-flex min-h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default async function AdminMetricsPage() {
  const connectionString = platformAnalyticsDatabaseUrl();
  const [{ metrics, monthly, mrrByMonth }, shares] = await Promise.all([getShareableMetrics(), connectionString ? listMetricShares(connectionString).catch(() => []) : Promise.resolve([])]);
  const chartRows = monthly.map((row) => ({ month: row.month, totalUsers: row.totalUsers, signups: row.signups, visitors: row.visitors, mrr: mrrByMonth.get(row.month) ?? null }));

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Share metrics" description="Headline numbers for investor updates, decks, and social posts. Download an image, export the monthly table, or share a live link.">
          <a href="/api/admin/metrics/export" download className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Download className="size-4" aria-hidden="true" />
            Monthly metrics (CSV)
          </a>
        </AnalyticsHeader>

        <section aria-label="Headline metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            const change = formatChange(metric.change);
            const Icon = metric.change !== null && metric.change < 0 ? ArrowDownRight : ArrowUpRight;
            return (
              <article key={metric.key} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {metric.label}
                  {metric.sensitive && <Lock className="size-3" aria-label="Private figure" />}
                </p>
                <p className="mt-2 font-mono text-3xl tabular-nums text-foreground">{metric.formatted}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {change ? (
                    <span className={`inline-flex items-center gap-0.5 ${metric.change! >= 0 ? 'text-success' : 'text-destructive'}`}>
                      <Icon className="size-3.5" aria-hidden="true" />
                      {change} in 30 days
                    </span>
                  ) : (
                    metric.caption
                  )}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3" aria-label={`Download ${metric.label} as an image`}>
                  {metric.value === null ? (
                    <span className="text-xs text-muted-foreground">Not connected yet</span>
                  ) : (
                    (['square', 'wide', 'story'] as const).map((format) => (
                      <a key={format} href={`/api/metrics/card?metric=${metric.key}&format=${format}&download=1`} className={linkClass} download>
                        {format === 'square' && <ImageDown className="size-3.5" aria-hidden="true" />}
                        {format === 'square' ? 'Post' : format === 'wide' ? 'Wide' : 'Story'}
                      </a>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </section>
        <p className="text-xs text-muted-foreground">Post is 1080×1080 (Instagram, LinkedIn), Wide is 1200×630 (X, decks, link previews), Story is 1080×1920. Revenue figures are marked private; share them deliberately.</p>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Total users by month">
            <TimeSeriesChart data={chartRows} xKey="month" kind="area" series={[{ key: 'totalUsers', label: 'Total users' }]} caption="Total users at the end of each month" />
          </Panel>
          <Panel title="New sign-ups by month">
            <TimeSeriesChart data={chartRows} xKey="month" kind="bar" series={[{ key: 'signups', label: 'New sign-ups' }]} caption="New sign-ups per month" />
          </Panel>
        </div>

        <Panel title="Month by month" description="The table investors usually ask for. The CSV download has the same columns.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <caption className="sr-only">Monthly metrics for the last 12 months</caption>
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 text-left font-medium">Month</th>
                  <th scope="col" className="pb-2 font-medium">New sign-ups</th>
                  <th scope="col" className="pb-2 font-medium">Total users</th>
                  <th scope="col" className="pb-2 font-medium">Monthly active</th>
                  <th scope="col" className="pb-2 font-medium">Visitors</th>
                  <th scope="col" className="pb-2 font-medium">Waitlist joins</th>
                  <th scope="col" className="pb-2 font-medium">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs tabular-nums">
                {[...monthly].reverse().map((row) => (
                  <tr key={row.month}>
                    <th scope="row" className="py-2 text-left font-normal text-foreground">{row.month}</th>
                    <td className="py-2">{row.signups.toLocaleString('en-GB')}</td>
                    <td className="py-2">{row.totalUsers.toLocaleString('en-GB')}</td>
                    <td className="py-2">{row.monthlyActiveUsers?.toLocaleString('en-GB') ?? '—'}</td>
                    <td className="py-2">{row.visitors?.toLocaleString('en-GB') ?? '—'}</td>
                    <td className="py-2">{row.waitlistJoins?.toLocaleString('en-GB') ?? '—'}</td>
                    <td className="py-2">{mrrByMonth.has(row.month) ? mrrByMonth.get(row.month)!.toLocaleString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Public links" description="A live, read-only page with only the numbers you choose. Good for investor updates or a link in bio.">
          {connectionString ? (
            <AdminMetricShares options={metrics.map(({ key, label, sensitive }) => ({ key, label, sensitive }))} shares={shares} />
          ) : (
            <p className="text-sm text-muted-foreground">Connect a database to create share links.</p>
          )}
        </Panel>
      </div>
    </AdminPageFrame>
  );
}
