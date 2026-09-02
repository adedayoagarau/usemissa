"use client";

import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { MissaWordmark } from "@/components/missa-wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PublicAccessMode } from "@/lib/publicAccess";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { resolveTaxonomyPhrase } from "@missa/taxonomy";
import styles from "./homepage-future.module.css";

const heroHeadingFont = localFont({
  src: "../../fonts/fraunces.woff2",
  variable: "--homepage-hero-heading",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const heroBodyFont = localFont({
  src: "../../fonts/instrument-sans.woff2",
  variable: "--homepage-hero-body",
  display: "swap",
  adjustFontFallback: "Arial",
});

type AccessCopy = {
  action: string;
  href: string;
  statusLabel: string;
  statusTitle: string;
  statusBody: string;
};

export type TrackerBoardRecord = {
  id: string;
  title: string;
  organizationName?: string;
  statusLabel: string;
  deadline?: string;
  deadlineKind: string;
  daysToDeadline?: number;
  href: string;
};

type TrackerBoardTab = "active" | "submitted" | "archived";

const trackerTabs: Array<{ id: TrackerBoardTab; label: string }> = [
  { id: "active", label: "Active" },
  { id: "submitted", label: "Submitted" },
  { id: "archived", label: "Archived" },
];

function usePreferredReducedMotion() {
  const motionPreference = useReducedMotion();
  const [mediaPreference, setMediaPreference] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setMediaPreference(Boolean(motionPreference || mediaQuery.matches));
    };
    const frame = window.requestAnimationFrame(updatePreference);
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, [motionPreference]);

  return mediaPreference;
}

function getAccessCopy(accessMode: PublicAccessMode): AccessCopy {
  if (accessMode === "open") {
    return {
      action: "Browse opportunities",
      href: "/opportunities",
      statusLabel: "Public reading",
      statusTitle: "The published catalogue is open.",
      statusBody:
        "Read published Opportunities without an account. Sign in only when you choose to save.",
    };
  }

  if (accessMode === "waitlist") {
    return {
      action: "Join the waitlist",
      href: "/waitlist",
      statusLabel: "Access is opening in stages",
      statusTitle: "The public catalogue is not open yet.",
      statusBody:
        "Join the waitlist and Missa will let you know when public browsing is available.",
    };
  }

  return {
    action: "Read the methodology",
    href: "/methodology",
    statusLabel: "Public access is closed",
    statusTitle: "See how Missa handles evidence.",
    statusBody:
      "The methodology explains how official sources, uncertain information, and private decisions are handled.",
  };
}

function HomepageHero({ access }: { access: AccessCopy }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = usePreferredReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const imageOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.84]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -112]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.82], [1, 0.16]);

  return (
    <section
      className={`${styles.hero} ${heroHeadingFont.variable} ${heroBodyFont.variable}`}
      ref={heroRef}
      aria-labelledby="gateway-heading"
      data-testid="homepage-hero"
    >
      <motion.div
        className={styles.heroMedia}
        data-testid="hero-media"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        style={
          reduceMotion
            ? undefined
            : { scale: imageScale, opacity: imageOpacity, y: imageY }
        }
      >
        <Image
          className={styles.heroImage}
          src="/design-system/homepage-future/missa-cobalt-hero-4k.png"
          alt=""
          fill
          priority
          sizes="100vw"
          aria-hidden="true"
        />
      </motion.div>
      <div className={styles.heroOverlay} aria-hidden="true" />

      <motion.div
        className={styles.heroCopy}
        data-testid="hero-copy"
        style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
      >
        <h1 id="gateway-heading">
          Find your next opportunity. Track every application.
        </h1>
        <p className={styles.heroSupport}>
          Search grants, residencies, fellowships, commissions, and open calls.
          Manage your deadlines and follow each application from draft to
          decision.
        </p>
        <div className={styles.heroActions}>
          <Link
            className={`${styles.primaryAction} ${styles.heroPrimaryAction}`}
            href={access.href}
            data-testid="hero-cta"
          >
            {access.action} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function formatTrackerDeadline(record: TrackerBoardRecord): {
  day: string | null;
  month: string | null;
} {
  if (!record.deadline) return { day: null, month: null };
  const date = new Date(`${record.deadline}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { day: null, month: null };
  return {
    day: new Intl.DateTimeFormat("en", { day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
  };
}

function trackerTimingLabel(record: TrackerBoardRecord): string {
  if (record.deadline) {
    const date = formatTrackerDeadline(record);
    if (date.day && date.month) {
      if (record.daysToDeadline === 0) return `${date.month} ${date.day} · due today`;
      if (record.daysToDeadline === 1) return `${date.month} ${date.day} · due tomorrow`;
      if (record.daysToDeadline !== undefined && record.daysToDeadline > 1)
        return `${date.month} ${date.day} · ${record.daysToDeadline} days left`;
      if (record.daysToDeadline !== undefined && record.daysToDeadline < 0)
        return `${date.month} ${date.day} · deadline passed`;
      return `${date.month} ${date.day}`;
    }
  }
  if (record.deadlineKind === "rolling") return "Rolling deadline";
  if (record.deadlineKind === "until-filled") return "Until filled";
  if (record.deadlineKind === "conflicting") return "Deadline needs review";
  return "Deadline not listed";
}

function trackerStatusLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.replace(/^./u, (letter) => letter.toUpperCase()))
    .join(" ");
}

const exampleTrackerRecord: TrackerBoardRecord = {
  id: "example",
  title: "North River Review",
  organizationName: "Fiction Fellowship",
  statusLabel: "preparing",
  deadline: "2026-09-03",
  deadlineKind: "exact",
  daysToDeadline: 12,
  href: "/tracker",
};

function TrackerBoard({
  records,
  reduceMotion,
}: {
  records: TrackerBoardRecord[];
  reduceMotion: boolean;
}) {
  const signedIn = records.length > 0;
  const [activeTab, setActiveTab] = useState<TrackerBoardTab>("active");
  const [focusIndex, setFocusIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeRecords = records.filter((item) => {
    if (activeTab === "active") return !["submitted", "received", "in-review"].includes(item.statusLabel) || item.deadline;
    if (activeTab === "submitted") return ["submitted", "received", "in-review"].includes(item.statusLabel);
    return false;
  });
  const displayRecord = signedIn ? activeRecords[0] : exampleTrackerRecord;

  function selectTab(index: number, focus = true) {
    setActiveTab(trackerTabs[index].id);
    setFocusIndex(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(Math.min(focusIndex + 1, trackerTabs.length - 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(Math.max(focusIndex - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(trackerTabs.length - 1);
    }
  }

  const deadline = formatTrackerDeadline(displayRecord);
  const panelId = `tracker-board-panel-${activeTab}`;

  return (
    <section className={styles.trackerSection} aria-labelledby="tracker-board-heading">
      <div className={styles.trackerIntro}>
        <p className={styles.eyebrow}>Private tracker</p>
        <h2 id="tracker-board-heading">Every application, from discovery to response.</h2>
        <p>Missa tracks each stage, syncs deadlines to your calendar, and shows you what needs attention next.</p>
      </div>
      <div className={styles.trackerShell}>
        <span className={styles.trackerShellTitle}>Your Tracker</span>
        {!signedIn ? (
          <p className={styles.trackerExampleNote}>Example record — sign in to see your real applications.</p>
        ) : null}
        <div className={styles.trackerTabs} role="tablist" aria-label="Tracker status" onKeyDown={onTabKeyDown}>
          {trackerTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              role="tab"
              id={`tracker-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={panelId}
              tabIndex={focusIndex === index ? 0 : -1}
              className={styles.trackerTab}
              data-active={activeTab === tab.id}
              onClick={() => selectTab(index, false)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.trackerPanelWrap}>
          <p className={styles.trackerEyebrow}>Next deadline</p>
          <motion.div
            key={`${activeTab}-${displayRecord.id}`}
            id={panelId}
            role="tabpanel"
            aria-labelledby={`tracker-tab-${activeTab}`}
            className={styles.trackerCard}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
          >
            <header>
              <span className={styles.trackerStatus}>{trackerStatusLabel(displayRecord.statusLabel)}</span>
              {deadline.day && deadline.month ? (
                <span className={styles.trackerDateBadge}><small>{deadline.month}</small><strong>{deadline.day}</strong></span>
              ) : null}
            </header>
            <h3>{displayRecord.title}</h3>
            <p>{displayRecord.organizationName ?? "Organization not listed"}</p>
            <hr />
            <p className={styles.trackerTiming}>{trackerTimingLabel(displayRecord)}</p>
            <hr />
            <p className={styles.trackerStep}>Complete work samples</p>
            <Link className={styles.trackerPrimaryAction} href={displayRecord.href}>
              View application <ArrowRight aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
        <Link className={styles.trackerSecondaryAction} href="/tracker">
          Explore the Tracker <span aria-hidden="true">⟶</span>
        </Link>
      </div>
    </section>
  );
}

const finderTypes = [
  { value: "all", label: "All" },
  { value: "grant", label: "Grant" },
  { value: "residency", label: "Residency" },
  { value: "fellowship", label: "Fellowship" },
  { value: "commission", label: "Commission" },
  { value: "open-call", label: "Open call" },
] as const;

type FinderType = (typeof finderTypes)[number]["value"];

type FinderIntent =
  | { kind: "taxonomy"; label: string; termId: string; schemeVersion: number }
  | { kind: "type"; label: string; value: Exclude<FinderType, "all"> }
  | null;

const finderTypeAliases: Record<string, Exclude<FinderType, "all">> = {
  grant: "grant",
  grants: "grant",
  residency: "residency",
  residencies: "residency",
  fellowship: "fellowship",
  fellowships: "fellowship",
  commission: "commission",
  commissions: "commission",
  "open call": "open-call",
  "open calls": "open-call",
};

type BrowseResponse = {
  items: OpportunityBrowseProjection[];
};

function formatOpportunityType(type: string) {
  return type.replace(/-/gu, " ").replace(/^./u, (letter) => letter.toUpperCase());
}

function formatFinderDeadline(deadline: OpportunityBrowseProjection["deadline"]) {
  if (deadline.kind === "rolling") return "Rolling";
  if (deadline.kind === "until-filled") return "Until filled";
  if (deadline.kind === "conflicting" || !deadline.date) return "Deadline not confirmed";

  const date = new Date(`${deadline.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Deadline not confirmed";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
}

function finderIntentFor(query: string): FinderIntent {
  const normalized = query.trim().toLocaleLowerCase();
  const type = finderTypeAliases[normalized];
  if (type) {
    return {
      kind: "type",
      value: type,
      label: finderTypes.find((item) => item.value === type)?.label ?? type,
    };
  }

  const resolved = resolveTaxonomyPhrase(query);
  if (resolved.status !== "resolved" || !resolved.termId) return null;
  return {
    kind: "taxonomy",
    termId: resolved.termId,
    schemeVersion: resolved.schemeVersion,
    label: resolved.candidates[0]?.preferredLabel ?? query,
  };
}

function OpportunityFinder({ access, accessMode }: { access: AccessCopy; accessMode: PublicAccessMode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<FinderType>("all");
  const [items, setItems] = useState<OpportunityBrowseProjection[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const intent = useMemo(() => finderIntentFor(trimmedQuery), [trimmedQuery]);
  const canSearch = accessMode === "open" && trimmedQuery.length >= 2;
  const displayStatus = canSearch ? status : "idle";
  const displayItems = canSearch ? items : [];
  const expanded = accessMode === "open" && canSearch;
  const resultsId = "opportunity-finder-results";
  const catalogueParams = new URLSearchParams();

  const effectiveType = type !== "all" ? type : intent?.kind === "type" ? intent.value : undefined;
  if (intent?.kind === "taxonomy") {
    catalogueParams.append("taxonomy", intent.termId);
    catalogueParams.set("taxonomyDescendants", "1");
    catalogueParams.set("taxonomyVersion", String(intent.schemeVersion));
  } else if (trimmedQuery && intent?.kind !== "type") {
    catalogueParams.set("q", trimmedQuery);
  }
  if (effectiveType) catalogueParams.append("type", effectiveType);
  const catalogueHref = catalogueParams.size ? `/opportunities?${catalogueParams.toString()}` : "/opportunities";

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ openNow: "true", sort: "soonest-deadline", limit: "5" });
      if (intent?.kind === "taxonomy") {
        params.append("taxonomy", intent.termId);
        params.set("taxonomyDescendants", "1");
        params.set("taxonomyVersion", String(intent.schemeVersion));
      } else if (intent?.kind !== "type") {
        params.set("q", trimmedQuery);
      }
      if (effectiveType) params.append("type", effectiveType);
      setStatus("loading");
      try {
        const response = await fetch(`/api/opportunities?${params.toString()}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Opportunity finder failed: ${response.status}`);
        const result = (await response.json()) as BrowseResponse;
        setItems(result.items);
        setStatus(result.items.length ? "ready" : "empty");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setItems([]);
          setStatus("error");
        }
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, effectiveType, intent, trimmedQuery]);

  function openCatalogue() {
    router.push(catalogueHref);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (canSearch && activeIndex >= 0 && displayItems[activeIndex]) {
      event.preventDefault();
      router.push(`/opportunities/${displayItems[activeIndex].slug}`);
      return;
    }
    event.preventDefault();
    openCatalogue();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && displayItems.length) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, displayItems.length - 1));
    } else if (event.key === "ArrowUp" && displayItems.length) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Escape") {
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  if (accessMode !== "open") {
    return (
      <section className={styles.opportunityFinder} aria-labelledby="opportunity-finder-heading">
        <div className={styles.finderIntro}>
          <p className={styles.eyebrow}>{access.statusLabel}</p>
          <h2 id="opportunity-finder-heading">The opportunity finder.</h2>
          <p>When public browsing opens, this is where you can search real published calls and follow each one to its details.</p>
        </div>
        <div className={styles.finderAccessPanel}>
          <span>Catalogue access</span>
          <h3>{access.statusTitle}</h3>
          <p>{access.statusBody}</p>
          <Link className={styles.finderAction} href={access.href}>{access.action} <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.opportunityFinder} aria-labelledby="opportunity-finder-heading" data-testid="opportunity-finder">
      <div className={styles.finderIntro}>
        <h2 id="opportunity-finder-heading">Search open opportunities.</h2>
        <p>Find grants, residencies, fellowships, commissions, and open calls by creative field, organization, or name. Open any listing to review the eligibility, requirements, funding, deadline, and original source.</p>
      </div>
      <div className={styles.finderStage} data-expanded={expanded ? "true" : "false"}>
        <form action="/opportunities" method="get" className={styles.finderForm} role="search" onSubmit={submit}>
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <div className={styles.finderSearchLine}>
            <Search aria-hidden="true" />
            <label className={styles.srOnly} htmlFor="opportunity-finder-query">Search by field, organization, or opportunity</label>
            <input
              ref={inputRef}
              id="opportunity-finder-query"
              name="q"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
              onKeyDown={onKeyDown}
              placeholder="Search by field, organization, or opportunity"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={resultsId}
              aria-expanded={expanded}
              aria-activedescendant={activeIndex >= 0 ? `opportunity-finder-option-${displayItems[activeIndex]?.id}` : undefined}
            />
            {query ? <button className={styles.finderClear} type="button" aria-label="Clear search input" onClick={() => { setQuery(""); setActiveIndex(-1); inputRef.current?.focus(); }}><X aria-hidden="true" /></button> : null}
            <button className={styles.finderSubmit} type="submit">Search <ArrowRight aria-hidden="true" /></button>
          </div>
          <div className={styles.finderTypes} aria-label="Opportunity type">
            {finderTypes.map((item) => (
              <button key={item.value} type="button" className={styles.finderType} data-selected={type === item.value ? "true" : "false"} onClick={() => { setType(item.value); setActiveIndex(-1); }}>
                {item.label}
              </button>
            ))}
          </div>
        </form>

        <div className={styles.finderPanel} id={resultsId} role={displayItems.length ? "listbox" : undefined} aria-label={displayItems.length ? "Matching opportunities" : undefined}>
          {displayStatus === "loading" ? <p className={styles.finderMessage} role="status">{intent ? `Searching ${intent.label}, a recognised ${intent.kind === "taxonomy" ? "field" : "opportunity type"}…` : "Searching published opportunities…"}</p> : null}
          {displayStatus === "error" ? <p className={styles.finderMessage} role="alert">The catalogue could not be reached. Try the full browse page instead.</p> : null}
          {displayStatus === "empty" ? (
            <div className={styles.finderEmpty} role="status">
              <h3>No results for “{trimmedQuery}”</h3>
              <p>Try another search or clear the selected filters.</p>
              <div>
                <button type="button" onClick={() => { setQuery(""); setActiveIndex(-1); inputRef.current?.focus(); }}>Clear search</button>
                <button type="button" onClick={() => { setType("all"); setActiveIndex(-1); inputRef.current?.focus(); }}>Clear filters</button>
              </div>
            </div>
          ) : null}
          {displayStatus === "ready" ? (
            <>
              <p className={styles.finderResultCount} role="status">{displayItems.length} live {displayItems.length === 1 ? "match" : "matches"}</p>
              <div className={styles.finderResults}>
                {displayItems.map((item, index) => (
                  <Link key={item.id} id={`opportunity-finder-option-${item.id}`} href={`/opportunities/${item.slug}`} role="option" aria-selected={activeIndex === index} className={styles.finderResult} onMouseEnter={() => setActiveIndex(index)}>
                    <span className={styles.finderResultType}>{formatOpportunityType(item.type)}</span>
                    <span className={styles.finderResultTitle}>{item.title}</span>
                    <span className={styles.finderResultMeta}>{item.organizationName ?? "Organisation not confirmed"} · {formatFinderDeadline(item.deadline)}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
              <Link className={styles.finderAllResults} href={catalogueHref}>See all results <ArrowRight aria-hidden="true" /></Link>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HomepageFuturePrototype({
  accessMode,
  tracker = [],
}: {
  accessMode: PublicAccessMode;
  tracker?: TrackerBoardRecord[];
}) {
  const access = getAccessCopy(accessMode);

  return (
    <div
      className={styles.prototype}
      data-access-mode={accessMode}
    >
      <a className={styles.skipLink} href="#future-main">
        Skip to main content
      </a>

      <aside className={styles.reviewNote} aria-label="Prototype status">
        <span>Local design review</span>
        <Link href="/design-system">Back to design system</Link>
      </aside>

      <header className={styles.siteHeader}>
        <div className={styles.wordmarkLink}>
          <MissaWordmark size="app" />
        </div>
        <nav className={styles.desktopNav} aria-label="Public navigation">
          {accessMode === "open" ? (
            <Link href="/opportunities">Opportunities</Link>
          ) : null}
          <Link href="/guides">Guides</Link>
          <Link href="/for-organizations">For organizations</Link>
          <Link href="/methodology">Methodology</Link>
        </nav>
        <div className={styles.headerActions}>
          <Button
            className={styles.signInButton}
            nativeButton={false}
            render={<Link href="/login" />}
            variant="ghost"
          >
            Sign in
          </Button>
          <Button
            className={styles.headerPrimary}
            nativeButton={false}
            render={<Link href={access.href} />}
            size="sm"
          >
            {access.action}
          </Button>
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  className={styles.mobileMenu}
                  size="icon"
                  variant="outline"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className={styles.mobileSheet} side="right">
              <SheetHeader className={styles.mobileSheetHeader}>
                <SheetTitle>Public navigation</SheetTitle>
                <SheetDescription>
                  Browse Missa’s public pages.
                </SheetDescription>
              </SheetHeader>
              <nav className={styles.mobileNav} aria-label="Mobile navigation">
                {accessMode === "open" ? (
                  <Link href="/opportunities">Opportunities</Link>
                ) : null}
                <Link href="/guides">Guides</Link>
                <Link href="/for-organizations">For organizations</Link>
                <Link href="/methodology">Methodology</Link>
                <Link href="/login">Sign in</Link>
                <Link className={styles.mobilePrimary} href={access.href}>
                  {access.action}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="future-main">
        <HomepageHero access={access} />

        <OpportunityFinder access={access} accessMode={accessMode} />
        <TrackerBoard records={tracker} reduceMotion={false} />
      </main>

      <footer className={styles.siteFooter}>
        <MissaWordmark size="app" />
        <p>Source-first opportunity discovery for creative work.</p>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
