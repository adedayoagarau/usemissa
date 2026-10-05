import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { readMetricShare } from '@missa/radar-adapters';
import { MissaWordmark } from '@/components/missa-wordmark';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';
import { formatChange, getShareableMetrics, isShareableMetricKey } from '@/lib/shareableMetrics';

export const dynamic = 'force-dynamic';

async function loadShare(token: string) {
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return undefined;
  return readMetricShare(connectionString, token).catch(() => undefined);
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) return { title: 'Not found', robots: { index: false, follow: false } };
  const first = share.metrics.find(isShareableMetricKey);
  const image = first ? `/api/metrics/card?metric=${first}&format=wide&share=${encodeURIComponent(token)}` : undefined;
  return {
    title: share.title,
    description: 'Live numbers from Missa.',
    robots: { index: false, follow: false },
    openGraph: { title: share.title, description: 'Live numbers from Missa.', ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}) },
    twitter: { card: 'summary_large_image', title: share.title, ...(image ? { images: [image] } : {}) },
  };
}

/** A public, read-only page showing only the metrics an admin chose to share. */
export default async function PublicStatsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) notFound();
  const { metrics } = await getShareableMetrics();
  const shown = share.metrics.map((key) => metrics.find((metric) => metric.key === key)).filter((metric): metric is NonNullable<typeof metric> => Boolean(metric && metric.value !== null));
  const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <main className="mx-auto min-h-screen w-[min(100%-32px,960px)] py-12 text-foreground sm:py-20">
      <MissaWordmark size="compact" className="text-foreground" />
      <h1 className="mt-10 font-heading text-4xl font-medium tracking-tight sm:text-6xl">{share.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Live figures, updated {updated}.</p>
      {shown.length ? (
        <section aria-label="Metrics" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((metric) => {
            const change = formatChange(metric.change);
            const Icon = metric.change !== null && metric.change < 0 ? ArrowDownRight : ArrowUpRight;
            return (
              <article key={metric.key} className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-3 font-mono text-4xl tabular-nums tracking-tight text-foreground sm:text-5xl">{metric.formatted}</p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.caption}</p>
                {change && (
                  <p className={`mt-3 inline-flex items-center gap-1 text-sm ${metric.change! >= 0 ? 'text-success' : 'text-destructive'}`}>
                    <Icon className="size-4" aria-hidden="true" />
                    {change} in the last 30 days
                  </p>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">These numbers are not available right now.</p>
      )}
      <p className="mt-12 text-sm text-muted-foreground">
        Missa helps writers and artists find and track creative opportunities. <Link href="/" className="text-foreground underline underline-offset-4">Visit Missa</Link>
      </p>
    </main>
  );
}
