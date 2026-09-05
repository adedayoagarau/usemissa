"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Award, Clock, DollarSign, Plus, X, ArrowLeft, ArrowUp, ArrowDown, Minus, Sparkles, ExternalLink } from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MagazineComparisonViewProps {
  allMagazines: MagazineRankingRow[];
  initialSelectedIds: string[];
}

export function MagazineComparisonView({
  allMagazines,
  initialSelectedIds,
}: MagazineComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds.slice(0, 3));
  const [searchQuery, setSearchQuery] = useState("");

  const selectedMagazines = useMemo(() => {
    return selectedIds
      .map((id) => allMagazines.find((m) => m.profileId === id))
      .filter((m): m is MagazineRankingRow => Boolean(m));
  }, [selectedIds, allMagazines]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allMagazines
      .filter(
        (m) =>
          !selectedIds.includes(m.profileId) &&
          (m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [searchQuery, allMagazines, selectedIds]);

  function addMagazine(id: string) {
    if (selectedIds.length < 3 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setSearchQuery("");
    }
  }

  function removeMagazine(id: string) {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  }

  return (
    <div className="space-y-8">
      {/* Navigation back to main rankings */}
      <div className="flex items-center justify-between">
        <Link
          href="/rankings/magazines"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent-deep transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to Full Rankings Index</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          Comparing {selectedMagazines.length} of 3 publications
        </span>
      </div>

      {/* Magazine Selector / Search Bar */}
      {selectedIds.length < 3 ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add Magazine to Compare
          </label>
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search magazine by name to add..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {searchResults.length > 0 ? (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-lg">
                {searchResults.map((mag) => (
                  <li key={mag.profileId}>
                    <button
                      type="button"
                      onClick={() => addMagazine(mag.profileId)}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/70 flex items-center justify-between"
                    >
                      <span className="font-medium">{mag.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        #{mag.rankPosition} ({mag.totalScore} pts)
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Comparison Grid Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm divide-y divide-border">
          <thead>
            <tr className="divide-x divide-border bg-muted/40">
              <th scope="col" className="p-4 w-48 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Metric
              </th>
              {selectedMagazines.map((mag) => (
                <th key={mag.profileId} scope="col" className="p-4 min-w-[16rem]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/journals/${encodeURIComponent(mag.slug)}`}
                        className="text-base font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{mag.name}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          #{mag.rankPosition} Overall
                        </span>
                        {mag.rankDelta != null ? (
                          mag.rankDelta > 0 ? (
                            <span className="inline-flex items-center text-accent-deep text-xs font-semibold">
                              <ArrowUp className="size-3" aria-hidden="true" />
                              +{mag.rankDelta}
                            </span>
                          ) : mag.rankDelta < 0 ? (
                            <span className="inline-flex items-center text-destructive text-xs font-semibold">
                              <ArrowDown className="size-3" aria-hidden="true" />
                              {mag.rankDelta}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">steady</span>
                          )
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMagazine(mag.profileId)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Remove from comparison"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </th>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <th key={`empty-${i}`} scope="col" className="p-4 text-center text-xs text-muted-foreground min-w-[16rem]">
                  <div className="border border-dashed border-border rounded-lg p-6">
                    <span>Empty Comparison Slot</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Total Score & Tier */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Total Missa Score</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-base font-bold text-primary">
                      {mag.totalScore} / 100
                    </span>
                    <span className="rounded bg-accent-tint/15 px-2 py-0.5 text-xs font-medium text-accent-deep border border-accent-tint/30">
                      {mag.prestigeTier.replace(/ \(.*\)/, "")}
                    </span>
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-score-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Accolades Honors */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Anthology Accolades (40 pts)</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <Award className="size-4 text-primary shrink-0" aria-hidden="true" />
                    <span>{mag.accoladesScore} / 40</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    10-year rolling Pushcart, Best American, and digital honors
                  </p>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-acc-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Contributor Compensation */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Contributor Pay (15 pts)</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <DollarSign className="size-4 text-accent-deep shrink-0" aria-hidden="true" />
                    <span>{mag.payScore} / 15</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mag.payScore >= 12
                      ? "Professional rates (Cash honoraria)"
                      : mag.payScore >= 6
                      ? "Modest honorarium or contributor copies"
                      : "Unpaid / Contributor copies only"}
                  </p>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-pay-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Turnaround Speed */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Turnaround Speed (15 pts)</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <Clock className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span>
                      {mag.medianResponseDays ? `~${mag.medianResponseDays} days` : `${mag.turnaroundScore}/15`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mag.medianResponseDays && mag.medianResponseDays <= 30
                      ? "Lightning response (< 30 days)"
                      : mag.medianResponseDays && mag.medianResponseDays <= 60
                      ? "Swift response (< 60 days)"
                      : "Standard literary turnaround"}
                  </p>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-speed-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Regular Submission Fee */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Reading Fee</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4 text-sm">
                  {mag.regularFeeCents === 0 ? (
                    <span className="font-semibold text-accent-deep">100% Free ($0)</span>
                  ) : (
                    <span className="text-foreground">${(mag.regularFeeCents / 100).toFixed(2)} regular fee</span>
                  )}
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-fee-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Simultaneous Submissions */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Simultaneous Submissions</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4 text-sm">
                  <span
                    className={
                      mag.simultaneousPolicy === "allowed"
                        ? "text-foreground font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {mag.simultaneousPolicy === "allowed" ? "Allowed" : "Forbidden (Exclusive Only)"}
                  </span>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-sim-${i}`} className="p-4"></td>
              ))}
            </tr>

            {/* Actions Row */}
            <tr className="divide-x divide-border bg-muted/20">
              <td className="p-4 font-semibold text-foreground">Actions</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/journals/${encodeURIComponent(mag.slug)}`}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "text-xs")}
                    >
                      View Full Profile
                    </Link>
                    {mag.websiteUrl ? (
                      <a
                        href={mag.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                      >
                        Visit Site ↗
                      </a>
                    ) : null}
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map((_, i) => (
                <td key={`empty-act-${i}`} className="p-4"></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
