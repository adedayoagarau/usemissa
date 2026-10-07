import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import type {
  CategoryCounts,
  MagazineIndexAnalytics,
  MagazineIndexCoverage,
} from "@missa/radar-adapters";
import {
  ANTHOLOGY_CITATION_POINTS,
  ANTHOLOGY_POINTS_CAP,
  MIN_REPORTS_FOR_MEDIAN,
  PILLAR_MAX,
  PRO_PAY_THRESHOLDS,
  TIER_THRESHOLDS,
} from "@missa/radar-engine";
import {
  ComparisonChart,
  CoverageChart,
  FlashLeadersChart,
  TierChart,
} from "./magazine-index-charts";
import { Sp } from "@/components/missa/spelling";

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Share of the recorded magazines in a group that fall in `key`. */
function shareOf(counts: CategoryCounts, key: string, keys: string[]): number {
  const recorded = keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  return percent(counts[key] ?? 0, recorded);
}

function yearSpan(years: number[] | undefined): string | null {
  if (!years?.length) return null;
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first} to ${last}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground marker:text-primary">
      {children}
    </ul>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">
      {children}
    </p>
  );
}

function Observations({ analytics }: { analytics: MagazineIndexAnalytics }) {
  const { honours, comparison, flash } = analytics;
  const feeKeys = ["free", "charges"];
  const payKeys = ["cash", "copies", "unpaid"];
  const replyKeys = ["under3", "between3and6", "over6"];
  const topFee = shareOf(comparison.fees.top, "charges", feeKeys);
  const restFee = shareOf(comparison.fees.rest, "charges", feeKeys);
  const topPay = shareOf(comparison.pay.top, "cash", payKeys);
  const restPay = shareOf(comparison.pay.rest, "cash", payKeys);
  const topSlow = shareOf(comparison.response.top, "over6", replyKeys);
  const restSlow = shareOf(comparison.response.rest, "over6", replyKeys);

  return (
    <Bullets>
      <li>
        <Sp>Recognition gathers at the top. The ten most honored magazines hold</Sp>{" "}
        {percent(honours.top10Share, 1)}% of all Pushcart recognition in the
        index, and <Sp>the fifty most honored hold</Sp>{" "}
        {percent(honours.top50Share, 1)}%.
      </li>
      <li>
        The long tail is real. {honours.singleRecognition.toLocaleString()} of
        the {honours.magazines.toLocaleString()} magazines with any Pushcart
        recognition have a single one to their name.
      </li>
      <li>
        <Sp>
          Honor and access pull in different directions. Among the fifty most
          honored magazines,
        </Sp>{" "}
        {topFee}% charge a reading fee; among the rest,{" "}
        {restFee}%.
        {analytics.typicalFeeCents != null
          ? ` Where we know the amount, it is usually $${(analytics.typicalFeeCents / 100).toFixed(0)}.`
          : ""}
      </li>
      <li>
        <Sp>The most honored magazines are also more likely to pay:</Sp>{" "}
        {topPay}% of
        them pay contributors in cash, against {restPay}% of everyone else.
      </li>
      <li>
        They can be slower to answer. {topSlow}%{" "}
        <Sp>of the most honored take more than six months to reply, against</Sp>{" "}
        {restSlow}% of the rest.
      </li>
      <li>
        Flash fiction keeps its own company. {flash.magazines.toLocaleString()}{" "}
        magazines have had work chosen for the flash anthologies since{" "}
        {flash.firstEdition}; only {flash.alsoPushcart.toLocaleString()} of them
        also appear in the Pushcart record.
      </li>
      <li>
        <Sp>Honors outlast magazines.</Sp> {honours.closed.toLocaleString()}{" "}
        magazines
        in the Pushcart record have closed and {honours.paused.toLocaleString()}{" "}
        are paused or quiet. They stay in the index, marked, so their record is
        not lost.
      </li>
    </Bullets>
  );
}

export function MagazineMethodology({
  coverage,
  analytics,
}: {
  coverage: MagazineIndexCoverage | null;
  analytics: MagazineIndexAnalytics | null;
}) {
  const editions = (source: string) =>
    yearSpan(coverage?.sourceEditions[source]);

  return (
    <div className="space-y-12">
      <Section title="What the index is for">
        <Prose>
          A writer choosing where to send a story or a set of poems wants to
          know two things: whether a magazine’s work is noticed, and how it
          treats the people who send it work. The Missa Literary Magazine Index
          puts both in one place. It weighs a magazine’s recognition alongside
          what it pays, what it charges, how long it takes to reply and how it
          handles submissions.
        </Prose>
        <Prose>
          Every number comes from a source you could check yourself. When no
          source records a fact, the index says so.
        </Prose>
      </Section>

      <Section title="What we count">
        <Prose>Each magazine is scored out of 100, across six measures.</Prose>
        <Bullets>
          <li>
            <strong className="text-foreground">
              <Sp>Honors, up to</Sp> {PILLAR_MAX.accolades} points.
            </strong>{" "}
            A magazine’s Pushcart Prize recognition over the past ten years,{" "}
            <Sp>
              with recent years counting more. The most recognized magazine in
              each index earns the full
            </Sp>{" "}
            {PILLAR_MAX.accolades};{" "}
            <Sp>
              others earn points in proportion, on a curve that keeps a single
              honor visible. Pieces
            </Sp>{" "}
            chosen for Best Small Fictions (
            {ANTHOLOGY_CITATION_POINTS["Best Small Fictions"]} points) and Best
            Microfiction ({ANTHOLOGY_CITATION_POINTS["Best Microfiction"]}{" "}
            points) add up to {ANTHOLOGY_POINTS_CAP} more in fiction.
          </li>
          <li>
            <strong className="text-foreground">
              Pay, up to {PILLAR_MAX.pay} points.
            </strong>{" "}
            Full points for professional rates:{" "}
            {PRO_PAY_THRESHOLDS.perWordCents}¢ a word, $
            {PRO_PAY_THRESHOLDS.perPoemCents / 100} a poem or $
            {PRO_PAY_THRESHOLDS.perPieceCents / 100} a piece. Less for smaller
            payments, two points for contributor copies, none for unpaid work.
          </li>
          <li>
            <strong className="text-foreground">
              Reply time, up to {PILLAR_MAX.turnaround} points.
            </strong>{" "}
            Full points for a reply within a month, falling as the wait
            lengthens, to none for more than a year.
          </li>
          <li>
            <strong className="text-foreground">
              Fees, up to {PILLAR_MAX.fees} points.
            </strong>{" "}
            Full points when submitting is free. Fewer as a reading fee rises,
            with credit kept for magazines that waive the fee for some writers.
          </li>
          <li>
            <strong className="text-foreground">
              Submission policy, up to {PILLAR_MAX.respect} points.
            </strong>{" "}
            Points for welcoming simultaneous submissions and for telling
            writers when they may ask after their work.
          </li>
          <li>
            <strong className="text-foreground">
              Archive and ethics, up to {PILLAR_MAX.formatEthics} points.
            </strong>{" "}
            Points for keeping published work available, for reading blind and
            for making room for writers who have not yet published.
          </li>
        </Bullets>
      </Section>

      <Section title="When something is not on record">
        <Bullets>
          <li>
            We never guess. A fact no source records is shown as “Not recorded”.
          </li>
          <li>
            A missing fact earns half the points it could have earned, so it
            neither lifts a magazine nor holds it back.
          </li>
          <li>
            When a source gives only part of the answer, such as “pays in cash”
            without an amount, the magazine earns the middle of what that answer
            allows.
          </li>
          <li>
            Each magazine’s page shows which of its facts are recorded, so you
            can see how much of its score rests on the record.
          </li>
        </Bullets>
      </Section>

      <Section title="Where the facts come from">
        <Bullets>
          <li>
            <strong className="text-foreground">
              Pushcart Prize recognition
            </strong>
            {editions("garstang") ? `, ${editions("garstang")},` : ""} as
            tallied each year at cliffordgarstang.com.
          </li>
          <li>
            <strong className="text-foreground">The flash anthologies</strong>:
            the published contents of Best Microfiction
            {editions("best_microfiction")
              ? ` (${editions("best_microfiction")})`
              : ""}{" "}
            and Best Small Fictions
            {editions("best_small_fictions")
              ? ` (${editions("best_small_fictions")})`
              : ""}
            .
          </li>
          <li>
            <strong className="text-foreground">
              The magazines’ own submission pages
            </strong>{" "}
            for what they charge, and for pay and reply time when no listing
            records them. Each fact taken from a magazine’s guidelines was
            checked word for word against its page. Prizes, paid fast-track
            reading and art calls are set aside; the fee we use is the cheapest
            way any writer can send work.
          </li>
          <li>
            <strong className="text-foreground">
              Poets &amp; Writers listings
            </strong>{" "}
            for pay, reply time and submission policy, used from the year each
            listing was last updated.
          </li>
          <li>
            <strong className="text-foreground">Writers’ own reports.</strong>{" "}
            Once a magazine has {MIN_REPORTS_FOR_MEDIAN} reports, their typical
            reply time becomes its recorded one. Reports are kept without names
            or accounts.
          </li>
        </Bullets>
        <Prose>
          The index checks its sources every month and begins a new year each
          January.
          {coverage?.lastRun
            ? ` It last checked them on ${new Date(coverage.lastRun.finishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
            : ""}
        </Prose>
      </Section>

      <Section title="Tiers">
        <Prose>
          The total score places each magazine in one of four tiers.
        </Prose>
        <ul className="space-y-3">
          {[
            [
              "Tier 1",
              `${TIER_THRESHOLDS.tier1} and above`,
              "Flagship Luminary",
            ],
            [
              "Tier 2",
              `${TIER_THRESHOLDS.tier2} to ${TIER_THRESHOLDS.tier1 - 0.1}`,
              "High Distinction",
            ],
            [
              "Tier 3",
              `${TIER_THRESHOLDS.tier3} to ${TIER_THRESHOLDS.tier2 - 0.1}`,
              "Distinguished Contemporary",
            ],
            [
              "Tier 4",
              `below ${TIER_THRESHOLDS.tier3}`,
              "Emerging & Community",
            ],
          ].map(([tier, range, name]) => (
            <li key={tier} className="flex flex-wrap items-center gap-3">
              <RankingTierBadge tier={tier!}>{tier}</RankingTierBadge>
              <span className="text-base text-foreground">{name}</span>
              <span className="text-sm text-muted-foreground">
                Score {range}
              </span>
            </li>
          ))}
        </ul>
        <Prose>
          A tier is a summary, not a verdict. A magazine with few facts on
          record can sit lower than its reputation, because the index will not
          assume what it cannot confirm.
        </Prose>
      </Section>

      <Section title="Four indexes">
        {coverage ? (
          <Prose>
            The {coverage.year} index ranks{" "}
            {coverage.magazineCounts.overall.toLocaleString()} magazines
            overall, {coverage.magazineCounts.fiction.toLocaleString()} in
            fiction, {coverage.magazineCounts.poetry.toLocaleString()} in poetry
            and {coverage.magazineCounts.nonfiction.toLocaleString()} in{" "}
            <Sp>
              nonfiction. A magazine joins a genre’s index when it has been
              recognized in that genre.
            </Sp>
          </Prose>
        ) : (
          <Prose>The index has not been published yet.</Prose>
        )}
      </Section>

      {analytics && coverage ? (
        <Section title="What the numbers show">
          <Observations analytics={analytics} />
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              [
                `${percent(analytics.honours.top10Share, 1)}%`,
                "of Pushcart recognition held by the ten most honored magazines",
              ],
              [
                `${percent(analytics.honours.top50Share, 1)}%`,
                "held by the fifty most honored",
              ],
              [
                `${analytics.honours.singleRecognition.toLocaleString()}`,
                `of ${analytics.honours.magazines.toLocaleString()} recognized magazines have a single honor`,
              ],
            ].map(([figure, label]) => (
              <div
                key={label}
                className="space-y-1 border-t border-border pt-3"
              >
                <dt className="sr-only">{label}</dt>
                <dd className="font-mono text-3xl text-foreground tabular-nums">
                  {figure}
                </dd>
                <dd className="text-sm leading-6 text-muted-foreground">
                  <Sp>{label}</Sp>
                </dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 lg:grid-cols-2">
            <TierChart tiers={analytics.tiers} />
            <CoverageChart coverage={coverage} />
            <ComparisonChart kind="fees" counts={analytics.comparison.fees} />
            <ComparisonChart kind="pay" counts={analytics.comparison.pay} />
            <ComparisonChart
              kind="response"
              counts={analytics.comparison.response}
            />
            <FlashLeadersChart flash={analytics.flash} />
          </div>
        </Section>
      ) : null}
    </div>
  );
}
