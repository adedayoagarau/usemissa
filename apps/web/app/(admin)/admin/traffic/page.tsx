import { AdminPageFrame } from '@/components/platform-admin';
import AdminChartNotes from '@/components/admin-chart-notes';
import TimeSeriesChart from '@/components/admin-time-series';
import { AnalyticsHeader, BarList, NotConnected, Panel, PeriodPicker, StatTile, capitalise, countryName, formatCount, formatDuration, formatPercent } from '@/components/admin-observability-ui';
import { getTrafficPage, parsePeriod } from '@/lib/platformAdminObservability';

const GOAL_LABELS: Record<string, string> = { signup: 'Created an account', waitlist_join: 'Joined the waitlist', checkout_started: 'Started Plus checkout' };

export default async function AdminTrafficPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const { traffic, notes } = await getTrafficPage(days);
  const data = traffic.data;
  const { current, previous } = data;

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Traffic" description="Every visit, counted without cookies, so people who decline analytics are included. Bots are excluded.">
          <div className="flex flex-wrap items-center gap-3">
            {traffic.available && (
              <p className="inline-flex items-center gap-2 text-sm text-foreground" aria-live="polite">
                <span className="relative flex size-2.5" aria-hidden="true">
                  <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                </span>
                <span className="font-mono tabular-nums">{data.live}</span> on the site now
              </p>
            )}
            <PeriodPicker basePath="/admin/traffic" days={days} />
          </div>
        </AnalyticsHeader>

        {!traffic.available ? (
          <NotConnected reason={traffic.reason} />
        ) : (
          <>
            <section aria-label="Traffic summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatTile label="Visitors" value={formatCount(current.visitors)} current={current.visitors} previous={previous.visitors} />
              <StatTile label="Visits" value={formatCount(current.visits)} current={current.visits} previous={previous.visits} />
              <StatTile label="Page views" value={formatCount(current.pageviews)} current={current.pageviews} previous={previous.pageviews} />
              <StatTile label="Bounce rate" value={formatPercent(current.bounceRate)} current={current.bounceRate} previous={previous.bounceRate} higherIsBetter={false} />
              <StatTile label="Visit length" value={formatDuration(current.avgVisitSeconds)} current={current.avgVisitSeconds} previous={previous.avgVisitSeconds} />
              <StatTile label="Pages per visit" value={current.pagesPerVisit === null ? '—' : current.pagesPerVisit.toFixed(1)} current={current.pagesPerVisit} previous={previous.pagesPerVisit} />
            </section>

            <Panel title="Visitors per day" description="Unique visitors each day. Dashed lines are your notes.">
              <TimeSeriesChart data={data.daily} series={[{ key: 'visitors', label: 'Visitors' }]} notes={notes} caption="Unique visitors per day" />
              <div className="mt-4 border-t border-border pt-4">
                <AdminChartNotes notes={notes} />
              </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Where visitors come from" description="Campaign tag if present, otherwise the referring site.">
                <BarList rows={data.sources.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits }))} secondaryLabel="Visits" />
              </Panel>
              <Panel title="Top pages">
                <BarList rows={data.topPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.pageviews }))} secondaryLabel="Views" />
              </Panel>
              <Panel title="Landing pages" description="The first page of each visit.">
                <BarList rows={data.entryPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits }))} secondaryLabel="Visits" />
              </Panel>
              <Panel title="Exit pages" description="Where visits ended. High counts on a key page can mean people get stuck.">
                <BarList rows={data.exitPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits }))} secondaryLabel="Visits" />
              </Panel>
              <Panel title="Countries">
                <BarList rows={data.countries.map((row) => ({ label: countryName(row.label), value: row.visitors }))} />
              </Panel>
              <Panel title="Campaigns" description="From utm_campaign links.">
                <BarList rows={data.campaigns.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits }))} secondaryLabel="Visits" empty="No tagged campaigns yet. Add ?utm_campaign=… to links you share." />
              </Panel>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Panel title="Devices"><BarList rows={data.devices.map((row) => ({ label: capitalise(row.label), value: row.visitors }))} /></Panel>
              <Panel title="Browsers"><BarList rows={data.browsers.map((row) => ({ label: row.label, value: row.visitors }))} /></Panel>
              <Panel title="Operating systems"><BarList rows={data.operatingSystems.map((row) => ({ label: row.label, value: row.visitors }))} /></Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Panel title="Busiest hours" description="Visitors by hour of day (UTC).">
                <TimeSeriesChart data={data.hourly.map((row) => ({ hour: `${String(row.hour).padStart(2, '0')}:00`, visitors: row.visitors }))} xKey="hour" kind="bar" series={[{ key: 'visitors', label: 'Visitors' }]} height={200} caption="Visitors by hour of day" />
              </Panel>
              <Panel title="Goals" description="Conversions recorded on the server, as a share of visitors.">
                {data.goals.length ? (
                  <BarList rows={data.goals.map((goal) => ({ label: GOAL_LABELS[goal.name] ?? goal.name, value: goal.visitors, secondary: formatPercent(goal.conversionRate) }))} secondaryLabel="Rate" />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No sign-ups, waitlist joins, or checkouts in this period yet.</p>
                )}
              </Panel>
            </div>
            <p className="text-xs text-muted-foreground">A visitor is counted once per day. Over longer periods, one person returning on different days counts each day, because the anonymous code changes daily.</p>
          </>
        )}
      </div>
    </AdminPageFrame>
  );
}
