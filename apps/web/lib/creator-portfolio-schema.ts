import { z } from "zod";
const text = (max: number) => z.string().max(max).default("");
const link = text(2048); // Incomplete links are allowed in private drafts.
const media = z
  .string()
  .regex(
    /^$|^\/api\/creator\/portfolio-media\/[0-9a-f-]{36}$/,
    "Upload this media before saving.",
  )
  .default("");
const isoDate = z
  .string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Use a full date.")
  .default("");
const itemId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,40}$/)
  .optional();

export const PORTFOLIO_THEMES = ["sage", "mineral", "night"] as const;
export type PortfolioTheme = (typeof PORTFOLIO_THEMES)[number];

/**
 * Older drafts carried `theme: "white"` or the retired `"paper"` theme (its
 * cream canvas conflicted with PRODUCT.md). Coerce any unknown or legacy value
 * to the canonical default so a stored draft or snapshot keeps loading.
 */
export function coercePortfolioTheme(value: unknown): PortfolioTheme {
  return typeof value === "string" &&
    (PORTFOLIO_THEMES as readonly string[]).includes(value)
    ? (value as PortfolioTheme)
    : "sage";
}

/** The craft lens decides which sections lead; it never changes the facts. */
export const PORTFOLIO_LENSES = [
  "mixed",
  "writing",
  "visual",
  "sound",
  "stage",
  "film",
  "design",
] as const;
export type PortfolioLens = (typeof PORTFOLIO_LENSES)[number];

export const PORTFOLIO_HEROES = ["portrait", "plate", "type"] as const;
export type PortfolioHero = (typeof PORTFOLIO_HEROES)[number];

/** Sections a creator can reorder or hide. Identity always comes first. */
export const PORTFOLIO_MODULES = [
  "work",
  "upcoming",
  "shelf",
  "record",
  "press",
  "about",
] as const;
export type PortfolioModule = (typeof PORTFOLIO_MODULES)[number];

export const SHELF_KINDS = [
  "book",
  "chapbook",
  "record",
  "catalogue",
  "other",
] as const;
export const RECORD_KINDS = [
  "publication",
  "prize",
  "residency",
  "grant",
  "exhibition",
  "performance",
  "screening",
  "other",
] as const;
export const AVAILABILITY_STATES = ["open", "from", "booked"] as const;
export const EVENT_STATUSES = ["open", "few", "soldout", "free"] as const;
/**
 * Confirmed means the organization recorded the outcome on Missa. Creators can
 * never set it: `withServerProvenance` derives the value on every write.
 */
export const PROVENANCE = ["confirmed", "linked", "added"] as const;
export type Provenance = (typeof PROVENANCE)[number];

const organization = z.object({
  id: text(200),
  name: text(200),
  kind: text(100),
  href: z
    .string()
    .regex(/^\/(journal|press|residency|grant|org)\/[a-zA-Z0-9_-]+$/),
});

const workSchema = z.object({
  id: itemId,
  title: text(200),
  text: text(20000),
  url: link,
  image: media,
  audio: media,
  formats: z.array(z.string().max(30)).max(6).default([]),
  kind: text(60),
  year: text(4),
  summary: text(300),
  caption: text(300),
  featured: z.boolean().default(false),
});

const shelfSchema = z.object({
  id: itemId,
  kind: z.enum(SHELF_KINDS).default("book"),
  title: text(200),
  publisher: text(200),
  year: text(4),
  cover: media,
  url: link,
  note: text(140),
});

const recordSchema = z.object({
  id: itemId,
  kind: z.enum(RECORD_KINDS).default("publication"),
  title: text(200),
  venue: text(200),
  year: text(4),
  url: link,
  organization: organization.optional(),
  /** A Missa decision id; only the server can turn it into Confirmed. */
  outcomeId: z
    .string()
    .regex(/^[A-Za-z0-9_:-]{1,120}$/)
    .optional(),
  provenance: z.enum(PROVENANCE).default("added"),
});

const eventSchema = z.object({
  id: itemId,
  kind: text(40),
  title: text(200),
  date: isoDate,
  time: z
    .string()
    .regex(/^$|^\d{2}:\d{2}$/, "Use a 24-hour time, like 19:30.")
    .default(""),
  place: text(200),
  url: link,
  status: z.enum(EVENT_STATUSES).default("open"),
});

const pressSchema = z.object({
  id: itemId,
  quote: text(320),
  source: text(160),
  url: link,
});

const availabilitySchema = z.object({
  id: itemId,
  label: text(48),
  state: z.enum(AVAILABILITY_STATES).default("open"),
  date: isoDate,
});

const moduleSchema = z.object({
  id: z.enum(PORTFOLIO_MODULES),
  visible: z.boolean().default(true),
});

export const DEFAULT_MODULES = PORTFOLIO_MODULES.map((id) => ({
  id,
  visible: true,
}));

export function createItemId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${random}`;
}

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asList = (value: unknown) => (Array.isArray(value) ? value : []);
const hasText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Accepts every stored draft shape. Version 1 drafts carried one `book`, one
 * `credit` and a two-item `sections` list; those become the first Shelf and
 * Track record entries and the module visibility list.
 */
export function migratePortfolioInput(input: unknown): unknown {
  if (!isObject(input)) return input;
  const draft: Loose = { ...input };
  const legacyBook = isObject(draft.book) ? draft.book : undefined;
  const legacyCredit = isObject(draft.credit) ? draft.credit : undefined;
  const legacySections = Array.isArray(draft.sections)
    ? (draft.sections as unknown[])
    : undefined;
  if (!Array.isArray(draft.shelf))
    draft.shelf =
      legacyBook && hasText(legacyBook.title)
        ? [
            {
              kind: "book",
              title: legacyBook.title,
              year: legacyBook.year ?? "",
              cover: legacyBook.cover ?? "",
              url: legacyBook.url ?? "",
            },
          ]
        : [];
  if (!Array.isArray(draft.record))
    draft.record =
      legacyCredit && hasText(legacyCredit.title)
        ? [
            {
              kind: "publication",
              title: legacyCredit.title,
              venue: legacyCredit.venue ?? "",
              year: legacyCredit.year ?? "",
              url: legacyCredit.url ?? "",
              organization: legacyCredit.organization,
            },
          ]
        : [];
  if (!Array.isArray(draft.modules) && legacySections)
    draft.modules = DEFAULT_MODULES.map((entry) => ({
      id: entry.id,
      visible:
        entry.id === "shelf"
          ? legacySections.includes("Books")
          : entry.id === "record"
            ? legacySections.includes("Selected publications")
            : true,
    }));
  if (draft.theme !== undefined)
    draft.theme = coercePortfolioTheme(draft.theme);
  delete draft.book;
  delete draft.credit;
  delete draft.sections;
  delete draft.work;
  if (!Array.isArray(draft.works) && isObject(input.work))
    draft.works = [input.work];
  for (const [key, prefix] of [
    ["works", "w"],
    ["shelf", "s"],
    ["record", "r"],
    ["events", "e"],
    ["press", "p"],
    ["openTo", "o"],
  ] as const)
    if (Array.isArray(draft[key]))
      draft[key] = asList(draft[key]).map((item) =>
        isObject(item) && !item.id
          ? { ...item, id: createItemId(prefix) }
          : item,
      );
  return draft;
}

const portfolioObject = z.object({
  handle: text(30),
  name: text(100),
  bio: text(600),
  statement: text(200),
  location: text(80),
  photo: media,
  selected: z.array(z.string().max(80)).max(12).default([]),
  lens: z.enum(PORTFOLIO_LENSES).default("mixed"),
  hero: z.enum(PORTFOLIO_HEROES).default("portrait"),
  now: z
    .object({ text: text(160), until: isoDate })
    .default({ text: "", until: "" }),
  openTo: z.array(availabilitySchema).max(8).default([]),
  works: z.array(workSchema).max(50).default([]),
  shelf: z.array(shelfSchema).max(24).default([]),
  record: z.array(recordSchema).max(80).default([]),
  events: z.array(eventSchema).max(24).default([]),
  press: z.array(pressSchema).max(12).default([]),
  contact: z
    .object({
      email: text(254),
      website: link,
      instagram: link,
      newsletter: link,
    })
    .default({ email: "", website: "", instagram: "", newsletter: "" }),
  modules: z.array(moduleSchema).max(PORTFOLIO_MODULES.length).default([]),
  /** Visitors may send a message through Missa without seeing any email. */
  inquiries: z.boolean().default(true),
  /** Organization members may invite this creator to apply to an open call. */
  invitations: z.boolean().default(true),
  theme: z.enum(PORTFOLIO_THEMES).default("sage"),
});

export const portfolioSchema = z.preprocess(
  migratePortfolioInput,
  portfolioObject,
);
export type PortfolioData = z.infer<typeof portfolioObject>;
export type PortfolioWork = z.infer<typeof workSchema>;
export type PortfolioShelfItem = z.infer<typeof shelfSchema>;
export type PortfolioRecordItem = z.infer<typeof recordSchema>;
export type PortfolioEvent = z.infer<typeof eventSchema>;
export type PortfolioPress = z.infer<typeof pressSchema>;
export type PortfolioAvailability = z.infer<typeof availabilitySchema>;
export type PortfolioOrganizationLink = z.infer<typeof organization>;

export function emptyPortfolio(): PortfolioData {
  return portfolioObject.parse({});
}

/** Every module once, in the creator's order, with unknown ids dropped. */
export function orderedModules(modules: PortfolioData["modules"]) {
  const seen = new Set<PortfolioModule>();
  const ordered = modules.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  for (const entry of DEFAULT_MODULES)
    if (!seen.has(entry.id)) ordered.push({ ...entry });
  return ordered;
}

export type VerifiedOutcome = { title: string; venue: string };

/**
 * Provenance is never trusted from the client. An entry is Confirmed only when
 * it cites an acceptance this account really received on Missa, and then its
 * title and venue come from that decision so the claim can't be reworded.
 * Otherwise it is Linked when it points at a directory profile, or Added.
 */
export function withServerProvenance(
  draft: PortfolioData,
  outcomes: ReadonlyMap<string, VerifiedOutcome> = new Map(),
): PortfolioData {
  return {
    ...draft,
    record: draft.record.map(({ outcomeId, ...entry }) => {
      const verified = outcomeId ? outcomes.get(outcomeId) : undefined;
      if (verified)
        return {
          ...entry,
          outcomeId,
          title: verified.title,
          venue: verified.venue,
          organization: undefined,
          provenance: "confirmed",
        };
      return {
        ...entry,
        provenance: entry.organization ? "linked" : "added",
      };
    }),
  };
}

export function portfolioMediaIds(draft: PortfolioData) {
  return [
    ...new Set(
      [
        draft.photo,
        ...draft.shelf.map((item) => item.cover),
        ...draft.works.flatMap((w) => [w.image, w.audio]),
      ]
        .filter(Boolean)
        .map((url) => url.split("/").pop()!),
    ),
  ];
}

function validWebLink(value: string) {
  try {
    const u = new URL(value);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}

export function publicationIssue(draft: PortfolioData): string | undefined {
  if (!draft.name.trim()) return "Add your display name before publishing.";
  for (const value of [
    draft.contact.website,
    draft.contact.instagram,
    draft.contact.newsletter,
    ...draft.shelf.map((item) => item.url),
    ...draft.record.map((item) => item.url),
    ...draft.events.map((item) => item.url),
    ...draft.press.map((item) => item.url),
    ...draft.works.map((work) => work.url),
  ]) {
    if (value && !validWebLink(value))
      return "Complete or remove unfinished links before publishing.";
  }
  if (draft.press.some((item) => !item.url))
    return "Add a source link to every press quote before publishing.";
  if (
    draft.contact.email &&
    !z.string().email().safeParse(draft.contact.email).success
  )
    return "Check your public contact email before publishing.";
}

/** Publish only what the preview shows; hidden and untitled items stay private. */
/**
 * What visitors may see. Publishing stores this with `keepOutcomeIds` so each
 * read can re-verify Confirmed entries; every read strips the ids again.
 */
export function publicPortfolioProjection(
  draft: PortfolioData,
  { keepOutcomeIds = false }: { keepOutcomeIds?: boolean } = {},
): PortfolioData {
  const visible = new Set(
    orderedModules(draft.modules)
      .filter((entry) => entry.visible)
      .map((entry) => entry.id),
  );
  const show = <T>(id: PortfolioModule, items: T[]) =>
    visible.has(id) ? items : [];
  return {
    ...draft,
    modules: orderedModules(draft.modules),
    works: show(
      "work",
      draft.works.filter((work) => work.title.trim()),
    ),
    shelf: show(
      "shelf",
      draft.shelf.filter((item) => item.title.trim()),
    ),
    // Decision ids stay private; visitors only see the resulting provenance.
    record: show(
      "record",
      draft.record
        .filter((item) => item.title.trim())
        .map(({ outcomeId, ...item }) =>
          keepOutcomeIds && outcomeId ? { ...item, outcomeId } : item,
        ),
    ),
    events: show(
      "upcoming",
      draft.events.filter((item) => item.title.trim() && item.date),
    ),
    press: show(
      "press",
      draft.press.filter((item) => item.quote.trim() && item.source.trim()),
    ),
    openTo: draft.openTo.filter((item) => item.label.trim()),
  };
}
