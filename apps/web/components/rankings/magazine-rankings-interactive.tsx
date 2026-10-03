"use client";

import { Fragment, useMemo, useState } from "react";
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
import { EditorialIntelligenceDrawer } from "./editorial-intelligence-drawer";
import {
  NOT_RECORDED,
  PRO_PAY_LABEL,
  feeCell,
  magazineFilters,
  payCell,
  replyCell,
  type MagazineFilterId,
} from "@/lib/magazineFacts";

const genres = ["overall", "poetry", "fiction", "nonfiction"] as const;

const pageSize = 25;
type Sort = "rank" | "accolades" | "pay" | "turnaround";

export function MagazineRankingsInteractive({
  initialItems,
  currentGenre,
  signedIn,
  preview = false,
}: {
  initialItems: MagazineRankingRow[];
  currentGenre: RankingGenre;
  signedIn: boolean;
  preview?: boolean;
}) {
  const router = useRouter();
  const items = initialItems;
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<Sort>("rank");
  const [filters, setFilters] = useState<MagazineFilterId[]>([]);
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      items
        .filter((row) => {
          if (
            !row.name.toLowerCase().includes(search.trim().toLowerCase()) &&
            !row.slug.toLowerCase().includes(search.trim().toLowerCase())
          )
            return false;
          if (tier !== "all" && !row.prestigeTier.startsWith(tier))
            return false;
          return filters.every((filter) => magazineFilters[filter](row));
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
    [items, search, tier, filters, sort],
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
          <div className="flex flex-wrap gap-1 pb-3">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/rankings/residencies" />}
            >
              Residency rankings
            </Button>
            <Button
              variant="ghost"
              size="sm"
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
            <option value="turnaround">Response time score</option>
          </NativeSelect>
        </Field>
      </div>
      {!preview && (
        <div
          role="group"
          className="flex flex-wrap gap-2"
          aria-label="Submission preferences"
        >
          {(
            [
              ["debut", "Debut-friendly"],
              ["pro", "Pro pay"],
              ["free", "No fee"],
              ["paying", "Pays writers"],
              ["simultaneous", "Simultaneous OK"],
              ["fast", "Replies within 3 months"],
            ] as Array<[MagazineFilterId, string]>
          )
            // A filter whose fact no loaded magazine records would always be empty.
            .filter(
              ([id]) =>
                id !== "debut" ||
                items.some((row) => row.debutFriendly != null),
            )
            .map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={filters.includes(id) ? "secondary" : "outline"}
                aria-pressed={filters.includes(id)}
                title={id === "pro" ? PRO_PAY_LABEL : undefined}
                onClick={() => {
                  setFilters((old) =>
                    old.includes(id)
                      ? old.filter((f) => f !== id)
                      : [...old, id],
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
        <Table>
          <caption className="sr-only">
            {items[0]?.rankingYear} {currentGenre} magazine rankings. Scores are
            out of 100; a dash means no source records the fact.
          </caption>
          <TableHeader>
            <TableRow variant="static">
              <TableHead scope="col" className="w-10 text-start sm:w-14">
                Rank
              </TableHead>
              <TableHead scope="col" className="text-start">
                Magazine
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-24 text-start lg:table-cell"
              >
                Fee
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-28 text-start lg:table-cell"
              >
                Pay
              </TableHead>
              <TableHead
                scope="col"
                className="hidden w-36 text-start md:table-cell"
              >
                Replies
              </TableHead>
              <TableHead scope="col" className="w-16 text-end sm:w-24">
                Score
              </TableHead>
              {!preview && (
                <TableHead
                  scope="col"
                  className="hidden w-28 text-end sm:table-cell"
                >
                  <span className="sr-only">Details</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => {
              const fee = preview ? null : feeCell(row);
              const pay = payCell(row);
              const reply = preview ? null : replyCell(row);
              const rowTier = tierParts(row.prestigeTier);
              const startsTier =
                groupByTier &&
                (index === 0 ||
                  tierParts(visible[index - 1].prestigeTier).label !==
                    rowTier.label);
              const drawer = (
                <EditorialIntelligenceDrawer
                  profileId={row.profileId}
                  magazineName={row.name}
                  magazineSlug={row.slug}
                  ranking={row}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Details
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  }
                  actions={
                    <>
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
                            <Button variant="outline">Report a reply</Button>
                          }
                        />
                      )}
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
                        colSpan={preview ? 6 : 7}
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
                      {row.rankPosition}
                    </TableCell>
                    <TableCell className="py-5 align-top whitespace-normal">
                      <Link
                        href={`/journal/${encodeURIComponent(row.slug)}`}
                        className="text-lg leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {!groupByTier && <span>{rowTier.label}</span>}
                        {!preview && (
                          <MagazineScheduleBadge schedule={row.schedule} />
                        )}
                        {!preview && row.simultaneousPolicy === "allowed" && (
                          <span>Simultaneous submissions OK</span>
                        )}
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-2 lg:hidden">
                        <FactItem label="Fee" value={fee} />
                        <FactItem label="Pay" value={pay} />
                        <FactItem
                          label="Replies"
                          value={reply}
                          className="md:hidden"
                        />
                      </dl>
                      {!preview && (
                        <div className="-ms-2.5 mt-2 sm:hidden">{drawer}</div>
                      )}
                    </TableCell>
                    <FactCell value={fee} className="hidden lg:table-cell" />
                    <FactCell value={pay} className="hidden lg:table-cell" />
                    <FactCell value={reply} className="hidden md:table-cell" />
                    <TableCell className="py-5 text-end align-top">
                      <ScoreMark score={row.totalScore} />
                    </TableCell>
                    {!preview && (
                      <TableCell className="hidden py-4 text-end align-top sm:table-cell">
                        {drawer}
                      </TableCell>
                    )}
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
  value: string | null;
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
