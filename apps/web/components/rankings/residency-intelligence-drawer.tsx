"use client";

import * as React from "react";
import {
  Sparkles,
  ExternalLink,
  DollarSign,
  Clock,
  Award,
  Users,
  Building,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import type {
  ResidencyFullIntelligenceProfile,
  ResidencyReviewRow,
} from "@missa/radar-adapters";
import { cn } from "@/lib/utils";

interface ResidencyIntelligenceDrawerProps {
  profileId: string;
  residencyName: string;
  residencySlug?: string | null;
  trigger?: React.ReactElement;
}

export function ResidencyIntelligenceDrawer({
  profileId,
  residencyName,
  residencySlug: _residencySlug,
  trigger,
}: ResidencyIntelligenceDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ResidencyFullIntelligenceProfile | null>(
    null,
  );
  const [activeTab, setActiveTab] = React.useState<
    "funding" | "facilities" | "cohort" | "alumni"
  >("funding");

  const fetchIntelligence = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rankings/residencies/${encodeURIComponent(profileId)}/intelligence`,
      );
      if (!res.ok) {
        throw new Error("Failed to load residency intelligence data.");
      }
      const json = (await res.json()) as ResidencyFullIntelligenceProfile;
      setData(json);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching residency intelligence.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    if (open && !data && !loading) {
      // The fetch callback owns loading/error state for this user-triggered disclosure.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchIntelligence();
    }
  }, [open, data, loading, fetchIntelligence]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-1.5">
      <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
      <span>Intelligence</span>
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger || defaultTrigger} />
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-[var(--surface-primary)] border-l border-[var(--border-subtle)] overflow-y-auto p-6"
      >
        <SheetHeader className="border-b border-[var(--border-subtle)] pb-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Fellowship Dossier
              </span>
              {data?.prestigeTier && (
                <RankingTierBadge tier={data.prestigeTier} />
              )}
            </div>
            {data?.websiteUrl && (
              <a
                href={data.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-sans text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Official Site <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <SheetTitle className="font-serif text-2xl font-medium text-[var(--text-primary)]">
            {residencyName}
          </SheetTitle>
          <SheetDescription className="font-sans text-xs text-[var(--text-secondary)]">
            {data?.location || "United States"} · Verified residency specs, stipends, private studios, and alumni lineage.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Clock className="size-8 animate-spin text-[var(--text-muted)] mb-3" />
            <p className="font-sans text-sm text-[var(--text-secondary)]">
              Loading residency intelligence dossier...
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="font-sans text-sm text-[var(--text-primary)]">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIntelligence}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6 pt-5">
            {/* Quick Summary Highlights Banner */}
            <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 p-3 text-center">
              <div>
                <span className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                  {data.specs.stipendAmountCents > 0
                    ? `$${(data.specs.stipendAmountCents / 100).toLocaleString()}`
                    : data.isFullyFunded
                      ? "Fully Funded"
                      : "Subsidized"}
                </span>
                <p className="text-[10px] uppercase font-medium text-[var(--text-muted)]">
                  {data.specs.stipendFrequency !== "none"
                    ? `Stipend (${data.specs.stipendFrequency})`
                    : "Funding Model"}
                </p>
              </div>

              <div>
                <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                  {data.specs.acceptanceRatePercent}%
                </span>
                <p className="text-[10px] uppercase font-medium text-[var(--text-muted)]">
                  Acceptance Rate
                </p>
              </div>

              <div>
                <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                  {data.specs.privateStudioSqft
                    ? `${data.specs.privateStudioSqft} sqft`
                    : "Private"}
                </span>
                <p className="text-[10px] uppercase font-medium text-[var(--text-muted)]">
                  Studio Space
                </p>
              </div>
            </div>

            {/* Custom Tab Navigation */}
            <div className="flex border-b border-[var(--border-subtle)]">
              {([
                { id: "funding", label: "Funding & Stipends", icon: DollarSign },
                { id: "facilities", label: "Studio & Facilities", icon: Building },
                { id: "cohort", label: "Selectivity & Cohort", icon: Users },
                { id: "alumni", label: "Alumni & Reviews", icon: Award },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 font-sans text-xs font-medium border-b-2 transition",
                      isActive
                        ? "border-[var(--text-primary)] text-[var(--text-primary)] font-semibold"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Funding & Stipends */}
            {activeTab === "funding" && (
              <div className="space-y-4">
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
                  <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Stipends, Grants & Financial Aid
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-[var(--text-secondary)]">Living Stipend:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.specs.stipendAmountCents > 0
                          ? `$${(data.specs.stipendAmountCents / 100).toLocaleString()} (${data.specs.stipendFrequency})`
                          : "No cash stipend (Residency is cost-free)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-[var(--text-secondary)]">Travel Grant / Reimbursement:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.specs.travelGrantCents > 0
                          ? `Up to $${(data.specs.travelGrantCents / 100).toLocaleString()}`
                          : "Self-funded travel"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-[var(--text-secondary)]">Meal Plan:</span>
                      <span className="font-medium text-[var(--text-primary)] capitalize">
                        {data.specs.mealPlanKind.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Application Fee:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.specs.applicationFeeCents > 0
                          ? `$${(data.specs.applicationFeeCents / 100).toFixed(0)}`
                          : "Free to apply"}
                      </span>
                    </div>
                  </div>
                </div>

                {data.specs.feeWaiverPolicy && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-3.5 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Fee Waiver Policy:
                    </span>
                    <p className="mt-1 text-[var(--text-secondary)]">
                      {data.specs.feeWaiverPolicy}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Studio & Facilities */}
            {activeTab === "facilities" && (
              <div className="space-y-4">
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
                  <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Studio Amenities & Equipment
                  </h4>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {data.specs.studioAmenities.map((amenity: string) => (
                      <span
                        key={amenity}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                      >
                        <Check className="size-3 text-[var(--text-primary)]" />
                        {amenity.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Living Quarters:</span>
                      <span className="font-medium text-[var(--text-primary)] capitalize">
                        {data.specs.livingArrangement.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">ADA Accessible:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.specs.adaAccessible ? "Yes (ADA Compliant)" : "Historic Site Limitations"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Family / Partner Friendly:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {data.specs.familyPartnerFriendly ? "Partners / Children welcome" : "Solo residency only"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Selectivity & Cohort */}
            {activeTab === "cohort" && (
              <div className="space-y-4">
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
                  <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Admissions Selectivity & Cohort Structure
                  </h4>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-3 text-center">
                      <span className="font-mono text-xl font-semibold text-[var(--text-primary)]">
                        {data.specs.cohortSize} Fellows
                      </span>
                      <p className="mt-0.5 text-[10px] uppercase font-medium text-[var(--text-muted)]">
                        Cohort Size per Session
                      </p>
                    </div>

                    <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-3 text-center">
                      <span className="font-mono text-xl font-semibold text-[var(--text-primary)]">
                        {data.specs.typicalDurationWeeks} Weeks
                      </span>
                      <p className="mt-0.5 text-[10px] uppercase font-medium text-[var(--text-muted)]">
                        Typical Session Length
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] pt-2">
                    Approximately {data.specs.annualApplicantVolume.toLocaleString()} artists and writers apply annually for fellowship slots across seasonal cycles.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Alumni & Verified Reviews */}
            {activeTab === "alumni" && (
              <div className="space-y-4">
                {data.specs.notableAlumni.length > 0 && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-2">
                    <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Notable Alumni & Major Honors
                    </h4>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.specs.notableAlumni.map((alum: string) => (
                        <span
                          key={alum}
                          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
                        >
                          {alum}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Reviews */}
                <div className="space-y-3">
                  <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Verified Resident Reviews ({data.reviews.length})
                  </h4>

                  {data.reviews.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      No community reviews submitted yet for this program.
                    </p>
                  ) : (
                    data.reviews.map((rev: ResidencyReviewRow) => (
                      <div
                        key={rev.id}
                        className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-2 shadow-sm text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {rev.reviewTitle || "Fellow Experience"}
                          </span>
                          {rev.ratingScore && (
                            <span className="flex items-center gap-1 font-mono text-xs font-medium text-[var(--text-primary)]">
                              ★ {rev.ratingScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          &ldquo;{rev.reviewBody}&rdquo;
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                          <span>{rev.authorName || "Anonymous Resident"}</span>
                          <span>{rev.datePublished || "Verified"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
