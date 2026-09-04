"use client";

import Link from "next/link";
import { OpportunitySort } from "@/components/opportunity-sort";
import { OpportunityBrowsePagination } from "@/components/opportunity-browse-pagination";
import { OpportunityCollectionsStrip } from "@/components/opportunity-collections-strip";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { MissaWordmark } from "@/components/missa-wordmark";
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import styles from "./opportunities-browse-v2-preview.module.css";
import dropdownStyles from "@/components/opportunity-dropdown.module.css";

const typeOptions: Record<string, string> = {
  "open-call": "Open call",
  grant: "Grant",
  residency: "Residency",
  award: "Award",
  fellowship: "Fellowship",
  magazine: "Magazine",
  contest: "Contest",
  exhibition: "Exhibition",
};

const disciplineOptions: Record<string, string> = {
  "visual-arts": "Visual arts",
  poetry: "Poetry",
  fiction: "Fiction",
  essay: "Essay & Nonfiction",
  literature: "Literature",
  photography: "Photography",
  "digital-art": "Digital art",
  film: "Film & Video",
  dance: "Dance & Movement",
  music: "Music & Sound",
  architecture: "Architecture & Design",
  "all-disciplines": "All disciplines",
};

const locationOptions: Record<string, string> = {
  online: "Online / Remote",
  US: "United States",
  GB: "United Kingdom",
  EU: "Europe",
  CA: "Canada",
  international: "International",
};

const deadlineOptions: Record<string, string> = {
  "7": "Closing in 7 days",
  "14": "Closing in 14 days",
  "30": "Closing in 30 days",
  "60": "Closing in 60 days",
};

const feeOptions: Record<string, string> = {
  "no-fee": "Free to enter (No fee)",
  "has-fee": "Has entry fee",
};

const collections = [
  { href: "/discover/queer-lgbtq-opportunities", label: "Queer & LGBTQ+" },
  { href: "/discover/bipoc-opportunities", label: "BIPOC Creators" },
  {
    href: "/discover/women-nonbinary-opportunities",
    label: "Women & Non-Binary",
  },
  {
    href: "/discover/disabled-neurodivergent-opportunities",
    label: "Disabled & Neurodivergent",
  },
  { href: "/discover/emerging-writers-artists", label: "Emerging & Debut" },
  { href: "/discover/jobs-for-creators", label: "Creative Jobs" },
  { href: "/opportunities?discipline=poetry", label: "Poetry" },
  { href: "/opportunities?discipline=fiction", label: "Fiction" },
  { href: "/opportunities?type=grant", label: "Grants" },
  { href: "/opportunities?type=residency", label: "Residencies" },
  { href: "/opportunities?discipline=visual-arts", label: "Visual Arts" },
  { href: "/opportunities?fee=no-fee", label: "Free to Enter" },
] as const;

const emptyStateCollections = [
  { href: "/opportunities?discipline=poetry", label: "Poetry" },
  { href: "/opportunities?type=grant", label: "Grants" },
  { href: "/opportunities?fee=no-fee", label: "Free to Enter" },
] as const;

export interface ActiveFiltersState {
  type: string | null;
  discipline: string | null;
  location: string | null;
  deadline: string | null;
  fee: string | null;
}

export function OpportunitiesBrowseV2Preview({
  embedded = false,
  filterControls,
  activeFilterContent,
  toolbarActions,
  signedIn,
  initialItems = [],
  totalCount = 0,
  nextCursor = null,
  loadFailed = false,
  initialQuery = "",
  activeFilters: serverFilters = {
    type: null,
    discipline: null,
    location: null,
    deadline: null,
    fee: null,
  },
}: {
  embedded?: boolean;
  filterControls?: ReactNode;
  activeFilterContent?: ReactNode;
  toolbarActions?: ReactNode;
  signedIn?: boolean;
  initialItems?: OpportunityBrowseProjection[];
  totalCount?: number;
  nextCursor?: string | null;
  loadFailed?: boolean;
  initialQuery?: string;
  activeFilters?: ActiveFiltersState;
}) {
  const router = useRouter();
  const basePath = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<ActiveFiltersState>(serverFilters);
  const serverKey = JSON.stringify([initialQuery, serverFilters]);
  const [previousServerKey, setPreviousServerKey] = useState(serverKey);
  if (previousServerKey !== serverKey) {
    setPreviousServerKey(serverKey);
    setFilters(serverFilters);
    setSearchQuery(initialQuery);
  }
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isMobileFilters, setIsMobileFilters] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileFilters(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const updateFilters = (
    newFilters: Partial<ActiveFiltersState>,
    newQuery?: string,
    closeSheet = false,
  ) => {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);

    const q = newQuery !== undefined ? newQuery : searchQuery;

    const params = new URLSearchParams(filterControls ? searchParams.toString() : undefined);
    params.delete("cursor");
    params.delete("trail");
    params.delete("q");
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    if (q.trim()) params.set("q", q.trim());
    if (merged.type) params.set("type", merged.type);
    if (merged.discipline) params.set("discipline", merged.discipline);
    if (merged.location) params.set("location", merged.location);
    if (merged.deadline) params.set("deadline", merged.deadline);
    if (merged.fee) params.set("fee", merged.fee);

    if (closeSheet) setFilterSheetOpen(false);

    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);

    });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilters({
      type: null,
      discipline: null,
      location: null,
      deadline: null,
      fee: null,
    });
    startTransition(() => {
      router.push(`${basePath}?sort=${searchParams.get("sort") ?? "soonest-deadline"}${searchParams.get("preview") === "public" ? "&preview=public" : ""}`);
    });
  };

  const displayedItems = initialItems;
  const pageOffset = searchParams.has("cursor") ? searchParams.getAll("trail").length * 48 : 0;
  const resultRange = displayedItems.length ? `${(pageOffset + 1).toLocaleString()}–${(pageOffset + displayedItems.length).toLocaleString()} of ${totalCount.toLocaleString()}` : "0 results";

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof ActiveFiltersState; label: string }> = [];
    if (filters.type) chips.push({ key: "type", label: typeOptions[filters.type] || filters.type });
    if (filters.discipline) chips.push({ key: "discipline", label: disciplineOptions[filters.discipline] || filters.discipline });
    if (filters.location) chips.push({ key: "location", label: locationOptions[filters.location] || filters.location });
    if (filters.deadline) chips.push({ key: "deadline", label: deadlineOptions[filters.deadline] || `Next ${filters.deadline} days` });
    if (filters.fee) chips.push({ key: "fee", label: feeOptions[filters.fee] || filters.fee });
    return chips;
  }, [filters]);

  return (
    <div className={styles.shell}>
      {!embedded ? <>
      <div className={styles.banner} role="note">
        <span>
          Option A · White index —{" "}
          <Link href="/design-system/opportunities-browse">all directions</Link>
          {" · "}
          <Link href="/design-system/homepage-hero">homepage hero</Link>
        </span>
        <span>
          <Link href="/design-system/opportunities-browse-forest">B</Link>
          {" · "}
          <Link href="/design-system/opportunities-browse-postal">C</Link>
          {" · "}
          <Link href="/design-system/opportunities-editorial">editorial archive</Link>
          {" · "}
          <Link href="/opportunities">live</Link>
        </span>
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

      </> : null}
      <main className={styles.main} id={embedded ? "main-content" : "results"}>
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>Opportunities</p>
          <div className={styles.introRow}>
            <div className={styles.introCopy}>
              <h1 id="prototype-title">
                Find your next opportunity.
              </h1>
              <p className={styles.lede}>
                Open calls, residencies and funding for your creative practice.
              </p>
            </div>
          </div>
        </header>

        <div className={styles.collectionsBand}>
          <OpportunityCollectionsStrip items={collections.map(item => ({ ...item, href: item.href.replace("/opportunities?", `${basePath}?`) }))} />
        </div>

        <div className={styles.browse}>
          <form
            className={styles.search}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              updateFilters({}, searchQuery);
            }}
          >
            <Search aria-hidden="true" className={styles.searchIcon} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, practice or organization"
              aria-label="Search opportunities"
            />
            {searchQuery ? (
              <button
                type="button"
                className={styles.searchClear}
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  updateFilters({}, "");
                }}
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
            <Button type="submit" variant="default" size="icon" className={styles.searchSubmit} disabled={isPending} aria-label="Search opportunities" title="Search opportunities">
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </form>

          {activeFilterContent ?? (activeChips.length > 0 ? (
            <div className={styles.activeFilters} aria-label="Active filters">
              {activeChips.map((chip) => (
                <span key={chip.key} className={styles.chip}>
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label} filter`}
                    onClick={() => updateFilters({ [chip.key]: null })}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className={styles.clear}
                onClick={clearAllFilters}
              >
                Clear all
              </button>
            </div>
          ) : null)}

          <div className={styles.toolbar}>
            {filterControls ?? (isMobileFilters ? (
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className={styles.mobileFilterTrigger}
                    />
                  }
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filters
                  {activeChips.length > 0 ? (
                    <span className={styles.mobileFilterCount}>{activeChips.length}</span>
                  ) : null}
                </SheetTrigger>
                <SheetContent side="bottom" className={styles.filterSheet}>
                  <SheetHeader>
                    <SheetTitle>Filter opportunities</SheetTitle>
                  </SheetHeader>
                  <div className={styles.sheetSections}>
                    {(
                      [
                        ["Type", "type", typeOptions],
                        ["Discipline", "discipline", disciplineOptions],
                        ["Location", "location", locationOptions],
                        ["Deadline", "deadline", deadlineOptions],
                        ["Fee", "fee", feeOptions],
                      ] as const
                    ).map(([label, key, options]) => (
                      <section key={key} className={styles.sheetSection}>
                        <h3 className={styles.sheetSectionTitle}>{label}</h3>
                        <div className={styles.sheetOptions}>
                          <button
                            type="button"
                            className={styles.sheetOption}
                            aria-pressed={!filters[key]}
                            data-selected={!filters[key] ? "true" : undefined}
                            onClick={() => updateFilters({ [key]: null })}
                          >
                            All
                          </button>
                          {Object.entries(options).map(([optionKey, optionLabel]) => (
                            <button
                              key={optionKey}
                              type="button"
                              className={styles.sheetOption}
                              aria-pressed={filters[key] === optionKey}
                              data-selected={
                                filters[key] === optionKey ? "true" : undefined
                              }
                              onClick={() =>
                                updateFilters({
                                  [key]: filters[key] === optionKey ? null : optionKey,
                                })
                              }
                            >
                              {optionLabel}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                  <SheetFooter className={styles.sheetFooter}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        clearAllFilters();
                        setFilterSheetOpen(false);
                      }}
                    >
                      Clear all
                    </Button>
                    <Button
                      type="button"
                      onClick={() => updateFilters({}, searchQuery, true)}
                    >
                      Show results
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ) : (
              <div className={styles.controls}>
              {/* 1. Type Popover */}
              <Popover>
                <PopoverTrigger
                  className={styles.filter}
                  data-active={Boolean(filters.type) ? "true" : undefined}
                >
                  {filters.type ? typeOptions[filters.type] || "Type" : "Type"}
                  <ChevronDown aria-hidden="true" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-1 w-52">
                  <div className={dropdownStyles.list}>
                    <button
                      type="button"
                      className={dropdownStyles.option}
                      data-selected={!filters.type ? "true" : undefined}
                      onClick={() => updateFilters({ type: null })}
                    >
                      All Types
                      {!filters.type ? <Check size={14} /> : null}
                    </button>
                    {Object.entries(typeOptions).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={dropdownStyles.option}
                        data-selected={filters.type === key ? "true" : undefined}
                        onClick={() => updateFilters({ type: filters.type === key ? null : key })}
                      >
                        {label}
                        {filters.type === key ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 2. Discipline Popover */}
              <Popover>
                <PopoverTrigger
                  className={styles.filter}
                  data-active={Boolean(filters.discipline) ? "true" : undefined}
                >
                  {filters.discipline ? disciplineOptions[filters.discipline] || "Discipline" : "Discipline"}
                  <ChevronDown aria-hidden="true" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-1 w-56">
                  <div className={dropdownStyles.list}>
                    <button
                      type="button"
                      className={dropdownStyles.option}
                      data-selected={!filters.discipline ? "true" : undefined}
                      onClick={() => updateFilters({ discipline: null })}
                    >
                      All Disciplines
                      {!filters.discipline ? <Check size={14} /> : null}
                    </button>
                    {Object.entries(disciplineOptions).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={dropdownStyles.option}
                        data-selected={filters.discipline === key ? "true" : undefined}
                        onClick={() => updateFilters({ discipline: filters.discipline === key ? null : key })}
                      >
                        {label}
                        {filters.discipline === key ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 3. Location Popover */}
              <Popover>
                <PopoverTrigger
                  className={styles.filter}
                  data-active={Boolean(filters.location) ? "true" : undefined}
                >
                  {filters.location ? locationOptions[filters.location] || "Location" : "Location"}
                  <ChevronDown aria-hidden="true" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-1 w-52">
                  <div className={dropdownStyles.list}>
                    <button
                      type="button"
                      className={dropdownStyles.option}
                      data-selected={!filters.location ? "true" : undefined}
                      onClick={() => updateFilters({ location: null })}
                    >
                      All Locations
                      {!filters.location ? <Check size={14} /> : null}
                    </button>
                    {Object.entries(locationOptions).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={dropdownStyles.option}
                        data-selected={filters.location === key ? "true" : undefined}
                        onClick={() => updateFilters({ location: filters.location === key ? null : key })}
                      >
                        {label}
                        {filters.location === key ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 4. Deadline Popover */}
              <Popover>
                <PopoverTrigger
                  className={styles.filter}
                  data-active={Boolean(filters.deadline) ? "true" : undefined}
                >
                  {filters.deadline ? deadlineOptions[filters.deadline] || "Deadline" : "Deadline"}
                  <ChevronDown aria-hidden="true" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-1 w-52">
                  <div className={dropdownStyles.list}>
                    <button
                      type="button"
                      className={dropdownStyles.option}
                      data-selected={!filters.deadline ? "true" : undefined}
                      onClick={() => updateFilters({ deadline: null })}
                    >
                      Any Deadline
                      {!filters.deadline ? <Check size={14} /> : null}
                    </button>
                    {Object.entries(deadlineOptions).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={dropdownStyles.option}
                        data-selected={filters.deadline === key ? "true" : undefined}
                        onClick={() => updateFilters({ deadline: filters.deadline === key ? null : key })}
                      >
                        {label}
                        {filters.deadline === key ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 5. Fee Popover */}
              <Popover>
                <PopoverTrigger
                  className={styles.filter}
                  data-active={Boolean(filters.fee) ? "true" : undefined}
                >
                  {filters.fee ? feeOptions[filters.fee] || "Fee" : "Fee"}
                  <ChevronDown aria-hidden="true" />
                </PopoverTrigger>
                <PopoverContent align="end" className="p-1 w-52">
                  <div className={dropdownStyles.list}>
                    <button
                      type="button"
                      className={dropdownStyles.option}
                      data-selected={!filters.fee ? "true" : undefined}
                      onClick={() => updateFilters({ fee: null })}
                    >
                      All Fees
                      {!filters.fee ? <Check size={14} /> : null}
                    </button>
                    {Object.entries(feeOptions).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={dropdownStyles.option}
                        data-selected={filters.fee === key ? "true" : undefined}
                        onClick={() => updateFilters({ fee: filters.fee === key ? null : key })}
                      >
                        {label}
                        {filters.fee === key ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>


            </div>
            ))}
            {toolbarActions}
            <OpportunitySort className={styles.sortControl} signedIn={signedIn} />
            <p className={styles.resultsMeta} aria-live="polite">
              {isPending ? "Updating…" : resultRange}
            </p>
          </div>
        </div>

        <div id="browse-results" className={styles.resultsAnchor} tabIndex={-1} />
        {loadFailed ? (
          <div className={styles.emptyState} role="alert">
            <p className={styles.emptyTitle}>We couldn’t load opportunities.</p>
            <Button variant="outline" onClick={() => router.refresh()}>Try again</Button>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className={styles.emptyState} role="status">
            <p className={styles.emptyTitle}>No matches for your current search or filters.</p>
            <button type="button" className={styles.emptyAction} onClick={clearAllFilters}>
              Clear all filters
            </button>
            <div className={styles.emptyCollections}>
              <p className={styles.emptyHint}>Try a collection instead:</p>
              <div className={styles.emptyLinks}>
                {emptyStateCollections.map((item) => (
                  <Link key={item.href} href={item.href.replace("/opportunities?", `${basePath}?`)}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={styles.grid}
            aria-busy={isPending || undefined}
            aria-live="polite"
          >
            {displayedItems.map((item) => (
              <OpportunityBrowseProjectCard key={item.id} item={item} signedIn={signedIn} />
            ))}
          </div>
        )}

        {!loadFailed ? <OpportunityBrowsePagination nextCursor={nextCursor} className={styles.pagination} /> : null}
      </main>
    </div>
  );
}
