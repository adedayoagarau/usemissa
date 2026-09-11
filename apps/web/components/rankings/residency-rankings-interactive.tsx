"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Star,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  Utensils,
  Home,
  MessageSquare,
  Check,
  Building,
  SlidersHorizontal,
  X,
  Compass,
  Layers,
  Award,
  PenLine,
  Scale,
} from "lucide-react";
import type { ResidencyRankingRow, ResidencyReviewRow } from "@missa/radar-adapters";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SubmitResidencyReviewDialog } from "./submit-residency-review-dialog";

const PAGE_SIZE = 25;

type SortOption = "score" | "rating" | "reviews" | "name";

const DISCIPLINES_LIST = [
  { id: "all", label: "All Disciplines" },
  { id: "writing", label: "Writing & Literature", keywords: ["writing", "literature", "poetry", "fiction", "playwriting", "screenwriting", "nonfiction", "translation"] },
  { id: "visual", label: "Visual Arts", keywords: ["visual", "painting", "sculpture", "ceramics", "drawing", "printmaking", "photography", "textiles"] },
  { id: "multi", label: "Multidisciplinary & Hybrid", keywords: ["interdisciplinary", "multidisciplinary", "all disciplines", "hybrid"] },
  { id: "music", label: "Music & Sound", keywords: ["music", "composition", "sound", "acoustic"] },
  { id: "film", label: "Film & Media Arts", keywords: ["film", "video", "media", "animation", "digital"] },
  { id: "performance", label: "Dance & Performing Arts", keywords: ["dance", "performance", "theater", "choreography"] },
] as const;

export function ResidencyRankingsInteractive({
  initialItems,
  total,
}: {
  initialItems: ResidencyRankingRow[];
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial values from URL params
  const paramQ = searchParams?.get("q") ?? "";
  const paramTier = searchParams?.get("tier") ?? "all";
  const paramSort = (searchParams?.get("sort") as SortOption) ?? "score";
  const paramDiscipline = searchParams?.get("discipline") ?? "all";
  const paramFilters = searchParams?.get("filter") ? searchParams.get("filter")!.split(",").filter(Boolean) : [];
  const paramPage = parseInt(searchParams?.get("page") ?? "1", 10) - 1;

  const [items, setItems] = useState<ResidencyRankingRow[]>(initialItems);
  const [search, setSearch] = useState(paramQ);
  const [tier, setTier] = useState(paramTier);
  const [sort, setSort] = useState<SortOption>(paramSort);
  const [discipline, setDiscipline] = useState(paramDiscipline);
  const [filters, setFilters] = useState<string[]>(paramFilters);
  const [page, setPage] = useState(Math.max(0, isNaN(paramPage) ? 0 : paramPage));

  // Review modal state
  const [activeResidencyForReviews, setActiveResidencyForReviews] = useState<ResidencyRankingRow | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState<ResidencyReviewRow[]>([]);

  // Write review dialog state
  const [residencyForNewReview, setResidencyForNewReview] = useState<ResidencyRankingRow | null>(null);

  // Score breakdown modal state
  const [activeResidencyForScore, setActiveResidencyForScore] = useState<ResidencyRankingRow | null>(null);

  // Sync state to URL
  const updateUrl = useCallback(
    (newParams: { q?: string; tier?: string; sort?: string; discipline?: string; filter?: string[]; page?: number }) => {
      const q = newParams.q !== undefined ? newParams.q : search;
      const t = newParams.tier !== undefined ? newParams.tier : tier;
      const s = newParams.sort !== undefined ? newParams.sort : sort;
      const d = newParams.discipline !== undefined ? newParams.discipline : discipline;
      const f = newParams.filter !== undefined ? newParams.filter : filters;
      const p = newParams.page !== undefined ? newParams.page : page;

      const urlParams = new URLSearchParams();
      if (q.trim()) urlParams.set("q", q.trim());
      if (t !== "all") urlParams.set("tier", t);
      if (s !== "score") urlParams.set("sort", s);
      if (d !== "all") urlParams.set("discipline", d);
      if (f.length > 0) urlParams.set("filter", f.join(","));
      if (p > 0) urlParams.set("page", String(p + 1));

      const queryStr = urlParams.toString();
      const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname, search, tier, sort, discipline, filters, page],
  );

  const openReviewsDialog = async (residency: ResidencyRankingRow) => {
    setActiveResidencyForReviews(residency);
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/rankings/residencies/${encodeURIComponent(residency.profileId)}/reviews`);
      if (res.ok) {
        const json = await res.json();
        setReviewsData(json.reviews || []);
      } else {
        setReviewsData([]);
      }
    } catch {
      setReviewsData([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmitted = (newRating: number, newTotalScore: number) => {
    if (!residencyForNewReview) return;
    const targetId = residencyForNewReview.profileId;
    setItems((prev) =>
      prev.map((r) =>
        r.profileId === targetId
          ? {
              ...r,
              rmarRating: newRating,
              totalScore: newTotalScore,
              rmarReviewsCount: r.rmarReviewsCount + 1,
              rmarRatingsCount: r.rmarRatingsCount + 1,
            }
          : r,
      ),
    );
  };

  // Compute summary stats across complete dataset
  const stats = useMemo(() => {
    let fullyFundedCount = 0;
    let stipendCount = 0;
    let reviewsCount = 0;
    let tier1Count = 0;

    for (const item of items) {
      if (item.isFullyFunded) fullyFundedCount++;
      if (item.hasStipend) stipendCount++;
      if (item.rmarReviewsCount > 0 || item.rmarRatingsCount > 0) reviewsCount++;
      if (item.prestigeTier.startsWith("Tier 1")) tier1Count++;
    }

    return {
      total: items.length,
      fullyFundedCount,
      stipendCount,
      reviewsCount,
      tier1Count,
    };
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((row) => {
        // Keyword Search
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchesName = row.name.toLowerCase().includes(q);
          const matchesLocation =
            (row.location && row.location.toLowerCase().includes(q)) ||
            (row.city && row.city.toLowerCase().includes(q)) ||
            (row.region && row.region.toLowerCase().includes(q)) ||
            (row.country && row.country.toLowerCase().includes(q));
          const matchesDisciplines =
            row.disciplines && row.disciplines.toLowerCase().includes(q);
          if (!matchesName && !matchesLocation && !matchesDisciplines) {
            return false;
          }
        }

        // Tier Filter
        if (tier !== "all" && !row.prestigeTier.startsWith(tier)) {
          return false;
        }

        // Discipline Filter
        if (discipline !== "all") {
          const matchedCategory = DISCIPLINES_LIST.find((d) => d.id === discipline);
          if (matchedCategory && "keywords" in matchedCategory) {
            const discText = (row.disciplines || "").toLowerCase();
            const matchesDiscipline = matchedCategory.keywords.some((kw) =>
              discText.includes(kw),
            );
            if (!matchesDiscipline) return false;
          }
        }

        // Feature / Funding Filters
        return filters.every((filter) => {
          if (filter === "funded") return row.isFullyFunded;
          if (filter === "stipend") return row.hasStipend;
          if (filter === "meals") return row.hasMeals;
          if (filter === "studio") return row.hasPrivateStudio;
          if (filter === "reviews") return row.rmarReviewsCount > 0 || row.rmarRatingsCount > 0;
          return true;
        });
      })
      .sort((a, b) => {
        if (sort === "rating") {
          const rA = a.rmarRating ?? 0;
          const rB = b.rmarRating ?? 0;
          return rB - rA || b.totalScore - a.totalScore;
        }
        if (sort === "reviews") {
          return b.rmarReviewsCount - a.rmarReviewsCount || b.totalScore - a.totalScore;
        }
        if (sort === "name") {
          return a.name.localeCompare(b.name);
        }
        return b.totalScore - a.totalScore;
      });
  }, [items, search, tier, discipline, filters, sort]);

  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const hasFilters = Boolean(
    search || tier !== "all" || discipline !== "all" || filters.length > 0,
  );

  function reset() {
    setSearch("");
    setTier("all");
    setDiscipline("all");
    setFilters([]);
    setPage(0);
    updateUrl({ q: "", tier: "all", discipline: "all", filter: [], page: 0 });
  }

  const toggleFilter = (filterId: string) => {
    const next = filters.includes(filterId)
      ? filters.filter((f) => f !== filterId)
      : [...filters, filterId];
    setFilters(next);
    setPage(0);
    updateUrl({ filter: next, page: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Top Rankings Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <nav aria-label="Ranking categories" className="flex flex-wrap items-center gap-2">
          <Link
            href="/rankings/residencies"
            aria-current="page"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors"
          >
            <Building className="h-4 w-4" />
            <span>Artist Residencies</span>
          </Link>
          <Link
            href="/rankings/magazines"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            <Compass className="h-4 w-4" />
            <span>Literary Magazines</span>
          </Link>
          <Link
            href="/rankings/compare?kind=residencies"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            <Scale className="h-4 w-4" />
            <span>Compare Side-by-Side</span>
          </Link>
        </nav>

        <Link
          href="/rankings/methodology"
          className="inline-flex min-h-10 items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          MRI Scoring Methodology →
        </Link>
      </div>

      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building className="h-3.5 w-3.5 text-primary" />
            <span>Programs Ranked</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {stats.total.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>100% Fully Funded</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {stats.fullyFundedCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Stipends Provided</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {stats.stipendCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span>Community Reviews</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {stats.reviewsCount}
          </p>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Keyword Search */}
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="residency-search">Search by name, state, country, or keyword</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="residency-search"
                type="search"
                placeholder="e.g. MacDowell, Vermont, New York, Poetry, Ceramics…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                  updateUrl({ q: e.target.value, page: 0 });
                }}
                className="pl-9 h-11"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(0);
                    updateUrl({ q: "", page: 0 });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search input"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>

          {/* Discipline Selector */}
          <Field>
            <FieldLabel htmlFor="residency-discipline">Artistic discipline</FieldLabel>
            <NativeSelect
              id="residency-discipline"
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setPage(0);
                updateUrl({ discipline: e.target.value, page: 0 });
              }}
              className="w-full [&_select]:h-11"
            >
              {DISCIPLINES_LIST.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {/* Sort Selector */}
          <Field>
            <FieldLabel htmlFor="residency-sort">Sort standings</FieldLabel>
            <NativeSelect
              id="residency-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortOption);
                setPage(0);
                updateUrl({ sort: e.target.value, page: 0 });
              }}
              className="w-full [&_select]:h-11"
            >
              <option value="score">Missa Residency Index (MRI Score)</option>
              <option value="rating">Resident Star Rating (Highest)</option>
              <option value="reviews">Most Community Reviews</option>
              <option value="name">Alphabetical (A–Z)</option>
            </NativeSelect>
          </Field>
        </div>

        {/* Second Row: Prestige Tier & Feature Pills */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-border">
          {/* Feature Toggle Pills */}
          <div className="flex flex-wrap items-center gap-2" aria-label="Funding & facility toggles">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Filters:
            </span>
            {[
              { id: "funded", label: "100% Free / Fellowship", icon: DollarSign },
              { id: "stipend", label: "Stipend Provided", icon: Sparkles },
              { id: "meals", label: "Meals Included", icon: Utensils },
              { id: "studio", label: "Private Studio", icon: Home },
              { id: "reviews", label: "With Reviews", icon: MessageSquare },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = filters.includes(id);
              return (
                <Button
                  key={id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  aria-pressed={isActive}
                  onClick={() => toggleFilter(id)}
                  className="gap-1.5 min-h-9 text-xs"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{label}</span>
                  {isActive && <Check className="h-3 w-3 ml-0.5" />}
                </Button>
              );
            })}
          </div>

          {/* Prestige Tier Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="tier-select" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Tier:
            </label>
            <NativeSelect
              id="tier-select"
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setPage(0);
                updateUrl({ tier: e.target.value, page: 0 });
              }}
              className="[&_select]:h-9 [&_select]:text-xs [&_select]:py-1"
            >
              <option value="all">All Tiers</option>
              <option value="Tier 1">Tier 1: Flagships</option>
              <option value="Tier 2">Tier 2: Distinction</option>
              <option value="Tier 3">Tier 3: Emerging</option>
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Results Counter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground border-b border-border pb-3">
        <p role="status" aria-live="polite">
          Showing <strong className="text-foreground">{filtered.length.toLocaleString()}</strong>{" "}
          {filtered.length === 1 ? "residency program" : "residency programs"}
          {hasFilters ? " matching your active criteria" : " across the index"}
          {total > items.length ? ` · searching ${items.length} of ${total}` : ""}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-xs gap-1">
            <X className="h-3.5 w-3.5" />
            <span>Reset filters</span>
          </Button>
        )}
      </div>

      {/* Content: Responsive Desktop Table & Mobile Cards */}
      {visible.length === 0 ? (
        <Empty className="border border-border py-16 bg-card">
          <EmptyHeader>
            <EmptyTitle>No residencies match your criteria</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t find any programs matching this specific combination of search terms, discipline, and funding filters.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              Clear all filters
            </Button>
            <Button
              variant="default"
              onClick={() => {
                reset();
                toggleFilter("funded");
              }}
            >
              Show all 100% Free Fellowships
            </Button>
          </div>
        </Empty>
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <Table className="w-full">
              <caption className="sr-only">
                2026 Artist Residency rankings, MRI scores, and community reviews.
              </caption>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead scope="col" className="w-16 font-semibold">Rank</TableHead>
                  <TableHead scope="col" className="font-semibold">Residency & Location</TableHead>
                  <TableHead scope="col" className="w-40 font-semibold">Prestige Tier</TableHead>
                  <TableHead scope="col" className="w-48 font-semibold">Funding & Amenities</TableHead>
                  <TableHead scope="col" className="w-36 font-semibold">Community</TableHead>
                  <TableHead scope="col" className="w-28 text-end font-semibold">MRI Index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row, idx) => {
                  const globalRank = currentPage * PAGE_SIZE + idx + 1;
                  return (
                    <TableRow key={row.profileId} className="transition-colors hover:bg-muted/40">
                      {/* Rank */}
                      <TableCell className="font-mono text-sm font-medium text-muted-foreground">
                        #{globalRank}
                      </TableCell>

                      {/* Residency Name & Location */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/residency/${row.slug}`}
                              className="font-medium text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                            >
                              {row.name}
                            </Link>
                            {row.websiteUrl && (
                              <a
                                href={row.websiteUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center p-0.5"
                                title={`Visit official website for ${row.name}`}
                                aria-label={`Visit official website for ${row.name}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                            <span>{row.location || [row.city, row.region, row.country].filter(Boolean).join(", ") || "Location unlisted"}</span>
                            {row.foundingYear && (
                              <span className="text-muted-foreground/60">· Est. {row.foundingYear}</span>
                            )}
                          </div>
                          {row.disciplines && (
                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                              {row.disciplines}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Tier */}
                      <TableCell>
                        <RankingTierBadge tier={row.prestigeTier} />
                      </TableCell>

                      {/* Amenities / Funding Badges */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {row.isFullyFunded && (
                            <span className="inline-flex items-center rounded-md border border-emerald-500/20 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              100% Free
                            </span>
                          )}
                          {row.hasStipend && (
                            <span className="inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Stipend
                            </span>
                          )}
                          {row.hasMeals && (
                            <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-normal bg-muted/40 text-foreground">
                              Meals
                            </span>
                          )}
                          {row.hasPrivateStudio && (
                            <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-normal bg-muted/40 text-foreground">
                              Studio
                            </span>
                          )}
                          {!row.isFullyFunded && !row.hasStipend && !row.hasMeals && !row.hasPrivateStudio && (
                            <span className="text-xs text-muted-foreground">Subsidized / Self-funded</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Community Reviews */}
                      <TableCell>
                        {row.rmarRating !== null ? (
                          <button
                            type="button"
                            onClick={() => openReviewsDialog(row)}
                            className="group flex flex-col items-start gap-0.5 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              <span>{row.rmarRating.toFixed(1)} / 5.0</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground group-hover:text-primary group-hover:underline">
                              {row.rmarReviewsCount > 0
                                ? `${row.rmarReviewsCount} ${row.rmarReviewsCount === 1 ? "review" : "reviews"}`
                                : `${row.rmarRatingsCount} ratings`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setResidencyForNewReview(row)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <PenLine className="h-3 w-3" />
                            <span>Be first to review</span>
                          </button>
                        )}
                      </TableCell>

                      {/* MRI Score Button */}
                      <TableCell className="text-end">
                        <button
                          type="button"
                          onClick={() => setActiveResidencyForScore(row)}
                          className="inline-flex flex-col items-end gap-0.5 group text-right min-h-10 justify-center"
                          title="Click to view full score breakdown"
                        >
                          <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {row.totalScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground group-hover:underline">
                            Breakdown
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {visible.map((row, idx) => {
              const globalRank = currentPage * PAGE_SIZE + idx + 1;
              return (
                <div
                  key={row.profileId}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          #{globalRank}
                        </span>
                        <RankingTierBadge tier={row.prestigeTier} />
                      </div>
                      <Link
                        href={`/residency/${row.slug}`}
                        className="font-medium text-base text-foreground hover:text-primary transition-colors block"
                      >
                        {row.name}
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveResidencyForScore(row)}
                      className="flex flex-col items-end gap-0.5 p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="View score breakdown"
                    >
                      <span className="font-mono text-base font-bold text-foreground">
                        {row.totalScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground underline">
                        MRI Score
                      </span>
                    </button>
                  </div>

                  {/* Location & Est */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{row.location || [row.city, row.region, row.country].filter(Boolean).join(", ") || "Location unlisted"}</span>
                    {row.foundingYear && (
                      <span>· Est. {row.foundingYear}</span>
                    )}
                  </div>

                  {/* Disciplines */}
                  {row.disciplines && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      {row.disciplines}
                    </p>
                  )}

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {row.isFullyFunded && (
                      <span className="inline-flex items-center rounded-md border border-emerald-500/20 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        100% Free
                      </span>
                    )}
                    {row.hasStipend && (
                      <span className="inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        Stipend
                      </span>
                    )}
                    {row.hasMeals && (
                      <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-normal bg-muted/40 text-foreground">
                        Meals
                      </span>
                    )}
                    {row.hasPrivateStudio && (
                      <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-normal bg-muted/40 text-foreground">
                        Studio
                      </span>
                    )}
                  </div>

                  {/* Footer actions on Card */}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    {row.rmarRating !== null ? (
                      <button
                        type="button"
                        onClick={() => openReviewsDialog(row)}
                        className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors min-h-10"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{row.rmarRating.toFixed(1)} / 5.0</span>
                        <span className="text-muted-foreground ml-1">
                          ({row.rmarReviewsCount > 0 ? `${row.rmarReviewsCount} reviews` : `${row.rmarRatingsCount} ratings`})
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResidencyForNewReview(row)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline min-h-10"
                      >
                        <PenLine className="h-3 w-3" />
                        <span>Write a Review</span>
                      </button>
                    )}

                    {row.websiteUrl && (
                      <a
                        href={row.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline min-h-10"
                      >
                        <span>Official Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages} ({filtered.length} total matching programs)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextP = Math.max(0, page - 1);
                setPage(nextP);
                updateUrl({ page: nextP });
              }}
              disabled={currentPage === 0}
              className="gap-1 min-h-10"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextP = Math.min(totalPages - 1, page + 1);
                setPage(nextP);
                updateUrl({ page: nextP });
              }}
              disabled={currentPage >= totalPages - 1}
              className="gap-1 min-h-10"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Community Reviews Modal */}
      <Dialog
        open={Boolean(activeResidencyForReviews)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveResidencyForReviews(null);
            setReviewsData([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                <Building className="h-5 w-5 text-primary" />
                <span>{activeResidencyForReviews?.name} Reviews</span>
              </DialogTitle>
            </div>
            <DialogDescription>
              Community ratings and artist testimonials sourced from verified resident archives.
            </DialogDescription>
          </DialogHeader>

          {/* Action to Write New Review */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Have you been a resident at {activeResidencyForReviews?.name}?
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                const target = activeResidencyForReviews;
                setActiveResidencyForReviews(null);
                setResidencyForNewReview(target);
              }}
              className="gap-1.5 h-8 text-xs"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Write a Review</span>
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {reviewsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading resident reviews…
              </div>
            ) : reviewsData.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground space-y-2">
                <p>No full-text written reviews available yet for this program.</p>
                {activeResidencyForReviews?.rmarRating && (
                  <p className="font-medium text-foreground">
                    Aggregate rating: {activeResidencyForReviews.rmarRating.toFixed(1)} / 5.0 across {activeResidencyForReviews.rmarRatingsCount} community reports.
                  </p>
                )}
                {activeResidencyForReviews?.websiteUrl && (
                  <div className="pt-3">
                    <a
                      href={activeResidencyForReviews.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      Visit Official Program Website <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              reviewsData.map((rev) => (
                <div key={rev.id} className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {rev.authorName || "Anonymous Resident"}
                    </span>
                    {rev.datePublished && <span>{rev.datePublished}</span>}
                  </div>
                  {rev.ratingScore !== null && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      <span>{rev.ratingScore.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                  {rev.reviewTitle && (
                    <h4 className="text-sm font-semibold text-foreground">{rev.reviewTitle}</h4>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {rev.reviewBody}
                  </p>
                  <div className="pt-2 text-[11px] text-muted-foreground/80 flex items-center justify-between">
                    <span>Source: {rev.source}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Score Breakdown Modal with Visual Meters */}
      <Dialog
        open={Boolean(activeResidencyForScore)}
        onOpenChange={(open) => {
          if (!open) setActiveResidencyForScore(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Missa Residency Index (MRI) Breakdown
            </DialogTitle>
            <DialogDescription>
              {activeResidencyForScore?.name} ({activeResidencyForScore?.prestigeTier})
            </DialogDescription>
          </DialogHeader>

          {activeResidencyForScore && (
            <div className="mt-4 space-y-5">
              {/* Total Score Banner */}
              <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Composite Index Score
                </span>
                <div className="mt-1 font-mono text-4xl font-bold text-foreground">
                  {activeResidencyForScore.totalScore.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </div>
                <div className="mt-2">
                  <RankingTierBadge tier={activeResidencyForScore.prestigeTier} />
                </div>
              </div>

              {/* Dimension Meters */}
              <div className="space-y-4 text-sm">
                {/* Funding */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Funding & Financial Support</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.fundingScore.toFixed(1)} / 35 pts
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(activeResidencyForScore.fundingScore / 35) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.isFullyFunded ? "100% Free residency fellowship (25 pts) + " : "Self-funded / subsidized + "}
                    {activeResidencyForScore.hasStipend ? "Living stipend provided (10 pts)" : "No stipend reported"}
                  </p>
                </div>

                {/* Community */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                      <span>Resident Community Rating</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.ratingScore.toFixed(1)} / 30 pts
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(activeResidencyForScore.ratingScore / 30) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.rmarRating !== null
                      ? `Normalized from ${activeResidencyForScore.rmarRating.toFixed(1)} / 5.0 star community rating`
                      : "Default baseline score prior to community review"}
                  </p>
                </div>

                {/* Facilities */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Home className="h-4 w-4 text-sky-500" />
                      <span>Facilities & Solitude</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.facilitiesScore.toFixed(1)} / 20 pts
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-500"
                      style={{ width: `${(activeResidencyForScore.facilitiesScore / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.hasMeals ? "Meals included (10 pts) + " : "Meals self-catered + "}
                    {activeResidencyForScore.hasPrivateStudio ? "Private dedicated studio (10 pts)" : "Shared or unlisted studio"}
                  </p>
                </div>

                {/* Prestige */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Award className="h-4 w-4 text-primary" />
                      <span>Prestige & Institutional Access</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.accessScore.toFixed(1)} / 15 pts
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(activeResidencyForScore.accessScore / 15) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Historical longevity, multi-directory provenance, and active verified calls
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Write a Review Dialog */}
      <SubmitResidencyReviewDialog
        residency={residencyForNewReview}
        isOpen={Boolean(residencyForNewReview)}
        onClose={() => setResidencyForNewReview(null)}
        onSuccess={handleReviewSubmitted}
      />
    </div>
  );
}
