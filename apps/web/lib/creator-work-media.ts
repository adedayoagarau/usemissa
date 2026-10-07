import type {
  PortfolioChapter,
  PortfolioWork,
} from "./creator-portfolio-schema";
import { workFormats, type WorkFormat } from "./creator-profile";
import { VIDEO_EMBED_ORIGINS } from "./video-embed-origins";

/**
 * Pure rules behind the work formats on a creator's profile: chapter times,
 * film links, series groups, wall labels and case-study facts. Nothing here
 * touches the page, so every rule is covered by unit tests.
 */

/* ---------- Time ---------- */

const CLOCK = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;

/** "09:40" or "1:02:30" in seconds, or null when it is not a time. */
export function parseChapterTime(value: string): number | null {
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (seconds > 59) return null;
  if (match[1] !== undefined && minutes > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/** Seconds as "02:14", or "1:02:30" past the hour. Unknown reads as "00:00". */
export function formatClock(total: number): string {
  const whole = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** The warning an editor shows beside a chapter time, if there is one. */
export function chapterTimeIssue(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return parseChapterTime(value) === null
    ? "Use minutes and seconds, like 09:40."
    : undefined;
}

export type ChapterMark = {
  id?: string;
  /** The time as the creator wrote it. */
  at: string;
  seconds: number;
  title: string;
};

/**
 * The chapters a visitor sees: those with a real time and a title, in the
 * order they happen. The creator may have entered them in any order.
 */
export function chapterMarks(
  chapters: readonly PortfolioChapter[],
): ChapterMark[] {
  return chapters
    .flatMap((chapter) => {
      const seconds = parseChapterTime(chapter.at);
      const title = chapter.title.trim();
      return seconds === null || !title
        ? []
        : [{ id: chapter.id, at: chapter.at.trim(), seconds, title }];
    })
    .sort((a, b) => a.seconds - b.seconds);
}

/** The chapter playing at `seconds`, or -1 before the first one starts. */
export function activeChapterIndex(
  marks: readonly ChapterMark[],
  seconds: number,
): number {
  let active = -1;
  marks.forEach((mark, index) => {
    if (mark.seconds <= seconds) active = index;
  });
  return active;
}

/* ---------- Film links ---------- */

export type VideoProvider = "youtube" | "vimeo";

export type VideoSource = {
  provider: VideoProvider;
  providerName: "YouTube" | "Vimeo";
  id: string;
  /** Vimeo's key for an unlisted film, so a private screener link works. */
  hash?: string;
  /** Where the link itself starts, in seconds. */
  startAt: number;
  /** The film's own page, for anyone who would rather leave Missa. */
  watchUrl: string;
};

export { VIDEO_EMBED_ORIGINS };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/** "90", "90s", "1m30s" or "1h2m3s" in seconds. */
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d{1,6}$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !(match[1] || match[2] || match[3])) return 0;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}

function youtubeId(url: URL): string | undefined {
  const segments = url.pathname.split("/").filter(Boolean);
  const candidate =
    url.hostname === "youtu.be"
      ? segments[0]
      : url.pathname === "/watch"
        ? (url.searchParams.get("v") ?? undefined)
        : ["embed", "shorts", "live", "v"].includes(segments[0] ?? "")
          ? segments[1]
          : undefined;
  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
    ? candidate
    : undefined;
}

function vimeoParts(url: URL): { id: string; hash?: string } | undefined {
  const segments = url.pathname.split("/").filter(Boolean);
  let at = -1;
  segments.forEach((segment, index) => {
    if (/^\d{5,12}$/.test(segment)) at = index;
  });
  if (at < 0) return undefined;
  const next = segments[at + 1];
  const hash =
    url.searchParams.get("h") ??
    (next && /^[0-9a-f]{8,}$/i.test(next) ? next : undefined);
  return { id: segments[at], hash: hash ?? undefined };
}

/**
 * Reads a YouTube or Vimeo address. Anything else, including a lookalike host
 * or an address with a login in it, is not a film Missa will frame.
 */
export function detectVideo(value: string): VideoSource | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const startAt = parseStart(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  );
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(url);
    if (!id) return null;
    return {
      provider: "youtube",
      providerName: "YouTube",
      id,
      startAt,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }
  if (VIMEO_HOSTS.has(host)) {
    const parts = vimeoParts(url);
    if (!parts) return null;
    const hashed = parts.hash ? `/${parts.hash}` : "";
    return {
      provider: "vimeo",
      providerName: "Vimeo",
      id: parts.id,
      hash: parts.hash,
      startAt: startAt || parseStart(/^#t=(.+)$/.exec(url.hash)?.[1] ?? null),
      watchUrl: `https://vimeo.com/${parts.id}${hashed}`,
    };
  }
  return null;
}

/**
 * The address an iframe loads once a visitor presses play. Built from the film
 * id alone, never from the creator's text, and on a privacy-enhanced host:
 * youtube-nocookie.com, and Vimeo with do-not-track on.
 */
export function videoEmbedSrc(
  source: VideoSource,
  { startAt = source.startAt, autoplay = true } = {},
): string {
  const start = Math.max(0, Math.floor(startAt));
  if (source.provider === "youtube") {
    const params = new URLSearchParams({ rel: "0", playsinline: "1" });
    if (autoplay) params.set("autoplay", "1");
    if (start) params.set("start", String(start));
    return `https://www.youtube-nocookie.com/embed/${source.id}?${params}`;
  }
  const params = new URLSearchParams({ dnt: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  if (source.hash) params.set("h", source.hash);
  return `https://player.vimeo.com/video/${source.id}?${params}${start ? `#t=${start}s` : ""}`;
}

/* ---------- Series ---------- */

const seriesKey = (work: Pick<PortfolioWork, "series">) =>
  work.series.trim().toLocaleLowerCase();

/**
 * The series that really group work: two or more works share the name. A name
 * on one work alone is only a label, so it never makes a heading.
 */
export function seriesKeys(works: readonly PortfolioWork[]): Set<string> {
  const counts = new Map<string, number>();
  for (const work of works) {
    const key = seriesKey(work);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts].filter(([, count]) => count > 1).map(([key]) => key),
  );
}

export function inSeries(
  work: PortfolioWork,
  keys: ReadonlySet<string>,
): boolean {
  return keys.has(seriesKey(work));
}

export type WorkSegment = {
  /** The series name as first written, or null for work that belongs to none. */
  series: string | null;
  works: PortfolioWork[];
};

/**
 * Splits works into runs, in the creator's order. A series sits where its
 * first work sits and keeps every member together; work without a series stays
 * where it was between them.
 */
export function groupWorksBySeries(
  works: readonly PortfolioWork[],
  keys: ReadonlySet<string> = seriesKeys(works),
): WorkSegment[] {
  const segments: WorkSegment[] = [];
  const bySeries = new Map<string, WorkSegment>();
  for (const work of works) {
    const key = seriesKey(work);
    if (key && keys.has(key)) {
      const existing = bySeries.get(key);
      if (existing) existing.works.push(work);
      else {
        const created = { series: work.series.trim(), works: [work] };
        bySeries.set(key, created);
        segments.push(created);
      }
      continue;
    }
    const last = segments.at(-1);
    if (last && last.series === null) last.works.push(work);
    else segments.push({ series: null, works: [work] });
  }
  return segments;
}

/** "4 plates · 2024–25", or "4 works" when not every one is an image. */
export function seriesSummary(works: readonly PortfolioWork[]): string {
  const plates = works.length > 0 && works.every((work) => work.image);
  const noun = plates ? "plate" : "work";
  const years = works
    .map((work) => work.year.trim())
    .filter((year) => /^\d{4}$/.test(year))
    .sort();
  const first = years[0];
  const last = years.at(-1);
  // "2024–25" when both fall in one century, "2024–2031" otherwise.
  const span =
    !first || !last
      ? ""
      : first === last
        ? first
        : first.slice(0, 2) === last.slice(0, 2)
          ? `${first}–${last.slice(2)}`
          : `${first}–${last}`;
  const count = `${works.length} ${noun}${works.length === 1 ? "" : "s"}`;
  return span ? `${count} · ${span}` : count;
}

/* ---------- Format filter ---------- */

export type WorkFilter = WorkFormat | "Series";

/**
 * The filter chips for a profile. Formats come from what the work contains and
 * need two or more to be worth a chip; "Series" joins them only when a series
 * exists and not every work is in one (otherwise it would match "All").
 */
export function workFilters(works: readonly PortfolioWork[]): WorkFilter[] {
  const formats = [...new Set(works.flatMap(workFormats))];
  const filters: WorkFilter[] = formats.length > 1 ? formats : [];
  const keys = seriesKeys(works);
  if (keys.size > 0 && works.some((work) => !inSeries(work, keys)))
    filters.push("Series");
  return filters;
}

export function filterWorks(
  works: readonly PortfolioWork[],
  filter: WorkFilter | "All",
): PortfolioWork[] {
  if (filter === "All") return [...works];
  if (filter === "Series") {
    const keys = seriesKeys(works);
    return works.filter((work) => inSeries(work, keys));
  }
  return works.filter((work) => workFormats(work).includes(filter));
}

/** What a screen reader hears after a filter changes. */
export function filterAnnouncement(
  filter: WorkFilter | "All",
  count: number,
): string {
  if (filter === "All") return "";
  const noun = count === 1 ? "work" : "works";
  return filter === "Series"
    ? `Showing ${count} ${noun} in a series.`
    : `Showing ${count} ${filter.toLowerCase()} ${noun}.`;
}

/* ---------- Wall label ---------- */

/** Medium, size and edition, in the order a gallery prints them. */
export function wallLabelDetails(
  work: Pick<PortfolioWork, "medium" | "size" | "edition">,
): string[] {
  return [work.medium, work.size, work.edition]
    .map((value) => value.trim())
    .filter(Boolean);
}

export function hasWallLabel(
  work: Pick<PortfolioWork, "medium" | "size" | "edition">,
): boolean {
  return wallLabelDetails(work).length > 0;
}

/** "Title, 2025 · Relief print on Kozo paper · 56 × 76 cm · Edition of 12". */
export function wallLabelText(
  work: Pick<PortfolioWork, "title" | "year" | "medium" | "size" | "edition">,
): string {
  const head = [work.title.trim(), work.year.trim()].filter(Boolean).join(", ");
  return [head, ...wallLabelDetails(work)].filter(Boolean).join(" · ");
}

/* ---------- Case study ---------- */

export type CaseFact = {
  label: "Brief" | "Role" | "Client" | "Outcome";
  value: string;
  /** The client's directory profile, when the creator linked one. */
  href?: string;
};

export function hasCaseStudy(work: PortfolioWork): boolean {
  return caseStudyFacts(work).length > 0;
}

/** The labelled facts of a commissioned project, skipping what is blank. */
export function caseStudyFacts(work: PortfolioWork): CaseFact[] {
  const client = work.client.trim() || work.clientOrganization?.name.trim();
  const facts: CaseFact[] = [];
  if (work.brief.trim())
    facts.push({ label: "Brief", value: work.brief.trim() });
  if (work.role.trim()) facts.push({ label: "Role", value: work.role.trim() });
  if (client)
    facts.push({
      label: "Client",
      value: client,
      href: work.clientOrganization?.href || undefined,
    });
  if (work.outcome.trim())
    facts.push({ label: "Outcome", value: work.outcome.trim() });
  return facts;
}

/* ---------- Parts ---------- */

/** "14 plates · 6 texts" for a work made of several pieces, else "". */
export function partsLabel(work: Pick<PortfolioWork, "parts">): string {
  const count = (kind: "image" | "text" | "audio") =>
    work.parts.filter((part) => part.kind === kind).length;
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? `1 ${one}` : `${n} ${many}`;
  return [
    [count("image"), "plate", "plates"],
    [count("text"), "text", "texts"],
    [count("audio"), "recording", "recordings"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, one, many]) => plural(n as number, one as string, many as string))
    .join(" · ");
}

/** Access notes a card can state: what comes with the film or recording. */
export function accessNotes(
  work: Pick<PortfolioWork, "chapters" | "transcript">,
): string[] {
  return [
    chapterMarks(work.chapters).length > 0 ? "Chapters" : "",
    work.transcript.trim() ? "Transcript" : "",
  ].filter(Boolean);
}
