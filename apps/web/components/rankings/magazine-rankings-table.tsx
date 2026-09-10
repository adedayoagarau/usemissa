
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import Link from "next/link";
import { Award, Clock, DollarSign, ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import type { RankingGenre } from "@missa/radar-engine";
import { MagazineScheduleBadge } from "@/components/ui/magazine-schedule-badge";
import { MagazineCitizenshipBadges } from "@/components/missa/magazine-citizenship-badges";
import { MagazineTrackerAction } from "@/components/rankings/magazine-tracker-action";

interface MagazineRankingsTableProps {
  items: MagazineRankingRow[];
  currentGenre: RankingGenre;
  total: number;
  signedIn?: boolean;
}

export function MagazineRankingsTable({
  items,
  currentGenre,
  total,
  signedIn = false,
}: MagazineRankingsTableProps) {
  const GENRE_TABS: Array<{ genre: RankingGenre; label: string }> = [
    { genre: "overall", label: "Overall Index" },
    { genre: "fiction", label: "Fiction" },
    { genre: "poetry", label: "Poetry" },
    { genre: "nonfiction", label: "Nonfiction" },
  ];

  return (
    <div className="space-y-6">
      {/* Genre Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        {GENRE_TABS.map((tab) => {
          const isActive = tab.genre === currentGenre;
          return (
            <Link
              key={tab.genre}
              href={`/rankings/magazines?genre=${tab.genre}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Ledger status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {items.length} of {total} indexed literary publications
        </span>
        <span className="hidden sm:inline">
          Updated for 2026 · 10-Year Rolling Window
        </span>
      </div>

      {/* High-density ranking table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-2 sm:pl-6 w-24 text-center">
                Rank & Trend
              </th>
              <th scope="col" className="py-3.5 px-3 min-w-[14rem]">
                Magazine
              </th>
              <th scope="col" className="py-3.5 px-3 text-center">
                Missa Score
              </th>
              <th scope="col" className="py-3.5 px-3 hidden md:table-cell">
                Accolades (40)
              </th>
              <th scope="col" className="py-3.5 px-3 hidden lg:table-cell">
                Pay (15)
              </th>
              <th scope="col" className="py-3.5 px-3 hidden sm:table-cell">
                Turnaround (15)
              </th>
              <th scope="col" className="py-3.5 pr-4 pl-3 text-right sm:pr-6">
                Tracker
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((row) => (
              <tr
                key={`${row.profileId}-${row.genre}`}
                className="hover:bg-muted/30 transition-colors"
              >
                {/* Rank Number & Trajectory */}
                <td className="py-4 pl-4 pr-2 text-center font-mono sm:pl-6">
                  <div className="text-base font-semibold text-foreground">
                    #{row.rankPosition}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px]">
                    {row.rankDelta != null ? (
                      row.rankDelta > 0 ? (
                        <span className="inline-flex items-center text-accent-deep font-semibold" title={`Climbed ${row.rankDelta} spots vs 2025`}>
                          <ArrowUp className="size-3" aria-hidden="true" />
                          +{row.rankDelta}
                        </span>
                      ) : row.rankDelta < 0 ? (
                        <span className="inline-flex items-center text-destructive font-semibold" title={`Dropped ${Math.abs(row.rankDelta)} spots vs 2025`}>
                          <ArrowDown className="size-3" aria-hidden="true" />
                          {row.rankDelta}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-muted-foreground" title="Steady rank vs 2025">
                          <Minus className="size-3" aria-hidden="true" />
                          steady
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.2 text-[10px] font-medium text-primary" title="New entry in 2026 index">
                        <Sparkles className="size-2.5" aria-hidden="true" />
                        new
                      </span>
                    )}
                  </div>
                </td>

                {/* Magazine Identity */}
                <td className="py-4 px-3">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                    <Link
                      href={`/journal/${encodeURIComponent(row.slug)}`}
                      className="hover:text-primary"
                    >
                      {row.name}
                    </Link>
                    <MagazineScheduleBadge schedule={row.schedule} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{row.genre}</span>
                    <span>·</span>
                    <span>{row.simultaneousPolicy === "allowed" ? "Simultaneous OK" : "No Simultaneous"}</span>
                    {row.regularFeeCents === 0 ? (
                      <>
                        <span>·</span>
                        <span className="text-accent-deep font-medium">Free Submissions</span>
                      </>
                    ) : null}
                  </div>
                  <MagazineCitizenshipBadges
                    ranking={row}
                    compact
                    className="mt-2"
                  />
                </td>

                {/* Total Score */}
                <td className="py-4 px-3 text-center">
                  <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                    {row.totalScore}
                  </span>
                </td>

                {/* Accolades Breakdown */}
                <td className="py-4 px-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                    <Award className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>{row.accoladesScore} / 40</span>
                  </div>
                </td>

                {/* Pay Breakdown */}
                <td className="py-4 px-3 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                    <DollarSign className="size-3.5 text-accent-deep shrink-0" aria-hidden="true" />
                    <span>{row.payScore} / 15</span>
                  </div>
                </td>

                {/* Turnaround Breakdown */}
                <td className="py-4 px-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span>{row.turnaroundScore} / 15</span>
                  </div>
                </td>

                {/* Tracker Action */}
                <td className="py-4 pr-4 pl-3 text-right sm:pr-6">
                  <div className="flex flex-col items-end gap-1.5">
                    <RankingTierBadge tier={row.prestigeTier} />
                    <MagazineTrackerAction
                      magazineName={row.name}
                      magazineSlug={row.slug}
                      activeOpportunity={row.activeOpportunity}
                      signedIn={signedIn}
                      returnTo={`/rankings/magazines?genre=${currentGenre}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
