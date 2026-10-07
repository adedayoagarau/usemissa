import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import styles from '../public-editorial.module.css';
import { contactMailto } from "@/lib/legalContact";
import { Sp } from "@/components/missa/spelling";

export const metadata = pageMetadata({ title: 'How Missa checks a call', description: 'We read the organizer’s page so you can decide faster. Every call links back to it, and anything we couldn’t confirm says so.', path: '/methodology' });

const facts = [
  ['The organizer’s page', 'Every call links to the organizer’s own page, so you can read their words before you do anything.'],
  ['Dates', 'A fixed deadline, a rolling call, “until filled” and “not announced yet” are all different, and we show which one it is.'],
  ['Fees and rules', 'The fee, what to send, who can apply, where and in what format are each listed on their own.'],
  ['Gaps and clashes', 'If something isn’t stated, or two sources disagree, the call says so. We don’t pick one quietly.'],
];

export default function MethodologyPage() {
  return <PublicSiteShell current="Methodology"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'How Missa checks a call', description: 'How Missa reads organizers’ pages, and what it can and can’t promise.', url: absoluteUrl('/methodology'), isPartOf: { '@type': 'WebSite', name: 'Missa', url: absoluteUrl('/') } }} />
    <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'Methodology' }])} />
    <header className={styles.hero}><p className={styles.eyebrow}>How Missa works</p><h1>How we check a call</h1><p><Sp>We read the organizer’s page so you can decide faster. Pages change and rules have exceptions, so we always send you there before you apply. We can’t promise you’re eligible, that you’ll get in, or that a page won’t change.</Sp></p></header>
    <section className={styles.section} aria-labelledby="public-record-heading"><header className={styles.sectionHeader}><p className={styles.eyebrow}>What every call shows</p><h2 id="public-record-heading">Each fact on its own.</h2><p>A call that looks familiar can still have a different fee, deadline or rule. So each one gets checked and shown separately.</p></header><div className={styles.facts}>{facts.map(([title, copy]) => <article key={title}><h3><Sp>{title}</Sp></h3><p><Sp>{copy}</Sp></p></article>)}</div></section>
    <section className={styles.responsibility} aria-labelledby="responsibility-heading"><div><p className={styles.eyebrow}>Before you send</p><h2 id="responsibility-heading"><Sp>Read the organizer’s page once more.</Sp></h2><p>Check the deadline, the fee, who can apply, what to send, the rights and how to submit on their own page. If something on Missa looks wrong, tell us and we’ll fix it.</p><nav className={styles.actions}><Link href="/opportunities">Browse open calls <ArrowRight aria-hidden="true" /></Link><a href={contactMailto()}>Report a mistake <ExternalLink aria-hidden="true" /></a></nav></div><aside className={styles.notice}><strong>Listed isn’t the same as guaranteed</strong><p><Sp>Every call on Missa has passed our checks, but organizers change things. A call can still have gaps, clashes or a newer version on their page.</Sp></p></aside></section>
  </main></PublicSiteShell>;
}
