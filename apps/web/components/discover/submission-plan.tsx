"use client";

import Link from "next/link";
import { BookmarkPlus, ChevronDown } from "lucide-react";
import type {
  ManuscriptMatchCard,
  ManuscriptMatchResponse,
  PlanPick,
  PlanTier,
} from "@missa/radar-adapters";
import { PLAN_TIER_LABELS } from "@/components/missa/plan-tier-badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ResultList, type ShortlistControls } from "./manuscript-match-results";
import type { ManuscriptBrief } from "./manuscript-match-brief";
import styles from "./manuscript-match-wizard.module.css";

const TIER_COUNT_LABELS: Record<PlanTier, [string, string]> = {
  long_shot: ["long shot", "long shots"],
  good_fit: ["good fit", "good fits"],
  likely: ["likely acceptance", "likely acceptances"],
};

function readableDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Plan picks in order, with the full card for each. */
function cardsFor(
  picks: PlanPick[],
  byId: Map<string, ManuscriptMatchCard>,
): ManuscriptMatchCard[] {
  return picks
    .map((pick) => byId.get(pick.profileId))
    .filter((card): card is ManuscriptMatchCard => card !== undefined);
}

/**
 * The submission plan: rounds to send, magazines opening later and the
 * magazines the brief's rules leave out. Every part comes from the decision
 * model, so the same brief on the same day gives the same plan.
 */
export function SubmissionPlanView({
  results,
  brief,
  shortlist,
}: {
  results: ManuscriptMatchResponse;
  brief: ManuscriptBrief;
  shortlist: ShortlistControls;
}) {
  const plan = results.plan;
  const byId = new Map(
    (results.planCards ?? []).map((card) => [card.profileId, card]),
  );
  const planned = plan
    ? cardsFor(
        plan.rounds.flatMap((round) => round.picks),
        byId,
      )
    : [];
  const unsaved = planned.filter((card) => !shortlist.isSaved(card.profileId));

  return (
    <div className={styles.plan}>
      {plan && plan.rounds.length > 0 ? (
        <>
          <div className={styles.planIntro}>
            <p className={styles.laneDescription}>
              {(Object.keys(TIER_COUNT_LABELS) as PlanTier[])
                .filter((tier) => plan.counts[tier] > 0)
                .map((tier) => {
                  const [one, many] = TIER_COUNT_LABELS[tier];
                  return `${plan.counts[tier]} ${plan.counts[tier] === 1 ? one : many}`;
                })
                .join(", ")}
              , all open now and judged a fit for this piece.
              {plan.shortTiers.length
                ? ` Missa found fewer ${plan.shortTiers
                    .map((tier) => TIER_COUNT_LABELS[tier][1])
                    .join(" and ")} than a full plan asks for.`
                : ""}
            </p>
            {unsaved.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  unsaved.forEach((card) => shortlist.toggle(card))
                }
              >
                <BookmarkPlus aria-hidden="true" />
                Shortlist the plan
              </Button>
            ) : null}
          </div>

          <ol className={styles.rounds}>
            {plan.rounds.map((round) => {
              const cards = cardsFor(round.picks, byId);
              const unknownPolicy = round.picks.filter(
                (pick) => pick.checkPolicy,
              );
              return (
                <li key={round.round} className={styles.round}>
                  <h3 className={styles.roundTitle}>
                    Round {round.round}
                    <span className={styles.roundMode}>
                      {round.send === "together"
                        ? ` · Send ${round.picks.length === 1 ? "now" : "together"}`
                        : " · Send on its own"}
                    </span>
                  </h3>
                  <p className={styles.roundNote}>
                    {round.note}
                    {unknownPolicy.length
                      ? ` Missa hasn't recorded whether ${unknownPolicy
                          .map((pick) => pick.name)
                          .join(
                            ", ",
                          )} ${unknownPolicy.length === 1 ? "accepts" : "accept"} simultaneous submissions: check before sending.`
                      : ""}
                  </p>
                  <ResultList
                    cards={cards}
                    brief={brief}
                    shortlist={shortlist}
                  />
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <Empty variant="bordered" role="status">
          <EmptyHeader>
            <EmptyTitle>No plan for this brief yet</EmptyTitle>
            <EmptyDescription>
              Missa hasn&apos;t recorded enough about magazines that are open
              now and fit this piece to build a plan. The other tabs list every
              magazine it compared.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {plan?.opensLater.length ? (
        <section className={styles.planSection} aria-labelledby="plan-later">
          <h3 id="plan-later" className={styles.groupTitle}>
            Opening later
          </h3>
          <ul className={styles.laterList}>
            {plan.opensLater.map((pick) => (
              <li key={pick.profileId}>
                <Link href={`/journal/${pick.slug}`}>{pick.name}</Link>
                <span className={styles.laterMeta}>
                  {PLAN_TIER_LABELS[pick.tier]} · opens{" "}
                  <time dateTime={pick.opensOn}>
                    {readableDate(pick.opensOn)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.excluded?.length ? (
        <Collapsible className={styles.excluded}>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.excludedTrigger}
              />
            }
          >
            {results.excludedCount ?? results.excluded.length}{" "}
            {(results.excludedCount ?? results.excluded.length) === 1
              ? "magazine"
              : "magazines"}{" "}
            ruled out by their guidelines or reading periods
            <ChevronDown aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className={styles.excludedList}>
              {results.excluded.map((entry) => (
                <li key={entry.profileId}>
                  <Link href={`/journal/${entry.slug}`}>{entry.name}</Link>
                  <span className={styles.laterMeta}>
                    {entry.exclusions
                      .map((exclusion) => exclusion.reason)
                      .join("; ")}
                  </span>
                </li>
              ))}
            </ul>
            {results.excludedCount &&
            results.excludedCount > results.excluded.length ? (
              <p className={styles.groupNote}>
                Showing the first {results.excluded.length} by name.
              </p>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {results.model ? (
        <p className={styles.modelNote}>
          Built by the Missa decision model, version {results.model.version},
          with reading periods checked on{" "}
          <time dateTime={results.model.asOf}>
            {longDate(results.model.asOf)}
          </time>
          . The same brief on the same day always gives the same plan.
        </p>
      ) : null}
    </div>
  );
}
