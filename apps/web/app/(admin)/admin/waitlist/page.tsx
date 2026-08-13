import { AdminPageFrame, DataAreaHeader, MaturityBadge, MetricCard, WarningList } from '@/components/platform-admin';
import { getPlatformAdminWaitlist } from '@/lib/platformAdminWaitlist';
import type { WaitlistAnalyticsDimension, WaitlistAnalyticsRow } from '@missa/radar-adapters';

export const dynamic = 'force-dynamic';

function formatRate(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
}

function dimensionTitle(dimension: WaitlistAnalyticsDimension): string {
  return { source: 'Campaign source', campaign: 'Campaign', device: 'Device', referrer: 'Referrer' }[dimension];
}

function DimensionTable({ dimension, rows }: { dimension: WaitlistAnalyticsDimension; rows: WaitlistAnalyticsRow[] }) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-white">
    <div className="border-b border-border px-4 py-4"><h3 className="text-base font-semibold tracking-tight">{dimensionTitle(dimension)}</h3><p className="mt-1 text-xs text-muted-foreground">Visits and joins grouped by safe attribution values.</p></div>
    {rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No attributed activity in this window.</p> : <table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">Waitlist {dimensionTitle(dimension).toLowerCase()} conversion</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Value</th><th scope="col" className="px-4 py-3 font-medium">Views</th><th scope="col" className="px-4 py-3 font-medium">Starts</th><th scope="col" className="px-4 py-3 font-medium">Attempts</th><th scope="col" className="px-4 py-3 font-medium">Joins</th><th scope="col" className="px-4 py-3 font-medium">View → join</th></tr></thead><tbody>{rows.slice(0, 20).map((row) => <tr key={row.value} className="border-b border-border last:border-0"><th scope="row" className="max-w-[240px] truncate px-4 py-3 font-mono text-xs font-medium" title={row.value}>{row.value}</th><td className="px-4 py-3 font-mono tabular-nums">{row.views}</td><td className="px-4 py-3 font-mono tabular-nums">{row.formStarts}</td><td className="px-4 py-3 font-mono tabular-nums">{row.submitAttempts}</td><td className="px-4 py-3 font-mono tabular-nums">{row.joins}</td><td className="px-4 py-3 font-mono tabular-nums">{formatRate(row.conversionRate)}</td></tr>)}</tbody></table>}
  </div>;
}

export default async function PlatformAdminWaitlistPage() {
  const area = await getPlatformAdminWaitlist();
  return <AdminPageFrame>
    <div className="space-y-8">
      <DataAreaHeader area={area} title="Waitlist" description="Private operational view of public waitlist signups. Emails are visible only inside the platform-admin boundary." />
      <WarningList warnings={area.warnings} />
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Signups" value={area.data.total} detail="All durable rows currently observed" />
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-medium text-muted-foreground">Availability</p><div className="mt-3"><MaturityBadge maturity={area.provenance.maturity} /></div><p className="mt-2 text-xs text-muted-foreground">{area.provenance.freshness}</p></div>
      </div>
      <section aria-labelledby="waitlist-funnel-title">
        <div><h2 id="waitlist-funnel-title" className="text-xl font-semibold tracking-tight">Waitlist funnel</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Last {area.data.analytics.windowDays} days. Counts are first-party events; joins come from the durable signup table.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <MetricCard label="Views" value={area.data.analytics.summary.views} detail="Waitlist page views" />
          <MetricCard label="CTA clicks" value={area.data.analytics.summary.ctaClicks} detail="Join button clicks" />
          <MetricCard label="Form starts" value={area.data.analytics.summary.formStarts} detail="First email focus" />
          <MetricCard label="Submit attempts" value={area.data.analytics.summary.submitAttempts} detail="Form submissions" />
          <MetricCard label="Joins" value={area.data.analytics.summary.joins} detail="Durable signups in window" />
          <MetricCard label="Failures" value={area.data.analytics.summary.failures} detail="Rejected or unavailable" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricCard label="View → join" value={formatRate(area.data.analytics.summary.viewToJoinRate)} detail="Joins divided by views" />
          <MetricCard label="View → start" value={formatRate(area.data.analytics.summary.formStartRate)} detail="Starts divided by views" />
          <MetricCard label="Start → join" value={formatRate(area.data.analytics.summary.startToJoinRate)} detail="Joins divided by starts" />
        </div>
      </section>
      <section aria-labelledby="waitlist-attribution-title">
        <div><h2 id="waitlist-attribution-title" className="text-xl font-semibold tracking-tight">Attribution and conversion</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Raw emails and identifiers stay out of analytics. Only bounded UTM values, device class, and referrer host are shown here.</p></div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {(['source', 'campaign', 'device', 'referrer'] as WaitlistAnalyticsDimension[]).map((dimension) => <DimensionTable key={dimension} dimension={dimension} rows={area.data.analytics.dimensions[dimension]} />)}
        </div>
      </section>
      <section aria-labelledby="waitlist-daily-title">
        <div><h2 id="waitlist-daily-title" className="text-xl font-semibold tracking-tight">Daily flow</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">UTC days present in the selected window. Empty days are not backfilled.</p></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Daily waitlist funnel counts</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Day UTC</th><th scope="col" className="px-4 py-3 font-medium">Views</th><th scope="col" className="px-4 py-3 font-medium">CTA clicks</th><th scope="col" className="px-4 py-3 font-medium">Starts</th><th scope="col" className="px-4 py-3 font-medium">Attempts</th><th scope="col" className="px-4 py-3 font-medium">Failures</th><th scope="col" className="px-4 py-3 font-medium">Joins</th></tr></thead><tbody>{area.data.analytics.daily.map((row) => <tr key={row.day} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-mono text-xs font-medium">{row.day}</th><td className="px-4 py-3 font-mono tabular-nums">{row.views}</td><td className="px-4 py-3 font-mono tabular-nums">{row.ctaClicks}</td><td className="px-4 py-3 font-mono tabular-nums">{row.formStarts}</td><td className="px-4 py-3 font-mono tabular-nums">{row.submitAttempts}</td><td className="px-4 py-3 font-mono tabular-nums">{row.failures}</td><td className="px-4 py-3 font-mono tabular-nums">{row.joins}</td></tr>)}</tbody></table>{area.data.analytics.daily.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No waitlist funnel events are available yet.</p>}</div>
      </section>
      <section className="overflow-x-auto rounded-xl border border-border bg-white" aria-labelledby="waitlist-table-title">
        <div className="border-b border-border px-4 py-4"><h2 id="waitlist-table-title" className="text-lg font-semibold tracking-tight">Recent signups</h2><p className="mt-1 text-xs text-muted-foreground">Showing up to {area.data.rows.length} most recent rows.</p></div>
        {area.data.rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No waitlist records are available.</p> : <table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Recent waitlist signups</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Email</th><th scope="col" className="px-4 py-3 font-medium">Source</th><th scope="col" className="px-4 py-3 font-medium">Campaign</th><th scope="col" className="px-4 py-3 font-medium">Joined</th></tr></thead><tbody>{area.data.rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-medium">{row.email}</th><td className="px-4 py-3 text-muted-foreground">{row.source}</td><td className="max-w-[280px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">{Object.entries(row.campaign).map(([key, value]) => `${key}=${value}`).join(' · ') || '—'}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td></tr>)}</tbody></table>}
      </section>
    </div>
  </AdminPageFrame>;
}
