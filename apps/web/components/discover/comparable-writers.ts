/**
 * Comparable-writer helpers for the matcher form. The catalogue itself lives
 * in `@missa/radar-adapters`, where the decision model also reads it.
 */
// The data module alone: the package root also carries server code.
import {
  COMPARABLE_WRITERS,
  WRITER_REGIONS,
  type ComparableWriter,
  type WriterForm,
} from "@missa/radar-adapters/dist/src/literary/writers.data.js";

export { COMPARABLE_WRITERS, WRITER_REGIONS };
export type { ComparableWriter, WriterForm };

/** Short prize names for labels; the full records live in `@missa/radar-adapters`. */
export const PRIZE_NAMES: Record<string, string> = {
  caine: "Caine Prize",
  "nigeria-prize-for-literature": "Nigeria Prize for Literature",
  "commonwealth-short-story": "Commonwealth Short Story Prize",
  "brunel-evaristo-african-poetry": "Brunel African Poetry Prize",
  "wole-soyinka-prize": "Wole Soyinka Prize",
  "windham-campbell": "Windham-Campbell Prize",
  "nobel-literature": "Nobel Prize in Literature",
  booker: "Booker Prize",
  "international-booker": "International Booker Prize",
  "pulitzer-fiction": "Pulitzer Prize for Fiction",
  "pulitzer-poetry": "Pulitzer Prize for Poetry",
  "pulitzer-general-nonfiction": "Pulitzer Prize for Nonfiction",
  "nba-fiction": "National Book Award for Fiction",
  "nba-poetry": "National Book Award for Poetry",
  "nba-nonfiction": "National Book Award for Nonfiction",
  "womens-prize-fiction": "Women's Prize for Fiction",
  "pen-faulkner": "PEN/Faulkner Award",
  "nbcc-fiction": "NBCC Award for Fiction",
  "nbcc-poetry": "NBCC Award for Poetry",
  "story-prize": "The Story Prize",
  "griffin-poetry": "Griffin Poetry Prize",
  "ts-eliot": "T. S. Eliot Prize",
  "dylan-thomas": "Dylan Thomas Prize",
};

/** Prize filter options, grouped as the prizes page groups them. */
export const PRIZE_GROUPS: Array<{ label: string; prizes: string[] }> = [
  {
    label: "Africa",
    prizes: [
      "caine",
      "nigeria-prize-for-literature",
      "commonwealth-short-story",
      "brunel-evaristo-african-poetry",
      "wole-soyinka-prize",
    ],
  },
  {
    label: "International",
    prizes: ["nobel-literature", "international-booker", "windham-campbell"],
  },
  {
    label: "UK and Ireland",
    prizes: ["booker", "womens-prize-fiction", "ts-eliot", "dylan-thomas"],
  },
  {
    label: "United States",
    prizes: [
      "pulitzer-fiction",
      "pulitzer-poetry",
      "pulitzer-general-nonfiction",
      "nba-fiction",
      "nba-poetry",
      "nba-nonfiction",
      "pen-faulkner",
      "nbcc-fiction",
      "nbcc-poetry",
      "story-prize",
    ],
  },
  { label: "Canada", prizes: ["griffin-poetry"] },
];

export const FORM_LABELS: Record<WriterForm, string> = {
  fiction: "Fiction",
  poetry: "Poetry",
  nonfiction: "Nonfiction",
};

const SUGGESTION_COUNT = 8;

const writersByName = new Map(
  COMPARABLE_WRITERS.map((writer) => [writer.name, writer]),
);

export const WRITER_COUNT = writersByName.size;

export const PRIZE_WINNER_COUNT = COMPARABLE_WRITERS.filter(
  (writer) => writer.prizes.length > 0,
).length;

const regionByCountry = new Map(
  WRITER_REGIONS.flatMap((region) =>
    region.countries.map((country) => [country, region.name] as const),
  ),
);

/** Surname-first sort key: "Ngũgĩ wa Thiong'o" sorts under T, "Ursula K. Le Guin" under L. */
const PARTICLES = new Set(["wa", "le", "de", "del", "van", "von", "abu"]);
function surnameKey(name: string): string {
  const parts = name.split(" ");
  let start = parts.length - 1;
  if (start > 0 && PARTICLES.has(parts[start - 1].toLocaleLowerCase())) {
    start -= 1;
  }
  return [...parts.slice(start), ...parts.slice(0, start)].join(" ");
}

function bySurname(a: string, b: string) {
  return surnameKey(a).localeCompare(surnameKey(b), "en", {
    sensitivity: "base",
  });
}

export function findWriter(name: string): ComparableWriter | undefined {
  return writersByName.get(name);
}

/** "Caine Prize 2019" for a writer's most recent prize, or null. */
export function latestPrizeLabel(name: string): string | null {
  const prize = writersByName.get(name)?.prizes[0];
  return prize ? `${PRIZE_NAMES[prize[0]] ?? prize[0]} ${prize[1]}` : null;
}

/**
 * "Nigeria · Fiction, Nonfiction · Caine Prize 2019" for a catalogue name,
 * or null for a typed name.
 */
export function writerDetail(name: string): string | null {
  const writer = writersByName.get(name);
  if (!writer) return null;
  const forms = writer.forms.map((form) => FORM_LABELS[form]).join(", ");
  const prize = latestPrizeLabel(name);
  return [writer.countries.join(" · "), forms, prize]
    .filter(Boolean)
    .join(" · ");
}

export interface WriterFilter {
  form: WriterForm | "all";
  country: string | "all";
  /** "all" writers, "any" prize winner, or one prize id. */
  prize: string;
}

function matchesFilter(writer: ComparableWriter, filter: WriterFilter) {
  return (
    (filter.form === "all" || writer.forms.includes(filter.form)) &&
    (filter.country === "all" || writer.countries.includes(filter.country)) &&
    (filter.prize === "all" ||
      (filter.prize === "any"
        ? writer.prizes.length > 0
        : writer.prizes.some(([prize]) => prize === filter.prize)))
  );
}

/** Countries with how many writers each has, most first. */
export function writerCountries(
  filter: Pick<WriterFilter, "form" | "prize"> = { form: "all", prize: "all" },
): Array<{ country: string; count: number }> {
  const counts = new Map<string, number>();
  for (const writer of writersByName.values()) {
    if (!matchesFilter(writer, { ...filter, country: "all" })) continue;
    for (const country of writer.countries) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

/** How many catalogue writers have won each prize. */
export function prizeCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const writer of writersByName.values()) {
    for (const prize of new Set(writer.prizes.map(([id]) => id))) {
      counts.set(prize, (counts.get(prize) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Catalogue names that pass the filter. With one prize chosen they form a
 * single group, most recent winner first; otherwise they are grouped by
 * region in display order and sorted by surname.
 */
export function groupedWriters(
  filter: WriterFilter,
): Array<{ value: string; items: string[] }> {
  const matching = [...writersByName.values()].filter((writer) =>
    matchesFilter(writer, filter),
  );
  if (filter.prize !== "all" && filter.prize !== "any") {
    const year = (writer: ComparableWriter) =>
      Math.max(
        ...writer.prizes
          .filter(([prize]) => prize === filter.prize)
          .map(([, won]) => won),
      );
    return matching.length
      ? [
          {
            value: PRIZE_NAMES[filter.prize] ?? filter.prize,
            items: matching
              .sort((a, b) => year(b) - year(a) || bySurname(a.name, b.name))
              .map((writer) => writer.name),
          },
        ]
      : [];
  }
  const groups = new Map<string, string[]>(
    WRITER_REGIONS.map((region) => [region.name, []]),
  );
  for (const writer of matching) {
    const region = regionByCountry.get(writer.countries[0]);
    if (region) groups.get(region)?.push(writer.name);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([value, items]) => ({ value, items: items.sort(bySurname) }));
}

/** The first catalogue names for a manuscript form, optionally narrowed. */
export function suggestedWriters(
  genre: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid",
  filter: Pick<WriterFilter, "country" | "prize"> = {
    country: "all",
    prize: "all",
  },
): string[] {
  const form: WriterForm =
    genre === "poetry"
      ? "poetry"
      : genre === "nonfiction"
        ? "nonfiction"
        : "fiction";
  return [...writersByName.values()]
    .filter((writer) => matchesFilter(writer, { form, ...filter }))
    .slice(0, SUGGESTION_COUNT)
    .map((writer) => writer.name);
}

/** Countries a writer can say they are from: every country in the catalogue. */
export const WRITER_COUNTRY_OPTIONS: string[] = [
  ...new Set(COMPARABLE_WRITERS.flatMap((writer) => writer.countries)),
].sort((a, b) => a.localeCompare(b, "en"));
