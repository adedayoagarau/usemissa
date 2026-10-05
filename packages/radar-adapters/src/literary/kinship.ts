import { LITERARY_PRIZES } from "./prizes.data.js";
import { PRIZE_COLLECTIONS } from "./selections.data.js";
import { COMPARABLE_WRITERS, type WriterForm } from "./writers.data.js";
import type { LiteraryGenre } from "./types.js";

export interface WriterProfile {
  name: string;
  countries: string[];
  forms: WriterForm[];
  /** Prize ids from the literary prize records. */
  prizes: string[];
}

function key(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function genreForm(
  genre: LiteraryGenre | string | undefined,
): WriterForm | null {
  const value = String(genre ?? "").toLowerCase();
  if (value === "poetry") return "poetry";
  if (value === "nonfiction") return "nonfiction";
  if (value === "fiction" || value === "prose") return "fiction";
  return null;
}

/** Split "Nigeria / United Kingdom" into its countries. */
function splitCountries(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[/;]/)
    .map((country) => country.trim())
    .filter(Boolean);
}

let profiles: Map<string, WriterProfile> | null = null;

function addTo(
  index: Map<string, WriterProfile>,
  name: string,
  countries: string[],
  forms: WriterForm[],
  prizes: string[],
) {
  const k = key(name);
  const existing = index.get(k) ?? {
    name,
    countries: [],
    forms: [],
    prizes: [],
  };
  for (const country of countries)
    if (!existing.countries.includes(country)) existing.countries.push(country);
  for (const form of forms)
    if (!existing.forms.includes(form)) existing.forms.push(form);
  for (const prize of prizes)
    if (!existing.prizes.includes(prize)) existing.prizes.push(prize);
  index.set(k, existing);
}

function buildProfiles(): Map<string, WriterProfile> {
  const index = new Map<string, WriterProfile>();
  for (const writer of COMPARABLE_WRITERS) {
    addTo(
      index,
      writer.name,
      writer.countries,
      writer.forms,
      writer.prizes.map(([id]) => id),
    );
  }
  for (const prize of LITERARY_PRIZES) {
    const prizeForms = prize.genres
      .map((genre) => genreForm(genre))
      .filter((form): form is WriterForm => form !== null);
    for (const winner of prize.winners) {
      const form = genreForm(winner.genre);
      addTo(
        index,
        winner.writer,
        splitCountries(winner.country),
        form ? [form] : prizeForms.length === 1 ? prizeForms : [],
        [prize.id],
      );
    }
  }
  // Anthology picks record the form only: being picked for the same annual
  // anthology is too common to say two writers are alike.
  for (const collection of PRIZE_COLLECTIONS) {
    for (const selection of collection.selections) {
      addTo(index, selection.writer, [], ["fiction"], []);
    }
  }
  return index;
}

/** What Missa records about a writer: countries, forms and prizes. */
export function writerProfile(name: string): WriterProfile | null {
  profiles ??= buildProfiles();
  return profiles.get(key(name)) ?? null;
}

/** Why two writers are alike, or null when nothing recorded links them. */
export interface WriterKinship {
  country: string;
  form: WriterForm;
  /** A prize both have won, when there is one; never enough on its own. */
  prize: string | null;
}

/**
 * Two writers are alike when they share a country and a form. A shared prize
 * alone is not enough: Booker or NBCC winners write very different books.
 */
export function writerKinship(a: string, b: string): WriterKinship | null {
  if (key(a) === key(b)) return null;
  const left = writerProfile(a);
  const right = writerProfile(b);
  if (!left || !right) return null;
  const country = left.countries.find((value) =>
    right.countries.includes(value),
  );
  const form = left.forms.find((value) => right.forms.includes(value));
  if (!country || !form) return null;
  const prize = left.prizes.find((id) => right.prizes.includes(id)) ?? null;
  return { country, form, prize };
}
