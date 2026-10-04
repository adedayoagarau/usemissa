"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ResidencyRankingRow } from "@missa/radar-adapters";
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
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { ResidencyIntelligenceDrawer } from "./residency-intelligence-drawer";
import { SubmitResidencyReviewDialog } from "./submit-residency-review-dialog";
import {
  NOT_RECORDED,
  RESIDENCY_SORT_LABELS,
  compareResidencies,
  costCell,
  ratingCell,
  residencyFilters,
  stipendCell,
  type ResidencyFilterId,
  type ResidencySort,
} from "@/lib/residencyFacts";

const pageSize = 25;

const FILTERS: Array<[ResidencyFilterId, string]> = [
  ["free", "No residency fee"],
  ["stipend", "Pays a stipend"],
  ["meals", "Meals provided"],
  ["studio", "Private studio"],
  ["open", "Open call now"],
];

export function ResidencyRankingsInteractive({
  initialItems,
  signedIn = false,
}: {
  initialItems: ResidencyRankingRow[];
  signedIn?: boolean;
}) {
  const router = useRouter();
  const items = initialItems;
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<ResidencySort>("rank");
  const [filters, setFilters] = useState<ResidencyFilterId[]>([]);
  const [page, setPage] = useState(0);
  const [reviewing, setReviewing] = useState<ResidencyRankingRow | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((row) => {
        if (
          query &&
          !row.name.toLowerCase().includes(query) &&
          !(row.location ?? "").toLowerCase().includes(query) &&
          !(row.disciplines ?? "").toLowerCase().includes(query)
        )
          return false;
        if (tier !== "all" && !row.prestigeTier.startsWith(tier)) return false;
        return filters.every((filter) => residencyFilters[filter](row));
      })
      .sort(compareResidencies(sort));
  }, [items, search, tier, filters, sort]);

  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  );
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const hasFilters = Boolean(search || tier !== "all" || filters.length);
  // Tier headings read naturally only while the list runs in rank order.
  const groupByTier = sort === "rank" && tier === "all";

  function reset() {
    setSearch("");
    setTier("all");
    setFilters([]);
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-1 border-b border-border pb-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/rankings/magazines" />}
        >
          Magazine rankings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/rankings/compare" />}
        >
          Compare residencies <ArrowRight aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              }}
              placeholder="Name, place or discipline"
              className="h-11 ps-10"
            />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="residency-tier">Ranking tier</FieldLabel>
          <NativeSelect
            id="residency-tier"
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
          <FieldLabel htmlFor="residency-sort">Sort by</FieldLabel>
          <NativeSelect
            id="residency-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ResidencySort);
              setPage(0);
            }}
            className="w-full [&_select]:h-11"
          >
            {(
              Object.entries(RESIDENCY_SORT_LABELS) as Array<
                [ResidencySort, string]
              >
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div
        role="group"
        className="flex flex-wrap gap-2"
        aria-label="Residency preferences"
      >
        {FILTERS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={filters.includes(id) ? "secondary" : "outline"}
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p role="status" aria-live="polite">
          {filtered.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "residency" : "residencies"}
          {hasFilters ? " matching your search" : " in this index"}
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
              Try a different name or place, or remove a filter to broaden your
              search.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={reset}>
            Clear filters
          </Button>
        </Empty>
      ) : (
        <Table>
          <caption className="sr-only">
            Residency rankings, ordered by{" "}
            {RESIDENCY_SORT_LABELS[sort].toLowerCase()}. Scores are out of 100;
            a dash means no source records the fact.
          </caption>
          <TableHeader>
            <TableRow variant="static">
              <TableHead scope="col" className="w-10 text-start sm:w-14">
                {sort === "rank" ? "Rank" : "#"}
              </TableHead>
              <TableHead scope="col" className="text-start">
                Residency
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-24 text-start lg:table-cell"
              >
                Cost
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-start lg:table-cell"
              >
                Stipend
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-32 text-start md:table-cell"
              >
                Rating
              </TableHead>
              <TableHead scope="col" className="w-16 text-end sm:w-24">
                Score
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-end sm:table-cell"
              >
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => {
              const cost = costCell(row);
              const stipend = stipendCell(row);
              const rating = ratingCell(row);
              const rowTier = tierParts(row.prestigeTier);
              const startsTier =
                groupByTier &&
                (index === 0 ||
                  tierParts(visible[index - 1].prestigeTier).label !==
                    rowTier.label);
              // Other sorts number the list in their own order; the Missa rank stays under the name.
              const position =
                sort === "rank"
                  ? row.rankPosition
                  : currentPage * pageSize + index + 1;
              const opportunityId = row.openCall?.url.startsWith(
                "/opportunities/",
              )
                ? row.openCall.url.split("/").pop()
                : null;
              const drawer = (
                <ResidencyIntelligenceDrawer
                  profileId={row.profileId}
                  residencyName={row.name}
                  residencySlug={row.slug}
                  ranking={row}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Details
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  }
                  actions={
                    <>
                      {signedIn && opportunityId ? (
                        <SaveToTrackerButton
                          opportunityId={opportunityId}
                          signedIn={signedIn}
                          returnTo="/rankings/residencies"
                          opportunityTitle={row.openCall?.title ?? row.name}
                        />
                      ) : row.openCall ? (
                        <Button
                          variant="outline"
                          nativeButton={false}
                          render={
                            row.openCall.url.startsWith("/") ? (
                              <Link href={row.openCall.url} />
                            ) : (
                              <a
                                href={row.openCall.url}
                                target="_blank"
                                rel="noreferrer"
                              />
                            )
                          }
                        >
                          See the open call
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        onClick={() => setReviewing(row)}
                      >
                        Write a review
                      </Button>
                    </>
                  }
                />
              );
              return (
                <Fragment key={row.profileId}>
                  {startsTier && (
                    <TableRow variant="static">
                      <TableHead
                        scope="colgroup"
                        colSpan={7}
                        className="pt-8 pb-2 text-start"
                      >
                        <span className="text-base font-semibold">
                          {rowTier.label}
                        </span>
                        {rowTier.name && (
                          <span className="ms-2 text-sm font-normal text-muted-foreground">
                            {rowTier.name}
                          </span>
                        )}
                      </TableHead>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell
                      tone="muted"
                      className="py-5 align-top text-lg leading-tight tabular-nums"
                    >
                      {position}
                    </TableCell>
                    <TableCell className="py-5 align-top whitespace-normal">
                      <Link
                        href={`/residency/${encodeURIComponent(row.slug)}`}
                        className="text-lg leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {sort !== "rank" && (
                          <span>Missa rank {row.rankPosition}</span>
                        )}
                        {!groupByTier && <span>{rowTier.label}</span>}
                        <MagazineScheduleBadge schedule={row.schedule} />
                        {row.location && <span>{row.location}</span>}
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3 md:grid-cols-2 lg:hidden">
                        <FactItem label="Cost" value={cost} />
                        <FactItem label="Stipend" value={stipend} />
                        <FactItem
                          label="Rating"
                          value={rating}
                          className="md:hidden"
                        />
                      </dl>
                      <div className="-ms-2.5 mt-2 sm:hidden">{drawer}</div>
                    </TableCell>
                    <FactCell value={cost} className="hidden lg:table-cell" />
                    <FactCell
                      value={stipend}
                      className="hidden lg:table-cell"
                    />
                    <FactCell value={rating} className="hidden md:table-cell" />
                    <TableCell className="py-5 text-end align-top">
                      <ScoreMark score={row.totalScore} />
                    </TableCell>
                    <TableCell className="hidden py-4 text-end align-top sm:table-cell">
                      {drawer}
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
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

      <SubmitResidencyReviewDialog
        residency={reviewing}
        isOpen={reviewing != null}
        onClose={() => setReviewing(null)}
        onSuccess={() => {
          setReviewing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function NotRecorded() {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{NOT_RECORDED}</span>
    </span>
  );
}

function FactCell({
  value,
  className,
}: {
  value: string | null;
  className?: string;
}) {
  return (
    <TableCell className={`py-5 align-top text-sm ${className ?? ""}`}>
      {value ?? <NotRecorded />}
    </TableCell>
  );
}

function FactItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value ?? <NotRecorded />}</dd>
    </div>
  );
}

/** "Tier 2 (High Distinction)" → { label: "Tier 2", name: "High distinction" }. */
function tierParts(tier: string): { label: string; name: string | null } {
  const label = tier.match(/tier[ _-]?([1-4])/i)?.[1];
  const name = tier.match(/\((.+)\)/)?.[1] ?? null;
  return {
    label: label ? `Tier ${label}` : tier,
    name: name ? name.charAt(0) + name.slice(1).toLowerCase() : null,
  };
}

function ScoreMark({ score }: { score: number }) {
  return (
    <span className="inline-flex flex-col items-end gap-1.5">
      <span className="text-lg leading-none font-medium text-foreground tabular-nums">
        {score.toFixed(1)}
      </span>
      <span
        aria-hidden="true"
        className="block h-1 w-14 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </span>
    </span>
  );
}
