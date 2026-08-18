import { Search } from 'lucide-react';
import { PublicSiteShell } from '@/components/public-site-shell';
import { NotFoundBlob, NotFoundEpigraph } from '@/components/not-found-identity';
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
        <h1 className={styles.srOnly}>Page not found</h1>

        <NotFoundBlob />
        <NotFoundEpigraph />

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
      </main>
    </PublicSiteShell>
  );
}
