import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { discoveryGuides } from '@/lib/discoveryGuides';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import styles from '../public-editorial.module.css';

export const metadata = pageMetadata({ title: 'Guides for creative Opportunity decisions', description: 'Source-first Guides for finding, comparing, preparing, and keeping track of creative Opportunities.', path: '/guides' });

function jobFor(slug: string): string {
  if (slug.includes('verify') || slug.includes('find')) return 'Before you apply';
  if (slug.includes('grant') || slug.includes('residenc') || slug.includes('fellow')) return 'Choosing support';
  if (slug.includes('magazine') || slug.includes('fee')) return 'Preparing Work';
  return 'Opportunity decisions';
}

export default function GuidesPage() {
  return <PublicSiteShell current="Guides"><main id="main-content" className={styles.main}>
    <PublicDiscoveryEvent eventName="public.guides_view" properties={{ surface: 'guides-index' }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Missa Guides', url: absoluteUrl('/guides'), mainEntity: { '@type': 'ItemList', itemListElement: discoveryGuides.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, name: guide.title, url: absoluteUrl(`/guides/${guide.slug}`) })) } }} />
    <header className={styles.hero}><p className={styles.eyebrow}>Missa Guides</p><h1>Start with the decision you are making.</h1><p>Practical reading for creators and Organizations, grouped by job rather than a wall of taxonomy terms.</p></header>
    <section className={styles.guideList} aria-label="Guides">{discoveryGuides.map((guide, index) => <article key={guide.slug}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{jobFor(guide.slug)}</small><h2>{guide.title}</h2><p>{guide.description}</p></div><Link href={`/guides/${guide.slug}`}>Read Guide <ArrowRight aria-hidden="true" /></Link></article>)}</section>
  </main></PublicSiteShell>;
}
