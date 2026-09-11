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
    "telemetry" | "compensation" | "guidelines" | "masthead"
  >("telemetry");

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
            Real-time telemetry, compensation standards, manuscript specs, and response curves.
          </SheetDescription>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border -mb-6 mt-6 overflow-x-auto no-scrollbar">
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
              <span>Compensation & Rights</span>
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
              <span>Manuscript Specs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("masthead")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "masthead"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
              <span>Masthead & Awards</span>
            </button>
          </div>
        </SheetHeader>

        <div className="p-6 flex-1 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Synthesizing editorial telemetry & publisher intelligence...
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
              {/* TAB 1: TELEMETRY & RESPONSE CURVES */}
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

              {/* TAB 2: COMPENSATION & RIGHTS */}
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
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded">
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

              {/* TAB 3: MANUSCRIPT GUIDELINES */}
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

              {/* TAB 4: MASTHEAD & AWARDS */}
              {activeTab === "masthead" && (
                <div className="space-y-4">
                  {/* Masthead Editors */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="size-4 text-primary" />
                      <span>Editorial Masthead & Aesthetic Wishlist</span>
                    </h4>

                    {data.masthead.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Masthead details being verified by Missa Research team.
                      </p>
                    ) : (
                      <div className="divide-y divide-border space-y-3 pt-1">
                        {data.masthead.map((member, idx) => (
                          <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">
                                {member.editorName}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {member.role}
                              </span>
                            </div>
                            {member.genres.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {member.genres.map((g) => (
                                  <span
                                    key={g}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground uppercase font-mono"
                                  >
                                    {g}
                                  </span>
                                ))}
                              </div>
                            )}
                            {member.manuscriptWishlist && (
                              <p className="text-xs text-muted-foreground mt-2 italic bg-muted/30 p-2.5 rounded border border-border/50">
                                &ldquo;{member.manuscriptWishlist}&rdquo;
                              </p>
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
                      <span>Recent Major Anthology Honors</span>
                    </h4>

                    {data.awards.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No recent major anthology selections recorded in the index.
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
