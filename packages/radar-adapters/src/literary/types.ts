export type LiteraryGenre =
  "fiction" | "poetry" | "nonfiction" | "drama" | "children";

export type PrizeRegion =
  | "africa"
  | "commonwealth"
  | "international"
  | "uk-ireland"
  | "united-states"
  | "canada";

export interface PrizeWinner {
  year: number;
  writer: string;
  /** Nationality as the source gives it; "A / B" for two. */
  country: string | null;
  work: string | null;
  translator?: string;
  /** Only for prizes that split genres between years. */
  genre?: string;
  /** Where a winning story first appeared, when a source says. */
  firstPublishedIn?: string;
  firstPublishedYear?: number;
  note?: string;
  sources: string[];
}

export interface LiteraryPrize {
  id: string;
  name: string;
  region: PrizeRegion;
  genres: LiteraryGenre[];
  organiserUrl: string | null;
  /** What the prize judges, from its rules where a source stated it. */
  picksFrom: string | null;
  /** Newest first. */
  winners: PrizeWinner[];
}

export interface PrizeSelection {
  year: number;
  writer: string;
  work: string | null;
  /** The magazine or journal the piece first appeared in. */
  venue: string;
  sources: string[];
}

export interface PrizeCollection {
  id: string;
  name: string;
  genres: LiteraryGenre[];
  organiserUrl: string | null;
  /** Which years are complete, as recorded when the list was compiled. */
  coverage: string | null;
  /** Newest first. */
  selections: PrizeSelection[];
}
