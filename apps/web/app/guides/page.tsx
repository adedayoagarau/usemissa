import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import { discoveryGuides } from '@/lib/discoveryGuides';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';

export const metadata = pageMetadata({
  title: 'Opportunity guides for creators',
  description: 'Clear, source-first guides for finding, comparing, and preparing for submission opportunities.',
  path: '/guides',
});

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicDiscoveryEvent eventName="public.guides_view" properties={{ surface: 'guides-index' }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Opportunity guides for creators', url: absoluteUrl('/guides'), mainEntity: { '@type': 'ItemList', itemListElement: discoveryGuides.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, name: guide.title, url: absoluteUrl(`/guides/${guide.slug}`) })) } }} />
      <header className="border-b border-border"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5"><Link href="/" className="font-heading text-2xl font-semibold">Missa</Link><nav className="flex items-center gap-4 text-sm text-muted-foreground" aria-label="Guides navigation"><Link href="/methodology" className="hover:text-foreground">How we verify</Link><Link href="/opportunities-preview" className="hover:text-foreground">Browse opportunities</Link></nav></div></header>
      <div className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Missa guides</p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">Make the opportunity easier to understand.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Source-first answers for creators deciding where to apply, what to prepare, and which details need confirmation.</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Missa’s public library is a starting point, not a substitute for the official call. <Link href="/methodology" className="font-medium text-foreground underline underline-offset-4">Read how we verify opportunities.</Link></p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {discoveryGuides.map((guide) => <article key={guide.slug} className="rounded-xl border border-border bg-card p-6"><h2 className="font-heading text-2xl font-medium">{guide.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.description}</p><Link href={`/guides/${guide.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium">Read guide <ArrowRight className="size-4" /></Link></article>)}
        </div>
      </div>
    </main>
  );
}
