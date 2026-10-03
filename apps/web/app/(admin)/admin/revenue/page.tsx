import { AdminPageFrame } from '@/components/platform-admin';
import TimeSeriesChart from '@/components/admin-time-series';
import { AnalyticsHeader, BarList, NotConnected, Panel, PeriodPicker, StatTile, formatCount, formatPercent } from '@/components/admin-observability-ui';
import { parsePeriod } from '@/lib/platformAdminObservability';
import { getRevenue } from '@/lib/platformAdminRevenue';

function money(value: number | null, currency: string): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

export default async function AdminRevenuePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const revenue = await getRevenue(days);
  const currency = revenue.currency;
  const previousMrr = revenue.mrrHistory.at(-2)?.mrr ?? null;

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Revenue" description="Recurring revenue, paying customers, and churn, read live from Stripe.">
          <PeriodPicker basePath="/admin/revenue" days={days} />
        </AnalyticsHeader>
        {!revenue.available ? (
          <NotConnected reason={revenue.reason} />
        ) : (
          <>
            <section aria-label="Revenue summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Monthly recurring revenue" value={money(revenue.mrr, currency)} current={revenue.mrr} previous={previousMrr} hint="Compared with last month" />
              <StatTile label="Annual run rate" value={money(revenue.arr, currency)} hint="MRR × 12" />
              <StatTile label="Paying customers" value={formatCount(revenue.payingCustomers)} hint={`${revenue.trialing} on trial`} />
              <StatTile label="Average revenue per customer" value={money(revenue.arpu, currency)} hint="Per month" />
              <StatTile label={`Collected (${days === 365 ? '12 months' : `${days} days`})`} value={money(revenue.revenueInPeriod, currency)} hint="Paid invoices" />
              <StatTile label="New subscriptions" value={formatCount(revenue.newInPeriod)} hint="Started in this period" />
              <StatTile label="Churn" value={formatPercent(revenue.churnRate)} hint={`${revenue.churnedInPeriod} ended in this period`} />
              <StatTile label="Payment problems" value={formatCount(revenue.pastDue)} hint={`${revenue.cancellingAtPeriodEnd} set to cancel`} />
            </section>
            <Panel title="Monthly recurring revenue" description="Each month-end, using today's prices for each subscription.">
              <TimeSeriesChart data={revenue.mrrHistory} xKey="month" kind="area" series={[{ key: 'mrr', label: `MRR (${currency})` }]} caption="Monthly recurring revenue over the last 12 months" />
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Paying customers by month">
                <TimeSeriesChart data={revenue.mrrHistory} xKey="month" kind="bar" series={[{ key: 'customers', label: 'Paying customers' }]} height={200} caption="Paying customers at each month-end" />
              </Panel>
              <Panel title="Plan mix" description="Customers and MRR by plan.">
                <BarList rows={revenue.planMix.map((plan) => ({ label: plan.label, value: plan.customers, secondary: money(plan.mrr, currency) }))} valueLabel="Customers" secondaryLabel="MRR" empty="No paying customers yet." />
              </Panel>
            </div>
            {revenue.otherCurrencies.length > 0 && <p className="text-xs text-muted-foreground">Figures are in {currency}. Subscriptions billed in {revenue.otherCurrencies.join(', ')} are not included in the totals.</p>}
          </>
        )}
      </div>
    </AdminPageFrame>
  );
}
