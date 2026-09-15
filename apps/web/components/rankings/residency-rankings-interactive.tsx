"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Award,
  Building,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ExternalLink,
  Home,
  MapPin,
  PenLine,
  Search,
  Star,
} from "lucide-react";
import type {
  ResidencyRankingRow,
  ResidencyReviewRow,
} from "@missa/radar-adapters";
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
import { ResidencyIntelligenceDrawer } from "./residency-intelligence-drawer";
import styles from "./residency-index.module.css";

const PAGE_SIZE = 25;

type SortOption = "score" | "rating" | "reviews" | "name";

const DISCIPLINES_LIST = [
  { id: "all", label: "All Disciplines" },
  {
    id: "writing",
    label: "Writing & Literature",
    keywords: [
      "writing",
      "literature",
      "poetry",
      "fiction",
      "playwriting",
      "screenwriting",
      "nonfiction",
      "translation",
    ],
  },
  {
    id: "visual",
    label: "Visual Arts",
    keywords: [
      "visual",
      "painting",
      "sculpture",
      "ceramics",
      "drawing",
      "printmaking",
      "photography",
      "textiles",
    ],
  },
  {
    id: "multi",
    label: "Multidisciplinary & Hybrid",
    keywords: [
      "interdisciplinary",
      "multidisciplinary",
      "all disciplines",
      "hybrid",
    ],
  },
  {
    id: "music",
    label: "Music & Sound",
    keywords: ["music", "composition", "sound", "acoustic"],
  },
  {
    id: "film",
    label: "Film & Media Arts",
    keywords: ["film", "video", "media", "animation", "digital"],
  },
  {
    id: "performance",
    label: "Dance & Performing Arts",
    keywords: ["dance", "performance", "theater", "choreography"],
  },
] as const;

const FUNDING_FILTERS = [
  { id: "funded", label: "Fully funded" },
  { id: "stipend", label: "Stipend" },
  { id: "meals", label: "Meals included" },
  { id: "studio", label: "Private studio" },
  { id: "reviews", label: "Community reviews" },
] as const;

function locationLabel(row: ResidencyRankingRow): string {
  return (
    row.location ||
    [row.city, row.region, row.country].filter(Boolean).join(", ") ||
    "Location unlisted"
  );
}

function fundingFacts(row: ResidencyRankingRow): string[] {
  const facts: string[] = [];
  if (row.isFullyFunded) facts.push("Fully funded");
  if (row.hasStipend) facts.push("Stipend");
  if (row.hasMeals) facts.push("Meals included");
  if (row.hasPrivateStudio) facts.push("Private studio");
  return facts.length > 0 ? facts : ["Subsidized or self-funded"];
}

function communityLabel(row: ResidencyRankingRow): string {
  if (row.rmarReviewsCount > 0) {
    return `${row.rmarReviewsCount} ${row.rmarReviewsCount === 1 ? "review" : "reviews"}`;
  }
  if (row.rmarRatingsCount > 0) {
    return `${row.rmarRatingsCount} ratings`;
  }
  return "No ratings yet";
}

export function ResidencyRankingsInteractive({
  initialItems,
  total,
}: {
  initialItems: ResidencyRankingRow[];
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramQ = searchParams?.get("q") ?? "";
  const paramTier = searchParams?.get("tier") ?? "all";
  const paramSort = (searchParams?.get("sort") as SortOption) ?? "score";
  const paramDiscipline = searchParams?.get("discipline") ?? "all";
  const paramFilters = searchParams?.get("filter")
    ? searchParams.get("filter")!.split(",").filter(Boolean)
    : [];
  const paramPage = parseInt(searchParams?.get("page") ?? "1", 10) - 1;

  const [items, setItems] = useState<ResidencyRankingRow[]>(initialItems);
  const [search, setSearch] = useState(paramQ);
  const [tier, setTier] = useState(paramTier);
  const [sort, setSort] = useState<SortOption>(paramSort);
  const [discipline, setDiscipline] = useState(paramDiscipline);
  const [filters, setFilters] = useState<string[]>(paramFilters);
  const [page, setPage] = useState(
    Math.max(0, isNaN(paramPage) ? 0 : paramPage),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const [activeResidencyForReviews, setActiveResidencyForReviews] =
    useState<ResidencyRankingRow | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState<ResidencyReviewRow[]>([]);
  const [residencyForNewReview, setResidencyForNewReview] =
    useState<ResidencyRankingRow | null>(null);
  const [activeResidencyForScore, setActiveResidencyForScore] =
    useState<ResidencyRankingRow | null>(null);

  const updateUrl = useCallback(
    (next: {
      q?: string;
      tier?: string;
      sort?: string;
      discipline?: string;
      filter?: string[];
      page?: number;
    }) => {
      const q = next.q !== undefined ? next.q : search;
      const t = next.tier !== undefined ? next.tier : tier;
      const s = next.sort !== undefined ? next.sort : sort;
      const d = next.discipline !== undefined ? next.discipline : discipline;
      const f = next.filter !== undefined ? next.filter : filters;
      const p = next.page !== undefined ? next.page : page;

      const urlParams = new URLSearchParams();
      if (q.trim()) urlParams.set("q", q.trim());
      if (t !== "all") urlParams.set("tier", t);
      if (s !== "score") urlParams.set("sort", s);
      if (d !== "all") urlParams.set("discipline", d);
      if (f.length > 0) urlParams.set("filter", f.join(","));
      if (p > 0) urlParams.set("page", String(p + 1));

      const queryStr = urlParams.toString();
      window.history.replaceState(
        null,
        "",
        queryStr ? `${pathname}?${queryStr}` : pathname,
      );
    },
    [pathname, search, tier, sort, discipline, filters, page],
  );

  const filtered = useMemo(() => {
    return items
      .filter((row) => {
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

        if (
          tier !== "all" &&
          !row.prestigeTier.toLowerCase().includes(tier.toLowerCase())
        ) {
          return false;
        }

        if (discipline !== "all") {
          const matchedCategory = DISCIPLINES_LIST.find(
            (d) => d.id === discipline,
          );
          if (matchedCategory && "keywords" in matchedCategory) {
            const discText = (row.disciplines || "").toLowerCase();
            if (!matchedCategory.keywords.some((kw) => discText.includes(kw))) {
              return false;
            }
          }
        }

        return filters.every((filter) => {
          if (filter === "funded") return row.isFullyFunded;
          if (filter === "stipend") return row.hasStipend;
          if (filter === "meals") return row.hasMeals;
          if (filter === "studio") return row.hasPrivateStudio;
          if (filter === "reviews") {
            return row.rmarReviewsCount > 0 || row.rmarRatingsCount > 0;
          }
          return true;
        });
      })
      .sort((a, b) => {
        if (sort === "rating") {
          return (
            (b.rmarRating ?? 0) - (a.rmarRating ?? 0) ||
            b.totalScore - a.totalScore
          );
        }
        if (sort === "reviews") {
          return (
            b.rmarReviewsCount - a.rmarReviewsCount ||
            b.totalScore - a.totalScore
          );
        }
        if (sort === "name") return a.name.localeCompare(b.name);
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

  function toggleFilter(filterId: string) {
    const next = filters.includes(filterId)
      ? filters.filter((f) => f !== filterId)
      : [...filters, filterId];
    setFilters(next);
    setPage(0);
    updateUrl({ filter: next, page: 0 });
  }

  async function openReviewsDialog(residency: ResidencyRankingRow) {
    setActiveResidencyForReviews(residency);
    setReviewsLoading(true);
    try {
      const res = await fetch(
        `/api/rankings/residencies/${encodeURIComponent(residency.profileId)}/reviews`,
      );
      setReviewsData(res.ok ? ((await res.json()).reviews ?? []) : []);
    } catch {
      setReviewsData([]);
    } finally {
      setReviewsLoading(false);
    }
  }

  function handleReviewSubmitted(newRating: number, newTotalScore: number) {
    if (!residencyForNewReview) return;
    const targetId = residencyForNewReview.profileId;
    setItems((previous) =>
      previous.map((row) =>
        row.profileId === targetId
          ? {
              ...row,
              rmarRating: newRating,
              totalScore: newTotalScore,
              rmarReviewsCount: row.rmarReviewsCount + 1,
              rmarRatingsCount: row.rmarRatingsCount + 1,
            }
          : row,
      ),
    );
  }

  async function loadMore() {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const params = new URLSearchParams({
        offset: String(items.length),
        limit: "250",
      });
      const response = await fetch(`/api/rankings/residencies?${params}`);
      if (!response.ok) throw new Error("Residency rankings request failed");
      const payload = (await response.json()) as {
        items: ResidencyRankingRow[];
      };
      setItems((current) => {
        const known = new Set(current.map((item) => item.profileId));
        return [
          ...current,
          ...payload.items.filter((item) => !known.has(item.profileId)),
        ];
      });
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border">
        <nav aria-label="Ranking kind" className="flex flex-wrap gap-6">
          {[
            {
              href: "/rankings/residencies",
              label: "Artist residencies",
              current: true,
            },
            {
              href: "/rankings/magazines",
              label: "Literary magazines",
              current: false,
            },
            {
              href: "/rankings/compare?kind=residencies",
              label: "Compare",
              current: false,
            },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={`inline-flex min-h-12 items-center border-b-2 text-sm font-medium outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring ${tab.current ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-3 pb-3">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/residencies" />}
          >
            Residency directory
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/rankings/methodology" />}
          >
            Methodology
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Field className="col-span-2">
          <FieldLabel htmlFor="residency-search">Find a residency</FieldLabel>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-3 size-5 text-muted-foreground"
            />
            <Input
              id="residency-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
                updateUrl({ q: e.target.value, page: 0 });
              }}
              placeholder="Search by name, discipline, or location"
              className="h-11 ps-10"
            />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="residency-discipline">
            Artistic discipline
          </FieldLabel>
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
        <Field>
          <FieldLabel htmlFor="residency-tier">Ranking tier</FieldLabel>
          <NativeSelect
            id="residency-tier"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(0);
              updateUrl({ tier: e.target.value, page: 0 });
            }}
            className="w-full [&_select]:h-11"
          >
            <option value="all">All tiers</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={`Tier ${n}`}>
                Tier {n}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="residency-sort">Sort by</FieldLabel>
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
            <option value="score">Missa Residency Index</option>
            <option value="rating">Resident star rating</option>
            <option value="reviews">Most community reviews</option>
            <option value="name">Alphabetical (A–Z)</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3" aria-label="Residency preferences">
        {FUNDING_FILTERS.map(({ id, label }) => (
          <Button
            key={id}
            variant={filters.includes(id) ? "default" : "outline"}
            aria-pressed={filters.includes(id)}
            onClick={() => toggleFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p role="status" aria-live="polite">
          {filtered.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "residency" : "residencies"}
          {hasFilters ? " matching your search" : " in this index"}
          {total > items.length
            ? ` · searching ${items.length} of ${total} entries`
            : ""}
        </p>
        {hasFilters && (
          <Button variant="ghost" onClick={reset}>
            Clear filters
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <Empty variant="bordered" size="spacious">
          <EmptyHeader>
            <EmptyTitle>No residencies found</EmptyTitle>
            <EmptyDescription>
              Try a different name, discipline, or funding filter to broaden
              your search.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={reset}>
            Clear filters
          </Button>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <caption className="sr-only">
            2026 artist residency rankings. Scores are Missa Residency Index
            points; community ratings come from resident reporting.
          </caption>
          <TableHeader>
            <TableRow variant="static">
              <TableHead scope="col" className="w-12 text-start sm:w-20">
                Rank
              </TableHead>
              <TableHead scope="col" className="text-start">
                Residency
              </TableHead>
              <TableHead scope="col" className="w-16 text-end sm:w-24">
                Score
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-24 text-end lg:table-cell"
              >
                Funding / 35
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-end lg:table-cell"
              >
                Community / 30
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-end xl:table-cell"
              >
                Facilities / 20
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-24 text-end xl:table-cell"
              >
                Access / 15
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-48 text-end xl:table-cell"
              >
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => {
              const rank = currentPage * PAGE_SIZE + index + 1;
              return (
                <TableRow key={row.profileId}>
                  <TableCell
                    tone="muted"
                    className="py-6 align-top font-mono text-base tabular-nums"
                  >
                    {rank}
                  </TableCell>
                  <TableCell className="py-6 whitespace-normal">
                    <Link
                      href={`/residency/${encodeURIComponent(row.slug)}`}
                      className="inline-flex min-h-11 items-center text-base leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:text-lg"
                    >
                      {row.name}
                    </Link>
                    {row.websiteUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open the ${row.name} website`}
                        title={`Open the ${row.name} website`}
                        nativeButton={false}
                        render={
                          <a
                            href={row.websiteUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                          />
                        }
                      >
                        <ExternalLink aria-hidden="true" />
                      </Button>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <RankingTierBadge tier={row.prestigeTier} />
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-3" />
                        {locationLabel(row)}
                        {row.foundingYear ? ` · Est. ${row.foundingYear}` : ""}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {fundingFacts(row).join(" · ")}
                    </p>
                    {row.disciplines ? (
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground italic">
                        {row.disciplines}
                      </p>
                    ) : null}
                    <dl
                      className="mt-4 grid gap-2 lg:hidden"
                      aria-label={`${row.name} score details`}
                    >
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                        <dt className="text-xs text-muted-foreground">
                          Funding support
                        </dt>
                        <dd className="font-mono text-xs text-foreground tabular-nums">
                          {row.fundingScore.toFixed(1)} / 35
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                        <dt className="text-xs text-muted-foreground">
                          Community score
                        </dt>
                        <dd className="font-mono text-xs text-foreground tabular-nums">
                          {row.ratingScore.toFixed(1)} / 30
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                        <dt className="text-xs text-muted-foreground">
                          Facilities
                        </dt>
                        <dd className="font-mono text-xs text-foreground tabular-nums">
                          {row.facilitiesScore.toFixed(1)} / 20
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-3 xl:hidden">
                      <ResidencyIntelligenceDrawer
                        profileId={row.profileId}
                        residencyName={row.name}
                        residencySlug={row.slug}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => void openReviewsDialog(row)}
                      >
                        {row.rmarRating !== null
                          ? "Resident reviews"
                          : "Add review"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setActiveResidencyForScore(row)}
                      >
                        Score breakdown
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-end align-top">
                    <span className="font-mono text-lg font-medium text-primary tabular-nums">
                      {row.totalScore.toFixed(1)}
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      / 100
                    </span>
                  </TableCell>
                  <TableCell className="hidden py-6 text-end font-mono tabular-nums lg:table-cell">
                    {row.fundingScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden py-6 text-end lg:table-cell">
                    {row.rmarRating !== null ? (
                      <>
                        <span className="font-mono tabular-nums">
                          {row.ratingScore.toFixed(1)}
                        </span>
                        <span className="mt-2 block text-xs text-muted-foreground">
                          {row.rmarRating.toFixed(1)} / 5.0 ·{" "}
                          {communityLabel(row)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono tabular-nums">
                          {row.ratingScore.toFixed(1)}
                        </span>
                        <span className="mt-2 block text-xs text-muted-foreground">
                          {communityLabel(row)}
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="hidden py-6 text-end font-mono tabular-nums xl:table-cell">
                    {row.facilitiesScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden py-6 text-end font-mono tabular-nums xl:table-cell">
                    {row.accessScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden py-6 xl:table-cell">
                    <div className="flex flex-col items-end gap-2.5">
                      <ResidencyIntelligenceDrawer
                        profileId={row.profileId}
                        residencyName={row.name}
                        residencySlug={row.slug}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => void openReviewsDialog(row)}
                        >
                          Reviews
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setActiveResidencyForScore(row)}
                        >
                          Breakdown
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {filtered.length > PAGE_SIZE && (
        <nav
          aria-label="Ranking pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => {
                const next = currentPage - 1;
                setPage(next);
                updateUrl({ page: next });
              }}
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length}
              onClick={() => {
                const next = currentPage + 1;
                setPage(next);
                updateUrl({ page: next });
              }}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      {items.length < total ? (
        <div className="flex flex-col items-center gap-2 border-t border-border pt-6">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more rankings…" : "Load more rankings"}
          </Button>
          {loadMoreError ? (
            <p role="alert" className="text-sm text-destructive">
              More rankings could not load. Try again.
            </p>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={Boolean(activeResidencyForReviews)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveResidencyForReviews(null);
            setReviewsData([]);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Building aria-hidden="true" className="size-5" />
              <span>{activeResidencyForReviews?.name} reviews</span>
            </DialogTitle>
            <DialogDescription>
              Community ratings and resident testimonials sourced from publicly
              reported accounts. Missa does not verify residency outcomes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Have you been a resident at {activeResidencyForReviews?.name}?
            </div>
            <Button
              size="sm"
              onClick={() => {
                const target = activeResidencyForReviews;
                setActiveResidencyForReviews(null);
                setResidencyForNewReview(target);
              }}
            >
              <PenLine aria-hidden="true" />
              Write a review
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {reviewsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading resident reviews…
              </div>
            ) : reviewsData.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                <p>
                  No full-text written reviews available yet for this program.
                </p>
                {activeResidencyForReviews?.rmarRating ? (
                  <p className="font-medium text-foreground">
                    Aggregate rating:{" "}
                    {activeResidencyForReviews.rmarRating.toFixed(1)} / 5.0
                    across {activeResidencyForReviews.rmarRatingsCount}{" "}
                    community reports.
                  </p>
                ) : null}
                {activeResidencyForReviews?.websiteUrl ? (
                  <div className="pt-3">
                    <a
                      href={activeResidencyForReviews.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Visit official program website
                      <ExternalLink aria-hidden="true" className="size-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            ) : (
              reviewsData.map((review) => (
                <div
                  key={review.id}
                  className="space-y-2.5 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {review.authorName || "Anonymous resident"}
                    </span>
                    {review.datePublished ? (
                      <span>{review.datePublished}</span>
                    ) : null}
                  </div>
                  {review.ratingScore !== null ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      <Star
                        aria-hidden="true"
                        className={`size-3.5 ${styles.communityStar}`}
                      />
                      <span>{review.ratingScore.toFixed(1)} / 5.0</span>
                    </div>
                  ) : null}
                  {review.reviewTitle ? (
                    <h3 className="text-sm font-semibold text-foreground">
                      {review.reviewTitle}
                    </h3>
                  ) : null}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {review.reviewBody}
                  </p>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Source: {review.source}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activeResidencyForScore)}
        onOpenChange={(open) => {
          if (!open) setActiveResidencyForScore(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Missa Residency Index breakdown
            </DialogTitle>
            <DialogDescription>
              {activeResidencyForScore?.name}
            </DialogDescription>
          </DialogHeader>

          {activeResidencyForScore ? (
            <div className="mt-4 space-y-5">
              <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Composite index score
                </span>
                <div className="mt-1 font-mono text-4xl font-bold text-foreground">
                  {activeResidencyForScore.totalScore.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / 100
                  </span>
                </div>
                <div className="mt-2">
                  <RankingTierBadge
                    tier={activeResidencyForScore.prestigeTier}
                  />
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <DollarSign
                        aria-hidden="true"
                        className={`size-4 ${styles.fundingAccent}`}
                      />
                      <span>Funding &amp; financial support</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.fundingScore.toFixed(1)} / 35 pts
                    </span>
                  </div>
                  <div className={styles.meterTrack}>
                    <div
                      className={`${styles.meterFill} ${styles.fundingMeter}`}
                      style={{
                        width: `${(activeResidencyForScore.fundingScore / 35) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.isFullyFunded
                      ? "Fully funded fellowship"
                      : "Self-funded or subsidized"}
                    {activeResidencyForScore.hasStipend
                      ? " · Living stipend provided"
                      : " · No stipend reported"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Star
                        aria-hidden="true"
                        className={`size-4 ${styles.communityStar}`}
                      />
                      <span>Resident community rating</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.ratingScore.toFixed(1)} / 30 pts
                    </span>
                  </div>
                  <div className={styles.meterTrack}>
                    <div
                      className={`${styles.meterFill} ${styles.communityMeter}`}
                      style={{
                        width: `${(activeResidencyForScore.ratingScore / 30) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.rmarRating !== null
                      ? `Normalized from ${activeResidencyForScore.rmarRating.toFixed(1)} / 5.0 resident reporting`
                      : "Baseline score prior to community reporting"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Home
                        aria-hidden="true"
                        className={`size-4 ${styles.facilitiesAccent}`}
                      />
                      <span>Facilities &amp; solitude</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.facilitiesScore.toFixed(1)} / 20
                      pts
                    </span>
                  </div>
                  <div className={styles.meterTrack}>
                    <div
                      className={`${styles.meterFill} ${styles.facilitiesMeter}`}
                      style={{
                        width: `${(activeResidencyForScore.facilitiesScore / 20) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeResidencyForScore.hasMeals
                      ? "Meals included"
                      : "Meals self-catered"}
                    {activeResidencyForScore.hasPrivateStudio
                      ? " · Private dedicated studio"
                      : " · Shared or unlisted studio"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Award
                        aria-hidden="true"
                        className={`size-4 ${styles.accessAccent}`}
                      />
                      <span>Prestige &amp; institutional access</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {activeResidencyForScore.accessScore.toFixed(1)} / 15 pts
                    </span>
                  </div>
                  <div className={styles.meterTrack}>
                    <div
                      className={`${styles.meterFill} ${styles.accessMeter}`}
                      style={{
                        width: `${(activeResidencyForScore.accessScore / 15) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Historical longevity, multi-directory provenance, and
                    linked calls with current source records
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SubmitResidencyReviewDialog
        residency={residencyForNewReview}
        isOpen={Boolean(residencyForNewReview)}
        onClose={() => setResidencyForNewReview(null)}
        onSuccess={handleReviewSubmitted}
      />
    </div>
  );
}
