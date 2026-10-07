import type {
  PortfolioData,
  PortfolioEdition,
  PortfolioService,
  PortfolioShow,
  PortfolioTeaching,
} from "./creator-portfolio-schema";

/**
 * Pure helpers for the visitor add-on sections (Editions, Shows and
 * performances, Services, Teaching and Support). The sections stay thin; the
 * rules that decide what visitors read live here so they can be tested.
 */

/** Untitled items are private drafts; the page never shows them. */
function titled<T extends { title: string }>(items: T[]): T[] {
  return items.filter((item) => item.title.trim());
}

/** The topic and first line an enquiry starts with. */
export type AddonEnquiry = {
  topic: "commission" | "booking";
  message: string;
};

/**
 * An enquiry action. `hiddenSuffix` is read aloud after the label so that a
 * page of "Enquire" buttons stays distinguishable ("Enquire about Salt ledger").
 */
export type AddonEnquiryAction = AddonEnquiry & {
  label: string;
  hiddenSuffix: string;
};

/* Editions */

export const visibleEditions = (portfolio: Pick<PortfolioData, "editions">) =>
  titled(portfolio.editions);

export type EditionAvailability = {
  /** `last` is exactly one left in an edition of more than one. */
  state: "available" | "last" | "sold-out";
  label: string;
};

/**
 * "4 of 12 available" or "Sold out", and only when both numbers are stated and
 * agree. Anything else (a missing number, more available than the edition,
 * an edition of none) says nothing rather than guess.
 */
export function editionAvailability(
  edition: Pick<PortfolioEdition, "total" | "available">,
): EditionAvailability | undefined {
  const { total, available } = edition;
  if (total === undefined || available === undefined) return undefined;
  if (!Number.isInteger(total) || !Number.isInteger(available))
    return undefined;
  if (total < 1 || available < 0 || available > total) return undefined;
  if (available === 0) return { state: "sold-out", label: "Sold out" };
  return {
    state: available === 1 && total > 1 ? "last" : "available",
    label: `${available} of ${total} available`,
  };
}

/** `Edition of 12`, for an edition whose remaining count is not stated. */
export function editionSizeLabel(
  edition: Pick<PortfolioEdition, "total" | "available">,
): string | undefined {
  const { total } = edition;
  if (editionAvailability(edition)) return undefined;
  return total !== undefined && Number.isInteger(total) && total >= 1
    ? `Edition of ${total}`
    : undefined;
}

/** `Relief print · 56 × 76 cm · 2026`, leaving out whatever is blank. */
export function editionDetails(
  edition: Pick<PortfolioEdition, "medium" | "size" | "year">,
): string {
  return [edition.medium, edition.size, edition.year]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

/** The action on an edition, and the message it starts. */
export function editionEnquiry(
  edition: Pick<PortfolioEdition, "title" | "total" | "available">,
): AddonEnquiryAction {
  const title = edition.title.trim();
  return editionAvailability(edition)?.state === "sold-out"
    ? {
        label: "Ask about another print",
        hiddenSuffix: ` (${title})`,
        topic: "commission",
        message: `About another print like ${title}: `,
      }
    : {
        label: "Enquire",
        hiddenSuffix: ` about ${title}`,
        topic: "commission",
        message: `About ${title}: `,
      };
}

/* Shows and performances */

export const SHOW_KIND_LABELS: Record<PortfolioShow["kind"], string> = {
  solo: "Solo",
  group: "Group",
  premiere: "Premiere",
  screening: "Screening",
  performance: "Performance",
  other: "",
};

export type ShowYearGroup = {
  /** Four digits, or an empty string for shows without a usable year. */
  year: string;
  label: string;
  shows: PortfolioShow[];
};

export const visibleShows = (portfolio: Pick<PortfolioData, "shows">) =>
  titled(portfolio.shows);

/**
 * Shows grouped by year, newest year first. Inside a year the creator's own
 * order is kept. Shows with no four-digit year gather last as "Undated".
 */
export function groupShowsByYear(shows: PortfolioShow[]): ShowYearGroup[] {
  const groups = new Map<string, PortfolioShow[]>();
  for (const show of shows) {
    const year = /^\d{4}$/.test(show.year.trim()) ? show.year.trim() : "";
    groups.set(year, [...(groups.get(year) ?? []), show]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a)))
    .map(([year, items]) => ({
      year,
      label: year || "Undated",
      shows: items,
    }));
}

/* Services */

export const visibleServices = (portfolio: Pick<PortfolioData, "services">) =>
  titled(portfolio.services);

/** Timing and rates as labelled facts. Rates are optional and simply left out. */
export function serviceFacts(
  service: Pick<PortfolioService, "timing" | "price">,
): { label: string; value: string }[] {
  return [
    { label: "Typical timing", value: service.timing.trim() },
    { label: "Rates", value: service.price.trim() },
  ].filter((fact) => fact.value);
}

export const serviceEnquiry = (
  service: Pick<PortfolioService, "title">,
): AddonEnquiryAction => ({
  label: "Get in touch",
  hiddenSuffix: ` about ${service.title.trim()}`,
  topic: "commission",
  message: `About ${service.title.trim()}: `,
});

/* Teaching */

/**
 * Sessions still to come, soonest first. A session with no date stays (the
 * creator may not have fixed it yet) and follows the dated ones.
 */
export function upcomingTeaching(
  items: PortfolioTeaching[],
  today: string,
): PortfolioTeaching[] {
  return titled(items)
    .filter((item) => !item.date || item.date >= today)
    .sort((a, b) =>
      a.date === b.date
        ? 0
        : !a.date
          ? 1
          : !b.date
            ? -1
            : a.date < b.date
              ? -1
              : 1,
    );
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "Monday 9 March 2027", written out by hand. Intl differs between Node and
 * the browser (a comma after the weekday, for one), and a difference between
 * the two breaks hydration.
 */
export function longDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  // A date that does not exist (30 February) rolls over; show what was typed.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return value;
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export type TeachingPlaces = {
  label: string;
  /** `few` is three or fewer, worth a nudge; `full` is none left. */
  tone: "some" | "few" | "full";
};

/** "3 places left" only when stated, and "Full" at none. */
export function teachingPlaces(
  places: PortfolioTeaching["places"],
): TeachingPlaces | undefined {
  if (places === undefined || !Number.isInteger(places) || places < 0)
    return undefined;
  if (places === 0) return { label: "Full", tone: "full" };
  return {
    label: places === 1 ? "1 place left" : `${places} places left`,
    tone: places <= 3 ? "few" : "some",
  };
}

export function teachingEnquiry(
  session: Pick<PortfolioTeaching, "title" | "places">,
): AddonEnquiryAction {
  const title = session.title.trim();
  return teachingPlaces(session.places)?.tone === "full"
    ? {
        label: "Ask about the next one",
        hiddenSuffix: ` (${title})`,
        topic: "booking",
        message: `About the next ${title}: `,
      }
    : {
        label: "Request a place",
        hiddenSuffix: ` on ${title}`,
        topic: "booking",
        message: `About ${title}: `,
      };
}

/* Support */

/** Said by Missa on every Support link, whatever the creator writes. */
export const SUPPORT_LEAVES_MISSA = "Payments happen outside Missa.";

/**
 * The creator's own note, unless it only repeats the line Missa already says.
 */
export function supportNote(note: string): string | undefined {
  const text = note.trim();
  const same = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
  return text && same(text) !== same(SUPPORT_LEAVES_MISSA) ? text : undefined;
}
