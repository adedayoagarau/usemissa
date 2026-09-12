"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Star,
  Home,
  MapPin,
  ExternalLink,
  X,
  Search,
  Award,
} from "lucide-react";
import type { ResidencyRankingRow } from "@missa/radar-adapters";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";

interface ResidencyComparisonViewProps {
  allResidencies: ResidencyRankingRow[];
  initialSelectedIds: string[];
  signedIn?: boolean;
}

export function ResidencyComparisonView({
  allResidencies,
  initialSelectedIds,
  signedIn: _signedIn = false,
}: ResidencyComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds.length > 0
      ? initialSelectedIds.slice(0, 3)
      : allResidencies.slice(0, 3).map((r) => r.profileId),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const selectedResidencies = useMemo(() => {
    return selectedIds
      .map((id) => allResidencies.find((r) => r.profileId === id || r.slug === id))
      .filter((r): r is ResidencyRankingRow => Boolean(r));
  }, [selectedIds, allResidencies]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allResidencies
      .filter(
        (r) =>
          !selectedIds.includes(r.profileId) &&
          (r.name.toLowerCase().includes(q) ||
            r.slug.toLowerCase().includes(q) ||
            (r.location && r.location.toLowerCase().includes(q))),
      )
      .slice(0, 5);
  }, [searchQuery, allResidencies, selectedIds]);

  function addResidency(id: string) {
    if (selectedIds.length < 3 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setSearchQuery("");
    }
  }

  function removeResidency(id: string) {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  }

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/rankings/residencies"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Residency Rankings Index</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          Comparing {selectedResidencies.length} of 3 programs
        </span>
      </div>

      {/* Program Selector Search */}
      {selectedIds.length < 3 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
          <label
            htmlFor="compare-residency-search"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Add Residency Program to Compare
          </label>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="compare-residency-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search residency by name or location to add…"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-lg">
                {searchResults.map((res) => (
                  <li key={res.profileId}>
                    <button
                      type="button"
                      onClick={() => addResidency(res.profileId)}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/70 flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium block">{res.name}</span>
                        <span className="text-xs text-muted-foreground">{res.location || "Location unlisted"}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {res.totalScore.toFixed(1)} pts
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      {selectedResidencies.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <p>No residencies selected for comparison. Search above to add programs.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {selectedResidencies.map((res) => {
            return (
              <div
                key={res.profileId}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 flex flex-col justify-between"
              >
                {/* Remove Card Button */}
                <button
                  type="button"
                  onClick={() => removeResidency(res.profileId)}
                  className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={`Remove ${res.name} from comparison`}
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="space-y-4">
                  {/* Header & Tier */}
                  <div className="pr-8 space-y-1.5">
                    <RankingTierBadge tier={res.prestigeTier} />
                    <h3 className="text-lg font-bold text-foreground">
                      <Link
                        href={`/residency/${res.slug}`}
                        className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                      >
                        {res.name}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{res.location || [res.city, res.region, res.country].filter(Boolean).join(", ") || "Location unlisted"}</span>
                    </div>
                  </div>

                  {/* Composite MRI Score */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Missa Residency Index
                    </span>
                    <div className="mt-1 font-mono text-3xl font-bold text-foreground">
                      {res.totalScore.toFixed(1)}
                      <span className="text-xs font-normal text-muted-foreground"> / 100</span>
                    </div>
                  </div>

                  {/* Dimension Metrics */}
                  <div className="space-y-3 divide-y divide-border text-xs">
                    {/* Funding */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Funding (35 pts)
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {res.fundingScore.toFixed(1)} pts
                      </span>
                    </div>

                    {/* Community */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> Resident Rating (30 pts)
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {res.ratingScore.toFixed(1)} pts
                      </span>
                    </div>

                    {/* Facilities */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Home className="h-3.5 w-3.5 text-sky-500" /> Facilities (20 pts)
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {res.facilitiesScore.toFixed(1)} pts
                      </span>
                    </div>

                    {/* Prestige */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-primary" /> Prestige (15 pts)
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {res.accessScore.toFixed(1)} pts
                      </span>
                    </div>
                  </div>

                  {/* Amenities Comparison */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tuition / Fee:</span>
                      <span className="font-medium text-foreground">
                        {res.isFullyFunded ? "100% Free Fellowship" : "Subsidized / Paid"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Living Stipend:</span>
                      <span className="font-medium text-foreground">
                        {res.hasStipend ? "Provided" : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Meals:</span>
                      <span className="font-medium text-foreground">
                        {res.hasMeals ? "Chef / Included" : "Self-catered"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Private Studio:</span>
                      <span className="font-medium text-foreground">
                        {res.hasPrivateStudio ? "Dedicated Private" : "Shared / Unlisted"}
                      </span>
                    </div>
                  </div>

                  {/* Disciplines */}
                  {res.disciplines && (
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase text-[10px]">Disciplines</span>
                      <p className="text-muted-foreground italic line-clamp-2">{res.disciplines}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/residency/${res.slug}`}
                    className="inline-flex min-h-9 items-center text-xs font-medium text-primary hover:underline"
                  >
                    View Missa Profile →
                  </Link>

                  {res.websiteUrl && (
                    <a
                      href={res.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <span>Official Site</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
