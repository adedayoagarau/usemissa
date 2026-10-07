import { publicWebUrl } from "./creator-portfolio-draft";
import type {
  PortfolioEdition,
  PortfolioShow,
  PortfolioTeaching,
} from "./creator-portfolio-schema";

/**
 * Pure rules behind the studio editors for Editions, Shows and performances,
 * Services, Teaching and Support. They live here, away from the components,
 * so the numbers, dates and links they accept can be tested on their own.
 */

/** The largest number the schema accepts for an edition size or places left. */
export const COUNT_MAX = 100000;

/** The most rows each list holds. These mirror the schema's array limits. */
export const ADDON_LIST_MAX = {
  editions: 24,
  shows: 80,
  services: 12,
  teaching: 12,
} as const;

export type ParsedCount = {
  /** Undefined means "not stated". It is never NaN, negative or fractional. */
  value: number | undefined;
  /** True when the typed number was larger than the limit and was cut to it. */
  capped: boolean;
};

/**
 * Reads what a person typed into a count field. Anything that is not a digit
 * is ignored, an empty field means "not stated", and a number above the limit
 * is held at the limit.
 */
export function parseCount(raw: string, max: number = COUNT_MAX): ParsedCount {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { value: undefined, capped: false };
  const limit = Math.max(0, Math.min(Math.trunc(max) || 0, COUNT_MAX));
  // A very long run of digits becomes Infinity, which still caps cleanly.
  const typed = Number(digits.replace(/^0+(?=\d)/, ""));
  return { value: Math.min(typed, limit), capped: typed > limit };
}

/** What a count field shows. A stored value that is not a count shows nothing. */
export function formatCount(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? String(Math.trunc(value))
    : "";
}

type Counts = Pick<PortfolioEdition, "total" | "available">;

/**
 * Applies a change to an edition's counts. How many are available is never
 * more than the edition size, whichever of the two was edited.
 */
export function withEditionCounts(
  edition: Counts,
  patch: Partial<Counts>,
): Partial<Counts> {
  const next = { ...edition, ...patch };
  if (
    next.total !== undefined &&
    next.available !== undefined &&
    next.available > next.total
  )
    return { ...patch, available: next.total };
  return patch;
}

/** The stock line for the editor's list row, e.g. "4 of 12 available". */
export function editionStock(edition: Counts): string {
  const { total, available } = edition;
  if (available === 0) return "Sold out";
  if (available !== undefined && total !== undefined)
    return `${available} of ${total} available`;
  if (available !== undefined) return `${available} available`;
  if (total !== undefined) return `Edition of ${total}`;
  return "";
}

export const SHOW_KIND_LABELS: Record<PortfolioShow["kind"], string> = {
  solo: "Solo",
  group: "Group",
  premiere: "Premiere",
  screening: "Screening",
  performance: "Performance",
  other: "Other",
};

/** Places left, as visitors read it: hidden when unstated, "Full" at zero. */
export function placesLeft(places: PortfolioTeaching["places"]): string {
  if (places === undefined) return "";
  if (places === 0) return "Full";
  return `${places} ${places === 1 ? "place" : "places"} left`;
}

/** The date the profile uses to hide what has passed (the same UTC day). */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A session on a past date is hidden from visitors. No date never expires. */
export function hasPassed(date: string, today: string = todayIso()): boolean {
  return Boolean(date) && date < today;
}

/** "9 Mar 2027", the way the date picker shows a chosen date. */
export function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export const WEB_LINK_MESSAGE =
  "Use a full web address, starting with https://";

/**
 * Why a link cannot be published, or undefined when it can. Empty is fine: a
 * link is optional. This is the same rule as `publicationIssue`, which rejects
 * the whole profile for a link that is not a full web address.
 */
export function webLinkIssue(value: string): string | undefined {
  if (!value) return undefined;
  return publicWebUrl(value) ? undefined : WEB_LINK_MESSAGE;
}
