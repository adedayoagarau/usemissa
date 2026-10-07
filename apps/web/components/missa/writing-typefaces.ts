import localFont from "next/font/local";

/**
 * Typefaces a writer can choose for their own text in the writing room. They
 * style only WritingPages, never Missa's interface, which keeps Newsreader,
 * Instrument Sans and Fragment Mono (DESIGN.md, "Writer typefaces").
 *
 * All are SIL Open Font License faces kept in fonts/writing with their
 * licences and provenance. preload is off: a face is downloaded only when a
 * writer picks it.
 */

const courierPrime = localFont({
  src: "../../fonts/writing/courier-prime.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});
const iaWriterDuo = localFont({
  src: "../../fonts/writing/ia-writer-duo.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});
const anonymousPro = localFont({
  src: "../../fonts/writing/anonymous-pro.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});
const literata = localFont({
  src: "../../fonts/writing/literata.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});
const ebGaramond = localFont({
  src: "../../fonts/writing/eb-garamond.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});
const libreBaskerville = localFont({
  src: "../../fonts/writing/libre-baskerville.woff2",
  weight: "400 700",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});
const cormorantGaramond = localFont({
  src: "../../fonts/writing/cormorant-garamond.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});
const atkinsonHyperlegible = localFont({
  src: "../../fonts/writing/atkinson-hyperlegible-next.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

export type WritingTypefaceGroup = "serif" | "sans" | "typewriter";

export type WritingTypeface = {
  id: string;
  label: string;
  /** What the face is for, in a few words. */
  note: string;
  group: WritingTypefaceGroup;
  className: string;
};

export const WRITING_TYPEFACE_GROUPS: {
  id: WritingTypefaceGroup;
  label: string;
}[] = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans serif" },
  { id: "typewriter", label: "Typewriter" },
];

export const WRITING_TYPEFACES = [
  {
    id: "newsreader",
    label: "Newsreader",
    note: "Missa’s serif",
    group: "serif",
    className: "font-heading",
  },
  {
    id: "literata",
    label: "Literata",
    note: "Made for long reading",
    group: "serif",
    className: literata.className,
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    note: "Classic book serif",
    group: "serif",
    className: ebGaramond.className,
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    note: "Sharp, high contrast",
    group: "serif",
    className: libreBaskerville.className,
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    note: "Light and elegant",
    group: "serif",
    className: cormorantGaramond.className,
  },
  {
    id: "instrument-sans",
    label: "Instrument Sans",
    note: "Missa’s sans serif",
    group: "sans",
    className: "font-sans",
  },
  {
    id: "atkinson-hyperlegible",
    label: "Atkinson Hyperlegible",
    note: "Designed for low vision",
    group: "sans",
    className: atkinsonHyperlegible.className,
  },
  {
    id: "courier-prime",
    label: "Courier Prime",
    note: "The screenplay typewriter",
    group: "typewriter",
    className: courierPrime.className,
  },
  {
    id: "ia-writer-duo",
    label: "iA Writer Duo",
    note: "Typewriter rhythm, wider m and w",
    group: "typewriter",
    className: iaWriterDuo.className,
  },
  {
    id: "anonymous-pro",
    label: "Anonymous Pro",
    note: "Clear monospace",
    group: "typewriter",
    className: anonymousPro.className,
  },
] as const satisfies readonly WritingTypeface[];

export type WritingTypefaceId = (typeof WRITING_TYPEFACES)[number]["id"];

export const DEFAULT_WRITING_TYPEFACE: WritingTypefaceId = "newsreader";

export function writingTypeface(id: string): WritingTypeface {
  return (
    WRITING_TYPEFACES.find((face) => face.id === id) ?? WRITING_TYPEFACES[0]
  );
}

/** Reads a stored choice, including the "serif" and "sans" of the first version. */
export function storedWritingTypeface(value: unknown): WritingTypefaceId {
  if (value === "serif") return "newsreader";
  if (value === "sans") return "instrument-sans";
  return WRITING_TYPEFACES.some((face) => face.id === value)
    ? (value as WritingTypefaceId)
    : DEFAULT_WRITING_TYPEFACE;
}
