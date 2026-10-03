import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MagazineIndexCoverage } from "@missa/radar-adapters";
import {
  ANTHOLOGY_CITATION_POINTS,
  ANTHOLOGY_POINTS_CAP,
  MIN_REPORTS_FOR_MEDIAN,
  PILLAR_KEYS,
  PILLAR_MAX,
  PRO_PAY_THRESHOLDS,
  TIER_THRESHOLDS,
  computeFeesScore,
  computePayScore,
  computeRespectScore,
  computeTurnaroundScore,
  type PillarKey,
} from "@missa/radar-engine";
import {
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const PILLAR_NAMES: Record<PillarKey, string> = {
  accolades: "Accolades",
  pay: "Contributor pay",
  turnaround: "Turnaround",
  fees: "Submission fees",
  respect: "Editorial respect",
  formatEthics: "Format and ethics",
};

// Every number below is read from the engine, so this page cannot drift from it.
const cashUnknownAmount = computePayScore({ kind: "cash" }).score;
const feeUnknownAmount = computeFeesScore({
  regularSubmissionFeeCents: null,
  chargesSubmissionFee: true,
  hasSubsidizedFeeCategory: null,
}).score;
const bandScore = (
  band: "under_3_months" | "3_to_6_months" | "over_6_months",
) =>
  computeTurnaroundScore({ medianResponseDays: null, responseTimeBand: band })
    .score;
const respectUnknown = computeRespectScore({
  simultaneousSubmissions: null,
  queryAllowedAfterDays: null,
}).score;

function percent(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function Pillar({
  icon: Icon,
  title,
  max,
  children,
}: {
  icon: typeof Award;
  title: string;
  max: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          {title}
        </h3>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {max} points maximum
        </span>
      </div>
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export function MagazineMethodology({
  coverage,
}: {
  coverage: MagazineIndexCoverage | null;
}) {
  const total = coverage?.magazineCounts.overall ?? 0;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          What the index measures
        </h2>
        <p className="mt-3 text-muted-foreground">
          Prize volume alone does not tell you what it is like to submit to a
          magazine. The Missa Literary Magazine Index adds pay, response time,
          fees and submission policy to Pushcart standing, but only where a
          source records them. A fact that no source records is shown as{" "}
          <strong>Not recorded</strong> and never filled with a guess.
        </p>
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Four indexes
        </h2>
        {coverage ? (
          <p className="mt-2 text-muted-foreground">
            The {coverage.year} index ranks{" "}
            <strong>{coverage.magazineCounts.overall.toLocaleString()}</strong>{" "}
            magazines overall,{" "}
            {coverage.magazineCounts.fiction.toLocaleString()} in fiction,{" "}
            {coverage.magazineCounts.poetry.toLocaleString()} in poetry and{" "}
            {coverage.magazineCounts.nonfiction.toLocaleString()} in nonfiction.
            A magazine enters a genre index when it has a Pushcart standing or a
            cited anthology selection in that genre. Counts are read from the
            live index.
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            The index has not been published yet.
          </p>
        )}
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Sources
        </h2>
        <ul className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">
              Clifford Garstang’s Literary Magazine Rankings
            </strong>{" "}
            (cliffordgarstang.com, 2024–2026 tables). For each genre and year
            Garstang publishes a magazine’s rank and a ten-year weighted score
            of Pushcart Prizes and Pushcart special mentions, with recent years
            weighted more. He does not publish the per-year prize and mention
            counts or the exact weights, so Missa stores his score and rank as
            published, with the page address and the date it was retrieved. A
            magazine missing from his table had no Pushcart points in his
            window.
          </li>
          <li>
            <strong className="text-foreground">
              Best Microfiction and Best Small Fictions
            </strong>{" "}
            tables of contents: Best Microfiction 2019–2026
            (bestmicrofiction.com) and Best Small Fictions 2023–2025
            (Alternating Current Press). Each selection is stored with its
            title, author, the magazine the contents name and the page address.
            Earlier Best Small Fictions contents are no longer published, so
            those editions are left out for every magazine.
          </li>
          <li>
            <strong className="text-foreground">
              Poets &amp; Writers listings
            </strong>{" "}
            for response-time band, whether a reading fee is charged, payment
            type and simultaneous-submission policy. Each value keeps the
            listing’s address. A listing counts for a ranking year only if it
            was last updated in or before that year, so 2024 and 2025 have
            almost no listing facts.
          </li>
          <li>
            <strong className="text-foreground">Missa writer reports.</strong> A
            magazine’s median response time is recorded once it has{" "}
            {MIN_REPORTS_FOR_MEDIAN} decided reports. Reports are stored without
            an account.
          </li>
          <li>
            Not used: Erika Krouse’s tiers, the Best American series, the O.
            Henry Prize and Best of the Net. No source in the index records them
            per magazine, so the index does not claim them.
          </li>
        </ul>
      </div>

      <div className="pt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          The 100-point score
        </h2>
        <p className="mt-2 text-muted-foreground">
          Six pillars add up to 100 points. When no source records a fact, its
          pillar scores the midpoint of the points it could earn, so a missing
          fact neither helps nor hurts. When a source records only a range (for
          example “pays in cash” with no amount), the pillar scores the midpoint
          of that range.
        </p>

        <div className="mt-6 space-y-4">
          <Pillar icon={Award} title="Accolades" max={PILLAR_MAX.accolades}>
            <p>
              Pushcart standing earns {PILLAR_MAX.accolades} × √(the magazine’s
              Garstang score ÷ the highest score in that index that year). The
              top magazine earns {PILLAR_MAX.accolades}; the square root keeps a
              single special mention visible. The overall index adds a
              magazine’s fiction, poetry and nonfiction scores.
            </p>
            <p>
              Each cited selection from the last ten editions adds{" "}
              {ANTHOLOGY_CITATION_POINTS["Best Small Fictions"]} points (Best
              Small Fictions) or{" "}
              {ANTHOLOGY_CITATION_POINTS["Best Microfiction"]} points (Best
              Microfiction), full weight for five years and half before that, up
              to {ANTHOLOGY_POINTS_CAP} points. These count toward fiction and
              overall.
            </p>
          </Pillar>

          <Pillar
            icon={DollarSign}
            title="Contributor pay"
            max={PILLAR_MAX.pay}
          >
            <p>
              Pro pay (at least {PRO_PAY_THRESHOLDS.perWordCents}¢ a word, $
              {PRO_PAY_THRESHOLDS.perPoemCents / 100} a poem or $
              {PRO_PAY_THRESHOLDS.perPieceCents / 100} a piece) earns 15.
              Semi-pro ($25 a poem or $40 a piece) earns 10, $10 or more earns
              5, contributor copies earn 2 and unpaid earns 0. A listing that
              says the magazine pays in cash without an amount earns{" "}
              {cashUnknownAmount}.
            </p>
          </Pillar>

          <Pillar icon={Clock} title="Turnaround" max={PILLAR_MAX.turnaround}>
            <p>
              A recorded median of 30 days or less earns 15; 60 days, 12; 120
              days, 8; 180 days, 4; a year, 1; longer, 0. A listed response band
              earns the midpoint of its range: under 3 months{" "}
              {bandScore("under_3_months")}, 3 to 6 months{" "}
              {bandScore("3_to_6_months")}, over 6 months{" "}
              {bandScore("over_6_months")}.
            </p>
          </Pillar>

          <Pillar
            icon={CheckCircle2}
            title="Submission fees"
            max={PILLAR_MAX.fees}
          >
            <p>
              No fee earns 15. A recorded free tier or fee waiver earns 11; a
              fee up to $3.50 earns 7; up to $5, 4; above $5, 0. A listing that
              records a fee without the amount earns {feeUnknownAmount}.
            </p>
          </Pillar>

          <Pillar
            icon={ShieldCheck}
            title="Editorial respect"
            max={PILLAR_MAX.respect}
          >
            <p>
              Allowing simultaneous submissions earns 6, with conditions 3,
              forbidding them 0. A query window of 180 days or less earns 4, a
              longer one 2. With neither recorded the pillar earns{" "}
              {respectUnknown}.
            </p>
          </Pillar>

          <Pillar
            icon={Sparkles}
            title="Format and ethics"
            max={PILLAR_MAX.formatEthics}
          >
            <p>
              A recorded archive earns 2, blind reading 1.5 and a roster that
              reserves space for debut writers 1.5. No current source records
              these, so every magazine earns the midpoint,{" "}
              {PILLAR_MAX.formatEthics / 2}.
            </p>
          </Pillar>
        </div>
      </div>

      <div className="pt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Data coverage
        </h2>
        {coverage ? (
          <>
            <p className="mt-2 text-muted-foreground">
              How many of the {total.toLocaleString()} magazines in the{" "}
              {coverage.year} overall index have each pillar backed by a source.
              On average{" "}
              {coverage.averageCoverage != null
                ? `${Math.round(coverage.averageCoverage * 100)}%`
                : "none"}{" "}
              of a magazine’s 100 points rest on recorded facts (a recorded
              range counts half). The index holds{" "}
              {coverage.pushcartRows.toLocaleString()} Pushcart ranking rows and{" "}
              {coverage.anthologyCitations.toLocaleString()} anthology
              selections for this window, and{" "}
              {coverage.writerReports.toLocaleString()} writer reports.
            </p>
            <Table className="mt-4">
              <caption className="sr-only">
                Data coverage per pillar for the {coverage.year} overall index
              </caption>
              <TableHeader>
                <TableRow variant="static">
                  <TableHead scope="col">Pillar</TableHead>
                  <TableHead scope="col" className="text-end">
                    Recorded
                  </TableHead>
                  <TableHead scope="col" className="text-end">
                    Range recorded
                  </TableHead>
                  <TableHead scope="col" className="text-end">
                    Not recorded
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PILLAR_KEYS.map((key) => {
                  const row = coverage.pillars[key];
                  return (
                    <TableRow key={key} variant="static">
                      <TableCell>
                        {PILLAR_NAMES[key]}{" "}
                        <span className="text-xs text-muted-foreground">
                          / {PILLAR_MAX[key]}
                        </span>
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        {row.recorded.toLocaleString()} (
                        {percent(row.recorded, total)})
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        {row.partial.toLocaleString()} (
                        {percent(row.partial, total)})
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        {row.unknown.toLocaleString()} (
                        {percent(row.unknown, total)})
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Coverage appears here once the index is published.
          </p>
        )}
      </div>

      <div className="pt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Tiers
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tiers come from the total score alone. Because unknown facts score the
          midpoint, a magazine with few recorded facts can sit lower than one
          whose strong policies are on record.
        </p>
        <div className="mt-6 space-y-3">
          {[
            {
              tier: "Tier 1",
              range: `Score ${TIER_THRESHOLDS.tier1}+`,
              name: "Flagship Luminary",
            },
            {
              tier: "Tier 2",
              range: `Score ${TIER_THRESHOLDS.tier2}–${TIER_THRESHOLDS.tier1 - 0.1}`,
              name: "High Distinction",
            },
            {
              tier: "Tier 3",
              range: `Score ${TIER_THRESHOLDS.tier3}–${TIER_THRESHOLDS.tier2 - 0.1}`,
              name: "Distinguished Contemporary",
            },
            {
              tier: "Tier 4",
              range: `Score below ${TIER_THRESHOLDS.tier3}`,
              name: "Emerging & Community",
            },
          ].map((item) => (
            <div
              key={item.tier}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/40 p-4"
            >
              <RankingTierBadge tier={item.tier}>
                {item.tier} · {item.range}
              </RankingTierBadge>
              <h3 className="text-base font-semibold text-foreground">
                {item.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
