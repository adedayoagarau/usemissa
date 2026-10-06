/**
 * Missa's copy is written in US English. People in the UK, by account country
 * or, without an account, by IP country, read UK spelling instead.
 *
 * Only pass Missa's own copy through `sp`. Opportunity titles, organization
 * names and anything else from a source stay exactly as published: "The
 * Center for Fiction" is a name, not a spelling.
 */
export type Spelling = 'us' | 'uk';

export const SPELLING_COOKIE = 'missa_spelling';

/** The UK and the Crown Dependencies, which use UK spelling. */
const UK_COUNTRIES = new Set(['GB', 'UK', 'IM', 'JE', 'GG']);

export function spellingForCountry(country: string | null | undefined): Spelling {
  return country && UK_COUNTRIES.has(country.trim().toUpperCase()) ? 'uk' : 'us';
}

/** The account's country wins; the IP country is the fallback for visitors without one. */
export function resolveSpelling(input: { accountCountry?: string | null; ipCountry?: string | null }): Spelling {
  return input.accountCountry?.trim() ? spellingForCountry(input.accountCountry) : spellingForCountry(input.ipCountry);
}

export function parseSpelling(value: string | null | undefined): Spelling | null {
  return value === 'uk' || value === 'us' ? value : null;
}

// US → UK, for words Missa's copy actually uses. Inflections are listed in full
// rather than derived, so nothing unexpected changes.
const US_TO_UK: Record<string, string> = {
  organization: 'organisation',
  organizations: 'organisations',
  organizational: 'organisational',
  organize: 'organise',
  organized: 'organised',
  organizes: 'organises',
  organizing: 'organising',
  organizer: 'organiser',
  organizers: 'organisers',
  program: 'programme',
  programs: 'programmes',
  catalog: 'catalogue',
  catalogs: 'catalogues',
  color: 'colour',
  colors: 'colours',
  favorite: 'favourite',
  favorites: 'favourites',
  center: 'centre',
  centers: 'centres',
  canceled: 'cancelled',
  canceling: 'cancelling',
  traveling: 'travelling',
  traveled: 'travelled',
  analyze: 'analyse',
  analyzed: 'analysed',
  recognize: 'recognise',
  recognized: 'recognised',
  prioritize: 'prioritise',
  personalize: 'personalise',
  personalized: 'personalised',
  customize: 'customise',
  customized: 'customised',
  summarize: 'summarise',
  summarized: 'summarised',
  finalize: 'finalise',
  finalized: 'finalised',
  behavior: 'behaviour',
  honor: 'honour',
  honors: 'honours',
  labor: 'labour',
  gray: 'grey',
  fulfill: 'fulfil',
  enrollment: 'enrolment',
  theater: 'theatre',
  theaters: 'theatres',
  labeled: 'labelled',
  modeling: 'modelling',
};

// Whole words only, and never inside a URL, path, email address or slug.
const WORDS = new RegExp(
  `(?<![\\w/@.-])(${Object.keys(US_TO_UK).sort((a, b) => b.length - a.length).join('|')})(?![\\w/@-]|\\.\\w)`,
  'giu',
);

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0]!.toUpperCase()) return replacement[0]!.toUpperCase() + replacement.slice(1);
  return replacement;
}

export function toUkSpelling(text: string): string {
  return text.replace(WORDS, (word: string) => matchCase(word, US_TO_UK[word.toLowerCase()] ?? word));
}

/** Missa copy in the reader's spelling. */
export function sp(text: string, spelling: Spelling = 'us'): string {
  return spelling === 'uk' ? toUkSpelling(text) : text;
}
