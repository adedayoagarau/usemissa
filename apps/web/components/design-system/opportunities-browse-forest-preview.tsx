"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Search,
  Tag,
  X,
} from "lucide-react";

import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./opportunities-browse-forest-preview.module.css";

type Opportunity = {
  id: string;
  title: string;
  organization: string | null;
  type: string;
  practices: string[];
  deadline: string;
  fee: string;
  image: string;
};

const fixtures: Opportunity[] = [
  {
    id: "1",
    title: "Rauschenberg Medical Emergency Grants",
    organization: "Robert Rauschenberg Foundation",
    type: "Grant",
    practices: ["Visual Arts"],
    deadline: "Sep 4, 2026",
    fee: "No fee",
    image: "/media/home/artist-at-work.webp",
  },
  {
    id: "2",
    title: "Oregon Book Awards",
    organization: "Literary Arts",
    type: "Award",
    practices: ["Poetry", "Fiction"],
    deadline: "Aug 28, 2026",
    fee: "$55.00",
    image: "/media/home/opportunity-mountains.webp",
  },
  {
    id: "3",
    title: "Open Call · Onsite Residency Q3–Q4 2027",
    organization: "GlogauAIR",
    type: "Residency",
    practices: ["Photography", "Dance"],
    deadline: "Rolling",
    fee: "Fee not listed",
    image: "/media/home/opportunity-architecture.webp",
  },
  {
    id: "4",
    title: "Black Horse Review Poetry Contest",
    organization: "Black Horse Review",
    type: "Award",
    practices: ["Poetry"],
    deadline: "Dec 15, 2026",
    fee: "$15.00",
    image: "/media/home/opportunity-mountains.webp",
  },
];

const filterLabels = ["Type", "Discipline", "Location", "Deadline", "Fee"] as const;

export function OpportunitiesBrowseForestPreview() {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    if (!query.trim()) return fixtures;
    const normalized = query.toLowerCase();
    return fixtures.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.organization?.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <div className={styles.shell}>
      <div className={styles.banner} role="note">
        <span>
          Option B · Forest band —{" "}
          <Link href="/design-system/opportunities-browse">all directions</Link>
        </span>
        <Link href="/design-system/opportunities-browse-v2">Option A</Link>
      </div>

      <section className={styles.band} aria-labelledby="forest-browse-title">
        <Image
          src="/design-system/homepage-hero/knit-h1.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.plate}
        />
        <header className={styles.bandHeader}>
          <MissaWordmark href="/" size="app" inverse />
          <nav className={styles.bandNav} aria-label="Primary navigation">
            <Link href="/opportunities" aria-current="page">
              Opportunities
            </Link>
            <Link href="/directory">Directory</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </header>
        <div className={styles.bandCopy}>
          <h1 id="forest-browse-title">
            Find calls for submissions, residencies, grants.
          </h1>
          <p>
            {items.length.toLocaleString()} published openings — search and
            filter below.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <form
          className={styles.search}
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search aria-hidden="true" className={styles.searchIcon} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by opportunity, organization, or discipline"
            aria-label="Search opportunities"
          />
          <button type="submit" className={styles.searchSubmit}>
            <span className={styles.searchMark} aria-hidden="true">
              <ArrowUpRight className={styles.searchArrow} />
            </span>
            Search
          </button>
        </form>

        <div className={styles.toolbar}>
          <div className={styles.controls}>
            {filterLabels.map((label) => (
              <button key={label} type="button" className={styles.filter}>
                {label}
                <ChevronDown aria-hidden="true" />
              </button>
            ))}
            <span className={styles.sort}>Soonest deadline</span>
          </div>
        </div>

        <div className={styles.grid}>
          {items.map((item) => (
            <article key={item.id} className={styles.card}>
              <a href="#top" className={styles.media} tabIndex={-1}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" />
              </a>
              <div className={styles.body}>
                <span className={`${styles.type} font-mono`}>{item.type}</span>
                <h3 className={`${styles.title} font-heading`}>
                  <a href="#top">{item.title}</a>
                </h3>
                {item.organization ? (
                  <p className={styles.org}>{item.organization}</p>
                ) : null}
                <div className={styles.facts}>
                  <span>
                    <CalendarDays aria-hidden="true" />
                    {item.deadline}
                  </span>
                  <span>
                    <Tag aria-hidden="true" />
                    {item.fee}
                  </span>
                </div>
              </div>
              <div className={styles.footer}>
                <button type="button" className={styles.save}>
                  <Bookmark size={15} aria-hidden="true" />
                  Save
                </button>
                <a href="#top" className={styles.view}>
                  View
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
