import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { PrintButton } from "./print-button";
import {
  RECORD_KINDS,
  type PortfolioData,
  type PortfolioRecordItem,
} from "@/lib/creator-portfolio-schema";
import styles from "./creator-cv.module.css";

const GROUPS: Record<PortfolioRecordItem["kind"], string> = {
  publication: "Publications",
  prize: "Prizes and shortlists",
  residency: "Residencies",
  grant: "Grants and fellowships",
  exhibition: "Exhibitions",
  performance: "Performances",
  screening: "Screenings",
  other: "Other",
};

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** A printable CV built from the published track record, shelf and work. */
export function CreatorCv({
  portfolio,
  handleKey,
  backHref,
}: {
  portfolio: PortfolioData;
  handleKey: string;
  backHref: string;
}) {
  const resolved = { handleKey };
  const byYear = (a: { year: string }, b: { year: string }) =>
    b.year.localeCompare(a.year);
  const groups = RECORD_KINDS.map((kind) => ({
    kind,
    entries: portfolio.record
      .filter((entry) => entry.kind === kind)
      .sort(byYear),
  })).filter((group) => group.entries.length);
  const shelf = [...portfolio.shelf].sort(byYear);
  const works = portfolio.works.filter((work) => work.title.trim());
  const contact = [
    portfolio.contact.email,
    hostname(portfolio.contact.website),
    `usemissa.com/@${resolved.handleKey}`,
  ].filter(Boolean);
  const generated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const anyConfirmed = portfolio.record.some(
    (entry) => entry.provenance === "confirmed",
  );

  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.toolbar}>
        <Link href={backHref} className={styles.back}>
          <ArrowLeft aria-hidden="true" />
          Back to profile
        </Link>
        <PrintButton />
      </div>
      <article className={styles.sheet}>
        <header className={styles.header}>
          <h1 className="font-heading">{portfolio.name}</h1>
          {portfolio.selected.length > 0 && (
            <p className={styles.practice}>{portfolio.selected.join(" · ")}</p>
          )}
          <p className={styles.contact}>
            {[portfolio.location, ...contact].filter(Boolean).join("   ·   ")}
          </p>
          {portfolio.bio && <p className={styles.bio}>{portfolio.bio}</p>}
        </header>

        {groups.map((group) => (
          <section key={group.kind} className={styles.section}>
            <h2>{GROUPS[group.kind]}</h2>
            <ol>
              {group.entries.map((entry) => (
                <li key={entry.id ?? `${entry.year}${entry.title}`}>
                  <span className={`${styles.year} font-mono`}>
                    {entry.year}
                  </span>
                  <span>
                    <strong>{entry.title}</strong>
                    {(entry.organization?.name || entry.venue) &&
                      `, ${entry.organization?.name || entry.venue}`}
                  </span>
                  {entry.provenance === "confirmed" && (
                    <span className={styles.confirmed}>
                      <BadgeCheck aria-hidden="true" />
                      Confirmed
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        {shelf.length > 0 && (
          <section className={styles.section}>
            <h2>Books and releases</h2>
            <ol>
              {shelf.map((item) => (
                <li key={item.id ?? item.title}>
                  <span className={`${styles.year} font-mono`}>
                    {item.year}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    {item.publisher && `, ${item.publisher}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {works.length > 0 && (
          <section className={styles.section}>
            <h2>Selected work</h2>
            <ol>
              {works.map((work) => (
                <li key={work.id ?? work.title}>
                  <span className={`${styles.year} font-mono`}>
                    {work.year}
                  </span>
                  <span>
                    <strong>{work.title}</strong>
                    {work.kind && `, ${work.kind.toLowerCase()}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className={styles.footer}>
          Generated from usemissa.com/@{resolved.handleKey} on {generated}.
          {anyConfirmed &&
            " Entries marked Confirmed were recorded by the organization on Missa."}
        </footer>
      </article>
    </main>
  );
}
