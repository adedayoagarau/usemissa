import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { discoveryGuides } from '@/lib/discoveryGuides';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import styles from '../public-editorial.module.css';

export const metadata = pageMetadata({
  title: 'Guides: finding and checking open calls',
  description: 'Short guides to finding open calls, grants, residencies and magazines, and to checking the fee, deadline and who can apply before you send work.',
  path: '/guides',
});

function sectionFor(slug: string): string {
  if (slug.includes('verify') || slug.includes('find')) return 'Before you apply';
  if (slug.includes('grant') || slug.includes('residenc') || slug.includes('fellow')) return 'Funding and time';
  if (slug.includes('magazine') || slug.includes('fee')) return 'Sending work';
  return 'Work in the arts';
}

export default function GuidesPage() {
  return (
    <PublicSiteShell current="Guides">
      <main id="main-content" className={styles.main}>
        <PublicDiscoveryEvent eventName="public.discovery_view" properties={{ surface: "guides-index", resultCount: discoveryGuides.length }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Missa guides',
            url: absoluteUrl('/guides'),
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: discoveryGuides.map((guide, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: guide.title,
                url: absoluteUrl(`/guides/${guide.slug}`),
              })),
            },
          }}
        />
        <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Guides' }])} />
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Guides</p>
          <h1>Before you send the work.</h1>
          <p>Short, practical reading on finding calls and checking the fee, the deadline and who can apply.</p>
        </header>
        <section className={styles.guideList} aria-label="Guides">
          {discoveryGuides.map((guide, index) => (
            <article key={guide.slug}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <small>{sectionFor(guide.slug)}</small>
                <h2>{guide.title}</h2>
                <p>{guide.description}</p>
              </div>
              <Link href={`/guides/${guide.slug}`}>
                Read the guide <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
      </main>
    </PublicSiteShell>
  );
}
