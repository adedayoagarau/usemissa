"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, X, Search } from "lucide-react";
import type { ResidencyRankingRow } from "@missa/radar-adapters";
import {
  NOT_RECORDED,
  costLabel,
  mealsLabel,
  ratingLabel,
  selectionLabel,
  stipendLabel,
  studioLabel,
} from "@/lib/residencyFacts";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sp } from "@/components/missa/spelling";

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
      .map((id) =>
        allResidencies.find((r) => r.profileId === id || r.slug === id),
      )
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
          <span>Back to the residency rankings</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          Comparing {selectedResidencies.length} of 3 programs
        </span>
      </div>

      {/* Program Selector Search */}
      {selectedIds.length < 3 && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <label
            htmlFor="compare-residency-search"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Add a residency to compare
          </label>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="compare-residency-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search residency by name or location to add…"
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-lg">
                {searchResults.map((res) => (
                  <li key={res.profileId}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => addResidency(res.profileId)}
                      className="h-auto min-h-11 w-full justify-between text-left whitespace-normal"
                    >
                      <div className="space-y-0.5">
                        <span className="block font-medium">{res.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {res.location || "Location unlisted"}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {res.totalScore.toFixed(1)} pts
                      </span>
                    </Button>
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
          <p>
            No residencies selected for comparison. Search above to add
            programs.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {selectedResidencies.map((res) => {
            return (
              <div
                key={res.profileId}
                className="relative flex flex-col justify-between space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                {/* Remove Card Button */}
                <div className="absolute top-3 right-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeResidency(res.profileId)}
                    aria-label={`Remove ${res.name} from comparison`}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Header & Tier */}
                  <div className="space-y-1.5 pr-12">
                    <RankingTierBadge tier={res.prestigeTier} />
                    <h3 className="text-lg font-bold text-foreground">
                      <Link
                        href={`/residency/${res.slug}`}
                        className="underline-offset-4 transition-colors hover:text-primary hover:underline"
                      >
                        {res.name}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{res.location ?? "Location not recorded"}</span>
                    </div>
                  </div>

                  {/* Composite MRI Score */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                    <span className="text-xs text-muted-foreground">
                      Missa score · rank {res.rankPosition}
                    </span>
                    <div className="mt-1 font-mono text-3xl font-bold text-foreground">
                      {res.totalScore.toFixed(1)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / 100
                      </span>
                    </div>
                  </div>

                  {/* Score by pillar */}
                  <dl className="space-y-3 divide-y divide-border text-xs">
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-muted-foreground">
                        Funding (35 pts)
                      </dt>
                      <dd className="font-mono font-semibold text-foreground">
                        {res.fundingScore.toFixed(1)} pts
                      </dd>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-muted-foreground">
                        What residents say (30 pts)
                      </dt>
                      <dd className="font-mono font-semibold text-foreground">
                        {res.ratingScore.toFixed(1)} pts
                      </dd>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-muted-foreground">
                        Room to work (20 pts)
                      </dt>
                      <dd className="font-mono font-semibold text-foreground">
                        {res.facilitiesScore.toFixed(1)} pts
                      </dd>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <dt className="text-muted-foreground">
                        Standing and access (15 pts)
                      </dt>
                      <dd className="font-mono font-semibold text-foreground">
                        {res.accessScore.toFixed(1)} pts
                      </dd>
                    </div>
                  </dl>

                  {/* Recorded facts */}
                  <dl className="space-y-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Cost</dt>
                      <dd className="text-end font-medium text-foreground">
                        {costLabel(res)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Stipend</dt>
                      <dd className="text-end font-medium text-foreground">
                        {stipendLabel(res)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Meals</dt>
                      <dd className="text-end font-medium text-foreground">
                        {mealsLabel(res.meals)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Studio</dt>
                      <dd className="text-end font-medium text-foreground">
                        {studioLabel(res.privateStudio)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Rating</dt>
                      <dd className="text-end font-medium text-foreground">
                        {ratingLabel(res)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Selection</dt>
                      <dd className="text-end font-medium text-foreground">
                        {selectionLabel(res) ?? NOT_RECORDED}
                      </dd>
                    </div>
                  </dl>

                  {/* Disciplines */}
                  {res.disciplines && (
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Disciplines
                      </span>
                      <p className="line-clamp-2 text-muted-foreground italic">
                        {res.disciplines}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <Link
                    href={`/residency/${res.slug}`}
                    className="inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Program profile →
                  </Link>

                  {res.websiteUrl && (
                    <a
                      href={res.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span><Sp>Program website</Sp></span>
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
