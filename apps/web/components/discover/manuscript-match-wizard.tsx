"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import type {
  ManuscriptMatchCard,
  ManuscriptMatchResponse,
} from "@missa/radar-adapters";
import { FilterChip } from "@/components/missa/filter-chip";
import { MatchExplanationTrigger } from "@/components/missa/match-explanation-trigger";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { EditorialIntelligenceDrawer } from "@/components/rankings/editorial-intelligence-drawer";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DEFAULT_MANUSCRIPT_BRIEF,
  manuscriptMatchPayload,
  type ManuscriptBrief,
} from "./manuscript-match-brief";
import styles from "./manuscript-match-wizard.module.css";

const FORMS: Array<{ value: ManuscriptBrief["genre"]; label: string }> = [
  { value: "fiction", label: "Fiction" },
  { value: "flash", label: "Flash" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "poetry", label: "Poetry" },
  { value: "hybrid", label: "Hybrid" },
];

const STYLES: Array<{ value: string; label: string }> = [
  { value: "fabulist", label: "Fabulist" },
  { value: "surrealist", label: "Surreal" },
  { value: "lyric", label: "Lyric" },
  { value: "realist", label: "Realist" },
  { value: "dark", label: "Dark" },
  { value: "experimental", label: "Experimental" },
  { value: "personal", label: "Personal" },
  { value: "minimalist", label: "Minimalist" },
  { value: "humorous", label: "Funny" },
  { value: "hybrid", label: "Hybrid" },
  { value: "prose-poetry", label: "Prose poetry" },
  { value: "ghazal", label: "Ghazal" },
];

const COMP_AUTHORS = [
  "Carmen Maria Machado",
  "Kelly Link",
  "George Saunders",
  "Lorrie Moore",
  "Lydia Davis",
  "Ocean Vuong",
  "Maggie Nelson",
  "Ben Lerner",
  "Ada Limón",
  "Kaveh Akbar",
];

/** Typed lengths accept any value in range; the slider moves in steps. */
const WORDS = {
  min: 50,
  max: 30000,
  sliderMin: 0,
  sliderMax: 12000,
  step: 250,
};
const POEMS = { min: 1, max: 10, sliderMin: 1, sliderMax: 10, step: 1 };

type LaneKey = "all" | "dreamReach" | "debutChampions" | "rapidPro";

const LANES: Array<{ key: LaneKey; label: string; description?: string }> = [
  { key: "all", label: "All" },
  {
    key: "dreamReach",
    label: "Reach",
    description:
      "Top-tier magazines. The odds are long, so send your strongest work.",
  },
  {
    key: "debutChampions",
    label: "Open to new writers",
    description:
      "Magazines with a record of publishing writers for the first time.",
  },
  {
    key: "rapidPro",
    label: "Fast or well paid",
    description: "Professional rates, or a typical reply within 30 days.",
  },
];

const SCORED_NOTE =
  "Fit compares your brief with what Missa has recorded for this magazine. It isn't an eligibility check.";

function clamp(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

/** Every magazine across the engine's groups, best fit first, once each. */
function shortlist(results: ManuscriptMatchResponse): ManuscriptMatchCard[] {
  const seen = new Set<string>();
  const cards: ManuscriptMatchCard[] = [];
  for (const card of [
    ...results.simultaneousPackets,
    ...results.dreamReach,
    ...results.debutChampions,
    ...results.rapidPro,
  ]) {
    if (seen.has(card.profileId)) continue;
    seen.add(card.profileId);
    cards.push(card);
  }
  return cards.sort((a, b) => b.matchScore - a.matchScore);
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
    facts.push({ key: "pay", label: "Unpaid" });
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

function toggled(list: string[], value: string, on: boolean) {
  return on ? [...list, value] : list.filter((item) => item !== value);
}

/** One line describing the brief, for the mobile summary. */
function briefSummary(brief: ManuscriptBrief) {
  const form = FORMS.find((entry) => entry.value === brief.genre)?.label;
  const length =
    brief.genre === "poetry"
      ? `${brief.poemCount} ${brief.poemCount === 1 ? "poem" : "poems"}`
      : `${brief.wordCount.toLocaleString()} words`;
  const styleLabels = STYLES.filter((entry) =>
    brief.aestheticTags.includes(entry.value),
  ).map((entry) => entry.label);
  return [form, length, ...styleLabels, ...brief.compAuthors]
    .filter(Boolean)
    .join(" · ");
}

interface ManuscriptMatchWizardProps {
  initialData?: ManuscriptMatchResponse;
}

export function ManuscriptMatchWizard({
  initialData,
}: ManuscriptMatchWizardProps) {
  const [brief, setBrief] = useState<ManuscriptBrief>(DEFAULT_MANUSCRIPT_BRIEF);
  const [submittedBrief, setSubmittedBrief] = useState<ManuscriptBrief>(
    DEFAULT_MANUSCRIPT_BRIEF,
  );
  const [results, setResults] = useState<ManuscriptMatchResponse | null>(
    initialData ?? null,
  );
  const [lane, setLane] = useState<LaneKey>("all");
  const [announcement, setAnnouncement] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const ids = useId();

  const update = (patch: Partial<ManuscriptBrief>) =>
    setBrief((current) => ({ ...current, ...patch }));

  const briefChanged = JSON.stringify(brief) !== JSON.stringify(submittedBrief);

  const lanes = useMemo(() => {
    if (!results || results.status !== "available") return null;
    const all = shortlist(results);
    const cards: Record<LaneKey, ManuscriptMatchCard[]> = {
      all,
      dreamReach: results.dreamReach,
      debutChampions: results.debutChampions,
      rapidPro: results.rapidPro,
    };
    return LANES.filter((entry) => cards[entry.key].length > 0).map(
      (entry) => ({ ...entry, cards: cards[entry.key] }),
    );
  }, [results]);
  const activeLane = lanes?.some((entry) => entry.key === lane) ? lane : "all";

  const findMagazines = (event: React.FormEvent) => {
    event.preventDefault();
    const sent = brief;
    setSheetOpen(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/discover/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(manuscriptMatchPayload(sent)),
        });
        if (!res.ok) throw new Error("Match computation failed");
        const data = (await res.json()) as ManuscriptMatchResponse;
        setResults(data);
        setSubmittedBrief(sent);
        setLane("all");
        const found = data.status === "available" ? shortlist(data).length : 0;
        setAnnouncement(
          data.status === "available"
            ? `${found} ${found === 1 ? "magazine" : "magazines"} to consider.`
            : "Matching is unavailable.",
        );
        const heading = resultsHeadingRef.current;
        const top = heading?.getBoundingClientRect().top ?? 0;
        if (heading && (top < 0 || top > window.innerHeight)) {
          heading.focus();
        }
      } catch {
        toast.error("We couldn't compare magazines. Try again.");
      }
    });
  };

  const formProps = {
    brief,
    update,
    isPending,
    onSubmit: findMagazines,
  };

  return (
    <div className={styles.layout}>
      <div className={styles.briefPanel}>
        <BriefForm {...formProps} />
      </div>

      <section
        className={styles.results}
        aria-labelledby={`${ids}-results`}
        aria-busy={isPending}
      >
        <div className={styles.briefSummary}>
          <div className={styles.briefSummaryText}>
            <p className={styles.briefSummaryLabel}>Your piece</p>
            <p>{briefSummary(submittedBrief)}</p>
          </div>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <Button type="button" variant="outline">
                  <SlidersHorizontal aria-hidden="true" />
                  Edit
                </Button>
              }
            />
            <SheetContent
              side="right"
              surface="canvas"
              className={styles.sheet}
            >
              <SheetTitle className="sr-only">Your piece</SheetTitle>
              <BriefForm {...formProps} inSheet />
            </SheetContent>
          </Sheet>
        </div>

        <header className={styles.resultsHeader}>
          <h2
            id={`${ids}-results`}
            ref={resultsHeadingRef}
            tabIndex={-1}
            className={styles.resultsTitle}
          >
            Magazines to consider
          </h2>
          {results?.status === "available" && results.totalAnalyzed > 0 ? (
            <p className={styles.resultsMeta}>
              Compared with{" "}
              <data value={results.totalAnalyzed} className="font-mono">
                {results.totalAnalyzed.toLocaleString()}
              </data>{" "}
              magazines in the Missa index.
            </p>
          ) : null}
          <p className="sr-only" role="status">
            {announcement}
          </p>
          <p className={styles.changed} role="status">
            {briefChanged && !isPending && !sheetOpen
              ? "Your brief has changed. Find magazines again to update this list."
              : ""}
          </p>
        </header>

        {isPending ? (
          <ResultsSkeleton />
        ) : results?.status === "unavailable" ? (
          <Empty variant="bordered" role="status">
            <EmptyHeader>
              <EmptyTitle>Matching is unavailable</EmptyTitle>
              <EmptyDescription>
                The magazine index couldn&apos;t be read, so there are no
                matches to show. Try again later, or browse the directory.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/directory" />}
            >
              Browse the directory
            </Button>
          </Empty>
        ) : !lanes || lanes.length === 0 ? (
          <Empty variant="bordered" role="status">
            <EmptyHeader>
              <EmptyTitle>No magazines match this brief</EmptyTitle>
              <EmptyDescription>
                Try a different length, fewer styles, or a broader payment
                choice.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Tabs
            value={activeLane}
            onValueChange={(value) => setLane(value as LaneKey)}
          >
            {lanes.length > 1 ? (
              <TabsList
                variant="line"
                size="responsive"
                className={styles.lanes}
              >
                {lanes.map((entry) => (
                  <TabsTrigger key={entry.key} value={entry.key} size="touch">
                    {entry.label}
                    <span className={`${styles.laneCount} font-mono`}>
                      {entry.cards.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : null}
            {lanes.map((entry) => (
              <TabsContent
                key={entry.key}
                value={entry.key}
                className={styles.panel}
              >
                {entry.description ? (
                  <p className={styles.laneDescription}>{entry.description}</p>
                ) : null}
                <ResultList cards={entry.cards} brief={submittedBrief} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <p className={styles.footnote}>
          Fit is a comparison aid, not an eligibility check. Read each
          magazine&apos;s current guidelines before you submit.{" "}
          <Link href="/methodology">How Missa ranks magazines</Link>
        </p>
      </section>
    </div>
  );
}

/**
 * The brief. Rendered in the side panel from 1024px and inside a sheet below
 * it; only one copy is ever visible, so each keeps its own ids.
 */
function BriefForm({
  brief,
  update,
  isPending,
  onSubmit,
  inSheet = false,
}: {
  brief: ManuscriptBrief;
  update: (patch: Partial<ManuscriptBrief>) => void;
  isPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  inSheet?: boolean;
}) {
  const ids = useId();
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);
  const poetry = brief.genre === "poetry";
  const lengthRange = poetry ? POEMS : WORDS;
  const lengthValue = poetry ? brief.poemCount : brief.wordCount;
  const lengthUnit = poetry
    ? brief.poemCount === 1
      ? "poem"
      : "poems"
    : "words";
  const setLength = (value: number) =>
    update(
      poetry
        ? { poemCount: clamp(value, POEMS) }
        : { wordCount: clamp(value, WORDS) },
    );

  return (
    <form
      className={styles.brief}
      data-in-sheet={inSheet || undefined}
      onSubmit={onSubmit}
      aria-labelledby={`${ids}-brief`}
    >
      <h2 id={`${ids}-brief`} className={styles.briefTitle}>
        Your piece
      </h2>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Form
        </FieldLegend>
        <RadioGroup
          className={styles.segments}
          value={brief.genre}
          onValueChange={(value) =>
            update({ genre: value as ManuscriptBrief["genre"] })
          }
        >
          {FORMS.map((form) => (
            <label key={form.value} className={styles.segment}>
              <RadioGroupItem
                value={form.value}
                className={styles.segmentRadio}
              />
              {form.label}
            </label>
          ))}
        </RadioGroup>
      </FieldSet>

      <Field className={styles.group}>
        <FieldLabel
          id={`${ids}-length-label`}
          htmlFor={`${ids}-length`}
          className={styles.legend}
        >
          {poetry ? "Poems in the packet" : "Length"}
        </FieldLabel>
        <InputGroup className={styles.lengthInput}>
          <InputGroupInput
            id={`${ids}-length`}
            type="number"
            inputMode="numeric"
            min={lengthRange.min}
            max={lengthRange.max}
            value={lengthDraft ?? String(lengthValue)}
            onChange={(event) => {
              setLengthDraft(event.target.value);
              const next = Number(event.target.value);
              if (event.target.value && Number.isFinite(next)) setLength(next);
            }}
            onBlur={() => setLengthDraft(null)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{lengthUnit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Slider
          className={styles.slider}
          min={lengthRange.sliderMin}
          max={lengthRange.sliderMax}
          step={lengthRange.step}
          value={[lengthValue]}
          onValueChange={(value) => {
            setLengthDraft(null);
            setLength(Array.isArray(value) ? value[0] : value);
          }}
          aria-labelledby={`${ids}-length-label`}
        />
      </Field>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Style
        </FieldLegend>
        <FieldDescription className={styles.helper}>
          Pick any that describe the piece.
        </FieldDescription>
        <div className={styles.chips}>
          {STYLES.map((style) => (
            <FilterChip
              key={style.value}
              selected={brief.aestheticTags.includes(style.value)}
              onSelectedChange={(on) =>
                update({
                  aestheticTags: toggled(brief.aestheticTags, style.value, on),
                })
              }
            >
              {style.label}
            </FilterChip>
          ))}
        </div>
      </FieldSet>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Comparable writers
        </FieldLegend>
        <FieldDescription className={styles.helper}>
          Magazines that publish similar work rank higher.
        </FieldDescription>
        <div className={styles.chips}>
          {COMP_AUTHORS.map((author) => (
            <FilterChip
              key={author}
              selected={brief.compAuthors.includes(author)}
              onSelectedChange={(on) =>
                update({ compAuthors: toggled(brief.compAuthors, author, on) })
              }
            >
              {author}
            </FilterChip>
          ))}
        </div>
      </FieldSet>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Preferences
        </FieldLegend>
        <Field orientation="horizontal" className={styles.switchRow}>
          <FieldContent>
            <FieldLabel htmlFor={`${ids}-debut`}>First publication</FieldLabel>
            <FieldDescription className={styles.helper}>
              Favour magazines that publish new writers.
            </FieldDescription>
          </FieldContent>
          <Switch
            id={`${ids}-debut`}
            checked={brief.isDebutAuthor}
            onCheckedChange={(checked) => update({ isDebutAuthor: checked })}
          />
        </Field>
        <Field orientation="horizontal" className={styles.switchRow}>
          <FieldContent>
            <FieldLabel htmlFor={`${ids}-simultaneous`}>
              Sending it to several magazines
            </FieldLabel>
            <FieldDescription className={styles.helper}>
              Rank down magazines that refuse simultaneous submissions.
            </FieldDescription>
          </FieldContent>
          <Switch
            id={`${ids}-simultaneous`}
            checked={brief.allowSimultaneous}
            onCheckedChange={(checked) =>
              update({ allowSimultaneous: checked })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-fee`}>Submission fees</FieldLabel>
          <NativeSelect
            id={`${ids}-fee`}
            className={styles.select}
            value={brief.feeTolerance}
            onChange={(event) =>
              update({
                feeTolerance: event.target
                  .value as ManuscriptBrief["feeTolerance"],
              })
            }
          >
            <NativeSelectOption value="free_only">
              Free, or a fee waiver
            </NativeSelectOption>
            <NativeSelectOption value="fee_ok_with_waivers">
              Fees are fine with a waiver option
            </NativeSelectOption>
            <NativeSelectOption value="any">Any fee</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-pay`}>Payment</FieldLabel>
          <NativeSelect
            id={`${ids}-pay`}
            className={styles.select}
            value={brief.minPayRate}
            onChange={(event) =>
              update({
                minPayRate: event.target.value as ManuscriptBrief["minPayRate"],
              })
            }
          >
            <NativeSelectOption value="all">Paid or unpaid</NativeSelectOption>
            <NativeSelectOption value="any_paying">
              Paying magazines
            </NativeSelectOption>
            <NativeSelectOption value="pro_rates_only">
              Professional rates (8¢ a word or more)
            </NativeSelectOption>
          </NativeSelect>
        </Field>
      </FieldSet>

      <div className={styles.submit}>
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? <Spinner aria-hidden="true" /> : null}
          {isPending ? "Finding magazines…" : "Find magazines"}
        </Button>
      </div>
    </form>
  );
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
function ResultList({
  cards,
  brief,
}: {
  cards: ManuscriptMatchCard[];
  brief: ManuscriptBrief;
}) {
  const scored: ResultRow[] = [];
  const limited: ManuscriptMatchCard[] = [];
  for (const card of cards) {
    const facts = recordedFacts(card, brief);
    const warnings = watchouts(card, brief);
    if (card.reasons.length || warnings.length || facts.length) {
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
            <ScoredResult key={row.card.profileId} row={row} rank={index + 1} />
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
                Missa hasn&apos;t recorded guidelines, pay, or reply times for
                these magazines yet, so there&apos;s no fit score. They&apos;re
                listed in Missa ranking order.
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
                <ResultActions card={card} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ScoredResult({ row, rank }: { row: ResultRow; rank: number }) {
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

        {card.reasons.length ? (
          <ul className={styles.reasons} aria-label="Why it fits">
            {card.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>
                <CheckCircle2 aria-hidden="true" />
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
        <ResultActions card={card} />
      </div>
    </li>
  );
}

function ResultActions({ card }: { card: ManuscriptMatchCard }) {
  return (
    <div className={styles.actions}>
      <EditorialIntelligenceDrawer
        profileId={card.profileId}
        magazineName={card.name}
        magazineSlug={card.slug}
        trigger={
          <Button type="button" variant="outline" size="sm">
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

function ResultsSkeleton() {
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
