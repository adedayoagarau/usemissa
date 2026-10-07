import {
  publicPortfolioProjection,
  type PortfolioData,
  type PortfolioEvent,
  type PortfolioWork,
} from "./creator-portfolio-schema";
import {
  eventDateParts,
  featuredWork,
  upcomingEvents,
} from "./creator-profile";
import { siteUrl } from "./siteUrl";

/* ---------- Addresses ---------- */

/** "usemissa.com/@rileychen": the address as people read and type it. */
export function profileAddress(handleKey: string) {
  const host = new URL(siteUrl()).host.replace(/^www\./, "");
  return `${host}/@${handleKey}`;
}

/** The full link that goes into a QR code, a signature or a message. */
export function profileLink(handleKey: string) {
  return `${siteUrl()}/@${handleKey}`;
}

/* ---------- The line under the name ---------- */

/**
 * "Poet, sound artist and photographer": the profile's own wording for what
 * someone makes. Kept in step with the line the profile page draws.
 */
export function practiceLine(selected: string[]) {
  const items = selected
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) =>
      index > 0 && /^[A-Z][a-z]/.test(item)
        ? item[0].toLowerCase() + item.slice(1)
        : item,
    );
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/* ---------- Story text ---------- */

export type StoryExcerpt = {
  /** Lines to set, in the maker's own line breaks. */
  lines: string[];
  /** Where the words came from, so a caption can say so. */
  source: "text" | "summary" | "caption" | "title" | "statement" | "line";
};

const EXCERPT_LINES = 3;
const EXCERPT_CHARACTERS = 140;

/**
 * Cuts a line and marks the cut with an ellipsis. It stops at the end of a
 * clause when there is one in the last 40% of the room, else at a word, so the
 * line doesn't end on "the".
 */
export function truncateAtWord(value: string, limit: number) {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit + 1);
  const clause = Math.max(
    ...[...cut.matchAll(/[,;:.!?—–]\s/gu)].map((match) => match.index ?? -1),
  );
  const space = cut.lastIndexOf(" ");
  const end =
    clause > limit * 0.6 ? clause : space > limit * 0.5 ? space : limit;
  const kept = cut
    .slice(0, end)
    .replace(/[\s,;:—–-]+$/u, "")
    .trimEnd();
  return `${kept}…`;
}

/**
 * The opening lines of a piece of writing: the first stanza or paragraph, never
 * reflowed, at most three lines and 140 characters. A single long line is cut
 * at a word and marked with an ellipsis; a stanza that ends sooner is kept whole.
 */
export function excerptLines(
  value: string,
  maxLines = EXCERPT_LINES,
  maxCharacters = EXCERPT_CHARACTERS,
) {
  const lines: string[] = [];
  let used = 0;
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (lines.length) break;
      continue;
    }
    if (lines.length >= maxLines) break;
    if (used + line.length > maxCharacters) {
      if (!lines.length) lines.push(truncateAtWord(line, maxCharacters));
      break;
    }
    lines.push(line);
    used += line.length;
  }
  return lines;
}

/**
 * What a story says about the featured work: its opening lines, else its
 * summary, caption or title. Nothing is invented, and nothing is written about
 * the work.
 */
export function storyExcerpt(work?: PortfolioWork): StoryExcerpt | undefined {
  if (!work) return undefined;
  const text = excerptLines(work.text);
  if (text.length) return { lines: text, source: "text" };
  for (const source of ["summary", "caption"] as const) {
    const lines = excerptLines(work[source], 2);
    if (lines.length) return { lines, source };
  }
  const title = work.title.trim();
  return title
    ? { lines: [truncateAtWord(title, 80)], source: "title" }
    : undefined;
}

/**
 * The words a story sets under or over the image: the featured work's opening,
 * else the profile's statement, else what they make. Nothing is written for them.
 */
export function storyBody(
  portfolio: Pick<PortfolioData, "works" | "statement" | "selected">,
): StoryExcerpt | undefined {
  const fromWork = storyExcerpt(featuredWork(portfolio.works));
  if (fromWork) return fromWork;
  const statement = excerptLines(portfolio.statement, 2);
  if (statement.length) return { lines: statement, source: "statement" };
  const line = practiceLine(portfolio.selected);
  return line ? { lines: [line], source: "line" } : undefined;
}

/** "Scan for the writing and images.": says only what the profile holds. */
export function scanLine(portfolio: Pick<PortfolioData, "works">) {
  const parts = [
    portfolio.works.some((work) => work.text.trim()) ? "writing" : "",
    portfolio.works.some((work) => work.image) ? "images" : "",
    portfolio.works.some((work) => work.audio) ? "recordings" : "",
  ].filter(Boolean);
  if (!parts.length) return "Scan for the full profile.";
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
      : parts[0];
  return `Scan for the ${list}.`;
}

/* ---------- Events ---------- */

/**
 * Events that can have a card: the ones the published profile lists, still to
 * come, with an address of their own. The studio and the card page both call
 * this, so a link in the studio and the page it opens always agree.
 */
export function shareableEvents(
  portfolio: PortfolioData,
  today = new Date().toISOString().slice(0, 10),
) {
  const seen = new Set<string>();
  return upcomingEvents(
    publicPortfolioProjection(portfolio).events,
    today,
  ).filter((event): event is PortfolioEvent & { id: string } => {
    if (!event.id || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function findShareableEvent(
  portfolio: PortfolioData,
  eventId: string,
  today?: string,
) {
  return shareableEvents(portfolio, today).find(
    (event) => event.id === eventId,
  );
}

/** "Sat 18 Jan · 19:00", with the year once it isn't this year. */
export function eventWhen(
  event: Pick<PortfolioEvent, "date" | "time">,
  today = new Date().toISOString().slice(0, 10),
) {
  const { day, month, weekday } = eventDateParts(event);
  if (!day) return "";
  const title = (value: string) =>
    value.charAt(0) + value.slice(1).toLowerCase();
  const year = event.date.slice(0, 4);
  const date = [
    title(weekday),
    String(Number(day)),
    title(month),
    year !== today.slice(0, 4) ? year : "",
  ]
    .filter(Boolean)
    .join(" ");
  return event.time ? `${date} · ${event.time}` : date;
}

/** "Reading · Sat 18 Jan · 19:00": the line above the title on an event card. */
export function eventLabel(
  event: Pick<PortfolioEvent, "kind" | "date" | "time">,
  today?: string,
) {
  return [event.kind.trim(), eventWhen(event, today)]
    .filter(Boolean)
    .join(" · ");
}
