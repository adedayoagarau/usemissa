/**
 * Type recipes for long-form guides. Each adapts a licensed Shadcn Studio
 * typography variant (components/shadcn-studio/typography) to Missa's three
 * families and type scale (DESIGN.md §4): Newsreader for editorial headings,
 * Instrument Sans for reading and interface text, Fragment Mono for dates.
 * Spacing between blocks comes from the Spacious density tokens on the page.
 */
export const guideType = {
  /** typography-01 at the page display size: 36px, 48px from md. */
  title:
    "font-heading text-4xl font-medium tracking-tight text-balance md:text-5xl",
  /** typography-01 at the marketing display size, for the guides index. */
  display:
    "font-heading text-5xl font-medium tracking-tight text-balance md:text-6xl",
  /** typography-10 (large), muted: the standfirst under a title. */
  dek: "text-lg text-pretty text-muted-foreground md:text-xl",
  /** typography-02 at the editorial section size. */
  h2: "scroll-mt-24 font-heading text-2xl font-medium tracking-tight text-balance md:text-3xl",
  /** typography-03 at the interface card-title size. */
  h3: "scroll-mt-24 text-lg font-semibold text-balance",
  h4: "text-base font-semibold",
  /** typography-05 at body large from md. */
  body: "text-base text-pretty md:text-lg",
  /** typography-06, set in the editorial face for quotations. */
  quote:
    "border-s-2 border-border-strong ps-6 font-heading text-xl text-pretty italic",
  /** typography-08. */
  list: "ms-6 list-disc space-y-2 marker:text-muted-foreground",
  /** typography-09. */
  code: "rounded-md bg-muted px-1 py-0.5 font-mono text-sm",
  /** typography-12. */
  muted: "text-sm text-pretty text-muted-foreground",
  /** typography-11 in the primary role: a short label above a heading. */
  eyebrow: "text-sm font-medium text-primary",
  /** A taxonomy caption on cards and covers (DESIGN.md caption role). */
  caption: "text-xs font-semibold text-muted-foreground",
  /** Links inside prose: typography-15's underline treatment in Forest. */
  link: "font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
} as const;
