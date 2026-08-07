import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { discoveryCollection, discoveryCollections } from '@/lib/discoveryGuides';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return discoveryCollections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  if (!collection) return pageMetadata({ title: 'Discovery page not found', description: 'This Missa discovery page is not available.', path: `/discover/${slug}`, noIndex: true });
  return pageMetadata({ title: collection.title, description: collection.description, path: `/discover/${collection.slug}` });
}

export default async function DiscoveryCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = discoveryCollection(slug);
  if (!collection) notFound();

  let items: OpportunityBrowseProjection[] = [];
  try { items = (await getOpportunityRepository().browse(collection.query)).items; } catch { items = []; }

  return (
    <main className="min-h-screen bg-background">
      <PublicDiscoveryEvent eventName="public.collection_view" properties={{ collection: collection.slug, resultCount: items.length }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: collection.title, description: collection.description, url: absoluteUrl(`/discover/${collection.slug}`), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') }, mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: absoluteUrl(`/discover/opportunities/${item.slug}`) })) } }} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Discover', path: '/opportunities-preview' }, { name: collection.title }])} />
      <header className="border-b border-border"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"><Link href="/" className="font-heading text-2xl font-semibold">Missa</Link><Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground">Read guides</Link></div></header>
      <article className="mx-auto max-w-5xl px-6 py-14">
        <Link href="/opportunities-preview" className="text-sm text-muted-foreground hover:text-foreground">← All opportunities</Link>
        <header className="mt-8 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Missa discovery</p><h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">{collection.title}</h1><p className="mt-5 text-base leading-7 text-muted-foreground">{collection.description}</p></header>
        <section className="mt-10 max-w-3xl rounded-xl border border-border bg-card p-6" aria-labelledby="answer-heading"><h2 id="answer-heading" className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">What to check</h2><p className="mt-3 text-lg leading-8 text-foreground">{collection.answer}</p></section>
        <section className="mt-12" aria-labelledby="live-heading"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source-linked records</p><h2 id="live-heading" className="mt-2 font-heading text-3xl font-medium">Open {collection.title.toLowerCase()} to review</h2></div><Link href="/opportunities-preview" className="inline-flex items-center gap-2 text-sm font-medium">Browse all <ArrowRight className="size-4" /></Link></div>{items.length > 0 ? <div className="mt-6 grid gap-4 md:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{item.organizationName ?? 'Organization not confirmed'}</p><h3 className="mt-2 font-heading text-xl font-medium">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.deadline.date ? `Deadline ${item.deadline.date}` : item.deadline.raw ?? 'Deadline to be confirmed'} · {item.fee.status === 'no-fee' ? 'No fee' : item.fee.status === 'paid' ? 'Paid submission' : 'Fee not confirmed'}</p><div className="mt-4 flex items-center justify-between gap-3"><Link href={`/discover/opportunities/${item.slug}`} className="inline-flex items-center gap-2 text-sm font-medium">Review details <ArrowRight className="size-4" /></Link><a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground">Source <ExternalLink className="size-3" /></a></div></article>)}</div> : <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No matching published opportunities are available in the current source snapshot. Browse the full library or check back after the next refresh.</p>}</section>
      </article>
    </main>
  );
}
