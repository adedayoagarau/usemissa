import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, ListChecks } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { pageMetadata } from '@/lib/seo';
import styles from './not-found.module.css';

export const metadata = pageMetadata({
  title: 'Page not found',
  description: "Missa doesn't have a source for this page. It may have moved, or the link may be mistyped.",
  path: '/404',
  noIndex: true,
});

const destinations = [
  {
    icon: Compass,
    title: 'Browse Opportunities',
    body: 'Open calls with their source, eligibility, and deadline kept separate and current.',
    href: '/opportunities',
    label: 'Browse Opportunities',
  },
  {
    icon: BookOpen,
    title: 'Read Guides',
    body: "Explanations of how Missa sources, verifies, and presents each Opportunity.",
    href: '/guides',
    label: 'Read Guides',
  },
  {
    icon: ListChecks,
    title: 'How Missa works',
    body: 'Why the official call stays authoritative and unknown facts stay visible.',
    href: '/methodology',
    label: 'Read the methodology',
  },
];

export default function NotFound() {
  return (
    <PublicSiteShell current="Not found">
      <main id="main-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="not-found-heading">
          <div>
            <p className={styles.eyebrow}>Error 404</p>
            <h1 id="not-found-heading">Unknown stays unknown—and this page is one of them.</h1>
            <p>We don&rsquo;t have a source for this page. The link may be old, mistyped, or the page may never have existed. Missa isn&rsquo;t going to guess where it went.</p>
            <div className={styles.actions}>
              <Link href="/" className={styles.primaryAction}>Go home<ArrowRight aria-hidden="true" /></Link>
              <Link href="/opportunities" className={styles.secondaryAction}>Browse Opportunities<ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
          <div className={styles.plate} aria-hidden="true">
            <span>404</span>
            <p>No record found</p>
          </div>
        </section>

        <section className={styles.destinations} aria-label="Where to go instead">
          {destinations.map(({ icon: Icon, title, body, href, label }) => (
            <article key={href}>
              <Icon aria-hidden="true" />
              <h2>{title}</h2>
              <p>{body}</p>
              <Link href={href}>{label}<ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </section>
      </main>
    </PublicSiteShell>
  );
}
