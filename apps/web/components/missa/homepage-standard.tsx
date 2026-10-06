import Link from "next/link";
import { ArrowUpRight, BellRing, Bookmark } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";

import { buttonVariants } from "@/components/ui/button";
import { MissaWordmark } from "@/components/missa-wordmark";
import { visibleHomepageStats } from "@/lib/homepageStatDisplay";
import { contactMailto } from "@/lib/legalContact";
import { categorySearch } from "@/lib/homepage-opportunity-categories";
import { Reveal } from "./homepage-reveal";
import { HomepageMorph } from "./homepage-morph";
import {
  HomepageQuestions,
  PortfolioTile,
  RemindersTile,
  TrackerTile,
} from "./homepage-standard-client";
import styles from "./homepage-standard.module.css";

type HomepageCall = Pick<
  OpportunityBrowseProjection,
  "id" | "title" | "organizationName" | "deadline"
> &
  Partial<Pick<OpportunityBrowseProjection, "type">>;

function tourTypeLabel(type: string | undefined) {
  if (!type) return "Open call";
  const label = type.replace(/-/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * The call the hero tour and the reminder example are built from: the
 * soonest dated call whose week-before reminder is still ahead.
 */
export function pickTourCall<T extends HomepageCall>(items: T[], today: string): T | null {
  const ahead = new Date(`${today}T12:00:00Z`);
  ahead.setUTCDate(ahead.getUTCDate() + 8);
  const weekAhead = ahead.toISOString().slice(0, 10);
  const dated = items
    .filter(
      (item) =>
        item.deadline.kind === "exact" &&
        item.deadline.date &&
        Number.isFinite(Date.parse(item.deadline.date)),
    )
    .sort((a, b) => a.deadline.date!.localeCompare(b.deadline.date!));
  return (
    dated.find((item) => item.deadline.date!.slice(0, 10) >= weekAhead) ??
    dated.at(-1) ??
    null
  );
}

export function HomepageHero({
  open,
  closingThisWeek,
  tourCall,
}: {
  open: number | null;
  closingThisWeek: number | null;
  tourCall: HomepageCall | null;
}) {
  const totals = visibleHomepageStats([
    { label: "open now", value: open ?? 0 },
    { label: "closing this week", value: closingThisWeek ?? 0 },
  ]);
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
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
      </div>
      {tourCall ? (
        <div className={styles.heroTour}>
          <HomepageMorph
            call={{
              title: tourCall.title,
              typeLabel: tourTypeLabel(tourCall.type),
              organizationName: tourCall.organizationName,
              deadline: { date: tourCall.deadline.date ?? null },
            }}
          />
        </div>
      ) : null}
    </header>
  );
}

export function HomepageProof({
  items,
  today,
}: {
  items: HomepageCall[];
  /** ISO date (YYYY-MM-DD) of this render. */
  today: string;
}) {
  return (
    <section className={styles.section} aria-labelledby="homepage-proof-heading">
      <Reveal className={styles.sectionHead}>
        <div>
          <h2 id="homepage-proof-heading" className="font-heading">
            Everything after you find the call.
          </h2>
          <p className={styles.sectionLede}>
            Shortlist it from this page. Keep the deadline, get a reminder
            before it closes, and share the work you make.
          </p>
        </div>
        <Link href="/signup" className={styles.textLink}>
          Create an account <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </Reveal>
      <div className={styles.tiles}>
        <TrackerTile items={items} />
        <PortfolioTile />
        <RemindersTile call={pickTourCall(items, today)} />
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
      <Reveal className={styles.questionsLayout}>
        <div className={styles.questionsIntro}>
          <h2 id="homepage-questions-heading" className="font-heading">
            Questions about Missa.
          </h2>
          <p className={styles.sectionLede}>
            Short answers to what creators ask first. Anything else, write to
            us.
          </p>
          <a href={contactMailto()} className={styles.textLink}>
            Contact us <ArrowUpRight aria-hidden="true" size={18} />
          </a>
        </div>
        <HomepageQuestions />
      </Reveal>
    </section>
  );
}

function closeCards(items: HomepageCall[]) {
  const dated = items
    .filter((item) => item.deadline.kind === "exact" && item.deadline.date)
    .sort((a, b) => a.deadline.date!.localeCompare(b.deadline.date!));
  const first = dated[0];
  const second = dated[1] ?? items.find((item) => item.id !== first?.id);
  const closes = (item: HomepageCall | undefined) =>
    item?.deadline.date
      ? new Date(`${item.deadline.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(
          "en",
          { day: "numeric", month: "short", timeZone: "UTC" },
        )
      : null;
  return { first, second, firstCloses: closes(first) };
}

export function HomepageClose({ items }: { items: HomepageCall[] }) {
  const { first, second, firstCloses } = closeCards(items);
  return (
    <section className={styles.close} aria-labelledby="homepage-close-heading">
      <Reveal className={styles.closePanel}>
        <div className={styles.closeCopy}>
          <h2 id="homepage-close-heading" className="font-heading">
            Shortlist calls. Keep every deadline. Share your work.
          </h2>
          <p className={styles.closeLede}>
            Your shortlist comes with you the moment you create an account.
          </p>
          <div className={styles.closeActions}>
            <Link href="/signup" className={`${buttonVariants({ variant: "default" })} ${styles.closePrimary}`}>
              Create an account
            </Link>
            <Link href="/opportunities" className={styles.closeLink}>
              Browse opportunities <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </div>
        <div className={styles.closeCards} aria-hidden="true">
          <div className={styles.closeCard} data-back>
            <span className={styles.closeCardLabel}>
              <Bookmark size={14} /> Shortlisted
            </span>
            <strong>{second?.title ?? "A call you want to come back to"}</strong>
            {second?.organizationName ? <span>{second.organizationName}</span> : null}
          </div>
          <div className={styles.closeCard}>
            <span className={styles.closeCardLabel}>
              <BellRing size={14} /> Reminder set
            </span>
            <strong>{first?.title ?? "Your next deadline"}</strong>
            <span>{firstCloses ? `Closes ${firstCloses}` : "Closes on the date you save"}</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function HomepageFooterStandard() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <MissaWordmark size="marketing" />
          <p className={styles.footerTagline}>Open calls for creators, in one place.</p>
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
