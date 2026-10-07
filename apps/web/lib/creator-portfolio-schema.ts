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

export const PORTFOLIO_THEMES = [
  "default",
  "sage",
  "mineral",
  "night",
] as const;
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

/** Sections every profile has. A creator can reorder or hide them. */
export const CORE_MODULES = [
  "work",
  "upcoming",
  "shelf",
  "record",
  "press",
  "about",
] as const;
/**
 * Add-ons a creator switches on for their practice. They stay out of the
 * studio's section list, and out of the profile, until the creator adds them.
 */
export const ADDON_MODULES = [
  "editions",
  "shows",
  "collaborators",
  "booking",
  "services",
  "teaching",
  "support",
] as const;
/** Sections a creator can reorder or hide. Identity always comes first. */
export const PORTFOLIO_MODULES = [...CORE_MODULES, ...ADDON_MODULES] as const;
export type PortfolioModule = (typeof PORTFOLIO_MODULES)[number];
export type PortfolioAddon = (typeof ADDON_MODULES)[number];
export const isAddonModule = (id: PortfolioModule): id is PortfolioAddon =>
  (ADDON_MODULES as readonly string[]).includes(id);

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
export const SHOW_KINDS = [
  "solo",
  "group",
  "premiere",
  "screening",
  "performance",
  "other",
] as const;
export const BOOKING_FILE_TYPES = ["pdf", "zip"] as const;
export const PART_KINDS = ["text", "image", "audio"] as const;
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

/** One piece of a work made of several: a poem, a plate or a recording. */
const partSchema = z.object({
  id: itemId,
  kind: z.enum(PART_KINDS).default("text"),
  title: text(200),
  text: text(20000),
  image: media,
  audio: media,
  caption: text(300),
});

/** A timestamp inside a recording or film, like 09:40 or 1:02:30. */
const chapterSchema = z.object({
  id: itemId,
  at: z
    .string()
    .regex(/^$|^(\d{1,2}:)?\d{1,2}:\d{2}$/, "Use a time like 09:40.")
    .default(""),
  title: text(120),
});

const creditSchema = z.object({
  id: itemId,
  role: text(60),
  name: text(100),
  url: link,
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
  /** Address of the work's own page: /@handle/<slug>. Empty derives one. */
  slug: z
    .string()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case words and hyphens.")
    .max(60)
    .default(""),
  /** Plates and series: the group a work belongs to and its wall label. */
  series: text(80),
  medium: text(120),
  size: text(80),
  edition: text(60),
  /** Screening: a film link, with chapters and a transcript for access. */
  video: link,
  chapters: z.array(chapterSchema).max(40).default([]),
  transcript: text(30000),
  /** Case study, for commissioned work. */
  brief: text(300),
  role: text(200),
  client: text(120),
  clientOrganization: organization.optional(),
  outcome: text(300),
  /** The work's own page. */
  about: text(2000),
  madeDuring: text(120),
  supportedBy: text(120),
  rights: text(200),
  credits: z.array(creditSchema).max(12).default([]),
  parts: z.array(partSchema).max(60).default([]),
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

const count = z.number().int().min(0).max(100000).optional();

const editionSchema = z.object({
  id: itemId,
  title: text(200),
  image: media,
  medium: text(120),
  size: text(80),
  year: text(4),
  /** Edition size and how many are left. Enquiries only; there is no checkout. */
  total: count,
  available: count,
  note: text(200),
});

const showSchema = z.object({
  id: itemId,
  year: text(4),
  title: text(200),
  venue: text(200),
  kind: z.enum(SHOW_KINDS).default("other"),
  url: link,
});

/**
 * A person credited for the work. It shows publicly only once the other
 * creator lists this one back; `confirmed` is derived on every read.
 */
const collaboratorSchema = z.object({
  id: itemId,
  handle: text(30),
  name: text(100),
  role: text(120),
  confirmed: z.boolean().default(false),
});

const bookingFileSchema = z.object({
  id: itemId,
  label: text(80),
  file: media,
  /** Derived from the stored file on read; a client value is never trusted. */
  type: z.enum(BOOKING_FILE_TYPES).optional(),
  /** Up to the 20 MB the media route stores; the `count` cap is far too small. */
  bytes: z
    .number()
    .int()
    .min(0)
    .max(20 * 1024 * 1024)
    .optional(),
});

const serviceSchema = z.object({
  id: itemId,
  title: text(120),
  timing: text(60),
  price: text(60),
  note: text(200),
});

const teachingSchema = z.object({
  id: itemId,
  title: text(200),
  date: isoDate,
  place: text(120),
  /** Places left. Empty leaves it unstated. */
  places: count,
  note: text(300),
});

const supportSchema = z.object({
  label: text(80),
  url: link,
  note: text(200),
});

const moduleSchema = z.object({
  id: z.enum(PORTFOLIO_MODULES),
  visible: z.boolean().default(true),
  /** Add-ons only: whether the creator has switched this one on. */
  added: z.boolean().optional(),
});

export type ModuleEntry = {
  id: PortfolioModule;
  visible: boolean;
  added?: boolean;
};

export const DEFAULT_MODULES: ModuleEntry[] = PORTFOLIO_MODULES.map((id) =>
  isAddonModule(id)
    ? { id, visible: true, added: false }
    : { id, visible: true },
);

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
    ["editions", "ed"],
    ["shows", "sh"],
    ["collaborators", "c"],
    ["services", "sv"],
    ["teaching", "t"],
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
  editions: z.array(editionSchema).max(24).default([]),
  shows: z.array(showSchema).max(80).default([]),
  collaborators: z.array(collaboratorSchema).max(12).default([]),
  booking: z
    .object({
      shortBio: text(400),
      longBio: text(2000),
      files: z.array(bookingFileSchema).max(6).default([]),
    })
    .default({ shortBio: "", longBio: "", files: [] }),
  services: z.array(serviceSchema).max(12).default([]),
  teaching: z.array(teachingSchema).max(12).default([]),
  support: supportSchema.default({ label: "", url: "", note: "" }),
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
export type PortfolioPart = z.infer<typeof partSchema>;
export type PortfolioChapter = z.infer<typeof chapterSchema>;
export type PortfolioCredit = z.infer<typeof creditSchema>;
export type PortfolioEdition = z.infer<typeof editionSchema>;
export type PortfolioShow = z.infer<typeof showSchema>;
export type PortfolioCollaborator = z.infer<typeof collaboratorSchema>;
export type PortfolioBookingFile = z.infer<typeof bookingFileSchema>;
export type PortfolioService = z.infer<typeof serviceSchema>;
export type PortfolioTeaching = z.infer<typeof teachingSchema>;
export type PortfolioSupport = z.infer<typeof supportSchema>;
export type PortfolioOrganizationLink = z.infer<typeof organization>;

/**
 * A work with every optional field at its default. Defaults only: the fields
 * you pass are not validated, so design samples may use bundled media paths.
 */
export function createWork(work: Partial<PortfolioWork> = {}): PortfolioWork {
  return { ...workSchema.parse({}), ...work };
}

export function emptyPortfolio(): PortfolioData {
  return portfolioObject.parse({});
}

/** Every module once, in the creator's order, with unknown ids dropped. */
export function orderedModules(modules: PortfolioData["modules"]) {
  const seen = new Set<PortfolioModule>();
  const ordered: ModuleEntry[] = modules
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .map((entry) =>
      isAddonModule(entry.id)
        ? { ...entry, added: entry.added === true }
        : { id: entry.id, visible: entry.visible },
    );
  for (const entry of DEFAULT_MODULES)
    if (!seen.has(entry.id)) ordered.push({ ...entry });
  return ordered;
}

/** Core sections plus the add-ons the creator has switched on, in order. */
export function activeModules(
  modules: PortfolioData["modules"],
): ModuleEntry[] {
  return orderedModules(modules).filter(
    (entry) => !isAddonModule(entry.id) || entry.added,
  );
}

/** Switch an add-on on (or off). Its data is kept when it is switched off. */
export function setAddon(
  modules: PortfolioData["modules"],
  id: PortfolioAddon,
  added: boolean,
) {
  return orderedModules(modules).map((entry) =>
    entry.id === id ? { ...entry, added, visible: true } : entry,
  );
}

export type VerifiedOutcome = { title: string; venue: string };

/** What only the server can know about an add-on, keyed as noted. */
export type ServerFacts = {
  /** Handles (lower case) of creators who list this creator back. */
  confirmedHandles?: ReadonlySet<string>;
  /** Stored file type and size, keyed by the media id at the end of its URL. */
  files?: ReadonlyMap<string, { type: "pdf" | "zip"; bytes: number }>;
};

/**
 * Provenance is never trusted from the client. An entry is Confirmed only when
 * it cites an acceptance this account really received on Missa, and then its
 * title and venue come from that decision so the claim can't be reworded.
 * Otherwise it is Linked when it points at a directory profile, or Added.
 *
 * The same rule covers the add-ons: a collaborator is confirmed only when the
 * server says the other creator lists this one back, and a booking file's type
 * and size come from the stored file. Anything the client sent is replaced.
 */
export function withServerProvenance(
  draft: PortfolioData,
  outcomes: ReadonlyMap<string, VerifiedOutcome> = new Map(),
  facts: ServerFacts = {},
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
    collaborators: draft.collaborators.map((entry) => ({
      ...entry,
      confirmed:
        Boolean(entry.handle) &&
        Boolean(facts.confirmedHandles?.has(entry.handle.toLowerCase())),
    })),
    booking: {
      ...draft.booking,
      files: draft.booking.files.map(
        ({ type: _type, bytes: _bytes, ...file }) => {
          const stored = facts.files?.get(file.file.split("/").pop() ?? "");
          return stored ? { ...file, ...stored } : file;
        },
      ),
    },
  };
}

export function portfolioMediaIds(draft: PortfolioData) {
  return [
    ...new Set(
      [
        draft.photo,
        ...draft.shelf.map((item) => item.cover),
        ...draft.editions.map((item) => item.image),
        ...draft.booking.files.map((item) => item.file),
        ...draft.works.flatMap((w) => [
          w.image,
          w.audio,
          ...w.parts.flatMap((part) => [part.image, part.audio]),
        ]),
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
    ...draft.shows.map((item) => item.url),
    draft.support.url,
    ...draft.works.flatMap((work) => [
      work.url,
      work.video,
      ...work.credits.map((credit) => credit.url),
    ]),
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
 * read can re-verify Confirmed entries, and with `keepPendingCollaborators` so
 * the people credited can confirm against it; every read strips both again.
 */
export function publicPortfolioProjection(
  draft: PortfolioData,
  {
    keepOutcomeIds = false,
    keepPendingCollaborators = false,
  }: { keepOutcomeIds?: boolean; keepPendingCollaborators?: boolean } = {},
  today = new Date().toISOString().slice(0, 10),
): PortfolioData {
  const modules = orderedModules(draft.modules);
  const visible = new Set(
    modules
      .filter(
        (entry) => entry.visible && (!isAddonModule(entry.id) || entry.added),
      )
      .map((entry) => entry.id),
  );
  const show = <T>(id: PortfolioModule, items: T[]) =>
    visible.has(id) ? items : [];
  const files = draft.booking.files.filter(
    (item) => item.label.trim() && item.file,
  );
  return {
    ...draft,
    modules,
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
    editions: show(
      "editions",
      draft.editions.filter((item) => item.title.trim()),
    ),
    shows: show(
      "shows",
      draft.shows.filter((item) => item.title.trim()),
    ),
    // Both sides confirm before a credit shows. Publishing keeps the credits
    // that are still waiting (`keepPendingCollaborators`) so the other creator
    // can confirm them against this snapshot; every read drops them again.
    collaborators: show(
      "collaborators",
      draft.collaborators.filter(
        (item) =>
          (item.confirmed || keepPendingCollaborators) &&
          item.name.trim() &&
          item.handle.trim(),
      ),
    ),
    booking: visible.has("booking")
      ? { ...draft.booking, files }
      : { shortBio: "", longBio: "", files: [] },
    services: show(
      "services",
      draft.services.filter((item) => item.title.trim()),
    ),
    teaching: show(
      "teaching",
      draft.teaching.filter(
        (item) => item.title.trim() && (!item.date || item.date >= today),
      ),
    ),
    support:
      visible.has("support") && draft.support.url
        ? draft.support
        : { label: "", url: "", note: "" },
    openTo: draft.openTo.filter((item) => item.label.trim()),
  };
}
