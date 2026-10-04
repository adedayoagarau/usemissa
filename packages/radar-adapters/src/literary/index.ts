import { LITERARY_PRIZES } from "./prizes.data.js";
import { PRIZE_COLLECTIONS } from "./selections.data.js";
import type { LiteraryPrize, PrizeRegion } from "./types.js";

export { LITERARY_PRIZES } from "./prizes.data.js";
export { PRIZE_COLLECTIONS } from "./selections.data.js";
export {
  COMPARABLE_WRITERS,
  WRITER_REGIONS,
  type ComparableWriter,
  type WriterForm,
} from "./writers.data.js";
export * from "./eligibility.js";
export * from "./kinship.js";
export type {
  LiteraryGenre,
  LiteraryPrize,
  PrizeCollection,
  PrizeRegion,
  PrizeSelection,
  PrizeWinner,
} from "./types.js";

export const PRIZE_REGION_LABELS: Record<PrizeRegion, string> = {
  africa: "Africa",
  commonwealth: "Commonwealth",
  international: "International",
  "uk-ireland": "UK and Ireland",
  "united-states": "United States",
  canada: "Canada",
};

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Compare people's names across sources: case, accents and punctuation ignored. */
export function normalizeWriterName(name: string): string {
  return fold(name);
}

/**
 * Compare magazine names across sources: also ignores a leading "The" and a
 * trailing "Magazine", so "Harper's Magazine" matches "Harper's".
 */
export function normalizePublicationName(name: string): string {
  return fold(name)
    .replace(/^the /, "")
    .replace(/ magazine$/, "")
    .trim();
}

export interface WriterPrize {
  prizeId: string;
  prize: string;
  year: number;
  work: string | null;
}

let writerIndex: Map<string, WriterPrize[]> | null = null;

/** Prizes a writer has won, newest first; empty when none are recorded. */
export function prizesForWriter(name: string): WriterPrize[] {
  if (!writerIndex) {
    writerIndex = new Map();
    for (const prize of LITERARY_PRIZES) {
      for (const winner of prize.winners) {
        const key = normalizeWriterName(winner.writer);
        const list = writerIndex.get(key) ?? [];
        list.push({
          prizeId: prize.id,
          prize: prize.name,
          year: winner.year,
          work: winner.work,
        });
        writerIndex.set(key, list);
      }
    }
    for (const list of writerIndex.values())
      list.sort((a, b) => b.year - a.year);
  }
  return writerIndex.get(normalizeWriterName(name)) ?? [];
}

/** A prize-recognised piece that first appeared in a given magazine. */
export interface VenueRecognition {
  /** The anthology or prize that picked it. */
  source: string;
  sourceId: string;
  year: number;
  writer: string;
  work: string | null;
  sourceUrl: string;
}

let venueIndex: Map<string, VenueRecognition[]> | null = null;

function buildVenueIndex(): Map<string, VenueRecognition[]> {
  const index = new Map<string, VenueRecognition[]>();
  const seen = new Set<string>();
  const add = (venue: string, entry: VenueRecognition) => {
    const key = normalizePublicationName(venue);
    // A piece honoured twice by one prize (e.g. "Best of Caine") counts once.
    const piece = [key, entry.sourceId, entry.writer, entry.work].join("|");
    if (seen.has(piece)) return;
    seen.add(piece);
    const list = index.get(key) ?? [];
    list.push(entry);
    index.set(key, list);
  };
  for (const collection of PRIZE_COLLECTIONS) {
    for (const selection of collection.selections) {
      add(selection.venue, {
        source: collection.name,
        sourceId: collection.id,
        year: selection.year,
        writer: selection.writer,
        work: selection.work,
        sourceUrl: selection.sources[0],
      });
    }
  }
  for (const prize of LITERARY_PRIZES) {
    for (const winner of prize.winners) {
      if (!winner.firstPublishedIn) continue;
      add(winner.firstPublishedIn, {
        source: prize.name,
        sourceId: prize.id,
        year: winner.firstPublishedYear ?? winner.year,
        writer: winner.writer,
        work: winner.work,
        sourceUrl: winner.sources[winner.sources.length - 1],
      });
    }
  }
  for (const list of index.values()) list.sort((a, b) => b.year - a.year);
  return index;
}

/** Prize-recognised pieces that first appeared in this magazine, newest first. */
export function recognitionForPublication(name: string): VenueRecognition[] {
  venueIndex ??= buildVenueIndex();
  return venueIndex.get(normalizePublicationName(name)) ?? [];
}

/** Every venue with its recognised pieces, most recognised first. */
export function recognisedPublications(): Array<{
  venue: string;
  pieces: VenueRecognition[];
}> {
  venueIndex ??= buildVenueIndex();
  const names = new Map<string, string>();
  for (const collection of PRIZE_COLLECTIONS) {
    for (const selection of collection.selections) {
      names.set(normalizePublicationName(selection.venue), selection.venue);
    }
  }
  for (const prize of LITERARY_PRIZES) {
    for (const winner of prize.winners) {
      if (winner.firstPublishedIn) {
        const key = normalizePublicationName(winner.firstPublishedIn);
        if (!names.has(key)) names.set(key, winner.firstPublishedIn);
      }
    }
  }
  return [...venueIndex.entries()]
    .map(([key, pieces]) => ({ venue: names.get(key) ?? key, pieces }))
    .sort(
      (a, b) =>
        b.pieces.length - a.pieces.length || a.venue.localeCompare(b.venue),
    );
}

export function prizeById(id: string): LiteraryPrize | undefined {
  return LITERARY_PRIZES.find((prize) => prize.id === id);
}
