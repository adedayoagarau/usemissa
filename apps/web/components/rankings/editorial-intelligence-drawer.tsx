"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ExternalLink,
  DollarSign,
  Clock,
  FileText,
  Users,
  Award,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Info,
  Compass,
  Gavel,
  BookOpen,
  HeartHandshake,
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
import type { EditorialIntelligenceFullProfile } from "@missa/radar-adapters";

interface EditorialIntelligenceDrawerProps {
  profileId: string;
  magazineName: string;
  magazineSlug: string;
  trigger?: React.ReactNode;
}

export function EditorialIntelligenceDrawer({
  profileId,
  magazineName,
  magazineSlug,
  trigger,
}: EditorialIntelligenceDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<EditorialIntelligenceFullProfile | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "aesthetic" | "telemetry" | "compensation" | "guidelines" | "judges"
  >("aesthetic");

  const fetchIntelligence = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rankings/magazines/${encodeURIComponent(profileId)}/intelligence`,
      );
      if (!res.ok) {
        throw new Error("Failed to load editorial intelligence data.");
      }
      const json = (await res.json()) as EditorialIntelligenceFullProfile;
      setData(json);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching intelligence.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    if (open && !data && !loading) {
      void fetchIntelligence();
    }
  }, [open, data, loading, fetchIntelligence]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              <span>Intelligence</span>
            </Button>
          )
        }
      />
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col bg-background"
      >
        <SheetHeader className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <RankingTierBadge tier={data?.prestigeTier ?? "Tier 1"} />
              {data?.aesthetic.isDebutChampion && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded">
                  <HeartHandshake className="size-3" /> Debut Champion
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Verified Intel
              </span>
            </div>
            <Link
              href={`/journal/${encodeURIComponent(magazineSlug || profileId)}`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <span>View full profile</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <SheetTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-2">
            {magazineName}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground mt-1">
            Aesthetic taste profile, response telemetry, author comps, manuscript specs, and prize lineage.
          </SheetDescription>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border -mb-6 mt-6 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("aesthetic")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "aesthetic"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-3.5" />
              <span>Taste DNA & Comps</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "telemetry"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-3.5" />
              <span>Response & Telemetry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compensation")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "compensation"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <DollarSign className="size-3.5" />
              <span>Compensation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guidelines")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "guidelines"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Specs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("judges")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "judges"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gavel className="size-3.5" />
              <span>Judges & Lineage</span>
            </button>
          </div>
        </SheetHeader>

        <div className="p-6 flex-1 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Synthesizing editorial taste DNA, telemetry & publisher intelligence...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-lg text-sm text-destructive flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch intelligence</p>
                <p className="mt-1 text-xs opacity-90">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchIntelligence}
                  className="mt-3 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* TAB 1: AESTHETIC TASTE DNA & COMPS */}
              {activeTab === "aesthetic" && (
                <div className="space-y-6">
                  {/* Editorial Motto */}
                  {data.aesthetic.editorialMotto && (
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Editorial Taste Profile
                      </p>
                      <p className="text-sm font-serif italic text-foreground leading-relaxed">
                        &ldquo;{data.aesthetic.editorialMotto}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Author Comps ("If You Write Like...") */}
                  {data.aesthetic.authorComps.length > 0 && (
                    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <BookOpen className="size-4 text-primary" />
                          <span>Author & Aesthetic Comps</span>
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono">
                          Stylistic Kinship
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Writers who share tonal or structural resonance with this journal&rsquo;s published work:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {data.aesthetic.authorComps.map((author) => (
                          <span
                            key={author}
                            className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {author}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Slush & Debut Breakdown */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <HeartHandshake className="size-4 text-emerald-600" />
                        <span>Slush Acceptance & Debut Friendliness</span>
                      </h4>
                      <span className="text-xs font-mono font-semibold text-emerald-600">
                        {data.aesthetic.debutAuthorFriendlyScore} / 10 Debut Score
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Unsolicited Slush Acceptance Share
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {data.aesthetic.unsolicitedSlushRatioPercent}% Open Slush{" "}
                          <span className="font-normal text-muted-foreground">
                            ({100 - data.aesthetic.unsolicitedSlushRatioPercent}% Solicited)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{ width: `${data.aesthetic.unsolicitedSlushRatioPercent}%` }}
                        />
                        <div
                          className="h-full bg-muted-foreground/30 transition-all duration-500"
                          style={{ width: `${100 - data.aesthetic.unsolicitedSlushRatioPercent}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {data.aesthetic.isDebutChampion
                        ? "Verified Debut Champion: This magazine consistently publishes emerging and first-time writers directly from open slush piles."
                        : "Selective Masthead: Significant portion of each issue is curated through solicitations and established contributors."}
                    </p>
                  </div>

                  {/* Writing Styles & Poetry Forms Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Preferred Writing Styles
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.writingStyles.map((style) => (
                          <span
                            key={style}
                            className="px-2 py-0.5 text-xs rounded bg-muted text-foreground capitalize font-mono"
                          >
                            {style.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Poetry Forms & Structures
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.poetryForms.map((form) => (
                          <span
                            key={form}
                            className="px-2 py-0.5 text-xs rounded bg-muted text-foreground capitalize font-mono"
                          >
                            {form.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Thematic Interests */}
                  {data.aesthetic.thematicInterests.length > 0 && (
                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Recurring Thematic Explorations
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.thematicInterests.map((theme) => (
                          <span
                            key={theme}
                            className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary border border-primary/20 capitalize font-mono"
                          >
                            {theme.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TELEMETRY & RESPONSE CURVES */}
              {activeTab === "telemetry" && (
                <div className="space-y-6">
                  {/* Key Telemetry Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground">Median Turnaround</p>
                      <p className="text-xl font-bold font-mono text-foreground mt-1">
                        {data.telemetry.medianResponseDays} <span className="text-xs font-normal">days</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Avg: {data.telemetry.avgResponseDays}d
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground">Acceptance Rate</p>
                      <p className="text-xl font-bold font-mono text-primary mt-1">
                        {data.telemetry.acceptanceRatePercent}%
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Highly Selective
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground">Personal / Tier Notes</p>
                      <p className="text-xl font-bold font-mono text-foreground mt-1">
                        {data.telemetry.tieredRejectionRatePercent}%
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Encouraging replies
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground">Active Queue Depth</p>
                      <p className="text-xl font-bold font-mono text-foreground mt-1">
                        {data.telemetry.currentQueueDepth}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        In review now
                      </p>
                    </div>
                  </div>

                  {/* Free Cap Depletion Alert */}
                  {data.telemetry.submittableFreeCapDepletionDays != null && (
                    <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                      <TrendingUp className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Submittable Free Submission Cap Depletion Velocity
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This publication operates on a monthly Submittable free cap that typically exhausts within{" "}
                          <span className="font-semibold text-foreground">
                            {data.telemetry.submittableFreeCapDepletionDays} days
                          </span>{" "}
                          of the calendar month opening. We recommend queueing your submission draft for automatic dispatch on the 1st of each month.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Response Probability Curve */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-4 text-primary" />
                        <span>Response Timeline Distribution</span>
                      </h4>
                      <span className="text-xs font-mono text-muted-foreground">
                        Confidence {(Number(data.telemetry.telemetryConfidenceScore) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Probability curve showing when editorial decisions (acceptances, requests, or rejections) are delivered to submitters.
                    </p>

                    <div className="space-y-2 pt-2">
                      {data.telemetry.responseCurveDistribution.map((bucket) => (
                        <div key={bucket.bucketDays} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground">{bucket.bucketDays}</span>
                            <span className="font-semibold text-foreground">
                              {bucket.percentage}%{" "}
                              <span className="font-normal text-muted-foreground">
                                ({bucket.count} reports)
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(4, bucket.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border mt-3">
                      <span>Fastest: {data.telemetry.fastestResponseDays} days</span>
                      <span>Slowest: {data.telemetry.slowestResponseDays} days</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPENSATION & RIGHTS */}
              {activeTab === "compensation" && (
                <div className="space-y-4">
                  {/* Contributor Pay Card */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <DollarSign className="size-4 text-primary" />
                        <span>Contributor Pay & Pro Rates</span>
                      </h4>
                      {data.compensation.isProRate && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded">
                          SFWA / Pro Rate
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-muted/40 rounded-lg">
                        <p className="text-xs text-muted-foreground">Payment Structure</p>
                        <p className="text-base font-semibold text-foreground capitalize mt-0.5">
                          {data.compensation.payRateKind.replace(/_/g, " ")}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg">
                        <p className="text-xs text-muted-foreground">Standard Rate</p>
                        <p className="text-base font-semibold font-mono text-primary mt-0.5">
                          {data.compensation.rateCentsPerWord != null
                            ? `$${(data.compensation.rateCentsPerWord / 100).toFixed(2)} / word`
                            : data.compensation.flatRateCents != null
                              ? `$${(data.compensation.flatRateCents / 100).toFixed(0)} flat rate`
                              : data.compensation.paysContributors
                                ? "Honorarium / Copies"
                                : "Unpaid / Contributor Copy"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rights Acquired & Reversion */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Rights & Copyright Retention</span>
                    </h4>

                    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Rights Acquired:{" "}
                          </span>
                          <span className="uppercase font-mono font-medium text-foreground">
                            {data.compensation.rightsAcquired}
                          </span>{" "}
                          (First North American Serial Rights & non-exclusive archival rights).
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Rights Reversion:{" "}
                          </span>
                          All publication rights automatically revert to the author{" "}
                          <span className="font-semibold text-foreground">
                            {data.compensation.rightsReversionMonths ?? 3} months
                          </span>{" "}
                          following publication.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fees & Fee Waivers */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="size-4 text-primary" />
                        <span>Submission Fees & Financial Accessibility</span>
                      </h4>
                      <span className="text-xs font-mono text-muted-foreground">
                        {data.compensation.submissionFeeCents === 0
                          ? "100% Free Submissions"
                          : `$${(data.compensation.submissionFeeCents / 100).toFixed(2)} Regular Fee`}
                      </span>
                    </div>

                    {data.compensation.hasFeeWaivers && data.compensation.feeWaiverPolicy && (
                      <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-muted-foreground border-l-2 border-primary">
                        <p className="font-semibold text-foreground mb-1">
                          Fee Waiver & Hardship Policy:
                        </p>
                        {data.compensation.feeWaiverPolicy}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: MANUSCRIPT GUIDELINES */}
              {activeTab === "guidelines" && (
                <div className="space-y-4">
                  {/* Constraints Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Max Word Count</p>
                      <p className="text-base font-bold font-mono text-foreground mt-0.5">
                        {data.specs.maxWordCount ? `${data.specs.maxWordCount.toLocaleString()} words` : "No hard limit"}
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Poetry Submission</p>
                      <p className="text-base font-bold font-mono text-foreground mt-0.5">
                        Up to {data.specs.maxPoemsPerSubmission ?? 5} poems
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Blind Review</p>
                      <p className="text-base font-semibold text-foreground mt-0.5 flex items-center gap-1">
                        {data.specs.requiresBlindReview ? (
                          <>
                            <CheckCircle2 className="size-4 text-primary" /> Required
                          </>
                        ) : (
                          <>
                            <XCircle className="size-4 text-muted-foreground" /> Standard
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Submission Rules List */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Editorial Policies & Formatting Rules
                    </h4>
                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Simultaneous Submissions:{" "}
                          </span>
                          {data.specs.allowsSimultaneous
                            ? "Permitted. Please notify editorial team immediately via Submittable / email if accepted elsewhere."
                            : "Not allowed. All submissions must be exclusive during active review."}
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        {data.specs.allowsReprints ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold text-foreground">
                            Reprints Policy:{" "}
                          </span>
                          {data.specs.allowsReprints
                            ? "Reprints and previously published works accepted with attribution."
                            : "Previously unpublished works only. Pieces appearing online or in self-published anthologies cannot be considered."}
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Accepted Formats:{" "}
                          </span>
                          <span className="font-mono uppercase">
                            {data.specs.acceptedFileFormats.join(", ")}
                          </span>
                        </div>
                      </li>
                    </ul>

                    {data.specs.specificGuidelines && (
                      <div className="pt-3 border-t border-border mt-3">
                        <p className="text-xs font-semibold text-foreground mb-1">
                          Editorial Instructions:
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {data.specs.specificGuidelines}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: CONTEST JUDGES & LINEAGE */}
              {activeTab === "judges" && (
                <div className="space-y-6">
                  {/* Contest Judges */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Gavel className="size-4 text-primary" />
                        <span>Annual Contest Judges & Aesthetics</span>
                      </h4>
                      <span className="text-xs text-muted-foreground font-mono">
                        ROI Optimization
                      </span>
                    </div>

                    {data.judges.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active annual contest judge dossiers recorded for this profile.
                      </p>
                    ) : (
                      <div className="space-y-4 divide-y divide-border">
                        {data.judges.map((judge, idx) => (
                          <div key={judge.id} className={idx > 0 ? "pt-4 space-y-3" : "space-y-3"}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-foreground">
                                  {judge.contestName}
                                </p>
                                <p className="text-xs font-semibold text-primary mt-0.5">
                                  Judge: {judge.judgeName}
                                </p>
                              </div>
                            </div>

                            {judge.judgeBio && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {judge.judgeBio}
                              </p>
                            )}


                            {judge.judgeAestheticNotes && (
                              <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed border-l-2 border-primary">
                                <p className="font-semibold text-foreground mb-1">
                                  Judge Aesthetic Focus:
                                </p>
                                <p className="text-muted-foreground italic">
                                  &ldquo;{judge.judgeAestheticNotes}&rdquo;
                                </p>
                              </div>
                            )}

                            {judge.judgePraisedAuthors.length > 0 && (
                              <div className="space-y-1 text-xs">
                                <span className="font-semibold text-foreground">
                                  Praised Authors & Influences:{" "}
                                </span>
                                <span className="text-muted-foreground font-mono">
                                  {judge.judgePraisedAuthors.join(", ")}
                                </span>
                              </div>
                            )}

                            {judge.pastWinnersLineage.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Past Winners & Book Deals Lineage
                                </p>
                                <div className="space-y-2">
                                  {judge.pastWinnersLineage.map((winner, wIdx) => (
                                    <div
                                      key={wIdx}
                                      className="p-2.5 rounded bg-muted/40 text-xs border border-border/50 space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">
                                          {winner.winnerName} ({winner.year})
                                        </span>
                                        <span className="text-muted-foreground uppercase font-mono text-[10px]">
                                          {winner.genre}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground italic">
                                        &ldquo;{winner.winningPieceTitle}&rdquo;
                                      </p>
                                      {winner.resultingPressOrPrize && (
                                        <p className="text-[11px] text-primary font-medium">
                                          Outcome: {winner.resultingPressOrPrize}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anthologies & Honors */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="size-4 text-amber-600" />
                      <span>Major Anthology Selections</span>
                    </h4>

                    {data.awards.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No major anthology selections recorded in the index.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {data.awards.map((award, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded bg-muted/40 text-xs border border-border/50"
                          >
                            <span className="font-semibold text-foreground">
                              {award.anthology} ({award.year})
                            </span>
                            <span className="capitalize text-muted-foreground font-mono">
                              {award.genre} · {award.awardType}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
