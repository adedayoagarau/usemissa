import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";

import { buttonVariants } from "@/components/ui/button";
import { MissaWordmark } from "@/components/missa-wordmark";
import { visibleHomepageStats } from "@/lib/homepageStatDisplay";
import { contactMailto } from "@/lib/legalContact";
import { categorySearch } from "@/lib/homepage-opportunity-categories";
import {
  HomepageQuestions,
  PortfolioExcerpt,
  TrackerExcerpt,
} from "./homepage-standard-client";
import styles from "./homepage-standard.module.css";

export function HomepageHero({
  open,
  closingThisWeek,
}: {
  open: number | null;
  closingThisWeek: number | null;
}) {
  const totals = visibleHomepageStats([
    { label: "open now", value: open ?? 0 },
    { label: "closing this week", value: closingThisWeek ?? 0 },
  ]);
  return (
    <header className={styles.hero}>
      <h1 id="homepage-heading" className="font-heading">Find your next open call.</h1>
      <p className={styles.lede}>
        Grants, residencies, publications and prizes in one place. Get
        automated reminders, find your artist circle, and become the artist you
        dreamed of.
      </p>
      {totals.length ? (
        <p className={styles.totals} aria-label="Catalogue totals">
          {totals.map((stat) => (
            <span key={stat.label}>
              <strong>{stat.formatted}</strong> {stat.label}
            </span>
          ))}
        </p>
      ) : null}
    </header>
  );
}

export function HomepageProof({
  items,
}: {
  items: Pick<
    OpportunityBrowseProjection,
    "id" | "title" | "organizationName" | "deadline"
  >[];
}) {
  return (
    <section className={styles.section} aria-labelledby="homepage-proof-heading">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="homepage-proof-heading" className="font-heading">
            Track your deadlines. Share your work.
          </h2>
          <p className={styles.sectionLede}>
            Save a call and its deadline stays with you, with reminders when you
            want them. Your portfolio gives your work one page to share.
          </p>
        </div>
        <Link href="/signup" className={styles.textLink}>
          Create an account <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
      <div className={styles.excerpts}>
        <TrackerExcerpt items={items} />
        <PortfolioExcerpt />
      </div>
    </section>
  );
}

export function HomepageQuestionsSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="homepage-questions-heading"
    >
      <div className={styles.sectionHead}>
        <h2 id="homepage-questions-heading" className="font-heading">Questions about Missa.</h2>
        <a href={contactMailto()} className={styles.textLink}>
          Contact us <ArrowUpRight aria-hidden="true" size={18} />
        </a>
      </div>
      <HomepageQuestions />
    </section>
  );
}

export function HomepageClose() {
  return (
    <section className={styles.close} aria-labelledby="homepage-close-heading">
      <h2 id="homepage-close-heading" className="font-heading">
        Shortlist calls. Keep every deadline. Share your work.
      </h2>
      <div className={styles.closeActions}>
        <Link href="/signup" className={buttonVariants({ variant: "default" })}>
          Create an account
        </Link>
        <Link href="/opportunities" className={styles.textLink}>
          Browse opportunities <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </section>
  );
}

export function HomepageFooterStandard() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <MissaWordmark size="marketing" />
        </div>
        <nav aria-label="Homepage footer navigation" className={styles.footerColumns}>
          <div>
            <span className={styles.footerHeading}>Calls</span>
            <Link href="/opportunities">Opportunities</Link>
            <Link href={`/opportunities?${categorySearch(["residency"])}`}>
              Residencies
            </Link>
            <Link href={`/opportunities?${categorySearch(["grant"])}`}>Grants</Link>
            <Link href={`/opportunities?${categorySearch(["magazine", "pitch"])}`}>
              Publications
            </Link>
          </div>
          <div>
            <span className={styles.footerHeading}>Explore</span>
            <Link href={`/opportunities?${categorySearch(["award", "contest"])}`}>
              Prizes
            </Link>
            <Link href={`/opportunities?${categorySearch(["exhibition"])}`}>
              Exhibitions
            </Link>
            <Link href={`/opportunities?${categorySearch(["festival"])}`}>
              Festivals
            </Link>
            <Link href="/directory">Directory</Link>
          </div>
          <div>
            <span className={styles.footerHeading}>Your work</span>
            <Link href="/profile/portfolio">Portfolio</Link>
            <Link href="/tracker">Tracker</Link>
          </div>
          <div>
            <span className={styles.footerHeading}>Tools and guides</span>
            <Link href="/rankings/magazines">Magazine rankings</Link>
            <Link href="/methodology">How Missa works</Link>
            <Link href="/about">About us</Link>
            <a href={contactMailto()}>Get in touch</a>
          </div>
          <div>
            <span className={styles.footerHeading}>Account</span>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Create an account</Link>
          </div>
        </nav>
        <div className={styles.footerLegal}>
          <span>© {new Date().getFullYear()} Missa</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
