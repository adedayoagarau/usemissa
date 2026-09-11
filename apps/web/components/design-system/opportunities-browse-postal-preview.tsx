"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./opportunities-browse-postal-preview.module.css";

const typeCards = [
  {
    label: "Grant",
    line: "Support with the terms kept visible.",
    href: "/opportunities?type=grant",
  },
  {
    label: "Residency",
    line: "Time and space to make the work.",
    href: "/opportunities?type=residency",
  },
  {
    label: "Fellowship",
    line: "Structured programs with clear limits.",
    href: "/opportunities?type=fellowship",
  },
  {
    label: "Open call",
    line: "Submissions with the source attached.",
    href: "/opportunities?type=open-call",
  },
  {
    label: "Award",
    line: "Prizes and recognition with published criteria.",
    href: "/opportunities?type=award",
  },
  {
    label: "Commission",
    line: "Paid work briefs from organizations.",
    href: "/opportunities?type=commission",
  },
] as const;

const liveCards = [
  {
    title: "Rauschenberg Medical Emergency Grants",
    org: "NYFA",
    type: "Grant",
    image: "/media/home/artist-at-work.webp",
  },
  {
    title: "Oregon Book Awards",
    org: "Literary Arts",
    type: "Award",
    image: "/media/home/opportunity-mountains.webp",
  },
] as const;

export function OpportunitiesBrowsePostalPreview() {
  const [query, setQuery] = useState("");

  return (
    <div className={styles.shell}>
      <div className={styles.banner} role="note">
        <span>
          Option C · Postal types —{" "}
          <Link href="/design-system/opportunities-browse">all directions</Link>
        </span>
        <Link href="/design-system/opportunities-browse-v2">Option A</Link>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <MissaWordmark href="/" size="app" />
          <div className={styles.auth}>
            <Link href="/login" className={styles.login}>
              Log in
            </Link>
            <Link href="/signup" className={styles.create}>
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Opportunities</p>
          <h1>What you can find on Missa.</h1>
          <p className={styles.lede}>
            Six kinds of published openings — each links into the live catalogue.
          </p>
        </header>

        <div className={styles.postalGrid}>
          {typeCards.map((card) => (
            <Link key={card.label} href={card.href} className={styles.postcard}>
              <span className={styles.stamp} aria-hidden="true" />
              <span className={`${styles.postmark} font-mono`}>MISSA</span>
              <h2>{card.label}</h2>
              <p>{card.line}</p>
              <span className={styles.postalLink}>
                Browse
                <ArrowUpRight aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>

        <form
          className={styles.search}
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Or search the full catalogue"
            aria-label="Search opportunities"
          />
          <button type="submit">
            <ArrowUpRight aria-hidden="true" />
          </button>
        </form>

        <section className={styles.live} aria-labelledby="live-openings">
          <h2 id="live-openings">Open now</h2>
          <div className={styles.liveGrid}>
            {liveCards.map((item) => (
              <article key={item.title} className={styles.liveCard}>
                <a href="#top" className={styles.media} tabIndex={-1}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" />
                </a>
                <div className={styles.liveBody}>
                  <span className={`${styles.type} font-mono`}>{item.type}</span>
                  <h3 className="font-heading">
                    <a href="#top">{item.title}</a>
                  </h3>
                  <p>{item.org}</p>
                </div>
              </article>
            ))}
          </div>
          <Link href="/opportunities" className={styles.all}>
            Browse all openings
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </section>
      </main>
    </div>
  );
}
