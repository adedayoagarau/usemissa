"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type {
  EditorialIntelligenceFullProfile,
  MagazineRankingRow,
} from "@missa/radar-adapters";
import type { PillarKey } from "@missa/radar-engine";
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
  factStatusLabel,
  feeLabel,
  payLabel,
  responseLabel,
  simultaneousLabel,
  sourceHost,
} from "@/lib/magazineFacts";
// Values come from the ranking module itself: the package root also exports Node-only code.
import { PILLAR_MAX } from "@missa/radar-engine/dist/src/ranking/magazineRankingEngine.js";
import { Sp } from "@/components/missa/spelling";

const GENRE_LABELS: Record<string, string> = {
  fiction: "Fiction",
  poetry: "Poetry",
  nonfiction: "Nonfiction",
  overall: "Overall",
};

interface Pillar {
  key: PillarKey;
  label: string;
  score: number;
  fact: string;
  source: string | null;
}

function pillars(row: MagazineRankingRow): Pillar[] {
  const source = (key: string) => row.factSources[key]?.url ?? null;
  return [
    {
      key: "accolades",
      label: "Honors",
      score: row.accoladesScore,
      fact: "Pushcart standing and anthology selections",
      source: null,
    },
    {
      key: "pay",
      label: "Pay",
      score: row.payScore,
      fact: payLabel(row),
      source: source("pay"),
    },
    {
      key: "turnaround",
      label: "Reply time",
      score: row.turnaroundScore,
      fact: responseLabel(row),
      source: row.medianResponseDays != null ? null : source("response"),
    },
    {
      key: "fees",
      label: "Fees",
      score: row.feesScore,
      fact: feeLabel(row),
      source: source("fee"),
    },
    {
      key: "respect",
      label: "Writer respect",
      score: row.respectScore,
      fact: simultaneousLabel(row.simultaneousPolicy),
      source: source("simultaneous"),
    },
    {
      key: "formatEthics",
      label: "Format and ethics",
      score: row.formatEthicsScore,
      fact: "Archive, blind reading and debut policy",
      source: null,
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
      <h3 className="text-sm font-semibold text-foreground"><Sp>{title}</Sp></h3>
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

function ScoreBreakdown({ row }: { row: MagazineRankingRow }) {
  return (
    <Section title="How the score adds up">
      <ul className="divide-y divide-border border-y border-border">
        {pillars(row).map((pillar) => {
          const status = row.pillarStatus[pillar.key];
          const max = PILLAR_MAX[pillar.key];
          return (
            <li
              key={pillar.key}
              className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3"
            >
              <span className="text-sm font-medium text-foreground">
                <Sp>{pillar.label}</Sp>
              </span>
              <span className="text-end text-sm text-foreground">
                <span className="font-mono tabular-nums">
                  {points(pillar.score)}
                </span>
                <span className="text-muted-foreground"> / {max}</span>
              </span>
              <span
                className={
                  status === "unknown"
                    ? "text-sm text-muted-foreground"
                    : "text-sm text-foreground"
                }
              >
                {pillar.fact}
              </span>
              <span className="text-end text-xs text-muted-foreground">
                {pillar.source ? (
                  <SourceLink url={pillar.source} />
                ) : (
                  factStatusLabel(status)
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm leading-6 text-muted-foreground">
        {Math.round(row.coverage * 100)}% of these points rest on recorded
        facts. A fact not on record scores the middle of its range.
      </p>
    </Section>
  );
}

function Honours({ data }: { data: EditorialIntelligenceFullProfile }) {
  if (data.pushcart.length === 0 && data.awards.length === 0) {
    return (
      <Section title="Honors">
        <p className="text-sm text-muted-foreground">
          No Pushcart standing or anthology selection on record.
        </p>
      </Section>
    );
  }
  return (
    <Section title="Honors">
      {data.pushcart.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {data.pushcart.map((entry) => (
            <li
              key={`${entry.editionYear}-${entry.genre}`}
              className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3"
            >
              <span className="text-sm text-foreground">
                Pushcart tally {entry.editionYear}
              </span>
              <span className="text-end text-sm text-foreground">
                <span className="font-mono tabular-nums">#{entry.rank}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {GENRE_LABELS[entry.genre] ?? entry.genre}
              </span>
              <span className="text-end">
                <SourceLink url={entry.sourceUrl} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.awards.length > 0 && (
        <ul className="space-y-3">
          {data.awards.map((award, index) => (
            <li
              key={`${award.anthology}-${award.year}-${index}`}
              className="space-y-0.5"
            >
              <p className="text-sm text-foreground">
                {award.anthology} {award.year}
              </p>
              <p className="text-sm text-muted-foreground">
                {[award.pieceTitle && `“${award.pieceTitle}”`, award.authorName]
                  .filter(Boolean)
                  .join(" by ") || NOT_RECORDED}
              </p>
              <SourceLink url={award.sourceUrl} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function WriterReports({ row }: { row: MagazineRankingRow }) {
  return (
    <Section title="Reply times from Missa writers">
      <p className="text-sm leading-6 text-muted-foreground">
        {row.medianResponseDays != null
          ? `Half of ${row.telemetryReports} reported decisions arrived within ${row.medianResponseDays} days.`
          : "Fewer than five writers have reported a decision. Reply times appear here once five have."}
      </p>
    </Section>
  );
}

interface EditorialIntelligenceDrawerProps {
  profileId: string;
  magazineName: string;
  magazineSlug: string;
  /** The ranking row already on screen; otherwise the latest overall row is fetched. */
  ranking?: MagazineRankingRow;
  /** Track and report actions, shown in the footer. */
  actions?: React.ReactNode;
  trigger?: React.ReactElement;
}

export function EditorialIntelligenceDrawer({
  profileId,
  magazineName,
  magazineSlug,
  ranking,
  actions,
  trigger,
}: EditorialIntelligenceDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [data, setData] =
    React.useState<EditorialIntelligenceFullProfile | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/rankings/magazines/${encodeURIComponent(profileId)}/intelligence`,
      );
      if (res.status === 404) {
        setData(null);
        setLoaded(true);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      setData((await res.json()) as EditorialIntelligenceFullProfile);
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

  const row = ranking ?? data?.ranking ?? null;

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
          <div className="flex flex-wrap items-center gap-2">
            {row && <RankingTierBadge tier={row.prestigeTier} />}
            {row && (
              <span className="text-sm text-muted-foreground">
                {row.rankingYear} · #{row.rankPosition}{" "}
                {GENRE_LABELS[row.genre]?.toLowerCase() ?? row.genre}
              </span>
            )}
          </div>
          <SheetTitle className="text-xl font-semibold">
            {magazineName}
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
            What Missa has on record for this magazine, with the source for each
            fact. Check the magazine’s own guidelines before you submit.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-8 p-6">
          {row && <ScoreBreakdown row={row} />}
          {loading && !loaded && (
            <div className="space-y-3" aria-label="Loading honors">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {error && (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">
                <Sp>The honors record could not load.</Sp>
              </p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}
          {loaded && data && <Honours data={data} />}
          {loaded && !data && !row && (
            <p className="text-sm text-muted-foreground">
              <Sp>Missa has no ranking or honors on record for this magazine yet.</Sp>
            </p>
          )}
          {row && <WriterReports row={row} />}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border p-6">
          {actions}
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <Link
                href={`/journal/${encodeURIComponent(magazineSlug || profileId)}`}
              />
            }
          >
            Magazine profile
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
