import Link from "next/link";
import { ArrowRight, ArrowUpRight, BellRing, Bookmark } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { MissaWordmark } from "@/components/missa-wordmark";
import { visibleHomepageStats } from "@/lib/homepageStatDisplay";
import { contactMailto } from "@/lib/legalContact";
import { categorySearch } from "@/lib/homepage-opportunity-categories";
import { Reveal } from "./homepage-reveal";
import { HomepageMorph } from "./homepage-morph";
import { HeroWord } from "./homepage-hero-word";
import { MissaArt } from "@/components/illustrations/missa-illustrations";
import { HomepageQuestions } from "./homepage-standard-client";
import {
  ProfileVignette,
  ReminderEmailVignette,
  TrackerItemVignette,
  longDate,
} from "./homepage-vignettes";
import {
  weekBeforeReminder,
  type Showcase,
  type VignetteCall,
} from "@/lib/homepageShowcase";
import styles from "./homepage-standard.module.css";


export function HomepageHero({
  open,
  closingThisWeek,
  tourCall,
}: {
  open: number | null;
  closingThisWeek: number | null;
  tourCall: VignetteCall | null;
}) {
  const totals = visibleHomepageStats([
    { label: "open now", value: open ?? 0 },
    { label: "closing this week", value: closingThisWeek ?? 0 },
  ]);
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
      <h1 id="homepage-heading" className="font-heading">
        Find your next open <HeroWord />
      </h1>
      <p className={styles.lede}>
        Get automated reminders, find your artist circle, and focus on
        creating.
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
          <HomepageMorph call={tourCall} />
        </div>
      ) : null}
      {/* Stands in for the tour where it is hidden, and wherever no call is
          available to drive it. */}
      <span className={styles.heroArt} data-beside-tour={tourCall ? "" : undefined}>
        <MissaArt id="scene-hero" />
      </span>
    </header>
  );
}

function FeatureCard({
  id,
  tone,
  spot,
  headline,
  children,
  href,
  action,
  caption,
  stage,
  delay = 0,
}: {
  id: string;
  tone: "ochre" | "lichen" | "blue";
  spot: "spot-tracker" | "spot-reminders" | "spot-portfolio";
  headline: string;
  children: ReactNode;
  href: string;
  action: string;
  caption: string;
  stage: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal className={styles.featureSlot} delay={delay}>
      <article className={styles.feature} aria-labelledby={`homepage-feature-${id}`}>
        <div className={styles.featureStage} data-tone={tone}>
          <MissaArt id={spot} className={styles.featureSpot} />
          <div className={styles.featureProduct} aria-hidden="true">
            {stage}
          </div>
          <p className={styles.featureCaption}>{caption}</p>
        </div>
        <div className={styles.featureText}>
          <h3 id={`homepage-feature-${id}`} className="font-heading">
            {headline}
          </h3>
          <p>{children}</p>
          <Link href={href} className={styles.textLink}>
            {action} <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}

export function HomepageProof({ showcase }: { showcase: Showcase }) {
  const first = showcase.urgent ?? showcase.lead;
  const second = showcase.urgent ? showcase.lead : null;
  // The email a creator receives a week before the deadline, with the real date.
  const reminderCall = showcase.lead ?? showcase.urgent;
  const reminder = reminderCall ? weekBeforeReminder(reminderCall) : null;
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
          <Link href="/signup" className={styles.textLink}>
            Create an account <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <MissaArt id="scene-after-find" className={styles.sectionArt} />
      </Reveal>
      <div className={styles.features}>
        <FeatureCard
          id="tracker"
          tone="ochre"
          spot="spot-tracker"
          headline="Keep every deadline in one view."
          href="/tracker"
          action="Open your Tracker"
          caption="Example, built from calls open today"
          stage={
            first ? (
              <div className={styles.trackerStack}>
                <TrackerItemVignette call={first} />
                {second ? <TrackerItemVignette call={second} /> : null}
              </div>
            ) : null
          }
        >
          Save a call and it waits in your Tracker with its deadline, stage and
          reminders.
        </FeatureCard>
        <FeatureCard
          id="reminders"
          tone="lichen"
          spot="spot-reminders"
          headline="A nudge before it closes."
          href="/tracker"
          action="Choose your reminders"
          caption="Example, built from a call open today"
          delay={0.06}
          stage={
            reminder ? (
              <div className={styles.vignetteFrame}>
                <ReminderEmailVignette call={reminder} />
              </div>
            ) : null
          }
        >
          Missa emails you before a saved call closes. You choose how early.
        </FeatureCard>
        <FeatureCard
          id="portfolio"
          tone="blue"
          spot="spot-portfolio"
          headline="One page for the work you make."
          href="/profile/portfolio"
          action="Build your portfolio"
          caption="Example, a fictional creator"
          delay={0.12}
          stage={<div className={styles.vignetteFrame}><ProfileVignette /></div>}
        >
          Writing, images and audio on one page. Other creators can follow you
          and get in touch.
        </FeatureCard>
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
          <MissaArt id="scene-questions" className={styles.questionsArt} />
        </div>
        <HomepageQuestions />
      </Reveal>
    </section>
  );
}

export function HomepageClose({ showcase }: { showcase: Showcase }) {
  const first = showcase.lead ?? showcase.urgent;
  const second = showcase.lead ? showcase.urgent : null;
  const firstCloses = first ? longDate(first.date) : null;
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
              Browse open calls <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </div>
        <div className={styles.closeCards} aria-hidden="true">
          <span className={styles.closeScene}>
            <MissaArt id="scene-close" reverse />
          </span>
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
