"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ExternalLink,
  DollarSign,
  Clock,
  FileText,
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
import { BetaBadge } from "@/components/ui/beta-badge";
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
  const [data, setData] =
    React.useState<EditorialIntelligenceFullProfile | null>(null);
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
      // The fetch callback owns loading/error state for this user-triggered disclosure.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
            <Button variant="outline" size="sm">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              <span>Intelligence</span>
            </Button>
          )
        }
      />
      <SheetContent
        side="right"
        surface="canvas"
        className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader variant="muted" className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <RankingTierBadge tier={data?.prestigeTier ?? "Tier 1"} />
              {data?.aesthetic.isDebutChampion && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <HeartHandshake className="size-3" /> Debut Champion
                </span>
              )}
              <BetaBadge />
            </div>
            <Link
              href={`/journal/${encodeURIComponent(magazineSlug || profileId)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <span>View full profile</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <SheetTitle className="mt-2 text-xl sm:text-2xl">
            {magazineName}
          </SheetTitle>
          <SheetDescription className="mt-1">
            A beta summary of Missa&apos;s current records, including taste
            signals, response telemetry, manuscript specs, and prize lineage.
            This tool is not publisher-confirmed; check official guidelines
            before deciding where to submit.
          </SheetDescription>

          {/* Tab Navigation */}
          <div className="mt-6 -mb-6 no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("aesthetic")}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "aesthetic"
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-3.5" />
              <span>Taste DNA & Comps</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "telemetry"
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-3.5" />
              <span>Response & Telemetry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compensation")}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "compensation"
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <DollarSign className="size-3.5" />
              <span>Compensation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guidelines")}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "guidelines"
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Specs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("judges")}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "judges"
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gavel className="size-3.5" />
              <span>Judges & Lineage</span>
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 p-6">
          {loading && (
            <div className="space-y-3 py-16 text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Synthesizing editorial taste DNA, telemetry & publisher
                intelligence...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to fetch intelligence</p>
                <p className="mt-1 text-xs opacity-90">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchIntelligence}
                  className="mt-3"
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
                    <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                        Editorial Taste Profile
                      </p>
                      <p className="font-serif text-sm leading-relaxed text-foreground italic">
                        &ldquo;{data.aesthetic.editorialMotto}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Author Comps ("If You Write Like...") */}
                  {data.aesthetic.authorComps.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <BookOpen className="size-4 text-primary" />
                          <span>Author & Aesthetic Comps</span>
                        </h4>
                        <span className="font-mono text-xs text-muted-foreground">
                          Stylistic Kinship
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Writers who share tonal or structural resonance with
                        this journal&rsquo;s published work:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {data.aesthetic.authorComps.map((author) => (
                          <span
                            key={author}
                            className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {author}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Slush & Debut Breakdown */}
                  <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <HeartHandshake className="size-4 text-emerald-600" />
                        <span>Slush Acceptance & Debut Friendliness</span>
                      </h4>
                      <span className="font-mono text-xs font-semibold text-emerald-600">
                        {data.aesthetic.debutAuthorFriendlyScore} / 10 Debut
                        Score
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Unsolicited Slush Acceptance Share
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {data.aesthetic.unsolicitedSlushRatioPercent}% Open
                          Slush{" "}
                          <span className="font-normal text-muted-foreground">
                            ({100 - data.aesthetic.unsolicitedSlushRatioPercent}
                            % Solicited)
                          </span>
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${data.aesthetic.unsolicitedSlushRatioPercent}%`,
                          }}
                        />
                        <div
                          className="h-full bg-muted-foreground/30 transition-all duration-500"
                          style={{
                            width: `${100 - data.aesthetic.unsolicitedSlushRatioPercent}%`,
                          }}
                        />
                      </div>
                    </div>

                    <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                      {data.aesthetic.isDebutChampion
                        ? "Beta signal: Current tool inputs suggest this magazine often publishes emerging and first-time writers from open submissions."
                        : "Selective Masthead: Significant portion of each issue is curated through solicitations and established contributors."}
                    </p>
                  </div>

                  {/* Writing Styles & Poetry Forms Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Preferred Writing Styles
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.writingStyles.map((style) => (
                          <span
                            key={style}
                            className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground capitalize"
                          >
                            {style.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Poetry Forms & Structures
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.poetryForms.map((form) => (
                          <span
                            key={form}
                            className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground capitalize"
                          >
                            {form.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Thematic Interests */}
                  {data.aesthetic.thematicInterests.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Recurring Thematic Explorations
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.aesthetic.thematicInterests.map((theme) => (
                          <span
                            key={theme}
                            className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary capitalize"
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground">
                        Median Turnaround
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-foreground">
                        {data.telemetry.medianResponseDays}{" "}
                        <span className="text-xs font-normal">days</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Avg: {data.telemetry.avgResponseDays}d
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground">
                        Acceptance Rate
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-primary">
                        {data.telemetry.acceptanceRatePercent}%
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Highly Selective
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground">
                        Personal / Tier Notes
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-foreground">
                        {data.telemetry.tieredRejectionRatePercent}%
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Encouraging replies
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground">
                        Active Queue Depth
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-foreground">
                        {data.telemetry.currentQueueDepth}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        In review now
                      </p>
                    </div>
                  </div>

                  {/* Free Cap Depletion Alert */}
                  {data.telemetry.submittableFreeCapDepletionDays != null && (
                    <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
                      <TrendingUp className="mt-0.5 size-5 shrink-0 text-warning" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Submittable Free Submission Cap Depletion Velocity
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          This publication operates on a monthly Submittable
                          free cap that typically exhausts within{" "}
                          <span className="font-semibold text-foreground">
                            {data.telemetry.submittableFreeCapDepletionDays}{" "}
                            days
                          </span>{" "}
                          of the calendar month opening. We recommend queueing
                          your submission draft for automatic dispatch on the
                          1st of each month.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Response Probability Curve */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Clock className="size-4 text-primary" />
                        <span>Response Timeline Distribution</span>
                      </h4>
                      <span className="font-mono text-xs text-muted-foreground">
                        Confidence{" "}
                        {(
                          Number(data.telemetry.telemetryConfidenceScore) * 100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Probability curve showing when editorial decisions
                      (acceptances, requests, or rejections) are delivered to
                      submitters.
                    </p>

                    <div className="space-y-2 pt-2">
                      {data.telemetry.responseCurveDistribution.map(
                        (bucket) => (
                          <div key={bucket.bucketDays} className="space-y-1">
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="text-muted-foreground">
                                {bucket.bucketDays}
                              </span>
                              <span className="font-semibold text-foreground">
                                {bucket.percentage}%{" "}
                                <span className="font-normal text-muted-foreground">
                                  ({bucket.count} reports)
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{
                                  width: `${Math.max(4, bucket.percentage)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                      <span>
                        Fastest: {data.telemetry.fastestResponseDays} days
                      </span>
                      <span>
                        Slowest: {data.telemetry.slowestResponseDays} days
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPENSATION & RIGHTS */}
              {activeTab === "compensation" && (
                <div className="space-y-4">
                  {/* Contributor Pay Card */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <DollarSign className="size-4 text-primary" />
                        <span>Contributor Pay & Pro Rates</span>
                      </h4>
                      {data.compensation.isProRate && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          SFWA / Pro Rate
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Payment Structure
                        </p>
                        <p className="mt-0.5 text-base font-semibold text-foreground capitalize">
                          {data.compensation.payRateKind.replace(/_/g, " ")}
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Standard Rate
                        </p>
                        <p className="mt-0.5 font-mono text-base font-semibold text-primary">
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
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Rights & Copyright Retention</span>
                    </h4>

                    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Rights Acquired:{" "}
                          </span>
                          <span className="font-mono font-medium text-foreground uppercase">
                            {data.compensation.rightsAcquired}
                          </span>{" "}
                          (First North American Serial Rights & non-exclusive
                          archival rights).
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-foreground">
                            Rights Reversion:{" "}
                          </span>
                          All publication rights automatically revert to the
                          author{" "}
                          <span className="font-semibold text-foreground">
                            {data.compensation.rightsReversionMonths ?? 3}{" "}
                            months
                          </span>{" "}
                          following publication.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fees & Fee Waivers */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Info className="size-4 text-primary" />
                        <span>Submission Fees & Financial Accessibility</span>
                      </h4>
                      <span className="font-mono text-xs text-muted-foreground">
                        {data.compensation.submissionFeeCents === 0
                          ? "100% Free Submissions"
                          : `$${(data.compensation.submissionFeeCents / 100).toFixed(2)} Regular Fee`}
                      </span>
                    </div>

                    {data.compensation.hasFeeWaivers &&
                      data.compensation.feeWaiverPolicy && (
                        <div className="rounded-lg border border-primary/30 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                          <p className="mb-1 font-semibold text-foreground">
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        Max Word Count
                      </p>
                      <p className="mt-0.5 font-mono text-base font-bold text-foreground">
                        {data.specs.maxWordCount
                          ? `${data.specs.maxWordCount.toLocaleString()} words`
                          : "No hard limit"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        Poetry Submission
                      </p>
                      <p className="mt-0.5 font-mono text-base font-bold text-foreground">
                        Up to {data.specs.maxPoemsPerSubmission ?? 5} poems
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        Blind Review
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-base font-semibold text-foreground">
                        {data.specs.requiresBlindReview ? (
                          <>
                            <CheckCircle2 className="size-4 text-primary" />{" "}
                            Required
                          </>
                        ) : (
                          <>
                            <XCircle className="size-4 text-muted-foreground" />{" "}
                            Standard
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Submission Rules List */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      Editorial Policies & Formatting Rules
                    </h4>
                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
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
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
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
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
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
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-1 text-xs font-semibold text-foreground">
                          Editorial Instructions:
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
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
                  <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Gavel className="size-4 text-primary" />
                        <span>Annual Contest Judges & Aesthetics</span>
                      </h4>
                      <span className="font-mono text-xs text-muted-foreground">
                        ROI Optimization
                      </span>
                    </div>

                    {data.judges.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active annual contest judge dossiers recorded for
                        this profile.
                      </p>
                    ) : (
                      <div className="space-y-4 divide-y divide-border">
                        {data.judges.map((judge, idx) => (
                          <div
                            key={judge.id}
                            className={idx > 0 ? "space-y-3 pt-4" : "space-y-3"}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-foreground">
                                  {judge.contestName}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-primary">
                                  Judge: {judge.judgeName}
                                </p>
                              </div>
                            </div>

                            {judge.judgeBio && (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {judge.judgeBio}
                              </p>
                            )}

                            {judge.judgeAestheticNotes && (
                              <div className="rounded-lg border border-primary/30 bg-muted/40 p-3 text-xs leading-relaxed">
                                <p className="mb-1 font-semibold text-foreground">
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
                                <span className="font-mono text-muted-foreground">
                                  {judge.judgePraisedAuthors.join(", ")}
                                </span>
                              </div>
                            )}

                            {judge.pastWinnersLineage.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                  Past Winners & Book Deals Lineage
                                </p>
                                <div className="space-y-2">
                                  {judge.pastWinnersLineage.map(
                                    (winner, wIdx) => (
                                      <div
                                        key={wIdx}
                                        className="space-y-1 rounded border border-border/50 bg-muted/40 p-2.5 text-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-foreground">
                                            {winner.winnerName} ({winner.year})
                                          </span>
                                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                            {winner.genre}
                                          </span>
                                        </div>
                                        <p className="text-muted-foreground italic">
                                          &ldquo;{winner.winningPieceTitle}
                                          &rdquo;
                                        </p>
                                        {winner.resultingPressOrPrize && (
                                          <p className="text-[11px] font-medium text-primary">
                                            Outcome:{" "}
                                            {winner.resultingPressOrPrize}
                                          </p>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anthologies & Honors */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Award className="size-4 text-warning" />
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
                            className="flex items-center justify-between rounded border border-border/50 bg-muted/40 p-2.5 text-xs"
                          >
                            <span className="font-semibold text-foreground">
                              {award.anthology} ({award.year})
                            </span>
                            <span className="font-mono text-muted-foreground capitalize">
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
