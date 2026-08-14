import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { PublicSiteShell } from '@/components/public-site-shell';
import { PublicDiscoveryEvent } from '@/components/public-discovery-event';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { discoveryContentLastModified, discoveryGuide, discoveryGuides } from '@/lib/discoveryGuides';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import styles from '../../public-editorial.module.css';

export const dynamic = 'force-dynamic';

function deadlineLabel(item: OpportunityBrowseProjection): string {
  if (item.deadline.date) return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${item.deadline.date}T12:00:00`));
  if (item.deadline.kind === 'rolling') return 'Rolling deadline';
  if (item.deadline.kind === 'until-filled') return 'Open until filled';
  if (item.deadline.kind === 'conflicting') return 'Deadline conflicts';
  return 'Deadline not published';
}

function feeLabel(item: OpportunityBrowseProjection): string {
  if (item.fee.status === 'no-fee') return 'No application fee';
  if (item.fee.status === 'paid') return item.fee.raw ?? 'Application fee';
  return 'Fee not published';
}

export function generateStaticParams() { return discoveryGuides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = discoveryGuide(slug);
  return guide
    ? pageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}` })
    : pageMetadata({ title: 'Guide not found', description: 'This Missa Guide is not available.', path: `/guides/${slug}`, noIndex: true });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = discoveryGuide(slug);
  if (!guide) notFound();
  let items: OpportunityBrowseProjection[] = [];
  let unavailable = false;
  try { items = (await getOpportunityRepository().browse(guide.query)).items; } catch { unavailable = true; }

  return <PublicSiteShell current="Guides"><main id="main-content" className={styles.main}>
    <PublicDiscoveryEvent eventName="public.guide_view" properties={{ guide: guide.slug, resultCount: items.length }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: guide.title, description: guide.description, url: absoluteUrl(`/guides/${guide.slug}`), dateModified: discoveryContentLastModified.toISOString(), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') } }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: guide.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) }} />
    <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Guides', path: '/guides' }, { name: guide.title }])} />
    <div className={styles.articleLayout}>
      <article className={styles.article}>
        <Link href="/guides" className={styles.eyebrow}>← All Guides</Link>
        <h1>{guide.title}</h1>
        <p className={styles.lede}>{guide.description}</p>
        <section className={styles.answer} aria-labelledby="short-answer-heading"><h2 id="short-answer-heading">Short answer</h2><p>{guide.answer}</p></section>
        <section className={styles.faq} aria-labelledby="questions-heading"><p className={styles.eyebrow}>Questions creators ask</p><h2 id="questions-heading">Keep the consequential details separate.</h2>{guide.faqs.map((faq) => <article key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</section>
      </article>
      <aside className={styles.related} aria-labelledby="related-heading">
        <p className={styles.eyebrow}>Related Opportunities</p><h2 id="related-heading">Published records to review</h2>
        {items.length ? <div className={styles.relatedList}>{items.slice(0, 4).map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.organizationName ?? 'Organization not confirmed'} · {deadlineLabel(item)} · {feeLabel(item)}</p><Link href={`/opportunities/${item.slug}`}>Open Opportunity <ArrowRight aria-hidden="true" /></Link><a href={item.source.url} target="_blank" rel="noreferrer">Official source <ExternalLink aria-hidden="true" /></a></article>)}</div> : <><p>{unavailable ? 'Related Opportunities are temporarily unavailable. The Guide remains readable.' : 'Missa has no matching published records in this collection right now. That does not mean no such Opportunities exist.'}</p><Link href="/opportunities">Browse all Opportunities <ArrowRight aria-hidden="true" /></Link></>}
      </aside>
    </div>
  </main></PublicSiteShell>;
}
