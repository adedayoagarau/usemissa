import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { NotFoundEpigraph, NotFoundPlate } from '@/components/not-found-identity';
import { pageMetadata } from '@/lib/seo';
import styles from './not-found.module.css';

export const metadata = pageMetadata({
  title: 'Page not found',
  description: "Missa doesn't have a source for this page. It may have moved, or the link may be mistyped.",
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  return (
    <PublicSiteShell current="Not found">
      <main id="main-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="not-found-heading">
          <div>
            <p className={styles.eyebrow}>Error 404</p>
            <h1 id="not-found-heading">Unknown stays unknown—and this page is one of them.</h1>
            <p>We don&rsquo;t have a source for this page. The link may be old, mistyped, or the page may never have existed. Missa isn&rsquo;t going to guess where it went.</p>
            <NotFoundEpigraph />
            <div className={styles.actions}>
              <Link href="/opportunities" className={styles.primaryAction}>Browse Opportunities<ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
          <NotFoundPlate />
        </section>
      </main>
    </PublicSiteShell>
  );
}
