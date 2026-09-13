"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Layers,
  Flame,
  Clock,
  CheckCircle2,
  ExternalLink,
  Check,
} from "lucide-react";
import type {
  ManuscriptMatchInput,
  ManuscriptMatchResponse,
  ManuscriptMatchCard,
} from "@missa/radar-adapters";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { EditorialIntelligenceDrawer } from "@/components/rankings/editorial-intelligence-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";

const PRESET_STYLES = [
  "fabulist",
  "surrealist",
  "lyric",
  "realist",
  "dark",
  "experimental",
  "personal",
  "minimalist",
  "prose-poetry",
  "ghazal",
  "hybrid",
  "humorous",
];

const PRESET_COMPS = [
  "Ocean Vuong",
  "Carmen Maria Machado",
  "Kelly Link",
  "Lydia Davis",
  "George Saunders",
  "Maggie Nelson",
  "Ben Lerner",
  "Ada Limón",
  "Kaveh Akbar",
  "Lorrie Moore",
];

interface ManuscriptMatchWizardProps {
  initialData?: ManuscriptMatchResponse;
}

export function ManuscriptMatchWizard({
  initialData,
}: ManuscriptMatchWizardProps) {
  const [genre, setGenre] =
    useState<ManuscriptMatchInput["genre"]>("fiction");
  const [wordCount, setWordCount] = useState<number>(3500);
  const [poemCount, setPoemCount] = useState<number>(3);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    "fabulist",
    "lyric",
  ]);
  const [selectedComps, setSelectedComps] = useState<string[]>([
    "Carmen Maria Machado",
  ]);
  const [isDebutAuthor, setIsDebutAuthor] = useState<boolean>(true);
  const [feeTolerance, setFeeTolerance] =
    useState<ManuscriptMatchInput["feeTolerance"]>("free_only");
  const [minPayRate, setMinPayRate] =
    useState<ManuscriptMatchInput["minPayRate"]>("all");
  const [allowSimultaneous, setAllowSimultaneous] = useState<boolean>(true);

  const [results, setResults] = useState<ManuscriptMatchResponse | null>(
    initialData ?? null,
  );
  const [activeTab, setActiveTab] = useState<
    "dream_reach" | "debut_champions" | "rapid_pro" | "packet_builder"
  >("debut_champions");

  const [isPending, startTransition] = useTransition();

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    );
  };

  const toggleComp = (comp: string) => {
    setSelectedComps((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp],
    );
  };

  const handleRunMatch = () => {
    startTransition(async () => {
      try {
        const payload: ManuscriptMatchInput = {
          genre,
          wordCount: genre === "poetry" ? undefined : wordCount,
          poemCount: genre === "poetry" ? poemCount : undefined,
          aestheticTags: selectedStyles,
          compAuthors: selectedComps,
          isDebutAuthor,
          feeTolerance,
          minPayRate,
          allowSimultaneous,
        };

        const res = await fetch("/api/discover/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Match computation failed");
        const data = (await res.json()) as ManuscriptMatchResponse;
        setResults(data);
        toast.success(`Matched across ${data.totalAnalyzed.toLocaleString()} publication profiles`);
      } catch {
        toast.error("Failed to generate manuscript strategy matches");
      }
    });
  };

  const currentCards: ManuscriptMatchCard[] = results
    ? activeTab === "dream_reach"
      ? results.dreamReach
      : activeTab === "debut_champions"
        ? results.debutChampions
        : activeTab === "rapid_pro"
          ? results.rapidPro
          : results.simultaneousPackets
    : [];

  return (
    <div className="space-y-10">
      <section className="border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--text-primary)]" />
              <h2 className="font-serif text-xl font-medium text-[var(--text-primary)]">
                Manuscript Strategy & Submission Matcher
              </h2>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Input your piece specs and style markers to calculate fit scores across the Missa magazine index.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleRunMatch}
            disabled={isPending}
          >
            {isPending ? (
              <Clock className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isPending ? "Calculating fit..." : "Find Matching Journals"}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Genre & Specs */}
          <div className="space-y-4">
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Genre / Form
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(
                  ["fiction", "poetry", "nonfiction", "flash", "hybrid"] as const
                ).map((g) => (
                  <Button
                    key={g}
                    type="button"
                    onClick={() => setGenre(g)}
                    variant={genre === g ? "default" : "outline"}
                    size="xs"
                    aria-pressed={genre === g}
                    className="capitalize"
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>

            {genre === "poetry" ? (
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Poem Count in Submission ({poemCount} poems)
                </label>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={poemCount}
                  onChange={(e) => setPoemCount(Number(e.target.value))}
                  aria-label="Poem count in submission"
                  className="mt-2 w-full accent-[var(--text-primary)]"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Word Count
                  </label>
                  <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                    {wordCount.toLocaleString()} words
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={12000}
                  step={250}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  aria-label="Manuscript word count"
                  className="mt-2 w-full accent-[var(--text-primary)]"
                />
              </div>
            )}
          </div>

          {/* Aesthetic Styles & Forms */}
          <div className="space-y-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Aesthetic Tone & Markers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_STYLES.map((style) => {
                const isSelected = selectedStyles.includes(style);
                return (
                  <Button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    variant={isSelected ? "default" : "outline"}
                    size="xs"
                    aria-pressed={isSelected}
                  >
                    #{style}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Author Comps */}
          <div className="space-y-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Comp Author Influences
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COMPS.map((comp) => {
                const isSelected = selectedComps.includes(comp);
                return (
                  <Button
                    key={comp}
                    type="button"
                    onClick={() => toggleComp(comp)}
                    variant={isSelected ? "secondary" : "outline"}
                    size="xs"
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check className="size-3" />}
                    {comp}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters & Toggles */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDebutAuthor}
              onChange={(e) => setIsDebutAuthor(e.target.checked)}
              className="rounded accent-[var(--text-primary)]"
            />
            <span className="font-medium text-[var(--text-primary)]">
              I am a debut / first-time author
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowSimultaneous}
              onChange={(e) => setAllowSimultaneous(e.target.checked)}
              className="rounded accent-[var(--text-primary)]"
            />
            <span className="text-[var(--text-secondary)]">
              Allows simultaneous submissions
            </span>
          </label>

          <Field className="min-w-56 gap-1">
            <FieldLabel htmlFor="match-fee-policy">Fee policy</FieldLabel>
            <NativeSelect
              id="match-fee-policy"
              value={feeTolerance}
              onChange={(e) =>
                setFeeTolerance(
                  e.target.value as ManuscriptMatchInput["feeTolerance"],
                )
              }
            >
              <option value="free_only">No fee / Fee-waiver required</option>
              <option value="fee_ok_with_waivers">Fee OK with waivers</option>
              <option value="any">Any fee policy</option>
            </NativeSelect>
          </Field>

          <Field className="min-w-52 gap-1">
            <FieldLabel htmlFor="match-pay-rate">Contributor pay</FieldLabel>
            <NativeSelect
              id="match-pay-rate"
              value={minPayRate}
              onChange={(e) =>
                setMinPayRate(
                  e.target.value as ManuscriptMatchInput["minPayRate"],
                )
              }
            >
              <option value="all">All magazines</option>
              <option value="any_paying">Paying contributors only</option>
              <option value="pro_rates_only">Pro Rates Only (≥ $0.08/w)</option>
            </NativeSelect>
          </Field>
        </div>
      </section>

      {/* 2. Results Section & Strategy Tiers */}
      {results && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setActiveTab("debut_champions")}
                variant={activeTab === "debut_champions" ? "default" : "ghost"}
                size="sm"
                aria-pressed={activeTab === "debut_champions"}
              >
                <Flame className="size-3.5" />
                Debut & Slush Champions ({results.debutChampions.length})
              </Button>

              <Button
                type="button"
                onClick={() => setActiveTab("dream_reach")}
                variant={activeTab === "dream_reach" ? "default" : "ghost"}
                size="sm"
                aria-pressed={activeTab === "dream_reach"}
              >
                <Sparkles className="size-3.5" />
                Prestige / Dream Reach ({results.dreamReach.length})
              </Button>

              <Button
                type="button"
                onClick={() => setActiveTab("rapid_pro")}
                variant={activeTab === "rapid_pro" ? "default" : "ghost"}
                size="sm"
                aria-pressed={activeTab === "rapid_pro"}
              >
                <Clock className="size-3.5" />
                Rapid Response & Pro Pay ({results.rapidPro.length})
              </Button>

              <Button
                type="button"
                onClick={() => setActiveTab("packet_builder")}
                variant={activeTab === "packet_builder" ? "default" : "ghost"}
                size="sm"
                aria-pressed={activeTab === "packet_builder"}
              >
                <Layers className="size-3.5" />
                Simultaneous Packets ({results.simultaneousPackets.length})
              </Button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Ranked from {results.totalAnalyzed.toLocaleString()} publications
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {currentCards.map((card) => (
              <Card
                key={card.profileId}
                className="justify-between"
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-[var(--text-primary)]">
                        {card.name}
                      </h3>
                      {card.aesthetic.editorialMotto && (
                        <p className="mt-1 font-serif text-xs italic text-[var(--text-secondary)] line-clamp-1">
                          &ldquo;{card.aesthetic.editorialMotto}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                        {card.matchScore}% Fit
                      </span>
                      <RankingTierBadge tier={card.prestigeTier} />
                    </div>
                  </div>

                  {/* Compatibility Reasons */}
                  <div className="mt-3 space-y-1">
                    {card.reasons.slice(0, 3).map((reason, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
                      >
                        <CheckCircle2 className="size-3 text-[var(--text-primary)] shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats Bar */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-2 text-center text-xs">
                    <div>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {card.telemetry.medianResponseDays}d
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Median Turnaround
                      </p>
                    </div>
                    <div>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {card.aesthetic.unsolicitedSlushRatioPercent}%
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Slush Ratio
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {card.compensation.isProRate
                          ? "Pro Rate"
                          : card.compensation.paysContributors
                            ? "Paid"
                            : "Unpaid"}
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Contributor Pay
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="mt-5 justify-between pt-3 text-xs">
                  <EditorialIntelligenceDrawer
                    profileId={card.profileId}
                    magazineName={card.name}
                    magazineSlug={card.slug}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:underline"
                      >
                        Explore Dossier & DNA →
                      </button>
                    }
                  />

                  <Link
                    href={`/journal/${card.slug}`}
                    className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    View Journal <ExternalLink className="size-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
