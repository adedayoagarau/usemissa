import Link from 'next/link';
import { AdminPageFrame } from '@/components/platform-admin';
import TimeSeriesChart from '@/components/admin-time-series';
import { AnalyticsHeader, BarList, CohortGrid, NotConnected, Panel, PeriodPicker, StatTile, formatCount, formatPercent } from '@/components/admin-observability-ui';
import { getGrowthPage, parsePeriod } from '@/lib/platformAdminObservability';

const METHOD_LABELS: Record<string, string> = { password: 'Email and password', 'neon-auth': 'Google or email link', unknown: 'Unknown' };

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export default async function AdminGrowthPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const { growth, notes } = await getGrowthPage(days);
  const data = growth.data;

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Sign-ups & users" description="How many people are joining, where they come from, whether they get value, and whether they come back.">
          <PeriodPicker basePath="/admin/growth" days={days} />
        </AnalyticsHeader>

        {!growth.available ? (
          <NotConnected reason={growth.reason} />
        ) : (
          <>
            <section aria-label="Growth summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Total users" value={formatCount(data.totals.accounts)} hint="All accounts ever created" />
              <StatTile label="New sign-ups" value={formatCount(data.totals.signupsCurrent)} current={data.totals.signupsCurrent} previous={data.totals.signupsPrevious} />
              <StatTile label="Activation rate" value={formatPercent(data.activation.rate)} hint={`${data.activation.activated} of ${data.activation.cohort} new users`} />
              <StatTile label="Waitlist" value={formatCount(data.totals.waitlist)} hint="People waiting for an invite" />
            </section>
            <section aria-label="Active users" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Daily active users" value={formatCount(data.active.dau)} hint="Signed-in users, last 24 hours" />
              <StatTile label="Weekly active users" value={formatCount(data.active.wau)} hint="Last 7 days" />
              <StatTile label="Monthly active users" value={formatCount(data.active.mau)} hint="Last 30 days" />
              <StatTile label="Stickiness" value={formatPercent(data.active.stickiness)} hint="Average daily ÷ monthly active" />
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Sign-ups per day">
                <TimeSeriesChart data={data.signupsDaily} kind="bar" series={[{ key: 'signups', label: 'Sign-ups' }]} notes={notes} caption="New accounts per day" />
              </Panel>
              <Panel title="Total users" description="Running total of accounts. The chart investors ask for.">
                <TimeSeriesChart data={data.signupsDaily} kind="area" series={[{ key: 'cumulative', label: 'Total users' }]} notes={notes} caption="Total accounts over time" />
              </Panel>
            </div>

            <Panel title="Active users per day" description="Signed-in people who did something each day, split into people who joined that day and people coming back.">
              <TimeSeriesChart
                data={data.activeDaily}
                kind="bar"
                stacked
                series={[{ key: 'returningUsers', label: 'Returning', tone: 'primary' }, { key: 'newUsers', label: 'New that day', tone: 'secondary' }]}
                notes={notes}
                caption="Daily active users, new and returning"
              />
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Where sign-ups come from" description="The source of the visit in which each account was created.">
                <BarList rows={data.signupSources.map((row) => ({ label: row.label, value: row.visitors }))} valueLabel="Sign-ups" empty="Sign-up sources appear here once new accounts are created." />
              </Panel>
              <Panel title="How people sign up">
                <BarList rows={data.signupMethods.map((row) => ({ label: METHOD_LABELS[row.label] ?? row.label, value: row.visitors }))} valueLabel="Sign-ups" />
              </Panel>
            </div>

            <Panel title="Retention" description="Of the people who signed up each week, the share that came back and did something in each following week.">
              <CohortGrid rows={data.retention} />
            </Panel>

            <Panel title="Newest sign-ups" action={<Link href="/admin/data?table=users" className="text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">All users</Link>}>
              {data.recentSignups.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <caption className="sr-only">The 25 most recent accounts</caption>
                    <thead className="text-xs text-muted-foreground">
                      <tr><th scope="col" className="pb-2 font-medium">Email</th><th scope="col" className="pb-2 font-medium">Signed up</th><th scope="col" className="pb-2 font-medium">Method</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.recentSignups.map((row) => (
                        <tr key={row.accountId}>
                          <td className="py-2 pr-3"><Link href={`/admin/users/${encodeURIComponent(row.accountId)}`} className="text-foreground underline-offset-4 hover:underline">{row.email}</Link></td>
                          <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>
                          <td className="py-2 text-xs text-muted-foreground">{row.method ? METHOD_LABELS[row.method] ?? row.method : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No accounts yet.</p>
              )}
            </Panel>
            <p className="text-xs text-muted-foreground">{data.activation.definition} Active users count signed-in activity recorded by the product.</p>
          </>
        )}
      </div>
    </AdminPageFrame>
  );
}
