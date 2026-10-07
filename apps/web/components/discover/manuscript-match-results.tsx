"use client";

import Link from "next/link";
import {
  Award,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  Info,
} from "lucide-react";
import type {
  DecisionDimension,
  ManuscriptMatchCard,
  ManuscriptMatchResponse,
} from "@missa/radar-adapters";
import { MatchExplanationTrigger } from "@/components/missa/match-explanation-trigger";
import { PlanTierBadge } from "@/components/missa/plan-tier-badge";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { EditorialIntelligenceDrawer } from "@/components/rankings/editorial-intelligence-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManuscriptBrief } from "./manuscript-match-brief";
import styles from "./manuscript-match-wizard.module.css";

export type ResultSort = "fit" | "prize" | "reply" | "pay" | "rank";

export const SORT_LABELS: Record<ResultSort, string> = {
  fit: "Best fit",
  prize: "Prize record",
  reply: "Fastest reply",
  pay: "Best pay",
  rank: "Missa ranking",
};

const SCORED_NOTE =
  "Fit compares your brief with what Missa has recorded for this magazine. Openness, payoff and cost are scored the same way, and magazines are ranked by all four. None of it tells you whether you’re eligible or whether they’ll say yes.";

export const DIMENSION_LABELS: Record<DecisionDimension, string> = {
  fit: "Fit",
  odds: "Openness",
  payoff: "Payoff",
  cost: "Low cost",
};

const DIMENSION_ORDER: DecisionDimension[] = ["fit", "odds", "payoff", "cost"];

function codepointCompare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The decision model's fixed order: ranking score, fit, odds, then name and
 * id, so equal scores never swap places between runs.
 */
export function compareCards(a: ManuscriptMatchCard, b: ManuscriptMatchCard) {
  const fit = (card: ManuscriptMatchCard) =>
    card.decision?.scores.fit.score ?? 0;
  const odds = (card: ManuscriptMatchCard) =>
    card.decision?.scores.odds.score ?? 0;
  return (
    b.matchScore - a.matchScore ||
    fit(b) - fit(a) ||
    odds(b) - odds(a) ||
    codepointCompare(a.name.toLowerCase(), b.name.toLowerCase()) ||
    codepointCompare(a.profileId, b.profileId)
  );
}

/** "2026-10-31" as "31 October". */
function dayMonth(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "The O. Henry Prize Stories (from 2021: …)" reads as "The O. Henry Prize Stories". */
function shortSource(name: string) {
  return name.replace(/\s*\([^)]*\)/g, "");
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

/** Every magazine across the engine's groups, best fit first, once each. */
export function mergedResults(
  results: ManuscriptMatchResponse,
): ManuscriptMatchCard[] {
  const seen = new Set<string>();
  const cards: ManuscriptMatchCard[] = [];
  for (const card of [
    ...results.simultaneousPackets,
    ...results.dreamReach,
    ...results.debutChampions,
    ...results.rapidPro,
    ...(results.prizeTrack ?? []),
    ...(results.planCards ?? []).filter(
      (card) => (card.decision?.exclusions.length ?? 0) === 0,
    ),
  ]) {
    if (seen.has(card.profileId)) continue;
    seen.add(card.profileId);
    cards.push(card);
  }
  return cards.sort(compareCards);
}

const TIER_ORDER: Record<ManuscriptMatchCard["prestigeTier"], number> = {
  tier_1: 0,
  tier_2: 1,
  tier_3: 2,
  unranked: 3,
};

/** Higher means better pay; unknown pay sorts last. */
function payValue(card: ManuscriptMatchCard): number {
  const pay = card.compensation;
  if (pay.isProRate) return 3000 + (pay.rateCentsPerWord ?? 0);
  if (pay.paysContributors && pay.flatRateCents)
    return 1000 + pay.flatRateCents / 100;
  if (pay.paysContributors === true) return 500;
  if (pay.paysContributors === false) return 0;
  return -1;
}

const BAND_DAYS: Record<string, number> = {
  under_3_months: 60,
  "3_to_6_months": 135,
  over_6_months: 240,
};

const BAND_LABELS: Record<string, string> = {
  under_3_months: "Replies in under 3 months",
  "3_to_6_months": "Replies in 3 to 6 months",
  over_6_months: "Replies in over 6 months",
};

/** Higher means a stronger recorded prize record. */
export function prizeValue(card: ManuscriptMatchCard): number {
  const record = card.recognition;
  if (!record) return 0;
  const pushcart = record.pushcart
    ? Math.max(0, 120 - record.pushcart.rank)
    : 0;
  return (
    record.publishedComps.length * 1000 +
    (card.decision?.kinWriters.length ?? 0) * 100 +
    (card.decision?.prizeRoutes.length ?? 0) * 50 +
    pushcart +
    record.prizeSelections * 6 +
    record.anthologySelections * 3
  );
}

/** A stable sort: ties keep the engine's best-fit order. */
export function sortResults(
  cards: ManuscriptMatchCard[],
  sort: ResultSort,
): ManuscriptMatchCard[] {
  if (sort === "fit") return cards;
  const indexed = cards.map((card, index) => ({ card, index }));
  const key = (card: ManuscriptMatchCard): number => {
    if (sort === "reply")
      return (
        card.telemetry.medianResponseDays ??
        BAND_DAYS[card.telemetry.responseBand ?? ""] ??
        Number.POSITIVE_INFINITY
      );
    if (sort === "prize") return -prizeValue(card);
    if (sort === "pay") return -payValue(card);
    return TIER_ORDER[card.prestigeTier];
  };
  return indexed
    .sort((a, b) => key(a.card) - key(b.card) || a.index - b.index)
    .map((entry) => entry.card);
}

type Fact = { key: string; label: React.ReactNode };

/** Recorded facts only. Unknown values are omitted, not labelled unknown. */
function recordedFacts(
  card: ManuscriptMatchCard,
  brief: ManuscriptBrief,
): Fact[] {
  const facts: Fact[] = [];
  const { specs, compensation: pay, telemetry, aesthetic } = card;
  if (brief.genre !== "poetry" && specs.maxWordCount) {
    facts.push({
      key: "words",
      label: (
        <>
          Up to{" "}
          <data value={specs.maxWordCount}>
            {specs.maxWordCount.toLocaleString()}
          </data>{" "}
          words
        </>
      ),
    });
  }
  if (pay.isProRate && pay.rateCentsPerWord) {
    facts.push({
      key: "pay",
      label: (
        <>
          Pays <data value={pay.rateCentsPerWord}>{pay.rateCentsPerWord}¢</data>{" "}
          a word
        </>
      ),
    });
  } else if (pay.isProRate) {
    facts.push({ key: "pay", label: "Pays professional rates" });
  } else if (pay.paysContributors && pay.flatRateCents) {
    facts.push({
      key: "pay",
      label: (
        <>
          Pays <data value={pay.flatRateCents}>{money(pay.flatRateCents)}</data>
        </>
      ),
    });
  } else if (pay.paysContributors === true) {
    facts.push({ key: "pay", label: "Pays contributors" });
  } else if (pay.paysContributors === false) {
    facts.push({
      key: "pay",
      label: pay.payRateKind === "copies_only" ? "Pays in copies" : "Unpaid",
    });
  }
  if (pay.submissionFeeCents === 0) {
    facts.push({ key: "fee", label: "Free to submit" });
  } else if (pay.submissionFeeCents !== null) {
    facts.push({
      key: "fee",
      label: (
        <>
          <data value={pay.submissionFeeCents}>
            {money(pay.submissionFeeCents)}
          </data>{" "}
          fee
          {pay.hasFeeWaivers ? ", waivers available" : ""}
        </>
      ),
    });
  }
  if (telemetry.medianResponseDays !== null) {
    facts.push({
      key: "reply",
      label: (
        <>
          Replies in about{" "}
          <data value={telemetry.medianResponseDays}>
            {telemetry.medianResponseDays}
          </data>{" "}
          days
        </>
      ),
    });
  }
  if (telemetry.medianResponseDays === null && telemetry.responseBand) {
    const label = BAND_LABELS[telemetry.responseBand];
    if (label) facts.push({ key: "reply", label });
  }
  if (aesthetic.unsolicitedSlushRatioPercent !== null) {
    facts.push({
      key: "open",
      label: (
        <>
          <data value={aesthetic.unsolicitedSlushRatioPercent}>
            {aesthetic.unsolicitedSlushRatioPercent}%
          </data>{" "}
          of published work from open submissions
        </>
      ),
    });
  }
  if (specs.allowsSimultaneous === false) {
    facts.push({ key: "simultaneous", label: "No simultaneous submissions" });
  }
  const window = card.decision?.readingWindow;
  if (window?.allYear) {
    facts.push({ key: "window", label: "Reads all year" });
  } else if (window?.openNow && window.closesOn) {
    facts.push({
      key: "window",
      label: (
        <>
          Reads until{" "}
          <time dateTime={window.closesOn}>{dayMonth(window.closesOn)}</time>
        </>
      ),
    });
  }
  return facts;
}

/** Reasons that raised a score, labelled by score. */
function decisionReasons(card: ManuscriptMatchCard): string[] {
  if (!card.decision) return card.reasons;
  return DIMENSION_ORDER.flatMap((dimension) =>
    card
      .decision!.scores[dimension].reasons.filter((reason) => reason.points > 0)
      .map((reason) => `${DIMENSION_LABELS[dimension]}: ${reason.text}`),
  );
}

/** Rules the brief breaks, then recorded facts that lowered a score. */
function decisionWatchouts(card: ManuscriptMatchCard): string[] {
  if (!card.decision) return [];
  return [
    ...card.decision.exclusions.map((exclusion) => exclusion.reason),
    ...DIMENSION_ORDER.flatMap((dimension) =>
      card
        .decision!.scores[dimension].reasons.filter(
          (reason) => reason.points < 0,
        )
        .map((reason) => `${DIMENSION_LABELS[dimension]}: ${reason.text}`),
    ),
  ];
}

function hasRecordedScores(card: ManuscriptMatchCard): boolean {
  return DIMENSION_ORDER.some(
    (dimension) => card.decision?.scores[dimension].known,
  );
}

/** Openness, payoff and cost beside the fit score; unrecorded scores show a dash. */
export function DecisionScores({ card }: { card: ManuscriptMatchCard }) {
  const decision = card.decision;
  if (!decision || !hasRecordedScores(card)) return null;
  return (
    <div className={styles.decision}>
      <PlanTierBadge tier={decision.tier} />
      <dl className={styles.scores}>
        {(["odds", "payoff", "cost"] as const).map((dimension) => {
          const score = decision.scores[dimension];
          return (
            <div key={dimension}>
              <dt>{DIMENSION_LABELS[dimension]}</dt>
              <dd className="font-mono">
                {score.known ? (
                  score.score
                ) : (
                  <>
                    <span aria-hidden="true">–</span>
                    <span className="sr-only">not recorded</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export interface ShortlistControls {
  isSaved: (profileId: string) => boolean;
  toggle: (card: ManuscriptMatchCard) => void;
}

type ResultRow = {
  card: ManuscriptMatchCard;
  facts: Fact[];
  warnings: string[];
};

/**
 * Scored magazines get full rows. Magazines with nothing recorded beyond
 * their ranking go into one compact group with a single explanation, so a
 * sparse index doesn't read as a page of empty cards.
 */
export function ResultList({
  cards,
  brief,
  shortlist,
}: {
  cards: ManuscriptMatchCard[];
  brief: ManuscriptBrief;
  shortlist: ShortlistControls;
}) {
  const scored: ResultRow[] = [];
  const limited: ManuscriptMatchCard[] = [];
  for (const card of cards) {
    const facts = recordedFacts(card, brief);
    const warnings = decisionWatchouts(card);
    if (
      hasRecordedScores(card) ||
      warnings.length ||
      facts.length ||
      prizeValue(card) > 0
    ) {
      scored.push({ card, facts, warnings });
    } else {
      limited.push(card);
    }
  }

  return (
    <div className={styles.groups}>
      {scored.length ? (
        <ol className={styles.list}>
          {scored.map((row, index) => (
            <ScoredResult
              key={row.card.profileId}
              row={row}
              rank={index + 1}
              shortlist={shortlist}
            />
          ))}
        </ol>
      ) : null}

      {limited.length ? (
        <section className={styles.limitedGroup} aria-label="Limited data">
          <div className={styles.limitedIntro}>
            {scored.length ? (
              <h3 className={styles.groupTitle}>More magazines to check</h3>
            ) : null}
            <p className={styles.groupNote}>
              <Info aria-hidden="true" />
              <span>
                Missa hasn&apos;t recorded guidelines, pay, reply times or a
                prize record for these magazines yet, so there&apos;s no fit
                score. They&apos;re listed in Missa ranking order.
              </span>
            </p>
          </div>
          <ul className={styles.compactList}>
            {limited.map((card) => (
              <li key={card.profileId} className={styles.compactResult}>
                <div className={styles.compactIdentity}>
                  <h3 className={`${styles.compactTitle} font-heading`}>
                    <Link href={`/journal/${card.slug}`}>{card.name}</Link>
                  </h3>
                  {card.prestigeTier !== "unranked" ? (
                    <RankingTierBadge tier={card.prestigeTier} />
                  ) : null}
                </div>
                <ResultActions card={card} shortlist={shortlist} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ScoredResult({
  row,
  rank,
  shortlist,
}: {
  row: ResultRow;
  rank: number;
  shortlist: ShortlistControls;
}) {
  const { card, facts, warnings } = row;
  return (
    <li className={styles.result}>
      <span className={`${styles.rank} font-mono`} aria-hidden="true">
        {rank}
      </span>
      <div className={styles.resultBody}>
        <div className={styles.resultHead}>
          <div className={styles.identity}>
            <h3 className={`${styles.resultTitle} font-heading`}>
              <Link href={`/journal/${card.slug}`}>{card.name}</Link>
            </h3>
            {card.aesthetic.editorialMotto ? (
              <p className={`${styles.motto} font-heading`}>
                &ldquo;{card.aesthetic.editorialMotto}&rdquo;
              </p>
            ) : null}
          </div>
          <MatchExplanationTrigger
            score={
              card.decision
                ? card.decision.scores.fit.known
                  ? card.decision.scores.fit.score
                  : null
                : card.matchScore
            }
            subject={card.name}
            reasons={decisionReasons(card)}
            watchouts={warnings}
            note={SCORED_NOTE}
            emptyLabel={card.decision ? "Fit not recorded" : undefined}
          />
        </div>

        {card.decision?.exclusions.length ? (
          <p className={styles.ruledOut}>
            Ruled out for this brief:{" "}
            {card.decision.exclusions
              .map((exclusion) => exclusion.reason)
              .join("; ")}
          </p>
        ) : null}
        <DecisionScores card={card} />

        {card.prestigeTier !== "unranked" || facts.length ? (
          <ul className={styles.facts} aria-label="Recorded details">
            {card.prestigeTier !== "unranked" ? (
              <li>
                <RankingTierBadge tier={card.prestigeTier} />
              </li>
            ) : null}
            {facts.map((fact) => (
              <li key={fact.key}>{fact.label}</li>
            ))}
          </ul>
        ) : null}

        <PrizeRecord card={card} />
        <ResultActions card={card} shortlist={shortlist} />
      </div>
    </li>
  );
}

/** What prizes and anthologies have recorded about this magazine. */
function PrizeRecord({ card }: { card: ManuscriptMatchCard }) {
  const record = card.recognition;
  if (!record || prizeValue(card) === 0) return null;
  const summary: string[] = [];
  if (record.pushcart) {
    summary.push(
      `Pushcart Prize rank #${record.pushcart.rank} in ${record.pushcart.genre} (${record.pushcart.edition})`,
    );
  }
  if (record.prizeSelections) {
    summary.push(
      `${record.prizeSelections} ${record.prizeSelections === 1 ? "story" : "stories"} picked by the O. Henry Prize, Best American Short Stories or a major prize`,
    );
  }
  if (record.anthologySelections) {
    summary.push(
      `${record.anthologySelections} ${record.anthologySelections === 1 ? "piece" : "pieces"} in Best Microfiction or Best Small Fictions`,
    );
  }
  return (
    <div className={styles.prizeRecord}>
      {record.publishedComps.length ? (
        <p className={styles.publishedComps}>
          <Award aria-hidden="true" />
          Published {record.publishedComps.join(", ")}, a writer you named
        </p>
      ) : null}
      {card.decision?.kinWriters.length ? (
        <p className={styles.prizeSummary}>
          Published writers like{" "}
          {[
            ...new Set(card.decision.kinWriters.map((kin) => kin.likeComp)),
          ].join(" and ")}
          :{" "}
          {card.decision.kinWriters
            .slice(0, 3)
            .map((kin) => `${kin.writer} (${kin.link})`)
            .join(", ")}
        </p>
      ) : null}
      {card.decision?.prizeRoutes.length ? (
        <ul className={styles.prizePieces} aria-label="Prize routes">
          {card.decision.prizeRoutes.map((route) => (
            <li key={route.id}>
              Route to {route.name}: first published {route.examples[0].writer}
              &rsquo;s {route.examples[0].year} pick
              <span className={styles.prizeSource}>
                {" "}
                · {route.eligible ? "Open to you: " : "Entry rules: "}
                {route.rule}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {summary.length ? (
        <p className={styles.prizeSummary}>{summary.join(" · ")}</p>
      ) : null}
      {record.recent.length ? (
        <ul
          className={styles.prizePieces}
          aria-label="Recently recognized pieces"
        >
          {record.recent.slice(0, 3).map((piece) => (
            <li key={`${piece.source}-${piece.writer}-${piece.work}`}>
              {piece.work ? <>&ldquo;{piece.work}&rdquo; by </> : null}
              {piece.writer}
              <span className={styles.prizeSource}>
                {" "}
                · {shortSource(piece.source)}, {piece.year}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ResultActions({
  card,
  shortlist,
}: {
  card: ManuscriptMatchCard;
  shortlist: ShortlistControls;
}) {
  const saved = shortlist.isSaved(card.profileId);
  return (
    <div className={styles.actions}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={saved}
        data-saved={saved || undefined}
        className={styles.saveButton}
        onClick={() => shortlist.toggle(card)}
      >
        {saved ? (
          <BookmarkCheck aria-hidden="true" />
        ) : (
          <BookmarkPlus aria-hidden="true" />
        )}
        {saved ? "On shortlist" : "Shortlist"}
        <span className="sr-only"> {card.name}</span>
      </Button>
      <EditorialIntelligenceDrawer
        profileId={card.profileId}
        magazineName={card.name}
        magazineSlug={card.slug}
        trigger={
          <Button type="button" variant="ghost" size="sm">
            Editorial profile
          </Button>
        }
      />
      {card.websiteUrl ? (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href={card.websiteUrl} target="_blank" rel="noreferrer" />}
        >
          Website
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </Button>
      ) : null}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className={styles.result}>
          <Skeleton className={styles.skeletonRank} />
          <div className={styles.resultBody}>
            <Skeleton className={styles.skeletonTitle} />
            <Skeleton className={styles.skeletonLine} />
            <Skeleton className={styles.skeletonActions} />
          </div>
        </div>
      ))}
    </div>
  );
}
