import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { PublicSiteShell } from '@/components/public-site-shell';
import { GuideLinks } from '@/components/missa/guide-links';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { getPublicOpportunityPage } from '@/lib/publicOpportunityReads';
import {
  discoveryCollections,
  discoveryContentLastModified,
  discoveryGuide,
  discoveryGuides,
} from '@/lib/discoveryGuides';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { guideArticle, guideArticles } from '@/lib/guideArticles';
import { GuideArticlePage, guideArticleMetadata } from './guide-article-page';
import styles from '../../public-editorial.module.css';

/** Static reading served from the CDN; the related calls refresh hourly. */
export const revalidate = 3600;

function deadlineLabel(item: OpportunityBrowseProjection): string {
  if (item.deadline.date) return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${item.deadline.date}T12:00:00Z`));
  if (item.deadline.kind === 'rolling') return 'Rolling deadline';
  if (item.deadline.kind === 'until-filled') return 'Open until filled';
  return 'Deadline not listed';
}

function feeLabel(item: OpportunityBrowseProjection): string {
  if (item.fee.status === 'no-fee') return 'No fee';
  if (item.fee.status === 'paid') return item.fee.raw ?? 'Fee listed';
  return 'Fee not listed';
}

export function generateStaticParams() {
  return [...guideArticles.map((article) => ({ slug: article.slug })), ...discoveryGuides.map((guide) => ({ slug: guide.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = guideArticle(slug);
  if (article) return guideArticleMetadata(article);
  const guide = discoveryGuide(slug);
  if (!guide) notFound();
  return pageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}` });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = guideArticle(slug);
  if (article) return <GuideArticlePage article={article} />;
  const guide = discoveryGuide(slug);
  if (!guide) notFound();
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try {
    items = (await getPublicOpportunityPage(guide.query)).items;
  } catch {
    unavailable = true;
  }
  const collections = discoveryCollections.filter((collection) => collection.relatedGuideSlug === guide.slug).slice(0, 4);
  const path = `/guides/${guide.slug}`;

  return (
    <PublicSiteShell current="Guides">
      <main id="main-content" className={styles.main}>
        <PublicDiscoveryEvent eventName="public.discovery_view" properties={{ surface: `guide:${guide.slug}`, resultCount: items.length }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.title,
            description: guide.description,
            url: absoluteUrl(path),
            mainEntityOfPage: absoluteUrl(path),
            dateModified: discoveryContentLastModified.toISOString(),
            author: { '@type': 'Organization', name: 'Missa', url: absoluteUrl('/') },
            publisher: { '@type': 'Organization', name: 'Missa', url: absoluteUrl('/') },
          }}
        />
        {/* The questions and answers below are visible on the page; FAQPage only describes them. */}
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: guide.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          }}
        />
        <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Guides', path: '/guides' }, { name: guide.title }])} />
        <div className={styles.articleLayout}>
          <article className={styles.article}>
            <Link href="/guides" className={styles.eyebrow}>
              ← All guides
            </Link>
            <h1>{guide.title}</h1>
            <p className={styles.lede}>{guide.description}</p>
            <section className={styles.answer} aria-labelledby="short-answer-heading">
              <h2 id="short-answer-heading">Short answer</h2>
              <p>{guide.answer}</p>
            </section>
            <section className={styles.faq} aria-labelledby="questions-heading">
              <p className={styles.eyebrow}>Questions people ask</p>
              <h2 id="questions-heading">The details that decide it.</h2>
              {guide.faqs.map((faq) => (
                <article key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </section>
            {collections.length ? (
              <nav className={styles.actions} aria-label="Browse these calls">
                {collections.map((collection) => (
                  <Link key={collection.slug} href={`/discover/${collection.slug}`}>
                    {collection.title} <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </nav>
            ) : null}
          </article>
          <aside className={styles.related} aria-labelledby="related-heading">
            <p className={styles.eyebrow}>Open now</p>
            <h2 id="related-heading">Calls to look at</h2>
            {items.length ? (
              <div className={styles.relatedList}>
                {items.slice(0, 4).map((item) => (
                  <article key={item.id}>
                    <h3>{item.title}</h3>
                    <p>
                      {item.organizationName ?? 'Organizer not listed'} · {deadlineLabel(item)} · {feeLabel(item)}
                    </p>
                    <Link href={`/opportunities/${encodeURIComponent(item.slug || item.id)}`}>
                      See the call <ArrowRight aria-hidden="true" />
                    </Link>
                    <a href={item.source.url} target="_blank" rel="noreferrer">
                      Organizer’s page <ExternalLink aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <p>
                  {unavailable
                    ? 'Open calls can’t be shown right now. The guide still reads in full.'
                    : 'No open calls match this guide right now.'}
                </p>
                <Link href="/opportunities">
                  Browse all open calls <ArrowRight aria-hidden="true" />
                </Link>
              </>
            )}
          </aside>
        </div>
        <div className={styles.section}>
          <GuideLinks path={path} />
        </div>
      </main>
    </PublicSiteShell>
  );
}
