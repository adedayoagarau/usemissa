import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { OpportunityCatalogueCard } from "@/components/opportunity-catalogue-card";
import { PublicSiteShell } from "@/components/public-site-shell";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import styles from "./home.module.css";

export const metadata = pageMetadata({
  title: "Missa — Creative Opportunities, kept understandable",
  description:
    "Find credible creative Opportunities, open the official source, and keep your decision and deadline together.",
  path: "/",
});

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const signedIn = Boolean(session);
  let opportunities: OpportunityBrowseProjection[] = [];
  let unavailable = false;

  try {
    opportunities = (
      await getOpportunityRepository().browse(
        { openNow: true, sort: "soonest-deadline", limit: 3 },
        session?.account.id ? { accountId: session.account.id } : undefined,
      )
    ).items;
  } catch {
    unavailable = true;
  }

  return (
    <PublicSiteShell current="Home">
      <main id="main-content" className={styles.main}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Missa",
            url: absoluteUrl("/"),
            description:
              "Creative Opportunities with their source and limits kept visible.",
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/opportunities")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }}
        />

        <section className={styles.hero} aria-labelledby="home-heading">
          <div>
            <p className={styles.eyebrow}>
              Creative Opportunities, kept understandable
            </p>
            <h1 id="home-heading">Find the call worth your time.</h1>
            <p>
              Missa helps you compare the facts, open the official source, save
              your decision, and keep track of what comes next.
            </p>
            <div className={styles.heroActions}>
              <Link
                href={signedIn ? "/home" : "/opportunities"}
                className={styles.primaryAction}
              >
                {signedIn ? "Open Missa" : "Browse Opportunities"}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/methodology" className={styles.secondaryAction}>
                How Missa handles evidence
              </Link>
            </div>
          </div>
          <aside
            className={styles.sourcePromise}
            aria-labelledby="source-promise-title"
          >
            <ExternalLink aria-hidden="true" />
            <p>Start with the source</p>
            <h2 id="source-promise-title">
              The official call remains authoritative.
            </h2>
            <span>
              Unknown or conflicting facts stay visible. Missa does not turn
              missing information into reassurance.
            </span>
            <Link href="/methodology">
              Read the methodology <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        </section>

        <section
          className={styles.opportunities}
          aria-labelledby="open-opportunities-heading"
        >
          <header className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Published Opportunities</p>
              <h2 id="open-opportunities-heading">Open something useful now</h2>
              <span>
                A small current set—not fabricated demo records and not a
                popularity ranking.
              </span>
            </div>
            <Link href="/opportunities">
              Browse all <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {opportunities.length ? (
            <div className={styles.opportunityGrid}>
              {opportunities.map((item) => (
                <OpportunityCatalogueCard
                  key={item.id}
                  item={item}
                  signedIn={signedIn}
                />
              ))}
            </div>
          ) : (
            <div
              className={styles.emptyState}
              role={unavailable ? "alert" : "status"}
            >
              <BookOpen aria-hidden="true" />
              <h3>
                {unavailable
                  ? "Opportunities are temporarily unavailable"
                  : "No published Opportunities to show here"}
              </h3>
              <p>
                {unavailable
                  ? "You can still learn how Missa works. Try the Opportunity library again later."
                  : "Missa is not substituting sample records. Return when published records are available."}
              </p>
              <div>
                <Link href="/methodology">How Missa works</Link>
                <Link href="/opportunities">Open the library</Link>
              </div>
            </div>
          )}
        </section>

        <section className={styles.path} aria-labelledby="missa-path-heading">
          <header>
            <p className={styles.eyebrow}>One connected path</p>
            <h2 id="missa-path-heading">Decide, prepare, and remember</h2>
          </header>
          <ol>
            <li>
              <span>01</span>
              <strong>Read the independent facts</strong>
              <p>
                Field, eligibility, geography, fee, deadline, and Opportunity
                type remain separate.
              </p>
            </li>
            <li>
              <span>02</span>
              <strong>Save your decision</strong>
              <p>
                Keep the Opportunity and your private next action in Tracker.
              </p>
            </li>
            <li>
              <span>03</span>
              <strong>Prepare from the requirements</strong>
              <p>
                Use the official call to decide which Work and materials belong.
              </p>
            </li>
            <li>
              <span>04</span>
              <strong>Keep the record</strong>
              <p>
                Submission receipts, decisions, and obligations stay attached to
                the right Work.
              </p>
            </li>
          </ol>
        </section>

        <section className={styles.audiences}>
          <article>
            <ListChecks aria-hidden="true" />
            <p className={styles.eyebrow}>For creators</p>
            <h2>Keep your Opportunities and Works together.</h2>
            <p>
              Your Profile, Tracker, and Library are private working tools—not
              public scores.
            </p>
            <Link href={signedIn ? "/profile" : "/signup?next=%2Fprofile"}>
              {signedIn ? "Open Profile" : "Create an account"}{" "}
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
          <article>
            <Building2 aria-hidden="true" />
            <p className={styles.eyebrow}>For Organizations</p>
            <h2>Run the path from call to per-Work outcome.</h2>
            <p>
              Publish clearly, receive Submissions, review each Work,
              communicate decisions, and coordinate delivery.
            </p>
            <Link href="/for-organizations">
              See the Organization workflow <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </section>
      </main>
    </PublicSiteShell>
  );
}
