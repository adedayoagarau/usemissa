"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Award,
  Clock,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Search,
  Check,
  Filter,
  PlusCircle,
  X,
} from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import type { RankingGenre } from "@missa/radar-engine";
import { ReportResponseDialog } from "./report-response-dialog";
import { Button } from "@/components/ui/button";

interface MagazineRankingsInteractiveProps {
  initialItems: MagazineRankingRow[];
  currentGenre: RankingGenre;
  total: number;
}

export function MagazineRankingsInteractive({
  initialItems,
  currentGenre,
  total,
}: MagazineRankingsInteractiveProps) {
  const [items, setItems] = useState<MagazineRankingRow[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [payingOnly, setPayingOnly] = useState(false);
  const [simultaneousOnly, setSimultaneousOnly] = useState(false);
  const [fastOnly, setFastOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "accolades" | "pay" | "turnaround">("rank");

  const GENRE_TABS: Array<{ genre: RankingGenre; label: string }> = [
    { genre: "overall", label: "Overall Index" },
    { genre: "fiction", label: "Fiction" },
    { genre: "poetry", label: "Poetry" },
    { genre: "nonfiction", label: "Nonfiction" },
  ];

  const TIERS = [
    { id: "all", label: "All Tiers" },
    { id: "Tier 1", label: "Tier 1 (Flagship Luminary)" },
    { id: "Tier 2", label: "Tier 2 (High Distinction)" },
    { id: "Tier 3", label: "Tier 3 (Distinguished Contemporary)" },
    { id: "Tier 4", label: "Tier 4 (Emerging & Community)" },
  ];

  // Live filtering
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)
      );
    }

    // Tier
    if (selectedTier !== "all") {
      result = result.filter((i) => i.prestigeTier.startsWith(selectedTier));
    }

    // Quick toggles
    if (freeOnly) {
      result = result.filter((i) => i.regularFeeCents === 0);
    }
    if (payingOnly) {
      result = result.filter((i) => i.payScore > 0);
    }
    if (simultaneousOnly) {
      result = result.filter((i) => i.simultaneousPolicy === "allowed");
    }
    if (fastOnly) {
      result = result.filter(
        (i) => i.medianResponseDays != null && i.medianResponseDays <= 60
      );
    }

    // Sorting
    if (sortBy === "accolades") {
      result.sort((a, b) => b.accoladesScore - a.accoladesScore);
    } else if (sortBy === "pay") {
      result.sort((a, b) => b.payScore - a.payScore);
    } else if (sortBy === "turnaround") {
      result.sort((a, b) => b.turnaroundScore - a.turnaroundScore);
    } else {
      result.sort((a, b) => a.rankPosition - b.rankPosition);
    }

    return result;
  }, [items, searchQuery, selectedTier, freeOnly, payingOnly, simultaneousOnly, fastOnly, sortBy]);

  function handleTelemetrySuccess(profileId: string, newMedianDays: number | null) {
    if (newMedianDays == null) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.profileId === profileId) {
          const turnaroundScore =
            newMedianDays <= 30 ? 15 : newMedianDays <= 60 ? 13 : newMedianDays <= 90 ? 10 : newMedianDays <= 180 ? 7 : 4;
          return {
            ...item,
            medianResponseDays: newMedianDays,
            turnaroundScore,
            totalScore:
              item.accoladesScore +
              item.payScore +
              turnaroundScore +
              item.feesScore +
              item.respectScore +
              item.formatEthicsScore,
          };
        }
        return item;
      })
    );
  }

  const activeFiltersCount =
    (selectedTier !== "all" ? 1 : 0) +
    (freeOnly ? 1 : 0) +
    (payingOnly ? 1 : 0) +
    (simultaneousOnly ? 1 : 0) +
    (fastOnly ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Top Controls: Genre Tabs & Compare Link */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {GENRE_TABS.map((tab) => {
            const isActive = tab.genre === currentGenre;
            return (
              <Link
                key={tab.genre}
                href={`/rankings/magazines?genre=${tab.genre}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/rankings/plan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-accent-deep transition-colors shadow-sm"
          >
            <Sparkles className="size-3.5" />
            <span>Smart Shortlist</span>
          </Link>
          <Link
            href="/rankings/methodology"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <span>Methodology</span>
          </Link>
          <Link
            href="/rankings/compare"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
          >
            <span>Compare →</span>
          </Link>
          <Link
            href="/rankings/claim"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span>Claim Profile</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[15rem]">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by magazine name..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-8 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Tier Selector */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Sort By Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="rank">Sort by Rank</option>
            <option value="accolades">Sort by Anthology Honors</option>
            <option value="pay">Sort by Contributor Pay</option>
            <option value="turnaround">Sort by Turnaround Speed</option>
          </select>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="size-3" aria-hidden="true" />
            Filters:
          </span>

          <button
            type="button"
            onClick={() => setFreeOnly(!freeOnly)}
            className={`rounded-full px-3 py-1 font-medium border transition-colors ${
              freeOnly
                ? "bg-accent-deep text-white border-accent-deep"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            Free Submissions ($0)
          </button>

          <button
            type="button"
            onClick={() => setPayingOnly(!payingOnly)}
            className={`rounded-full px-3 py-1 font-medium border transition-colors ${
              payingOnly
                ? "bg-accent-deep text-white border-accent-deep"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            Paying Publications
          </button>

          <button
            type="button"
            onClick={() => setSimultaneousOnly(!simultaneousOnly)}
            className={`rounded-full px-3 py-1 font-medium border transition-colors ${
              simultaneousOnly
                ? "bg-accent-deep text-white border-accent-deep"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            Simultaneous OK
          </button>

          <button
            type="button"
            onClick={() => setFastOnly(!fastOnly)}
            className={`rounded-full px-3 py-1 font-medium border transition-colors ${
              fastOnly
                ? "bg-accent-deep text-white border-accent-deep"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            Fast Response (&lt; 60 days)
          </button>

          {activeFiltersCount > 0 || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTier("all");
                setFreeOnly(false);
                setPayingOnly(false);
                setSimultaneousOnly(false);
                setFastOnly(false);
                setSortBy("rank");
              }}
              className="ml-auto text-xs text-primary underline underline-offset-4 hover:text-accent-deep"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Ledger status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredItems.length} of {total} indexed literary publications
        </span>
        <span className="hidden sm:inline">
          Updated for 2026 · 10-Year Rolling Window
        </span>
      </div>

      {/* High-density ranking table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-2 sm:pl-6 w-24 text-center">
                Rank & Trend
              </th>
              <th scope="col" className="py-3.5 px-3 min-w-[14rem]">
                Magazine
              </th>
              <th scope="col" className="py-3.5 px-3 text-center">
                Missa Score
              </th>
              <th scope="col" className="py-3.5 px-3 hidden md:table-cell">
                Accolades (40)
              </th>
              <th scope="col" className="py-3.5 px-3 hidden lg:table-cell">
                Pay (15)
              </th>
              <th scope="col" className="py-3.5 px-3 hidden sm:table-cell">
                Turnaround (15)
              </th>
              <th scope="col" className="py-3.5 pr-4 pl-3 text-right sm:pr-6">
                Tier & Telemetry
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No literary publications found matching your search or filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => (
                <tr
                  key={`${row.profileId}-${row.genre}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Rank Number & Trajectory */}
                  <td className="py-4 pl-4 pr-2 text-center font-mono sm:pl-6">
                    <div className="text-base font-semibold text-foreground">
                      #{row.rankPosition}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-[11px]">
                      {row.rankDelta != null ? (
                        row.rankDelta > 0 ? (
                          <span className="inline-flex items-center text-accent-deep font-semibold" title={`Climbed ${row.rankDelta} spots vs 2025`}>
                            <ArrowUp className="size-3" aria-hidden="true" />
                            +{row.rankDelta}
                          </span>
                        ) : row.rankDelta < 0 ? (
                          <span className="inline-flex items-center text-destructive font-semibold" title={`Dropped ${Math.abs(row.rankDelta)} spots vs 2025`}>
                            <ArrowDown className="size-3" aria-hidden="true" />
                            {row.rankDelta}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-muted-foreground" title="Steady rank vs 2025">
                            <Minus className="size-3" aria-hidden="true" />
                            steady
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.2 text-[10px] font-medium text-primary" title="New entry in 2026 index">
                          <Sparkles className="size-2.5" aria-hidden="true" />
                          new
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Magazine Identity */}
                  <td className="py-4 px-3">
                    <div className="font-semibold text-foreground hover:text-primary">
                      <Link href={`/journals/${encodeURIComponent(row.slug)}`}>
                        {row.name}
                      </Link>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{row.genre}</span>
                      <span>·</span>
                      <span>{row.simultaneousPolicy === "allowed" ? "Simultaneous OK" : "No Simultaneous"}</span>
                      {row.regularFeeCents === 0 ? (
                        <>
                          <span>·</span>
                          <span className="text-accent-deep font-medium">Free Submissions</span>
                        </>
                      ) : null}
                    </div>
                  </td>

                  {/* Total Score */}
                  <td className="py-4 px-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                      {row.totalScore}
                    </span>
                  </td>

                  {/* Accolades Breakdown */}
                  <td className="py-4 px-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                      <Award className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span>{row.accoladesScore} / 40</span>
                    </div>
                  </td>

                  {/* Pay Breakdown */}
                  <td className="py-4 px-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                      <DollarSign className="size-3.5 text-accent-deep shrink-0" aria-hidden="true" />
                      <span>{row.payScore} / 15</span>
                    </div>
                  </td>

                  {/* Turnaround Breakdown */}
                  <td className="py-4 px-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span>
                        {row.medianResponseDays ? `~${row.medianResponseDays}d` : `${row.turnaroundScore}/15`}
                      </span>
                    </div>
                  </td>

                  {/* Tier Badge & Telemetry Button */}
                  <td className="py-4 pr-4 pl-3 text-right sm:pr-6">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-accent-tint/15 border border-accent-tint/30 px-2 py-0.5 text-xs font-medium text-accent-deep">
                        {row.prestigeTier.replace(/ \(.*\)/, "")}
                      </span>
                      <ReportResponseDialog
                        profileId={row.profileId}
                        magazineName={row.name}
                        onSuccess={(newDays) => handleTelemetrySuccess(row.profileId, newDays)}
                        trigger={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                            title="Report response outcome"
                          >
                            <PlusCircle className="size-3" aria-hidden="true" />
                            <span>Log outcome</span>
                          </button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
