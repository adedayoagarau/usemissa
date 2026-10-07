import type {
  PortfolioPart,
  PortfolioRecordItem,
  PortfolioWork,
} from "./creator-portfolio-schema";

/**
 * Words that already mean something after /@handle, so a work can't take them.
 * `cv` and `share.png` are routes today; the rest are held for the share kit.
 */
export const RESERVED_WORK_SLUGS = [
  "cv",
  "share",
  "story",
  "events",
  "event",
  "signature",
  "work",
  "works",
] as const;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * The address of each work's page, in the creator's order. A slug the creator
 * set wins; otherwise it comes from the title. A word that is reserved or
 * already taken gets a number, so every address on a profile is unique and
 * stable while the works around it are reordered.
 */
export function workSlugs(works: readonly PortfolioWork[]): string[] {
  const taken = new Set<string>(RESERVED_WORK_SLUGS);
  // Slugs a creator chose are honoured first, wherever the work sits.
  const chosen = works.map((work) => slugify(work.slug));
  for (const slug of chosen) if (slug) taken.add(slug);
  const used = new Set<string>();
  return works.map((work, index) => {
    const preferred = chosen[index];
    if (
      preferred &&
      !used.has(preferred) &&
      !RESERVED_WORK_SLUGS.includes(preferred as never)
    ) {
      used.add(preferred);
      return preferred;
    }
    const base =
      slugify(work.title) || slugify(work.id ?? "") || `work-${index + 1}`;
    let slug = base;
    for (let n = 2; taken.has(slug) || used.has(slug); n++)
      slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  });
}

export function workSlug(work: PortfolioWork, works: readonly PortfolioWork[]) {
  const index = works.indexOf(work);
  return index < 0 ? slugify(work.title) : workSlugs(works)[index];
}

/** /@handle/<slug>, or undefined until the profile has a handle. */
export function workHref(
  handle: string,
  work: PortfolioWork,
  works: readonly PortfolioWork[],
) {
  const slug = workSlug(work, works);
  return handle && slug ? `/@${handle}/${slug}` : undefined;
}

/** Finds the work a /@handle/<slug> address names. */
export function workBySlug(works: readonly PortfolioWork[], slug: string) {
  const index = workSlugs(works).indexOf(slug);
  return index < 0 ? undefined : { work: works[index], index };
}

/**
 * The work a requested address means. An address in another case still finds
 * its work, and `slug` is the address the page really has, so the route can
 * send the visitor there.
 */
export function findWorkByAddress(
  works: readonly PortfolioWork[],
  requested: string,
) {
  const found =
    workBySlug(works, requested) ?? workBySlug(works, requested.toLowerCase());
  return found ? { ...found, slug: workSlugs(works)[found.index] } : undefined;
}

/** The works either side of one, for Previous and Next on a work page. */
export function workNeighbours(works: readonly PortfolioWork[], index: number) {
  return {
    previous: index > 0 ? works[index - 1] : undefined,
    next: index < works.length - 1 ? works[index + 1] : undefined,
  };
}

/* ---------- The page itself ---------- */

type PartKind = PortfolioPart["kind"];

/** One part as the page shows it: numbered, labelled and anchored. */
export type WorkPart = {
  /** Position among the parts shown, from 1. */
  number: number;
  /** Id of the part's section, so the contents list can jump to it. */
  anchor: string;
  kind: PartKind;
  /** The title as written; empty when the creator left it blank. */
  title: string;
  /** The title, or a plain name such as "Plate 3" when there is none. */
  heading: string;
  text: string;
  image: string;
  audio: string;
  caption: string;
  /** "Poem 3 of 9", or just "Recording" when it is the only one of its kind. */
  label: string;
};

const TEXT_NOUNS: Array<[RegExp, string, string]> = [
  [/poem/i, "poem", "poems"],
  [/essay/i, "essay", "essays"],
  [/stor(?:y|ies)|fiction/i, "story", "stories"],
  [/chapter/i, "chapter", "chapters"],
  [/letter/i, "letter", "letters"],
];

/** What one part of this work is called, in the singular and the plural. */
export function partNouns(work: Pick<PortfolioWork, "kind">, kind: PartKind) {
  if (kind === "image") return { one: "plate", many: "plates" };
  if (kind === "audio") return { one: "recording", many: "recordings" };
  const match = TEXT_NOUNS.find(([pattern]) => pattern.test(work.kind));
  return match
    ? { one: match[1], many: match[2] }
    : { one: "text", many: "texts" };
}

const capitalise = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : value;

/** A part with nothing to show is left out, so counts never overstate. */
function hasContent(part: PortfolioPart) {
  if (part.kind === "image") return Boolean(part.image);
  if (part.kind === "audio") return Boolean(part.audio);
  return Boolean(part.text.trim());
}

/**
 * The parts that have something to show, in the creator's order. Counts, the
 * contents list and the page all read this one list.
 */
export function workParts(work: Pick<PortfolioWork, "kind" | "parts">) {
  const shown = work.parts.filter(hasContent);
  const seen: Record<PartKind, number> = { text: 0, image: 0, audio: 0 };
  const total: Record<PartKind, number> = { text: 0, image: 0, audio: 0 };
  for (const part of shown) total[part.kind]++;
  return shown.map((part, index): WorkPart => {
    const ofKind = ++seen[part.kind];
    const noun = capitalise(partNouns(work, part.kind).one);
    const alone = total[part.kind] === 1;
    return {
      number: index + 1,
      anchor: `part-${index + 1}`,
      kind: part.kind,
      title: part.title.trim(),
      heading: part.title.trim() || (alone ? noun : `${noun} ${ofKind}`),
      text: part.text,
      image: part.image,
      audio: part.audio,
      caption: part.caption.trim(),
      label: alone ? noun : `${noun} ${ofKind} of ${total[part.kind]}`,
    };
  });
}

/** How many of each kind, in the order they first appear. */
export function workCounts(work: Pick<PortfolioWork, "kind" | "parts">) {
  const counts = new Map<PartKind, number>();
  for (const part of workParts(work))
    counts.set(part.kind, (counts.get(part.kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => {
    const nouns = partNouns(work, kind);
    return {
      kind,
      count,
      text: `${count} ${count === 1 ? nouns.one : nouns.many}`,
    };
  });
}

/**
 * "9 poems · 14 plates · 1 recording". Empty unless the work has more than one
 * part, because a single part needs no count.
 */
export function workCountsLine(work: Pick<PortfolioWork, "kind" | "parts">) {
  if (workParts(work).length < 2) return "";
  return workCounts(work)
    .map((entry) => entry.text)
    .join(" · ");
}

/** The contents list: every part in order. Empty unless there is more than one. */
export function workContents(work: Pick<PortfolioWork, "kind" | "parts">) {
  const parts = workParts(work);
  return parts.length < 2
    ? []
    : parts.map(({ anchor, number, heading, kind }) => ({
        anchor,
        number,
        title: heading,
        kind,
      }));
}

export type WorkBlock =
  | { type: "text"; part: WorkPart }
  | { type: "plates"; parts: WorkPart[] }
  | { type: "recording"; part: WorkPart };

/**
 * The parts as the page lays them out: still in order, but plates that follow
 * one another sit together in a group, the way a wall of prints does.
 */
export function workBlocks(parts: readonly WorkPart[]): WorkBlock[] {
  const blocks: WorkBlock[] = [];
  for (const part of parts) {
    const last = blocks[blocks.length - 1];
    if (part.kind === "image" && last?.type === "plates") last.parts.push(part);
    else if (part.kind === "image")
      blocks.push({ type: "plates", parts: [part] });
    else if (part.kind === "audio") blocks.push({ type: "recording", part });
    else blocks.push({ type: "text", part });
  }
  return blocks;
}

/** Blank lines separate stanzas or paragraphs; single line breaks are kept. */
export function stanzas(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .filter((block) => block.trim());
}

/** The page would show only a title: no words, picture, sound or parts. */
export function isThinWorkPage(work: PortfolioWork) {
  return !(
    work.summary.trim() ||
    work.about.trim() ||
    work.text.trim() ||
    work.image ||
    work.audio ||
    workParts(work).length
  );
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** The sentence search results and link previews show for a work page. */
export function workPageDescription(work: PortfolioWork, creator: string) {
  const text =
    oneLine(work.summary) ||
    oneLine(work.about) ||
    oneLine(workParts(work).find((part) => part.kind === "text")?.text ?? "") ||
    oneLine(work.text) ||
    `${work.kind.trim() || "Work"} by ${creator}.`;
  return text.length > 300 ? `${text.slice(0, 297).trimEnd()}…` : text;
}

/* ---------- Published in ---------- */

const words = (value: string) =>
  ` ${value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

const TRUST: Record<PortfolioRecordItem["provenance"], number> = {
  confirmed: 2,
  linked: 1,
  added: 0,
};

/**
 * The publication on the track record that names this work. A title matches
 * as whole words, so "Window" finds “Window”, Issue 3 and not Windowpane. Only
 * publications count: a prize or a show is not where a work was published.
 * When several entries name it, the best-evidenced and newest one wins.
 */
export function recordEntryForWork(
  work: Pick<PortfolioWork, "title">,
  record: readonly PortfolioRecordItem[],
) {
  const needle = words(work.title);
  if (needle.trim().length < 3) return undefined;
  return record
    .filter(
      (entry) =>
        entry.kind === "publication" && words(entry.title).includes(needle),
    )
    .sort(
      (a, b) =>
        TRUST[b.provenance] - TRUST[a.provenance] ||
        b.year.localeCompare(a.year),
    )[0];
}

/**
 * What the entry's title says besides the work's own name, such as "Issue 14".
 * Empty when the title is only the work's name.
 */
export function recordEntryDetail(
  work: Pick<PortfolioWork, "title">,
  entry: Pick<PortfolioRecordItem, "title">,
) {
  const escaped = work.title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return "";
  return entry.title
    .replace(new RegExp(escaped, "i"), "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

/* ---------- Rights ---------- */

/**
 * The line at the foot of the page. The creator's own words win. Without them
 * the page says the work is shared for reading and, only when a visitor has a
 * way to write, where to ask about anything more.
 */
export function workRights(
  work: Pick<PortfolioWork, "rights" | "year">,
  creator: string,
  canContact: boolean,
) {
  const own = work.rights.trim();
  if (own) return { notice: own, ask: "", custom: true };
  const year = work.year.trim();
  return {
    notice: `© ${creator}${year ? ` ${year}` : ""}. Shared here for reading.`,
    ask: canContact ? "For permissions, get in touch." : "",
    custom: false,
  };
}

/* ---------- Page address, for the studio ---------- */

export type WorkAddress = {
  /** The address this work really gets. */
  slug: string;
  /** What the creator typed, tidied. Empty when the address comes from the title. */
  requested: string;
  /**
   * Why the address is not the one asked for or the plain title:
   * `reserved` (Missa uses the word), `taken` (another work has it) or
   * `numbered` (another work already has the title's address).
   */
  note?: "reserved" | "taken" | "numbered";
  /** The other work's title, for `taken` and `numbered`. */
  otherTitle?: string;
};

/** Tidies an address as it is typed: lower-case words joined by hyphens. */
export function addressFromInput(value: string) {
  return slugify(value);
}

/** The address a work gets, and why when it is not the one the creator wanted. */
export function workAddress(
  work: PortfolioWork,
  works: readonly PortfolioWork[],
): WorkAddress {
  const index = works.findIndex(
    (entry) => entry === work || (work.id && entry.id === work.id),
  );
  const slugs = workSlugs(works);
  const slug = index < 0 ? slugify(work.title) : slugs[index];
  const requested = slugify(work.slug);
  const holder = (address: string) =>
    works.find((entry, at) => at !== index && slugs[at] === address);
  if (requested && slug === requested) return { slug, requested };
  if (requested && RESERVED_WORK_SLUGS.includes(requested as never))
    return { slug, requested, note: "reserved" };
  if (requested)
    return {
      slug,
      requested,
      note: "taken",
      otherTitle: holder(requested)?.title,
    };
  const plain = slugify(work.title);
  if (plain && slug !== plain)
    return {
      slug,
      requested,
      note: "numbered",
      otherTitle: holder(plain)?.title,
    };
  return { slug, requested };
}

/** "usemissa.com/@riley/atlas", with a stand-in until a handle is claimed. */
export function workAddressText(handle: string, slug: string) {
  return `usemissa.com/@${handle || "yourname"}/${slug}`;
}
