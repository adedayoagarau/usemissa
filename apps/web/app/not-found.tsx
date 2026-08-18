import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { NotFoundEpigraph, NotFoundMark } from '@/components/not-found-identity';
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
          <NotFoundMark />
          <h1 id="not-found-heading">Unknown stays unknown—and this page is one of them.</h1>
          <p>We don&rsquo;t have a source for this page. The link may be old, mistyped, or the page may never have existed.</p>

          <form className={styles.search} action="/opportunities" method="GET" role="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              name="q"
              placeholder="Search opportunities or organizations"
              aria-label="Search opportunities or organizations"
            />
            <button type="submit">Search</button>
          </form>

          <p className={styles.browseAll}>
            <Link href="/opportunities">Browse all Opportunities<ArrowRight aria-hidden="true" /></Link>
          </p>

          <NotFoundEpigraph />
        </section>
      </main>
    </PublicSiteShell>
  );
}
