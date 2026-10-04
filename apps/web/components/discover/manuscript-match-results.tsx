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
  ManuscriptMatchCard,
  ManuscriptMatchResponse,
} from "@missa/radar-adapters";
import { MatchExplanationTrigger } from "@/components/missa/match-explanation-trigger";
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
  "Fit compares your brief with what Missa has recorded for this magazine. It isn't an eligibility check.";

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
  ]) {
    if (seen.has(card.profileId)) continue;
    seen.add(card.profileId);
    cards.push(card);
  }
  return cards.sort((a, b) => b.matchScore - a.matchScore);
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
  return facts;
}

/** Conflicts between the brief and the magazine's recorded guidelines. */
function watchouts(
  card: ManuscriptMatchCard,
  brief: ManuscriptBrief,
): string[] {
  const list: string[] = [];
  const { specs, compensation: pay } = card;
  if (brief.genre !== "poetry") {
    if (specs.maxWordCount && brief.wordCount > specs.maxWordCount) {
      list.push(`Over the ${specs.maxWordCount.toLocaleString()}-word limit`);
    }
    if (specs.minWordCount && brief.wordCount < specs.minWordCount) {
      list.push(
        `Under the ${specs.minWordCount.toLocaleString()}-word minimum`,
      );
    }
  }
  if (brief.allowSimultaneous && specs.allowsSimultaneous === false) {
    list.push("Doesn't accept simultaneous submissions");
  }
  if (
    brief.feeTolerance === "free_only" &&
    pay.submissionFeeCents &&
    !pay.hasFeeWaivers
  ) {
    list.push(`Charges a ${money(pay.submissionFeeCents)} fee with no waiver`);
  }
  if (brief.minPayRate === "pro_rates_only" && !pay.isProRate) {
    list.push("Doesn't pay professional rates");
  } else if (
    brief.minPayRate === "any_paying" &&
    pay.paysContributors === false
  ) {
    list.push("Doesn't pay contributors");
  }
  return list;
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
    const warnings = watchouts(card, brief);
    if (
      card.reasons.length ||
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
            score={card.matchScore}
            subject={card.name}
            reasons={card.reasons}
            watchouts={warnings}
            note={SCORED_NOTE}
          />
        </div>

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
      <p className={styles.prizeSummary}>{summary.join(" · ")}</p>
      {record.recent.length ? (
        <ul
          className={styles.prizePieces}
          aria-label="Recently recognised pieces"
        >
          {record.recent.slice(0, 3).map((piece) => (
            <li key={`${piece.source}-${piece.writer}-${piece.work}`}>
              {piece.work ? <>&ldquo;{piece.work}&rdquo; by </> : null}
              {piece.writer}
              <span className={styles.prizeSource}>
                {" "}
                · {piece.source}, {piece.year}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResultActions({
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
