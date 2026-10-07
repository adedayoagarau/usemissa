import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { DEFAULT_DESCRIPTION, JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Sp } from '@/components/missa/spelling';
import { founderNote } from '@/lib/founder-note';
import styles from '../public-editorial.module.css';

export const metadata = pageMetadata({ title: 'About Missa', description: 'Making the work is half the job. Missa does most of the other half: finding the call, keeping the dates and remembering what went where.', path: '/about' });

const principles = [
  ['We always link to the organizer’s page', 'Missa makes a call easier to read. The organizer’s own page still has the final word, and every call links to it.'],
  ['If the page doesn’t say, neither do we', 'When a fee, a deadline or who can apply isn’t stated, the call says so. We don’t fill the gap with a guess.'],
  ['Your saves and notes are private', 'What you save, what you send, your notes and your reminders are yours. Nobody else sees them.'],
  ['We don’t touch the work', 'Missa doesn’t write, judge or rewrite anything you make, and nothing trains on it.'],
];

export default function AboutPage() {
  return <PublicSiteShell current="About"><main id="main-content" className={styles.main}>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Missa', description: DEFAULT_DESCRIPTION, url: absoluteUrl('/about'), about: { '@type': 'Organization', name: 'Missa', url: absoluteUrl('/') } }} />
    <JsonLd data={breadcrumbJsonLd([{ name: 'Missa', path: '/' }, { name: 'About Missa' }])} />
    <header className={styles.hero}><p className={styles.eyebrow}>About Missa</p><h1>Making the work is half the job.</h1><p>The other half is finding where to send it, keeping the dates and remembering what went where. Missa does most of that half.</p></header>
    {founderNote ? <section className={`${styles.section} ${styles.note}`} aria-labelledby="founder-note-heading"><p className={styles.eyebrow}>A note from the founder</p><h2 id="founder-note-heading" className="font-heading">Why Missa exists</h2>{founderNote.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<footer><strong>{founderNote.name}</strong><span>{founderNote.role}</span></footer></section> : null}
    <section className={styles.principles} aria-label="Missa principles">{principles.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2><Sp>{title}</Sp></h2><p><Sp>{copy}</Sp></p></div></article>)}</section>
    <nav className={styles.actions} aria-label="Continue from About"><Link href="/opportunities">Browse open calls <ArrowRight aria-hidden="true" /></Link><Link href="/methodology">How we check a call <ArrowRight aria-hidden="true" /></Link><Link href="/for-organizations"><Sp>For organizations</Sp> <ArrowRight aria-hidden="true" /></Link></nav>
  </main></PublicSiteShell>;
}
