"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type {
  ResidencyRankingRow,
  ResidencyReviewRow,
} from "@missa/radar-adapters";
import type { ResidencyPillarKey } from "@missa/radar-engine";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import {
  NOT_RECORDED,
  applicationFeeLabel,
  costLabel,
  factStatusLabel,
  mealsLabel,
  ratingLabel,
  selectionLabel,
  sourceHost,
  stipendLabel,
  studioLabel,
} from "@/lib/residencyFacts";
// Values come from the ranking module itself: the package root also exports Node-only code.
import { RESIDENCY_PILLAR_MAX } from "@missa/radar-engine/dist/src/ranking/residencyRankingEngine.js";

type Detail = ResidencyRankingRow & { reviews: ResidencyReviewRow[] };

interface Fact {
  label: string;
  value: string;
  source: string | null;
}

interface Pillar {
  key: ResidencyPillarKey;
  label: string;
  score: number;
  facts: Fact[];
}

function pillars(row: ResidencyRankingRow): Pillar[] {
  const source = (key: string) => row.factSources[key]?.url ?? null;
  const founded = row.foundingYear
    ? `Founded ${row.foundingYear}`
    : NOT_RECORDED;
  return [
    {
      key: "funding",
      label: "Funding",
      score: row.fundingScore,
      facts: [
        { label: "Cost", value: costLabel(row), source: source("fee") },
        {
          label: "Stipend",
          value: stipendLabel(row),
          source: source("stipend"),
        },
      ],
    },
    {
      key: "ratings",
      label: "What residents say",
      score: row.ratingScore,
      facts: [
        { label: "Rating", value: ratingLabel(row), source: source("rating") },
      ],
    },
    {
      key: "facilities",
      label: "Room to work",
      score: row.facilitiesScore,
      facts: [
        {
          label: "Meals",
          value: mealsLabel(row.meals),
          source: source("meals"),
        },
        {
          label: "Studio",
          value: studioLabel(row.privateStudio),
          source: source("studio"),
        },
      ],
    },
    {
      key: "access",
      label: "Standing and access",
      score: row.accessScore,
      facts: [
        { label: "Years running", value: founded, source: source("founded") },
        {
          label: "Listed by",
          value: row.directories.length
            ? row.directories.join(", ")
            : NOT_RECORDED,
          source: null,
        },
        {
          label: "Open call",
          value: row.openCall
            ? row.openCall.deadline
              ? `${row.openCall.title}, closes ${new Date(`${row.openCall.deadline}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : row.openCall.title
            : "None on record",
          source: source("openCall"),
        },
      ],
    },
  ];
}

function points(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SourceLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {sourceHost(url)}
      <ArrowUpRight className="size-3" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function ScoreBreakdown({ row }: { row: ResidencyRankingRow }) {
  return (
    <Section title="How the score adds up">
      <ul className="divide-y divide-border border-y border-border">
        {pillars(row).map((pillar) => {
          const status = row.pillarStatus[pillar.key];
          return (
            <li key={pillar.key} className="space-y-2 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium text-foreground">
                  {pillar.label}
                </span>
                <span className="text-sm text-foreground">
                  <span className="font-mono tabular-nums">
                    {points(pillar.score)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {RESIDENCY_PILLAR_MAX[pillar.key]}
                  </span>
                </span>
              </div>
              <dl className="space-y-1.5">
                {pillar.facts.map((fact) => (
                  <FactRow key={fact.label} fact={fact} />
                ))}
              </dl>
              {status !== "recorded" && (
                <p className="text-xs text-muted-foreground">
                  {factStatusLabel(status)}: a fact not on record scores the
                  middle of its range.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm leading-6 text-muted-foreground">
        {Math.round(row.coverage * 100)}% of these points rest on recorded
        facts.
      </p>
    </Section>
  );
}

/** Label on the left; the value with its source underneath, so neither is squeezed. */
function FactRow({ fact, className }: { fact: Fact; className?: string }) {
  return (
    <div
      className={`grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-3 ${className ?? ""}`}
    >
      <dt className="text-xs text-muted-foreground">{fact.label}</dt>
      <dd className="min-w-0 space-y-0.5">
        <p
          className={
            fact.value === NOT_RECORDED
              ? "text-sm break-words text-muted-foreground"
              : "text-sm break-words text-foreground"
          }
        >
          {fact.value}
        </p>
        {fact.source ? <SourceLink url={fact.source} /> : null}
      </dd>
    </div>
  );
}

function ProgramDetails({ row }: { row: ResidencyRankingRow }) {
  const source = (key: string) => row.factSources[key]?.url ?? null;
  const facts: Fact[] = [
    { label: "Location", value: row.location ?? NOT_RECORDED, source: null },
    {
      label: "Length",
      value: row.residencyLength ?? NOT_RECORDED,
      source: source("length"),
    },
    {
      label: "Applying",
      value: applicationFeeLabel(row) ?? NOT_RECORDED,
      source: source("applicationFee"),
    },
    {
      label: "Selection",
      value: selectionLabel(row) ?? NOT_RECORDED,
      source: source("selection"),
    },
    {
      label: "Housing",
      value: row.housing ?? NOT_RECORDED,
      source: source("housing"),
    },
    {
      label: "Wheelchair access",
      value: row.wheelchair ?? NOT_RECORDED,
      source: source("wheelchair"),
    },
  ];
  return (
    <Section title="The program">
      <dl className="divide-y divide-border border-y border-border">
        {facts.map((fact) => (
          <FactRow key={fact.label} fact={fact} className="py-2.5" />
        ))}
      </dl>
      {row.disciplines && (
        <p className="text-sm leading-6 text-muted-foreground">
          <span className="text-foreground">Disciplines:</span>{" "}
          {row.disciplines}
        </p>
      )}
    </Section>
  );
}

function Reviews({ reviews }: { reviews: ResidencyReviewRow[] }) {
  return (
    <Section title="Residents’ reviews">
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews on record yet.
        </p>
      ) : (
        <ul className="space-y-5">
          {reviews.slice(0, 8).map((review) => (
            <li key={review.id} className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {review.reviewTitle ?? "Review"}
                {review.ratingScore != null && (
                  <span className="ms-2 font-normal text-muted-foreground">
                    {review.ratingScore.toFixed(1)} / 5
                  </span>
                )}
              </p>
              <p className="text-sm leading-6 text-foreground">
                {review.reviewBody}
              </p>
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span>{review.authorName ?? "Anonymous"}</span>
                {review.datePublished && (
                  <span>{review.datePublished.slice(0, 10)}</span>
                )}
                {review.sourceUrl ? (
                  <SourceLink url={review.sourceUrl} />
                ) : (
                  <span>{review.source}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

interface ResidencyIntelligenceDrawerProps {
  profileId: string;
  residencyName: string;
  residencySlug: string;
  /** The ranking row already on screen; otherwise it is fetched with the reviews. */
  ranking?: ResidencyRankingRow;
  /** Track, apply and review actions, shown in the footer. */
  actions?: React.ReactNode;
  trigger?: React.ReactElement;
}

export function ResidencyIntelligenceDrawer({
  profileId,
  residencyName,
  residencySlug,
  ranking,
  actions,
  trigger,
}: ResidencyIntelligenceDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/rankings/residencies/${encodeURIComponent(profileId)}/intelligence`,
      );
      if (res.status === 404) {
        setDetail(null);
        setLoaded(true);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      setDetail((await res.json()) as Detail);
      setLoaded(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    if (open && !loaded && !loading && !error) {
      // The fetch callback owns loading/error state for this user-triggered disclosure.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [open, loaded, loading, error, load]);

  const row = ranking ?? detail ?? null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              Details
            </Button>
          )
        }
      />
      <SheetContent
        side="right"
        surface="canvas"
        className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader variant="section" className="space-y-3 p-6">
          {row && (
            <div className="flex flex-wrap items-center gap-2">
              <RankingTierBadge tier={row.prestigeTier} />
              <span className="text-sm text-muted-foreground">
                #{row.rankPosition} of the residency index
              </span>
            </div>
          )}
          <SheetTitle className="text-xl font-semibold">
            {residencyName}
          </SheetTitle>
          {row && (
            <p className="text-sm text-foreground">
              <span className="font-mono text-2xl tabular-nums">
                {row.totalScore.toFixed(1)}
              </span>
              <span className="text-muted-foreground"> / 100</span>
            </p>
          )}
          <SheetDescription>
            What Missa has on record for this program, with the source for each
            fact. Check the program’s own guidelines before you apply.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-8 p-6">
          {row && <ScoreBreakdown row={row} />}
          {row && <ProgramDetails row={row} />}
          {loading && !loaded && (
            <div className="space-y-3" aria-label="Loading reviews">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {error && (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">
                Reviews could not load.
              </p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}
          {loaded && <Reviews reviews={detail?.reviews ?? []} />}
          {loaded && !row && (
            <p className="text-sm text-muted-foreground">
              This program is not in the residency index yet: no directory
              describes it in enough detail to compare.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border p-6">
          {actions}
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <Link
                href={`/residency/${encodeURIComponent(residencySlug || profileId)}`}
              />
            }
          >
            Program profile
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/rankings/methodology" />}
          >
            How scores work
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
