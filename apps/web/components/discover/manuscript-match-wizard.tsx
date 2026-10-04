"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { Link2, Search, SlidersHorizontal, X } from "lucide-react";
import type {
  ManuscriptMatchCard,
  ManuscriptMatchResponse,
} from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dropdownStyles from "@/components/opportunity-dropdown.module.css";
import { toast } from "sonner";
import { BriefForm } from "./manuscript-brief-form";
import {
  DEFAULT_MANUSCRIPT_BRIEF,
  briefFromSearchParams,
  briefSummary,
  briefToSearchParams,
  manuscriptMatchPayload,
  type ManuscriptBrief,
} from "./manuscript-match-brief";
import {
  ResultList,
  ResultsSkeleton,
  SORT_LABELS,
  mergedResults,
  sortResults,
  type ResultSort,
  type ShortlistControls,
} from "./manuscript-match-results";
import { ShortlistSheet, useShortlist } from "./manuscript-shortlist";
import { SubmissionPlanView } from "./submission-plan";
import styles from "./manuscript-match-wizard.module.css";

type LaneKey =
  "plan" | "all" | "prizeTrack" | "dreamReach" | "debutChampions" | "rapidPro";

const LANES: Array<{ key: LaneKey; label: string; description?: string }> = [
  { key: "plan", label: "Plan" },
  { key: "all", label: "All" },
  {
    key: "prizeTrack",
    label: "Prize record",
    description:
      "Magazines whose published work has been picked for Pushcart Prizes, prize anthologies or major prizes.",
  },
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

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

type SearchState =
  | { status: "loading"; query: string }
  | { status: "done"; query: string; cards: ManuscriptMatchCard[] }
  | { status: "error"; query: string };

async function requestMatch(
  brief: ManuscriptBrief,
  query?: string,
  signal?: AbortSignal,
): Promise<ManuscriptMatchResponse> {
  const res = await fetch("/api/discover/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manuscriptMatchPayload(brief, query)),
    signal,
  });
  if (!res.ok) throw new Error("Match computation failed");
  return (await res.json()) as ManuscriptMatchResponse;
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
  const [lane, setLane] = useState<LaneKey>("plan");
  const [sort, setSort] = useState<ResultSort>("fit");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const shortlist = useShortlist();
  const ids = useId();

  const update = (patch: Partial<ManuscriptBrief>) =>
    setBrief((current) => ({ ...current, ...patch }));

  const briefChanged = JSON.stringify(brief) !== JSON.stringify(submittedBrief);
  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length >= SEARCH_MIN_LENGTH;

  const lanes = useMemo(() => {
    if (!results || results.status !== "available") return null;
    const planIds = (results.plan?.rounds ?? []).flatMap((round) =>
      round.picks.map((pick) => pick.profileId),
    );
    const planCards = (results.planCards ?? []).filter((card) =>
      planIds.includes(card.profileId),
    );
    const cards: Record<LaneKey, ManuscriptMatchCard[]> = {
      plan: planCards,
      all: mergedResults(results),
      dreamReach: results.dreamReach,
      debutChampions: results.debutChampions,
      rapidPro: results.rapidPro,
      prizeTrack: results.prizeTrack ?? [],
    };
    // The plan tab stays when it has nothing to send: it still explains why
    // and lists magazines opening later or ruled out.
    return LANES.filter((entry) =>
      entry.key === "plan"
        ? Boolean(results.plan)
        : cards[entry.key].length > 0,
    ).map((entry) => ({ ...entry, cards: cards[entry.key] }));
  }, [results]);
  const activeLane = lanes?.some((entry) => entry.key === lane)
    ? lane
    : (lanes?.[0]?.key ?? "all");

  const runMatch = useCallback((sent: ManuscriptBrief, updateUrl: boolean) => {
    startTransition(async () => {
      try {
        const data = await requestMatch(sent);
        setResults(data);
        setSubmittedBrief(sent);
        setLane("plan");
        if (updateUrl) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?${briefToSearchParams(sent)}`,
          );
        }
        const found =
          data.status === "available" ? mergedResults(data).length : 0;
        setAnnouncement(
          data.status === "available"
            ? `${found} ${found === 1 ? "magazine" : "magazines"} to consider.`
            : "Matching is unavailable.",
        );
        const heading = resultsHeadingRef.current;
        const top = heading?.getBoundingClientRect().top ?? 0;
        if (heading && (top < 0 || top > window.innerHeight)) heading.focus();
      } catch {
        toast.error("We couldn't compare magazines. Try again.");
      }
    });
  }, []);

  // A shared link carries the brief in its URL: restore it and match once.
  useEffect(() => {
    const shared = briefFromSearchParams(
      new URLSearchParams(window.location.search),
    );
    if (!shared) return;
    startTransition(() => setBrief(shared));
    runMatch(shared, false);
  }, [runMatch]);

  // Name search across the whole index, scored against the submitted brief.
  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearch({ status: "loading", query: trimmedQuery });
      try {
        const data = await requestMatch(
          submittedBrief,
          trimmedQuery,
          controller.signal,
        );
        if (data.status !== "available") throw new Error("Index unavailable");
        setSearch({
          status: "done",
          query: trimmedQuery,
          cards: data.searchResults ?? [],
        });
      } catch {
        if (!controller.signal.aborted) {
          setSearch({ status: "error", query: trimmedQuery });
        }
      }
    }, SEARCH_DELAY_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searching, trimmedQuery, submittedBrief]);

  const findMagazines = (event: React.FormEvent) => {
    event.preventDefault();
    setSheetOpen(false);
    runMatch(brief, true);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?${briefToSearchParams(submittedBrief)}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Link copied."),
      () => toast.error("Copy failed."),
    );
  };

  const formProps = { brief, update, isPending, onSubmit: findMagazines };
  const searchCurrent = search?.query === trimmedQuery ? search : null;

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

        <div className={styles.toolbar}>
          <InputGroup className={styles.search}>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search any magazine by name"
              placeholder="Search any magazine"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <div className={styles.toolbarActions}>
            <Select
              value={sort}
              onValueChange={(value) => {
                if (value) setSort(value as ResultSort);
              }}
            >
              <SelectTrigger
                aria-label="Sort magazines"
                variant="quiet"
                size="touch"
              >
                <SelectValue>
                  {(value: ResultSort) => SORT_LABELS[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="end"
                alignItemWithTrigger={false}
                sideOffset={4}
                className="w-48"
              >
                <SelectGroup className={dropdownStyles.list}>
                  {(Object.keys(SORT_LABELS) as ResultSort[]).map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className={dropdownStyles.option}
                    >
                      {SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <ShortlistSheet
              list={shortlist.list}
              onRemove={shortlist.remove}
              onClear={shortlist.clear}
            />
            <Button type="button" variant="ghost" onClick={copyLink}>
              <Link2 aria-hidden="true" />
              Copy link
            </Button>
          </div>
        </div>

        {searching ? (
          <SearchResults
            query={trimmedQuery}
            state={searchCurrent}
            sort={sort}
            brief={submittedBrief}
            shortlist={shortlist.controls}
          />
        ) : isPending ? (
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
                {entry.key === "plan" ? (
                  <SubmissionPlanView
                    results={results!}
                    brief={submittedBrief}
                    shortlist={shortlist.controls}
                  />
                ) : (
                  <ResultList
                    cards={sortResults(entry.cards, sort)}
                    brief={submittedBrief}
                    shortlist={shortlist.controls}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <p className={styles.footnote}>
          Scores and plans come from what Missa has recorded, not an eligibility
          check. Read each magazine&apos;s current guidelines before you submit.{" "}
          <Link href="/methodology">How Missa ranks magazines</Link>
        </p>
      </section>
    </div>
  );
}

function SearchResults({
  query,
  state,
  sort,
  brief,
  shortlist,
}: {
  query: string;
  state: SearchState | null;
  sort: ResultSort;
  brief: ManuscriptBrief;
  shortlist: ShortlistControls;
}) {
  if (!state || state.status === "loading") {
    return (
      <p className={styles.searchStatus} role="status">
        <Spinner aria-hidden="true" />
        Searching the index for &ldquo;{query}&rdquo;…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <Empty variant="bordered" role="status">
        <EmptyHeader>
          <EmptyTitle>Search is unavailable</EmptyTitle>
          <EmptyDescription>
            The magazine index couldn&apos;t be searched. Try again in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (state.cards.length === 0) {
    return (
      <Empty variant="bordered" role="status">
        <EmptyHeader>
          <EmptyTitle>No magazine matches &ldquo;{query}&rdquo;</EmptyTitle>
          <EmptyDescription>
            Check the spelling, or browse the full directory.
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
    );
  }
  return (
    <div className={styles.panel}>
      <p className={styles.laneDescription} role="status">
        {state.cards.length === 1
          ? "1 magazine matches"
          : `${state.cards.length} magazines match`}{" "}
        &ldquo;{query}&rdquo;, scored against your piece.
      </p>
      <ResultList
        cards={sortResults(state.cards, sort)}
        brief={brief}
        shortlist={shortlist}
      />
    </div>
  );
}
