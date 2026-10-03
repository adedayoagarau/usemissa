import { AdminPageFrame } from '@/components/platform-admin';
import AdminChartNotes from '@/components/admin-chart-notes';
import TimeSeriesChart from '@/components/admin-time-series';
import BreakdownTabs from '@/components/admin-breakdown-tabs';
import MetricChart from '@/components/admin-metric-chart';
import { AnalyticsHeader, BarList, ChangeLine, NotConnected, Panel, PeriodPicker, capitalise, countryName, formatCount, formatDuration, formatPercent } from '@/components/admin-observability-ui';
import { getTrafficPage, parsePeriod } from '@/lib/platformAdminObservability';

const GOAL_LABELS: Record<string, string> = { signup: 'Created an account', waitlist_join: 'Joined the waitlist', checkout_started: 'Started Plus checkout' };

export default async function AdminTrafficPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const { traffic, notes } = await getTrafficPage(days);
  const data = traffic.data;
  const { current, previous } = data;

  return (
    <AdminPageFrame>
      <div className="space-y-8">
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
            <MetricChart
              caption="Traffic over time"
              data={data.daily}
              notes={notes}
              tabs={[
                { key: 'visitors', label: 'Visitors', value: formatCount(current.visitors), seriesKey: 'visitors', delta: <ChangeLine current={current.visitors} previous={previous.visitors} /> },
                { key: 'visits', label: 'Visits', value: formatCount(current.visits), seriesKey: 'visits', delta: <ChangeLine current={current.visits} previous={previous.visits} /> },
                { key: 'pageviews', label: 'Page views', value: formatCount(current.pageviews), seriesKey: 'pageviews', kind: 'bar', delta: <ChangeLine current={current.pageviews} previous={previous.pageviews} /> },
                { key: 'bounce', label: 'Bounce rate', value: formatPercent(current.bounceRate), delta: <ChangeLine current={current.bounceRate} previous={previous.bounceRate} higherIsBetter={false} /> },
                { key: 'duration', label: 'Visit length', value: formatDuration(current.avgVisitSeconds), delta: <ChangeLine current={current.avgVisitSeconds} previous={previous.avgVisitSeconds} /> },
                { key: 'depth', label: 'Pages per visit', value: current.pagesPerVisit === null ? '—' : current.pagesPerVisit.toFixed(1), delta: <ChangeLine current={current.pagesPerVisit} previous={previous.pagesPerVisit} /> },
              ]}
              footer={<AdminChartNotes notes={notes} />}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <BreakdownTabs
                title="Where visitors come from"
                views={[
                  { key: 'sources', label: 'Sources', rows: data.sources.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits })), secondaryLabel: 'Visits' },
                  { key: 'referrers', label: 'Referrers', rows: data.referrers.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits })), secondaryLabel: 'Visits' },
                  { key: 'campaigns', label: 'Campaigns', rows: data.campaigns.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits })), secondaryLabel: 'Visits', empty: 'No tagged campaigns yet. Add ?utm_campaign=… to links you share.' },
                ]}
              />
              <BreakdownTabs
                title="Pages"
                views={[
                  { key: 'top', label: 'Top', rows: data.topPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.pageviews })), secondaryLabel: 'Views' },
                  { key: 'entry', label: 'Landing', rows: data.entryPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits })), secondaryLabel: 'Visits' },
                  { key: 'exit', label: 'Exit', rows: data.exitPages.map((row) => ({ label: row.label, value: row.visitors, secondary: row.visits })), secondaryLabel: 'Visits' },
                ]}
              />
              <BreakdownTabs title="Countries" views={[{ key: 'countries', label: 'Countries', rows: data.countries.map((row) => ({ label: countryName(row.label), value: row.visitors })) }]} />
              <BreakdownTabs
                title="Devices"
                views={[
                  { key: 'devices', label: 'Device', rows: data.devices.map((row) => ({ label: capitalise(row.label), value: row.visitors })) },
                  { key: 'browsers', label: 'Browser', rows: data.browsers.map((row) => ({ label: row.label, value: row.visitors })) },
                  { key: 'os', label: 'System', rows: data.operatingSystems.map((row) => ({ label: row.label, value: row.visitors })) },
                ]}
              />
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
