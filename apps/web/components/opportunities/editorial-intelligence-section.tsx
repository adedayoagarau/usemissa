import type { EditorialIntelligenceFullProfile } from "@missa/radar-adapters";
import {
  Sparkles,
  Clock,
  Coins,
  Scale,
  Award,
  ShieldAlert,
  Flame,
  UserCheck,
  BookOpen,
} from "lucide-react";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { cn } from "@/lib/utils";

interface EditorialIntelligenceSectionProps {
  intelligence: EditorialIntelligenceFullProfile;
  className?: string;
}

export function EditorialIntelligenceSection({
  intelligence,
  className,
}: EditorialIntelligenceSectionProps) {
  const { aesthetic, telemetry, specs, compensation, judges, prestigeTier } =
    intelligence;

  return (
    <section
      aria-label="Editorial Intelligence and Publisher Dossier"
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-6 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--text-primary)]" />
            <h2 className="font-serif text-lg font-medium text-[var(--text-primary)]">
              Editorial Intelligence & Market Telemetry
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Verified taste DNA, slush ratios, payout transparency, and judge lineages.
          </p>
        </div>
        {prestigeTier && (
          <div className="flex items-center gap-2">
            <RankingTierBadge tier={prestigeTier} />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Aesthetic Taste DNA & Comps */}
        {aesthetic && (
          <div className="flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <BookOpen className="size-4 text-[var(--text-secondary)]" />
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Aesthetic DNA & Author Comps
                </h3>
              </div>
              {aesthetic.editorialMotto && (
                <p className="mt-2.5 font-serif text-sm italic text-[var(--text-secondary)]">
                  &ldquo;{aesthetic.editorialMotto}&rdquo;
                </p>
              )}
              {aesthetic.authorComps.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    If you write like:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {aesthetic.authorComps.map((comp) => (
                      <span
                        key={comp}
                        className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                Key Styles & Forms:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[...aesthetic.writingStyles, ...aesthetic.poetryForms].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                    >
                      #{tag.replace(/_/g, "-")}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debut & Slush-Friendly Champion Index */}
        {aesthetic && (
          <div className="flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <UserCheck className="size-4 text-[var(--text-secondary)]" />
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Debut & Slush-Friendliness
                  </h3>
                </div>
                {aesthetic.isDebutChampion && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 font-sans text-xs font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]">
                    <Flame className="size-3 text-[var(--text-primary)]" />
                    Debut Champion
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-2.5 text-center">
                  <span className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
                    {aesthetic.unsolicitedSlushRatioPercent}%
                  </span>
                  <p className="mt-0.5 text-[10px] uppercase font-medium text-[var(--text-muted)]">
                    Slush Acceptance Ratio
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-2.5 text-center">
                  <span className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
                    {aesthetic.debutAuthorFriendlyScore}/10
                  </span>
                  <p className="mt-0.5 text-[10px] uppercase font-medium text-[var(--text-muted)]">
                    Debut Friendliness
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {aesthetic.unsolicitedSlushRatioPercent > 65
                ? "Highly receptive to unagented queue submissions with high debut representation in published issues."
                : "Curates a balance of solicited voices and competitive slush-pile selections."}
            </p>
          </div>
        )}

        {/* Turnaround & Submittable Cap Telemetry */}
        {telemetry && (
          <div className="flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Clock className="size-4 text-[var(--text-secondary)]" />
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Response Telemetry
                  </h3>
                </div>
                {telemetry.freeCapStatus === "at_risk" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-primary)]">
                    <ShieldAlert className="size-3" />
                    Free cap closes fast
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-2">
                  <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                    {telemetry.medianResponseDays}d
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)]">Median</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-2">
                  <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                    {telemetry.fastestResponseDays}d
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)]">Fastest</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-2">
                  <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
                    {telemetry.acceptanceRatePercent}%
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)]">Accept Rate</p>
                </div>
              </div>
            </div>

            {telemetry.submittableFreeCapDepletionDays && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                ⚠️ Monthly Submittable free cap typically exhausts within{" "}
                <strong className="font-medium text-[var(--text-primary)]">
                  {telemetry.submittableFreeCapDepletionDays} days
                </strong>{" "}
                of opening.
              </p>
            )}
          </div>
        )}

        {/* Compensation & Rights */}
        {compensation && (
          <div className="flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Coins className="size-4 text-[var(--text-secondary)]" />
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Compensation & Rights
                  </h3>
                </div>
                {compensation.isProRate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 font-sans text-xs font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]">
                    Pro Rate Verified
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Contributor Pay:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {compensation.payRateKind === "per_word" &&
                    compensation.rateCentsPerWord
                      ? `$${(compensation.rateCentsPerWord / 100).toFixed(2)}/word`
                      : compensation.flatRateCents
                        ? `$${(compensation.flatRateCents / 100).toFixed(0)} flat rate`
                        : compensation.paysContributors
                          ? "Honoria / Contributor Copies"
                          : "Unpaid / Non-monetary"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Rights Acquired:</span>
                  <span className="font-mono text-[var(--text-primary)] uppercase">
                    {compensation.rightsAcquired}
                    {compensation.rightsReversionMonths
                      ? ` (${compensation.rightsReversionMonths}mo reversion)`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Fee Waivers:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {compensation.hasFeeWaivers
                      ? "Available upon request"
                      : "Standard submission fees"}
                  </span>
                </div>
              </div>
            </div>

            {compensation.feeWaiverPolicy && (
              <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                {compensation.feeWaiverPolicy}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Contest Judge Dossier & Winners Lineage (if available) */}
      {judges && judges.length > 0 && (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-[var(--text-primary)]" />
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Contest Judge Dossier & Prize Lineage
            </h3>
          </div>

          <div className="mt-4 space-y-4">
            {judges.map((judge) => (
              <div
                key={judge.id}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-base font-semibold text-[var(--text-primary)]">
                      {judge.judgeName}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      {judge.contestName}
                    </p>
                  </div>
                  {judge.judgePraisedAuthors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Influences:</span>
                      {judge.judgePraisedAuthors.map((author) => (
                        <span
                          key={author}
                          className="rounded-[var(--radius-sm)] bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[11px]"
                        >
                          {author}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {judge.judgeAestheticNotes && (
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">
                    <strong className="font-medium text-[var(--text-primary)]">
                      Judging Philosophy:
                    </strong>{" "}
                    {judge.judgeAestheticNotes}
                  </p>
                )}

                {judge.pastWinnersLineage && judge.pastWinnersLineage.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Historical Winner Outcomes:
                    </span>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {judge.pastWinnersLineage.map((winner, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 p-2 text-xs"
                        >
                          <Award className="size-3.5 text-[var(--text-primary)] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {winner.winnerName} ({winner.year})
                            </span>
                            <p className="text-[11px] italic text-[var(--text-secondary)]">
                              &ldquo;{winner.winningPieceTitle}&rdquo;
                            </p>
                            {winner.resultingPressOrPrize && (
                              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                                ↳ {winner.resultingPressOrPrize}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
