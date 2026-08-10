import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import styles from '../public-editorial.module.css';

export const metadata = pageMetadata({ title: 'About Missa', description: 'Why Missa keeps creative Opportunity facts, sources, unknowns, and private creator decisions separate.', path: '/about' });

const principles = [
  ['Source first', 'The official Organization or source remains authoritative. Missa makes the stated facts easier to compare without replacing the call.'],
  ['Unknown stays unknown', 'Missing, conflicting, or unclear facts remain visible instead of becoming reassuring guesses.'],
  ['Private by default', 'Profile preferences, eligibility details, Tracker activity, applications, and messages are private working context.'],
  ['Per-Work truth', 'A Submission can contain several Works. Review evidence, decisions, communication, and delivery stay attached to the right Work.'],
];

export default function AboutPage() {
  return <PublicSiteShell current="About"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Missa', description: 'Missa helps creators understand and track creative Opportunities.', url: absoluteUrl('/about'), about: { '@type': 'Organization', name: 'Missa', url: absoluteUrl('/') } }} />
    <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'About Missa' }])} />
    <header className={styles.hero}><p className={styles.eyebrow}>About Missa</p><h1>Creative Opportunity infrastructure for clearer decisions.</h1><p>Missa helps creators understand and track Opportunities, and helps Organizations operate the path from a published call to review, decisions, communication, and delivery.</p></header>
    <section className={styles.principles} aria-label="Missa principles">{principles.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</section>
    <nav className={styles.actions} aria-label="Continue from About"><Link href="/opportunities">Browse Opportunities <ArrowRight aria-hidden="true" /></Link><Link href="/methodology">Read Methodology <ArrowRight aria-hidden="true" /></Link><Link href="/for-organizations">For Organizations <ArrowRight aria-hidden="true" /></Link></nav>
  </main></PublicSiteShell>;
}
