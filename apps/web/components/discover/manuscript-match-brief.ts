import type { ManuscriptMatchInput } from "@missa/radar-adapters";

/** What the writer describes; shared by the server's first match and the form. */
export interface ManuscriptBrief {
  genre: ManuscriptMatchInput["genre"];
  wordCount: number;
  poemCount: number;
  aestheticTags: string[];
  compAuthors: string[];
  isDebutAuthor: boolean;
  allowSimultaneous: boolean;
  feeTolerance: NonNullable<ManuscriptMatchInput["feeTolerance"]>;
  minPayRate: NonNullable<ManuscriptMatchInput["minPayRate"]>;
  /** Where the writer is from, for prizes with nationality rules; "" when not given. */
  writerCountry: string;
}

export const DEFAULT_MANUSCRIPT_BRIEF: ManuscriptBrief = {
  genre: "fiction",
  wordCount: 3500,
  poemCount: 3,
  aestheticTags: ["fabulist", "lyric"],
  compAuthors: ["Carmen Maria Machado"],
  isDebutAuthor: true,
  allowSimultaneous: true,
  feeTolerance: "free_only",
  minPayRate: "all",
  writerCountry: "",
};

export const FORMS: Array<{ value: ManuscriptBrief["genre"]; label: string }> =
  [
    { value: "fiction", label: "Fiction" },
    { value: "flash", label: "Flash" },
    { value: "nonfiction", label: "Nonfiction" },
    { value: "poetry", label: "Poetry" },
    { value: "hybrid", label: "Hybrid" },
  ];

type StyleOption = { value: string; label: string };

const PROSE_STYLES: StyleOption[] = [
  { value: "fabulist", label: "Fabulist" },
  { value: "surrealist", label: "Surreal" },
  { value: "lyric", label: "Lyric" },
  { value: "realist", label: "Realist" },
  { value: "speculative", label: "Speculative" },
  { value: "dark", label: "Dark" },
  { value: "horror", label: "Literary horror" },
  { value: "experimental", label: "Experimental" },
  { value: "minimalist", label: "Minimalist" },
  { value: "humorous", label: "Funny" },
  { value: "historical", label: "Historical" },
  { value: "autofiction", label: "Autofiction" },
  { value: "political", label: "Political" },
  { value: "climate", label: "Climate" },
  { value: "queer", label: "Queer" },
  { value: "hybrid", label: "Hybrid" },
];

const POETRY_STYLES: StyleOption[] = [
  { value: "lyric", label: "Lyric" },
  { value: "narrative", label: "Narrative" },
  { value: "free-verse", label: "Free verse" },
  { value: "formal", label: "Formal verse" },
  { value: "prose-poetry", label: "Prose poetry" },
  { value: "experimental", label: "Experimental" },
  { value: "persona", label: "Persona" },
  { value: "elegy", label: "Elegy" },
  { value: "ghazal", label: "Ghazal" },
  { value: "sonnet", label: "Sonnet" },
  { value: "documentary", label: "Documentary" },
  { value: "ecopoetry", label: "Ecopoetry" },
  { value: "political", label: "Political" },
  { value: "personal", label: "Personal" },
  { value: "humorous", label: "Funny" },
  { value: "visual", label: "Visual" },
];

const NONFICTION_STYLES: StyleOption[] = [
  { value: "personal", label: "Personal essay" },
  { value: "lyric", label: "Lyric essay" },
  { value: "memoir", label: "Memoir" },
  { value: "criticism", label: "Criticism" },
  { value: "reportage", label: "Reportage" },
  { value: "nature", label: "Nature writing" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "humorous", label: "Funny" },
  { value: "political", label: "Political" },
  { value: "experimental", label: "Experimental" },
  { value: "hybrid", label: "Hybrid" },
];

/** Styles offered for a form. Selected styles from another form stay visible. */
export function styleOptions(
  genre: ManuscriptBrief["genre"],
  selected: string[],
): StyleOption[] {
  const base =
    genre === "poetry"
      ? POETRY_STYLES
      : genre === "nonfiction"
        ? NONFICTION_STYLES
        : PROSE_STYLES;
  const extra = selected
    .filter((value) => !base.some((option) => option.value === value))
    .map((value) => ({ value, label: styleLabel(value) }));
  return [...base, ...extra];
}

export function styleLabel(value: string): string {
  const option = [...PROSE_STYLES, ...POETRY_STYLES, ...NONFICTION_STYLES].find(
    (entry) => entry.value === value,
  );
  return option?.label ?? value.replace(/-/g, " ");
}

/** Typed lengths accept any value in range; the slider moves in steps. */
export const WORDS = {
  min: 50,
  max: 30000,
  sliderMin: 0,
  sliderMax: 12000,
  step: 250,
};
export const POEMS = { min: 1, max: 10, sliderMin: 1, sliderMax: 10, step: 1 };

export function clamp(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

export function manuscriptMatchPayload(
  brief: ManuscriptBrief,
  query?: string,
): ManuscriptMatchInput {
  const poetry = brief.genre === "poetry";
  return {
    genre: brief.genre,
    wordCount: poetry ? undefined : brief.wordCount,
    poemCount: poetry ? brief.poemCount : undefined,
    aestheticTags: brief.aestheticTags,
    compAuthors: brief.compAuthors,
    isDebutAuthor: brief.isDebutAuthor,
    allowSimultaneous: brief.allowSimultaneous,
    feeTolerance: brief.feeTolerance,
    minPayRate: brief.minPayRate,
    ...(brief.writerCountry ? { writerCountry: brief.writerCountry } : {}),
    ...(query ? { query } : {}),
  };
}

/** One line describing the brief, for the mobile summary and the shortlist. */
export function briefSummary(brief: ManuscriptBrief) {
  const form = FORMS.find((entry) => entry.value === brief.genre)?.label;
  const length =
    brief.genre === "poetry"
      ? `${brief.poemCount} ${brief.poemCount === 1 ? "poem" : "poems"}`
      : `${brief.wordCount.toLocaleString()} words`;
  return [
    form,
    length,
    ...brief.aestheticTags.map(styleLabel),
    ...brief.compAuthors,
  ]
    .filter(Boolean)
    .join(" · ");
}

const FEES: ManuscriptBrief["feeTolerance"][] = [
  "free_only",
  "fee_ok_with_waivers",
  "any",
];
const PAY: ManuscriptBrief["minPayRate"][] = [
  "all",
  "any_paying",
  "pro_rates_only",
];

/** The brief as URL parameters, so a search can be shared or bookmarked. */
export function briefToSearchParams(brief: ManuscriptBrief): URLSearchParams {
  const params = new URLSearchParams();
  params.set("form", brief.genre);
  if (brief.genre === "poetry") params.set("poems", String(brief.poemCount));
  else params.set("words", String(brief.wordCount));
  if (brief.aestheticTags.length)
    params.set("style", brief.aestheticTags.join(","));
  for (const writer of brief.compAuthors) params.append("writer", writer);
  params.set("debut", brief.isDebutAuthor ? "1" : "0");
  params.set("simultaneous", brief.allowSimultaneous ? "1" : "0");
  params.set("fees", brief.feeTolerance);
  params.set("pay", brief.minPayRate);
  if (brief.writerCountry) params.set("country", brief.writerCountry);
  return params;
}

/** A brief read from URL parameters, or null when the URL holds none. */
export function briefFromSearchParams(
  params: URLSearchParams,
): ManuscriptBrief | null {
  const form = params.get("form");
  const genre = FORMS.find((entry) => entry.value === form)?.value;
  if (!genre) return null;
  const number = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const fees = params.get("fees") as ManuscriptBrief["feeTolerance"];
  const pay = params.get("pay") as ManuscriptBrief["minPayRate"];
  return {
    genre,
    wordCount: clamp(
      number("words", DEFAULT_MANUSCRIPT_BRIEF.wordCount),
      WORDS,
    ),
    poemCount: clamp(
      number("poems", DEFAULT_MANUSCRIPT_BRIEF.poemCount),
      POEMS,
    ),
    aestheticTags: (params.get("style") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 20),
    compAuthors: params
      .getAll("writer")
      .map((value) => value.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20),
    isDebutAuthor: params.get("debut") !== "0",
    allowSimultaneous: params.get("simultaneous") !== "0",
    feeTolerance: FEES.includes(fees)
      ? fees
      : DEFAULT_MANUSCRIPT_BRIEF.feeTolerance,
    minPayRate: PAY.includes(pay) ? pay : DEFAULT_MANUSCRIPT_BRIEF.minPayRate,
    writerCountry: (params.get("country") ?? "").trim().slice(0, 60),
  };
}
