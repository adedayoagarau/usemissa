"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Scale,
  Rocket,
  Check,
  Copy,
  DollarSign,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  BookmarkPlus,
  RefreshCw,
} from "lucide-react";
import type { RankingGenre, SubmissionStrategyPreset, PortfolioStrategyPlan } from "@missa/radar-engine";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SmartShortlistBuilderProps {
  initialPlan?: PortfolioStrategyPlan;
  initialGenre?: RankingGenre;
}

export function SmartShortlistBuilder({
  initialPlan,
  initialGenre = "overall",
}: SmartShortlistBuilderProps) {
  const [genre, setGenre] = useState<RankingGenre>(initialGenre);
  const [preset, setPreset] = useState<SubmissionStrategyPreset>("balanced");
  const [freeOnly, setFreeOnly] = useState(false);
  const [payingOnly, setPayingOnly] = useState(false);
  const [simultaneousOnly, setSimultaneousOnly] = useState(true);
  const [fastOnly, setFastOnly] = useState(false);
  const [pieceTitle, setPieceTitle] = useState("");

  const [plan, setPlan] = useState<PortfolioStrategyPlan | undefined>(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Generate or regenerate the portfolio plan
  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/rankings/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            genre,
            preset,
            maxFeeCents: freeOnly ? 0 : undefined,
            payingOnly,
            requireSimultaneousSubmissions: simultaneousOnly,
            maxTurnaroundDays: fastOnly ? 60 : undefined,
          }),
        });

        if (!res.ok) throw new Error("Plan generation failed");
        const data = await res.json();
        setPlan(data.plan);
        toast.success("Submission portfolio updated!");
      } catch (err) {
        console.error(err);
        toast.error("Could not generate submission plan. Please try again.");
      }
    });
  };

  // Initial load if no plan provided
  React.useEffect(() => {
    if (!plan) {
      handleGenerate();
    }
  }, []);

  const handleCopyMarkdown = () => {
    if (!plan) return;
    const titleHeader = pieceTitle.trim() ? `Submission Packet: "${pieceTitle.trim()}"` : `Missa Submission Shortlist (${plan.genre.toUpperCase()})`;
    const lines = [
      `# ${titleHeader}`,
      `Strategy: ${plan.preset} · Estimated Reading Fees: $${(plan.totalEstimatedFeesCents / 100).toFixed(2)} · Avg Turnaround: ~${plan.expectedTurnaroundDays} days`,
      "",
      "## Targeted Submission Batch",
      "",
    ];

    plan.slots.forEach((slot, idx) => {
      const mag = slot.magazine;
      const payStr = mag.contributorPayCents > 0 ? `$${(mag.contributorPayCents / 100).toFixed(0)} pay` : "Unpaid / Copies";
      const feeStr = mag.regularFeeCents === 0 ? "$0 fee" : `$${(mag.regularFeeCents / 100).toFixed(0)} fee`;
      const daysStr = mag.medianResponseDays ? `~${mag.medianResponseDays}d` : "unknown days";
      lines.push(
        `- [ ] **${mag.name}** (${slot.role.toUpperCase()}) — Score: ${mag.totalScore} | ${payStr} | ${feeStr} | ${daysStr}`
      );
      if (mag.websiteUrl) lines.push(`  Guidelines: ${mag.websiteUrl}`);
    });

    lines.push("", "Generated via Missa Literary Magazine Index (MLMI)");

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Submission checklist copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Strategy Control Panel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Portfolio Planner
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Configure Your Submission Strategy
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell Missa what you're submitting. We calculate a balanced batch of reach, target, and anchor journals to maximize placement and minimize wait times.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isPending}
            className="gap-2 font-medium"
          >
            <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
            <span>{isPending ? "Calculating..." : "Re-Calculate Shortlist"}</span>
          </Button>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Piece Title (Optional) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Manuscript Title / Working Name (Optional)
            </label>
            <input
              type="text"
              value={pieceTitle}
              onChange={(e) => setPieceTitle(e.target.value)}
              placeholder="e.g. The Anatomy of Fog"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Genre Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Genre
            </label>
            <select
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value as RankingGenre);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="overall">All Genres / Composite</option>
              <option value="fiction">Short Fiction</option>
              <option value="poetry">Poetry</option>
              <option value="nonfiction">Creative Nonfiction / Essays</option>
            </select>
          </div>

          {/* Strategy Preset */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Portfolio Goal
            </label>
            <select
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value as SubmissionStrategyPreset);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="balanced">Balanced Spread (2 Reach, 3 Target, 2 Anchor)</option>
              <option value="aggressive_moonshot">Aggressive Moonshot (4 Reach, 2 Target, 1 Anchor)</option>
              <option value="velocity_low_friction">Frictionless Velocity (1 Reach, 3 Target, 3 Anchor)</option>
            </select>
          </div>
        </div>

        {/* Constraint Toggles */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="text-xs font-semibold text-muted-foreground mr-2">
            Preferences:
          </span>

          <button
            type="button"
            onClick={() => setSimultaneousOnly(!simultaneousOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              simultaneousOnly
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {simultaneousOnly && <Check className="size-3.5" />}
            Simultaneous Submissions OK
          </button>

          <button
            type="button"
            onClick={() => setFreeOnly(!freeOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              freeOnly
                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {freeOnly && <Check className="size-3.5" />}
            $0 Reading Fees Only
          </button>

          <button
            type="button"
            onClick={() => setPayingOnly(!payingOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              payingOnly
                ? "border-amber-600 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {payingOnly && <Check className="size-3.5" />}
            Paying Contributors Only
          </button>

          <button
            type="button"
            onClick={() => setFastOnly(!fastOnly)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              fastOnly
                ? "border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {fastOnly && <Check className="size-3.5" />}
            Fast Turnaround (&lt; 60 days)
          </button>
        </div>
      </div>

      {/* Generated Strategy Plan View */}
      {plan && (
        <div className="space-y-6">
          {/* Plan Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-muted-foreground">Portfolio Size</span>
                <p className="text-lg font-bold text-foreground">{plan.slots.length} Journals</p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div>
                <span className="text-xs text-muted-foreground">Est. Total Fees</span>
                <p className="text-lg font-bold text-foreground">
                  {plan.totalEstimatedFeesCents === 0 ? "$0 (100% Free)" : `$${(plan.totalEstimatedFeesCents / 100).toFixed(2)}`}
                </p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div>
                <span className="text-xs text-muted-foreground">Expected Median Turnaround</span>
                <p className="text-lg font-bold text-foreground">~{plan.expectedTurnaroundDays} Days</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                className="gap-1.5 text-xs"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                <span>{copied ? "Copied!" : "Copy Markdown Checklist"}</span>
              </Button>
              <Link
                href="/tracker"
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 text-xs")}
              >
                <BookmarkPlus className="size-3.5" />
                <span>Open in Private Tracker</span>
              </Link>
            </div>
          </div>

          {/* Recommended Shortlist Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Your Curated Target Batch
              </h3>
              <span className="text-xs text-muted-foreground">
                Ranked by Missa Composite Index
              </span>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {plan.slots.map((slot, index) => {
                const mag = slot.magazine;
                const isReach = slot.role === "reach";
                const isTarget = slot.role === "target";

                return (
                  <div
                    key={mag.profileId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/30"
                  >
                    {/* Left: Role Badge & Journal Name */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md px-2.5 py-1 text-xs font-bold",
                          isReach && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                          isTarget && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                          !isReach && !isTarget && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        )}
                      >
                        {slot.role.toUpperCase()}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/journals/${encodeURIComponent(mag.slug)}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors text-base truncate"
                          >
                            {mag.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            · Rank #{mag.rankPosition}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {slot.roleDescription}
                        </p>
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                      {/* Score Badge */}
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Missa Score</span>
                        <span className="font-bold text-foreground text-sm">{mag.totalScore}</span>
                      </div>

                      {/* Pay Badge */}
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-muted-foreground block">Pay</span>
                        <span className="text-xs font-medium text-foreground">
                          {mag.contributorPayCents > 0 ? `$${(mag.contributorPayCents / 100).toFixed(0)}` : "Copies/Unpaid"}
                        </span>
                      </div>

                      {/* Fee Badge */}
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-muted-foreground block">Fee</span>
                        <span className="text-xs font-medium text-foreground">
                          {mag.regularFeeCents === 0 ? "Free ($0)" : `$${(mag.regularFeeCents / 100).toFixed(0)}`}
                        </span>
                      </div>

                      {/* Turnaround Badge */}
                      <div className="text-right hidden md:block">
                        <span className="text-xs text-muted-foreground block">Turnaround</span>
                        <span className="text-xs font-medium text-foreground">
                          {mag.medianResponseDays ? `~${mag.medianResponseDays} days` : "Unknown"}
                        </span>
                      </div>

                      {/* View Profile Link */}
                      <Link
                        href={`/journals/${encodeURIComponent(mag.slug)}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs gap-1")}
                      >
                        <span>Guidelines</span>
                        <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
