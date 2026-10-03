import { AdminPageFrame } from '@/components/platform-admin';
import { AnalyticsHeader, FunnelBars, NotConnected, Panel, PeriodPicker } from '@/components/admin-observability-ui';
import { getFunnelsPage, parsePeriod } from '@/lib/platformAdminObservability';

export default async function AdminFunnelsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const { site, journey } = await getFunnelsPage(days);

  return (
    <AdminPageFrame>
      <div className="space-y-6">
        <AnalyticsHeader title="Funnels" description="Where people drop off on the way to signing up, joining the waitlist, upgrading, and applying.">
          <PeriodPicker basePath="/admin/funnels" days={days} />
        </AnalyticsHeader>

        <section aria-labelledby="site-funnels" className="space-y-3">
          <h2 id="site-funnels" className="text-base font-semibold text-foreground">Website funnels</h2>
          {!site.available ? (
            <NotConnected reason={site.reason} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {site.data.funnels.map((funnel) => (
                <Panel key={funnel.key} title={funnel.label} description={funnel.description}>
                  <FunnelBars steps={funnel.steps.map((step) => ({ label: step.label, count: step.visitors, conversionFromPrevious: step.conversionFromPrevious }))} />
                </Panel>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Website funnels follow each visitor within a single day, so a journey that spans several days is not joined up.</p>
        </section>

        <section aria-labelledby="product-funnel" className="space-y-3">
          <h2 id="product-funnel" className="text-base font-semibold text-foreground">Product journey</h2>
          {!journey.available ? (
            <NotConnected reason={journey.reason} />
          ) : (
            <Panel title="From discovery to outcome" description="Signed-in people (and consenting visitors) moving through each step in order.">
              <FunnelBars steps={journey.data.steps.map((step) => ({ label: step.label, count: step.actors, conversionFromPrevious: step.conversionFromPrevious }))} />
            </Panel>
          )}
          <p className="text-xs text-muted-foreground">Product steps come from product analytics, which only include visitors who accepted analytics.</p>
        </section>
      </div>
    </AdminPageFrame>
  );
}
