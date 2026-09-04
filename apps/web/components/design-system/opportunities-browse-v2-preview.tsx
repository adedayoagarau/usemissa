"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
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
import styles from "./opportunities-browse-v2-preview.module.css";

type Opportunity = {
  id: string;
  title: string;
  organization: string | null;
  type: "Grant" | "Award" | "Open call" | "Residency" | "Fellowship";
  practices: string[];
  deadline: string;
  fee: string;
  prizeChip?: string;
  location?: string;
  image: string;
};

const plates = {
  Grant: "/media/home/artist-at-work.webp",
  Award: "/media/home/opportunity-mountains.webp",
  "Open call": "/media/home/gallery-interior.webp",
  Residency: "/media/home/opportunity-architecture.webp",
  Fellowship: "/media/home/opportunity-dance.webp",
} as const;

const fixtures: Opportunity[] = [
  {
    id: "1",
    title: "Rauschenberg Medical Emergency Grants",
    organization: "Robert Rauschenberg Foundation",
    type: "Grant",
    practices: ["Visual Arts"],
    deadline: "Sep 4, 2026",
    fee: "No fee",
    image: plates.Grant,
  },
  {
    id: "2",
    title: "Oregon Book Awards",
    organization: "Literary Arts",
    type: "Award",
    practices: ["Poetry", "Fiction"],
    deadline: "Aug 28, 2026",
    fee: "$55.00",
    prizeChip: "Prize $1,000",
    location: "United States",
    image: plates.Award,
  },
  {
    id: "3",
    title: "Open Call · Onsite Residency Q3–Q4 2027",
    organization: "GlogauAIR",
    type: "Residency",
    practices: ["Photography", "Dance"],
    deadline: "Rolling",
    fee: "Fee not listed",
    location: "Berlin",
    image: plates.Residency,
  },
  {
    id: "4",
    title: "Scuola Piccola Zattere Fellowship 2027",
    organization: null,
    type: "Fellowship",
    practices: ["Architecture", "Cross Disciplinary"],
    deadline: "Nov 12, 2026",
    fee: "No fee",
    prizeChip: "Prize €5,000",
    location: "Venice",
    image: plates.Fellowship,
  },
  {
    id: "5",
    title: "Cultural Horizons: European Local Culture",
    organization: null,
    type: "Open call",
    practices: ["All Disciplines"],
    deadline: "Oct 1, 2026",
    fee: "No fee",
    location: "EU",
    image: plates["Open call"],
  },
  {
    id: "6",
    title: "Black Horse Review Poetry Contest",
    organization: "Black Horse Review",
    type: "Award",
    practices: ["Poetry"],
    deadline: "Dec 15, 2026",
    fee: "$15.00",
    prizeChip: "Prize $600",
    image: plates.Award,
  },
];

const filterLabels = ["Type", "Discipline", "Location", "Deadline", "Fee"] as const;

export function OpportunitiesBrowseV2Preview() {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    return fixtures.filter((item) => {
      const matchesQuery =
        !query.trim() ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.organization?.toLowerCase().includes(query.toLowerCase()) ??
          false);
      const matchesType = !activeType || item.type === activeType;
      return matchesQuery && matchesType;
    });
  }, [activeType, query]);

  return (
    <div className={styles.shell}>
      <div className={styles.banner} role="note">
        <span>
          Prototype · v2 (winner) — not live. Compare{" "}
          <Link href="/opportunities">live</Link>
        </span>
        <span>Hero · collections · image-top cards</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <MissaWordmark href="/" size="app" />
          <nav className={styles.nav} aria-label="Primary navigation">
            <Link href="/opportunities" aria-current="page">
              Opportunities
            </Link>
            <Link href="/directory">Directory</Link>
            <Link href="/residencies">Residencies</Link>
            <Link href="/for-organizations">For organizations</Link>
          </nav>
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

      <section className={styles.hero} aria-labelledby="prototype-title">
        <div className={styles.heroArt} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <h1 id="prototype-title" className="font-heading">
            Find calls for submissions, residencies, grants.
          </h1>
          <p className={styles.intro}>
            Browse published opportunities across writing, visual arts,
            performance, film, music, and design.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.browse}>
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by opportunity, organization, or discipline"
              aria-label="Search opportunities"
            />
            <button type="submit">Search</button>
          </form>

          {activeType ? (
            <div className={styles.activeFilters} aria-label="Active filters">
              <span className={styles.chip}>
                {activeType}
                <button
                  type="button"
                  aria-label={`Remove ${activeType} filter`}
                  onClick={() => setActiveType(null)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
              <button
                type="button"
                className={styles.clear}
                onClick={() => setActiveType(null)}
              >
                Clear all
              </button>
            </div>
          ) : null}

          <div className={styles.toolbar} id="results">
            <p className={styles.count}>
              {items.length.toLocaleString()} opportunities
            </p>
            <div className={styles.controls}>
              {filterLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={styles.filter}
                  data-active={
                    label === "Type" && activeType ? "true" : undefined
                  }
                  onClick={() => {
                    if (label !== "Type") return;
                    setActiveType((current) =>
                      current === "Grant" ? null : "Grant",
                    );
                  }}
                >
                  {label}
                  <ChevronDown aria-hidden="true" />
                </button>
              ))}
              <span className={styles.sort}>Soonest deadline</span>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {items.map((item) => {
            const isSaved = saved.has(item.id);
            return (
              <article key={item.id} className={styles.card}>
                <a href="#results" className={styles.media} tabIndex={-1}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" />
                </a>
                <div className={styles.body}>
                  <div className={styles.badges}>
                    <span className={`${styles.type} font-mono`}>
                      {item.type}
                    </span>
                    {item.prizeChip ? (
                      <span className={`${styles.prize} font-mono`}>
                        {item.prizeChip}
                      </span>
                    ) : null}
                  </div>
                  <h3 className={`${styles.title} font-heading`}>
                    <a href="#results">{item.title}</a>
                  </h3>
                  {item.organization ? (
                    <p className={styles.org}>{item.organization}</p>
                  ) : null}
                  <p className={styles.practices}>
                    {item.practices.join(" · ")}
                  </p>
                  <div className={styles.facts}>
                    <span>
                      <CalendarDays aria-hidden="true" />
                      {item.deadline}
                    </span>
                    <span>
                      <Tag aria-hidden="true" />
                      {item.fee}
                    </span>
                    {item.location ? (
                      <span>
                        <MapPin aria-hidden="true" />
                        {item.location}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.footer}>
                  <button
                    type="button"
                    className={styles.save}
                    data-saved={isSaved || undefined}
                    onClick={() => {
                      setSaved((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                  >
                    {isSaved ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Bookmark size={15} aria-hidden="true" />
                    )}
                    {isSaved ? "Saved" : "Save"}
                  </button>
                  <a href="#results" className={styles.view}>
                    View
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        <p className={styles.note}>
          v2 winner: field hero, collections, quieter filters, image-top card
          grid — shipped as the live opportunities direction.
        </p>
      </main>
    </div>
  );
}
