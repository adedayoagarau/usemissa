"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  RankingMovement,
  RankingTierBadge,
} from "@/components/missa/ranking-indicators";
import {
  Award,
  Clock,
  DollarSign,
  X,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MagazineScheduleBadge } from "@/components/ui/magazine-schedule-badge";
import { MagazineCitizenshipBadges } from "@/components/missa/magazine-citizenship-badges";
import { MagazineTrackerAction } from "@/components/rankings/magazine-tracker-action";

interface MagazineComparisonViewProps {
  allMagazines: MagazineRankingRow[];
  initialSelectedIds: string[];
  signedIn: boolean;
}

export function MagazineComparisonView({
  allMagazines,
  initialSelectedIds,
  signedIn,
}: MagazineComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialSelectedIds
      .map(
        (id) =>
          allMagazines.find(
            (magazine) => magazine.profileId === id || magazine.slug === id,
          )?.profileId,
      )
      .filter((id): id is string => Boolean(id))
      .slice(0, 3),
  );
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
          (m.name.toLowerCase().includes(q) ||
            m.slug.toLowerCase().includes(q)),
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-accent-deep"
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
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <label
            htmlFor="compare-magazine-search"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Add Magazine to Compare
          </label>
          <div className="relative max-w-md">
            <input
              id="compare-magazine-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search magazine by name to add..."
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {searchResults.length > 0 ? (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-lg">
                {searchResults.map((mag) => (
                  <li key={mag.profileId}>
                    <button
                      type="button"
                      onClick={() => addMagazine(mag.profileId)}
                      className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring"
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

      {/* Narrow comparison: labelled records keep each value attached to its metric. */}
      <section
        className="grid gap-4 md:hidden"
        aria-label="Magazine comparison"
      >
        {selectedMagazines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm leading-6 text-muted-foreground">
            No magazines selected. Search above to add up to three publications.
          </p>
        ) : null}
        {selectedMagazines.map((mag) => (
          <article
            key={mag.profileId}
            className="rounded-xl border border-border bg-card p-4"
            aria-labelledby={`comparison-${mag.profileId}`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <Link
                  id={`comparison-${mag.profileId}`}
                  href={`/journal/${encodeURIComponent(mag.slug)}`}
                  className="inline-flex min-h-11 items-center gap-1.5 text-base leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span>{mag.name}</span>
                  <ExternalLink
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    #{mag.rankPosition} overall
                  </span>
                  <MagazineScheduleBadge schedule={mag.schedule} />
                  <RankingMovement delta={mag.rankDelta} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMagazine(mag.profileId)}
                aria-label={`Remove ${mag.name} from comparison`}
              >
                <X aria-hidden="true" />
              </Button>
            </header>

            <dl className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm font-medium text-foreground">
                  Total Missa score
                </dt>
                <dd className="font-mono text-base font-semibold text-primary tabular-nums">
                  {mag.totalScore} / 100
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">
                  Anthology accolades
                </dt>
                <dd className="font-mono text-sm text-foreground tabular-nums">
                  {mag.accoladesScore} / 40
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">
                  Contributor pay
                </dt>
                <dd className="font-mono text-sm text-foreground tabular-nums">
                  {mag.payScore} / 15
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">Response time</dt>
                <dd className="text-end font-mono text-sm text-foreground tabular-nums">
                  {mag.medianResponseDays
                    ? `${mag.medianResponseDays} days median`
                    : `${mag.turnaroundScore} / 15`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">Reading fee</dt>
                <dd className="text-end text-sm font-medium text-foreground">
                  {mag.regularFeeCents === 0
                    ? "No fee"
                    : `$${(mag.regularFeeCents / 100).toFixed(2)}`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">
                  Simultaneous submissions
                </dt>
                <dd className="text-end text-sm font-medium text-foreground">
                  {mag.simultaneousPolicy === "allowed"
                    ? "Allowed"
                    : mag.simultaneousPolicy === "not_allowed"
                      ? "Not allowed"
                      : "Policy not listed"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Link
                href={`/journal/${encodeURIComponent(mag.slug)}`}
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                View full profile
              </Link>
              <MagazineTrackerAction
                magazineName={mag.name}
                magazineSlug={mag.slug}
                activeOpportunity={mag.activeOpportunity}
                signedIn={signedIn}
                returnTo="/rankings/compare"
              />
              {mag.websiteUrl ? (
                <a
                  href={mag.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full",
                  )}
                >
                  Visit official site
                  <ExternalLink aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {/* Comparison Grid Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full divide-y divide-border text-left text-sm">
          <thead>
            <tr className="divide-x divide-border bg-muted/40">
              <th
                scope="col"
                className="w-48 p-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Metric
              </th>
              {selectedMagazines.map((mag) => (
                <th
                  key={mag.profileId}
                  scope="col"
                  className="min-w-[16rem] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/journal/${encodeURIComponent(mag.slug)}`}
                        className="flex items-center gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        <span>{mag.name}</span>
                        <ExternalLink
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          #{mag.rankPosition} Overall
                        </span>
                        <MagazineScheduleBadge schedule={mag.schedule} />
                        <RankingMovement delta={mag.rankDelta} />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMagazine(mag.profileId)}
                      aria-label={`Remove ${mag.name} from comparison`}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </th>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <th
                    key={`empty-${i}`}
                    scope="col"
                    className="min-w-[16rem] p-4 text-center text-xs text-muted-foreground"
                  >
                    <div className="rounded-lg border border-dashed border-border p-6">
                      <span>Empty Comparison Slot</span>
                    </div>
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Total Score & Tier */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Total Missa Score
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-base font-bold text-primary">
                      {mag.totalScore} / 100
                    </span>
                    <RankingTierBadge tier={mag.prestigeTier} />
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-score-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Accolades Honors */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Anthology Accolades (40 pts)
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <Award
                      className="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{mag.accoladesScore} / 40</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    10-year rolling Pushcart, Best American, and digital honors
                  </p>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-acc-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Contributor Compensation */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Contributor Pay (15 pts)
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <DollarSign
                      className="size-4 shrink-0 text-accent-deep"
                      aria-hidden="true"
                    />
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
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-pay-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Turnaround Speed */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Turnaround Speed (15 pts)
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                    <Clock
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>
                      {mag.medianResponseDays
                        ? `~${mag.medianResponseDays} days`
                        : `${mag.turnaroundScore}/15`}
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
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-speed-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Regular Submission Fee */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">Reading Fee</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4 text-sm">
                  {mag.regularFeeCents === 0 ? (
                    <span className="font-semibold text-accent-deep">
                      100% Free ($0)
                    </span>
                  ) : (
                    <span className="text-foreground">
                      ${(mag.regularFeeCents / 100).toFixed(2)} regular fee
                    </span>
                  )}
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-fee-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Editorial Citizenship */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Editorial Badges
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <MagazineCitizenshipBadges ranking={mag} />
                  {!mag.medianResponseDays &&
                  mag.regularFeeCents > 0 &&
                  mag.contributorPayCents === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No badge thresholds met from current ranking fields.
                    </p>
                  ) : null}
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-badges-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Simultaneous Submissions */}
            <tr className="divide-x divide-border">
              <td className="p-4 font-semibold text-foreground">
                Simultaneous Submissions
              </td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4 text-sm">
                  <span
                    className={
                      mag.simultaneousPolicy === "allowed"
                        ? "font-medium text-foreground"
                        : "font-medium text-destructive"
                    }
                  >
                    {mag.simultaneousPolicy === "allowed"
                      ? "Allowed"
                      : "Forbidden (Exclusive Only)"}
                  </span>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-sim-${i}`} className="p-4"></td>
                ),
              )}
            </tr>

            {/* Actions Row */}
            <tr className="divide-x divide-border bg-muted/20">
              <td className="p-4 font-semibold text-foreground">Actions</td>
              {selectedMagazines.map((mag) => (
                <td key={mag.profileId} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/journal/${encodeURIComponent(mag.slug)}`}
                      className={cn(
                        buttonVariants({ variant: "default", size: "sm" }),
                        "text-xs",
                      )}
                    >
                      View Full Profile
                    </Link>
                    <MagazineTrackerAction
                      magazineName={mag.name}
                      magazineSlug={mag.slug}
                      activeOpportunity={mag.activeOpportunity}
                      signedIn={signedIn}
                      returnTo="/rankings/compare"
                    />
                    {mag.websiteUrl ? (
                      <a
                        href={mag.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "text-xs",
                        )}
                      >
                        Visit Site ↗
                      </a>
                    ) : null}
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - selectedMagazines.length }).map(
                (_, i) => (
                  <td key={`empty-act-${i}`} className="p-4"></td>
                ),
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
