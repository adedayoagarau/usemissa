import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { GuideCard, GuideClosing, guideStyles as styles } from '@/components/missa/guide-article';
import { discoveryGuides } from '@/lib/discoveryGuides';
import { GUIDE_SECTIONS, guideArticles } from '@/lib/guideArticles';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { sectionAnchor } from './[slug]/guide-article-page';

export const metadata = pageMetadata({
  title: 'Guides: finding open calls, fees, residencies and magazines',
  description: 'Practical guides for artists and writers: where to find open calls, what fees are fair, how to apply to residencies and how to pick magazines.',
  path: '/guides',
});

export default function GuidesPage() {
  const [featured, ...rest] = guideArticles;
  const sections = GUIDE_SECTIONS.map((section) => ({
    section,
    articles: rest.filter((article) => article.section === section),
  })).filter((group) => group.articles.length);
  const allEntries = [
    ...guideArticles.map((article) => ({ name: article.title, path: `/guides/${article.slug}` })),
    ...discoveryGuides.map((guide) => ({ name: guide.title, path: `/guides/${guide.slug}` })),
  ];

  return (
    <PublicSiteShell current="Guides">
      <main id="main-content" className={styles.page} data-density="spacious">
        <PublicDiscoveryEvent eventName="public.discovery_view" properties={{ surface: 'guides-index', resultCount: allEntries.length }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Missa guides',
            url: absoluteUrl('/guides'),
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: allEntries.map((entry, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: entry.name,
                url: absoluteUrl(entry.path),
              })),
            },
          }}
        />
        <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Guides' }])} />

        <header className={styles.indexHero}>
          <p className={styles.sectionEyebrow}>Guides</p>
          <h1 className="font-heading">Before you send the work.</h1>
          <p>
            Making the work is half the job. These guides cover the other half: where calls turn up, what a fee should get you, how residencies choose, and how to keep track of it all.
          </p>
        </header>

        <nav aria-label="Guide topics">
          <ul className={styles.sectionNav}>
            {GUIDE_SECTIONS.map((section) => (
              <li key={section}>
                <a href={`#${sectionAnchor(section)}`}>{section}</a>
              </li>
            ))}
            <li>
              <a href="#quick-guides">Quick guides</a>
            </li>
          </ul>
        </nav>

        {featured ? (
          <div id={sections.some((group) => group.section === featured.section) ? undefined : sectionAnchor(featured.section)} className={styles.indexSection}>
            <GuideCard article={featured} headingLevel="h2" featured />
          </div>
        ) : null}

        {GUIDE_SECTIONS.map((section) => {
          const group = sections.find((candidate) => candidate.section === section);
          const inSection = group?.articles ?? [];
          if (!inSection.length) return null;
          return (
            <section key={section} id={sectionAnchor(section)} className={styles.indexSection} aria-labelledby={`${sectionAnchor(section)}-heading`}>
              <h2 id={`${sectionAnchor(section)}-heading`} className={`font-heading ${styles.sectionTitle}`}>
                {section}
              </h2>
              <div className={styles.cardGrid}>
                {inSection.map((article) => (
                  <GuideCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          );
        })}

        <section id="quick-guides" className={styles.indexSection} aria-labelledby="quick-guides-heading">
          <h2 id="quick-guides-heading" className={`font-heading ${styles.sectionTitle}`}>
            Quick guides
          </h2>
          <ul className={styles.quickList}>
            {discoveryGuides.map((guide) => (
              <li key={guide.slug}>
                <div>
                  <h3>{guide.title}</h3>
                  <p>{guide.description}</p>
                </div>
                <Link href={`/guides/${guide.slug}`} className={styles.moreLink}>
                  Read <span className="sr-only">{guide.title}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <GuideClosing cta={{ label: 'Browse open calls', href: '/opportunities' }} />
      </main>
    </PublicSiteShell>
  );
}
