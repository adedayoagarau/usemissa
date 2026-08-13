import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import styles from '../public-editorial.module.css';

export const metadata = pageMetadata({ title: 'How Missa handles Opportunity evidence', description: 'How Missa keeps official sources, public facts, conflicts, and unknowns visible without replacing the official call.', path: '/methodology' });

const facts = [
  ['Source identity', 'The official destination stays visible so you can read the Organization’s own call before acting.'],
  ['Dates and windows', 'Exact dates, rolling windows, until-filled calls, conflicts, and unpublished deadlines remain different states.'],
  ['Fees and requirements', 'Fees, materials, eligibility, geography, formats, and Opportunity type remain independent facts.'],
  ['Unknowns and conflicts', 'A public record can still contain unknown or conflicting facts. Missa does not silently resolve them for you.'],
];

export default function MethodologyPage() {
  return <PublicSiteShell current="Methodology"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'How Missa handles Opportunity evidence', description: 'Missa public evidence and responsibility methodology.', url: absoluteUrl('/methodology'), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') } }} />
    <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Methodology' }])} />
    <header className={styles.hero}><p className={styles.eyebrow}>Missa methodology</p><h1>Use the evidence. Keep the source in authority.</h1><p>Missa organizes public Opportunity facts so they are easier to compare. It does not guarantee eligibility, acceptance, safety, availability, or that a third-party page will remain unchanged.</p></header>
    <section className={styles.section} aria-labelledby="public-record-heading"><header className={styles.sectionHeader}><p className={styles.eyebrow}>What a public record keeps separate</p><h2 id="public-record-heading">Facts are not scores.</h2><p>A familiar field label does not establish geography, eligibility, fee, deadline, or fit. Each consequential fact keeps its own state and evidence.</p></header><div className={styles.facts}>{facts.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className={styles.responsibility} aria-labelledby="responsibility-heading"><div><p className={styles.eyebrow}>Your responsibility</p><h2 id="responsibility-heading">Read the official call before you commit.</h2><p>Confirm the deadline, fee, eligibility, required Works and materials, rights, terms, and submission route on the Organization’s own page. If a Missa record appears wrong, report it rather than relying on an assumption.</p><nav className={styles.actions}><Link href="/opportunities">Browse Opportunities <ArrowRight aria-hidden="true" /></Link><a href="mailto:hello@usemissa.com">Report a record issue <ExternalLink aria-hidden="true" /></a></nav></div><aside className={styles.notice}><strong>Publication is not a guarantee</strong><p>A published record meets Missa’s customer-safe evidence minimum. It may still include facts that are unknown, conflicting, or changed at the official source.</p></aside></section>
  </main></PublicSiteShell>;
}
