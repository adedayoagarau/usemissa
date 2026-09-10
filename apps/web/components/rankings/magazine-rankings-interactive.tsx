"use client";

import { RankingMovement, RankingTierBadge } from "@/components/missa/ranking-indicators";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import type { RankingGenre } from "@missa/radar-engine";
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
import { MagazineScheduleBadge } from "@/components/ui/magazine-schedule-badge";
import { ReportResponseDialog } from "./report-response-dialog";
import { MagazineTrackerAction } from "./magazine-tracker-action";

const genres = ["overall", "poetry", "fiction", "nonfiction"] as const;
const pageSize = 25;
type Sort = "rank" | "accolades" | "pay" | "turnaround";

export function MagazineRankingsInteractive({
  initialItems,
  currentGenre,
  total,
  signedIn,
  preview = false,
}: {
  initialItems: MagazineRankingRow[];
  currentGenre: RankingGenre;
  total: number;
  signedIn: boolean;
  preview?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<Sort>("rank");
  const [filters, setFilters] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      initialItems
        .filter((row) => {
          if (
            !row.name.toLowerCase().includes(search.trim().toLowerCase()) &&
            !row.slug.toLowerCase().includes(search.trim().toLowerCase())
          )
            return false;
          if (tier !== "all" && !row.prestigeTier.startsWith(tier))
            return false;
          return filters.every((filter) =>
            filter === "free"
              ? row.regularFeeCents === 0
              : filter === "paying"
                ? row.contributorPayCents > 0
                : filter === "simultaneous"
                  ? row.simultaneousPolicy === "allowed"
                  : row.medianResponseDays != null &&
                    row.medianResponseDays <= 60,
          );
        })
        .sort((a, b) =>
          sort === "accolades"
            ? b.accoladesScore - a.accoladesScore
            : sort === "pay"
              ? b.payScore - a.payScore
              : sort === "turnaround"
                ? (a.medianResponseDays ?? Infinity) -
                  (b.medianResponseDays ?? Infinity)
                : a.rankPosition - b.rankPosition,
        ),
    [initialItems, search, tier, filters, sort],
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  );
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const hasFilters = Boolean(search || tier !== "all" || filters.length);
  function reset() {
    setSearch("");
    setTier("all");
    setFilters([]);
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border">
        <nav aria-label="Ranking genre" className="flex flex-wrap gap-6">
          {genres.map((genre) => (
            <Link
              key={genre}
              href={`/rankings/magazines?genre=${genre}`}
              onClick={(event) => {
                event.preventDefault();
                window.location.assign(`/rankings/magazines?genre=${genre}`);
              }}
              aria-current={genre === currentGenre ? "page" : undefined}
              className={`inline-flex min-h-12 items-center border-b-2 text-sm font-medium capitalize outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring ${genre === currentGenre ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </Link>
          ))}
        </nav>
        {!preview && (
          <div className="flex flex-wrap gap-3 pb-3">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/rankings/compare" />}
            >
              Compare magazines <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field className="col-span-2">
          <FieldLabel htmlFor="magazine-search">Find a magazine</FieldLabel>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-3 size-5 text-muted-foreground"
            />
            <Input
              id="magazine-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name"
              className="h-11 ps-10"
            />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="magazine-tier">Ranking tier</FieldLabel>
          <NativeSelect
            id="magazine-tier"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(0);
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
          <FieldLabel htmlFor="magazine-sort">Sort by</FieldLabel>
          <NativeSelect
            id="magazine-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(0);
            }}
            className="w-full [&_select]:h-11"
          >
            <option value="rank">Missa rank</option>
            <option value="accolades">Anthology honors</option>
            <option value="pay">Contributor pay score</option>
            <option value="turnaround">Median response time</option>
          </NativeSelect>
        </Field>
      </div>
      {!preview && (
        <div
          className="flex flex-wrap gap-3"
          aria-label="Submission preferences"
        >
          {[
            ["free", "No submission fee"],
            ["paying", "Pays contributors"],
            ["simultaneous", "Allows simultaneous submissions"],
            ["fast", "Responds within 60 days"],
          ].map(([id, label]) => (
            <Button
              key={id}
              variant={filters.includes(id) ? "default" : "outline"}
              aria-pressed={filters.includes(id)}
              onClick={() => {
                setFilters((old) =>
                  old.includes(id) ? old.filter((f) => f !== id) : [...old, id],
                );
                setPage(0);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p role="status" aria-live="polite">
          {filtered.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "magazine" : "magazines"}
          {hasFilters ? " matching your search" : " in this index"}
          {total > initialItems.length
            ? ` · searching ${initialItems.length} of ${total} entries`
            : ""}
        </p>
        {hasFilters && (
          <Button variant="ghost" onClick={reset}>
            Clear filters
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <Empty className="border border-border py-16">
          <EmptyHeader>
            <EmptyTitle>No magazines found</EmptyTitle>
            <EmptyDescription>
              Try a different name or remove a filter to broaden your search.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={reset}>
            Clear filters
          </Button>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <caption className="sr-only">
            2026 {currentGenre} magazine rankings. Scores are index points;
            response times are medians where available.
          </caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="w-12 text-start sm:w-20">
                Rank
              </TableHead>
              <TableHead scope="col" className="text-start">
                Magazine
              </TableHead>
              <TableHead scope="col" className="w-16 text-end sm:w-24">
                Score
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-end lg:table-cell"
              >
                Honors / 40
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-24 text-end lg:table-cell"
              >
                Pay / 15
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-32 text-end md:table-cell"
              >
                Response
              </TableHead>
              {!preview && (
                <TableHead
                  scope="col"
                  className="hidden w-48 text-end xl:table-cell"
                >
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.profileId}>
                <TableCell className="py-6 align-top font-mono text-base text-muted-foreground tabular-nums">
                  {row.rankPosition}
                  <RankingMovement delta={row.rankDelta} />
                </TableCell>
                <TableCell className="py-6 whitespace-normal">
                  <Link
                    href={`/journal/${encodeURIComponent(row.slug)}`}
                    className="inline-flex min-h-11 items-center text-base leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:text-lg"
                  >
                    {row.name}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <RankingTierBadge tier={row.prestigeTier} />
                    {!preview && (
                      <MagazineScheduleBadge schedule={row.schedule} />
                    )}
                  </div>
                  {!preview && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {row.regularFeeCents === 0
                        ? "No submission fee"
                        : row.regularFeeCents != null
                          ? "Submission fee applies"
                          : "Fee not listed"}
                      {row.simultaneousPolicy === "allowed"
                        ? " · Simultaneous submissions welcome"
                        : row.simultaneousPolicy === "not_allowed"
                          ? " · No simultaneous submissions"
                          : ""}
                    </p>
                  )}
                  {!preview && (
                    <div className="mt-3 flex flex-wrap gap-3 xl:hidden">
                      <MagazineTrackerAction
                        magazineName={row.name}
                        magazineSlug={row.slug}
                        activeOpportunity={row.activeOpportunity}
                        signedIn={signedIn}
                        returnTo={`/rankings/magazines?genre=${currentGenre}`}
                      />
                      {signedIn && (
                        <ReportResponseDialog
                          profileId={row.profileId}
                          magazineName={row.name}
                          onSuccess={() => router.refresh()}
                          trigger={
                            <Button variant="ghost">Report a response</Button>
                          }
                        />
                      )}
                    </div>
                  )}
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
                  {row.accoladesScore}
                </TableCell>
                <TableCell className="hidden py-6 text-end font-mono tabular-nums lg:table-cell">
                  {row.payScore}
                </TableCell>
                <TableCell className="hidden py-6 text-end md:table-cell">
                  {!preview && row.medianResponseDays != null ? (
                    <>
                      <span className="font-mono tabular-nums">
                        {row.medianResponseDays} days
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        median
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not available
                    </span>
                  )}
                </TableCell>
                {!preview && (
                  <TableCell className="hidden py-6 xl:table-cell">
                    <div className="flex flex-col items-end gap-3">
                      <MagazineTrackerAction
                        magazineName={row.name}
                        magazineSlug={row.slug}
                        activeOpportunity={row.activeOpportunity}
                        signedIn={signedIn}
                        returnTo={`/rankings/magazines?genre=${currentGenre}`}
                      />
                      {signedIn && (
                        <ReportResponseDialog
                          profileId={row.profileId}
                          magazineName={row.name}
                          onSuccess={() => router.refresh()}
                          trigger={
                            <Button variant="ghost">Report a response</Button>
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {filtered.length > pageSize && (
        <nav
          aria-label="Ranking pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {Math.ceil(filtered.length / pageSize)}
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={(currentPage + 1) * pageSize >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
