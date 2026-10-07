import type { ReactNode } from "react";
import Link from "next/link";
import {
  MissaSiteHeader,
  type HeaderSession,
} from "@/components/missa-site-header";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./public-site-shell.module.css";
import { contactMailto } from "@/lib/legalContact";
import { discoveryCollections } from "@/lib/discoveryGuides";

/**
 * Public page frame. It reads no request data, so the pages inside it can be
 * served from the CDN; the header resolves the visitor's session in the
 * browser unless a page that already has it passes `session`.
 */
export function PublicSiteShell({
  children,
  current,
  collectionLinks,
  session,
}: {
  children: ReactNode;
  current?: string;
  collectionLinks?: Array<{ slug: string; title: string }>;
  session?: HeaderSession;
}) {
  // Every public page links the discover hubs, so none of them is orphaned.
  const collections = collectionLinks ?? discoveryCollections;
  return (
    <div className={styles.site}>
      <MissaSiteHeader session={session} current={current} />
      {children}
      <footer
        className={styles.footer}
        data-collections={Boolean(collections.length) || undefined}
      >
        {collections.length ? (
          <nav
            className={styles.collections}
            aria-labelledby="footer-collections-title"
          >
            <h2 id="footer-collections-title" className="font-sans">
              Keep exploring
            </h2>
            <div>
              {collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/discover/${collection.slug}`}
                >
                  {collection.title}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
        <div>
          <MissaWordmark size="compact" className={styles.wordmark} />
          <p>
            Missa is new. If a call is wrong or missing,{" "}
            <a href={contactMailto("A call on Missa")}>tell us</a>.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/directory">Directory</Link>
          <Link href="/residencies">Residencies</Link>
          <Link href="/journals">Journals</Link>
          <Link href="/grants">Grants</Link>
          <Link href="/presses">Presses</Link>
          <Link href="/countries">Calls by country</Link>
          <Link href="/rankings/magazines">Magazine rankings</Link>
          <Link href="/rankings/residencies">Residency rankings</Link>
          <Link href="/discover/match">Manuscript matcher</Link>
          <Link href="/discover/prizes">Literary prizes</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={contactMailto()}>Share feedback</a>
        </nav>
      </footer>
    </div>
  );
}
