import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { MissaSiteHeader } from "@/components/missa-site-header";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./public-site-shell.module.css";

export async function PublicSiteShell({
  children,
  current,
  collectionLinks,
}: {
  children: ReactNode;
  current?: string;
  collectionLinks?: Array<{ slug: string; title: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const headerSession = session
    ? {
        email: session.account.email,
        hasOrganization: session.memberships.length > 0,
      }
    : null;

  return (
    <div className={styles.site}>
      <MissaSiteHeader session={headerSession} current={current} />
      {children}
      <footer
        className={styles.footer}
        data-collections={Boolean(collectionLinks?.length) || undefined}
      >
        {collectionLinks?.length ? (
          <nav
            className={styles.collections}
            aria-labelledby="footer-collections-title"
          >
            <h2 id="footer-collections-title" className="font-sans">
              Keep exploring
            </h2>
            <div>
              {collectionLinks.map((collection) => (
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
            Creative Opportunities with the source, facts, and limits kept
            visible.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/directory">Directory</Link>
          <Link href="/residencies">Residencies</Link>
          <Link href="/journals">Journals</Link>
          <Link href="/grants">Grants</Link>
          <Link href="/for-organizations">For organizations</Link>
          <a href="mailto:hello@usemissa.com">Contact</a>
        </nav>
      </footer>
    </div>
  );
}
