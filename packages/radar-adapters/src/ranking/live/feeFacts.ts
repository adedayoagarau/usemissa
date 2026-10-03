/**
 * Regular submission fees read from a magazine's own submission categories
 * (Submittable and similar portals), per genre, with the category that
 * records each amount.
 */

export type FeeGenre = "fiction" | "poetry" | "nonfiction";

export interface SubmissionCategory {
  title: string;
  feeCents: number;
  url: string;
  checkedOn: string; // YYYY-MM-DD
}

export interface GenreFeeFact {
  regularFeeCents: number;
  hasSubsidizedFeeCategory: boolean;
  sourceUrl: string;
  recordedOn: string;
}

/** Calls that are not regular submissions: prizes, paid extras, jobs, art. */
const NOT_REGULAR =
  /\b(prizes?|contests?|awards?|competitions?|chapbooks?|manuscripts?|books?|anthology|anthologies|fellowships?|residenc(y|ies)|jobs?|coordinator|intern(ship)?s?|editors?|readers?|volunteers?|staff|art(work)?s?|visual|photo(graphy|s)?|illustrations?|comics?|audio|video|music|tips?|donat\w*|subscri\w*|merch|pitch(es)?|query|queries|interviews?|conversations?|book reviews?|reviews? of|translations?|translated|portfolios?|expedit\w*|fast[- ]?track|priority|feedback|critique|editorial letter|consult\w*|mentor\w*|workshops?)\b/i;

/** A category named only "Review" (after the magazine's name) takes book reviews. */
const REVIEWS_ONLY = /(^|[:\u2014\u2013-]\s*)reviews?\s*$/i;

/** Free categories open only to some writers count as a fee waiver, not as free. */
const RESTRICTED =
  /\b(limited free|free (week|weeks|window|period|days?|slots?)|complimentary|marginali[sz]ed|bipoc|black|indigenous|lgbtq?\+?|queer|trans|disab\w*|financial|hardship|low[- ]income|waivers?|students?|veterans?|emerging|first[- ]time|underrepresented|global majority|free (for|to))\b/i;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "Ninth Letter — 6. Print Edition Fiction" → "6. Print Edition Fiction". */
export function withoutMagazineName(title: string, magazineName?: string): string {
  if (!magazineName?.trim()) return title;
  const name = escapeRegExp(magazineName.trim()).replace(/\s+/g, "\\s+");
  const stripped = title.replace(new RegExp(`^\\s*(the\\s+)?${name}\\s*(:|—|–|-)?\\s*`, "i"), "");
  return stripped.trim() ? stripped : title;
}

export function categoryGenres(title: string): FeeGenre[] {
  const lower = title.toLowerCase();
  const genres = new Set<FeeGenre>();
  if (/\bprose\b/.test(lower)) {
    genres.add("fiction");
    genres.add("nonfiction");
  }
  if (/non-?fiction|\bcnf\b|essays?\b|memoir/.test(lower)) genres.add("nonfiction");
  const withoutNonfiction = lower.replace(/non-?fiction/g, " ");
  if (/fiction|\bstor(y|ies)\b|\bflash\b|\bmicro/.test(withoutNonfiction)) genres.add("fiction");
  if (/\bpoe(m|ms|try|tic)\b/.test(lower)) genres.add("poetry");
  return genres.size ? [...genres] : ["fiction", "poetry", "nonfiction"];
}

export function isRegularCategory(title: string): boolean {
  return !NOT_REGULAR.test(title) && !REVIEWS_ONLY.test(title.trim());
}

/**
 * The regular fee for each genre is the lowest fee among categories open to
 * every writer. A free category limited to some writers marks a fee waiver.
 */
export function deriveFeeFacts(
  categories: SubmissionCategory[],
  magazineName?: string,
): Partial<Record<FeeGenre, GenreFeeFact>> {
  const facts: Partial<Record<FeeGenre, GenreFeeFact>> = {};
  // Read each category without the magazine's own name ("Arts & Letters — Fiction").
  const named = categories.map((c) => ({ ...c, title: withoutMagazineName(c.title, magazineName) }));
  const regular = named.filter((c) => isRegularCategory(c.title) && c.feeCents >= 0);
  for (const genre of ["fiction", "poetry", "nonfiction"] as const) {
    const forGenre = regular.filter((c) => categoryGenres(c.title).includes(genre));
    const open = forGenre.filter((c) => !RESTRICTED.test(c.title));
    if (open.length === 0) continue;
    const cheapest = open.reduce((best, c) =>
      c.feeCents < best.feeCents || (c.feeCents === best.feeCents && c.checkedOn > best.checkedOn) ? c : best,
    );
    const waiver = forGenre.some((c) => RESTRICTED.test(c.title) && c.feeCents === 0);
    facts[genre] = {
      regularFeeCents: cheapest.feeCents,
      hasSubsidizedFeeCategory: cheapest.feeCents > 0 && waiver,
      sourceUrl: cheapest.url,
      recordedOn: cheapest.checkedOn,
    };
  }
  return facts;
}

/** Overall index: the cheapest regular route into the magazine in any genre. */
export function overallFeeFact(
  facts: Partial<Record<FeeGenre, GenreFeeFact>>,
): GenreFeeFact | null {
  const all = Object.values(facts).filter((f): f is GenreFeeFact => Boolean(f));
  if (all.length === 0) return null;
  const cheapest = all.reduce((best, f) => (f.regularFeeCents < best.regularFeeCents ? f : best));
  return {
    ...cheapest,
    hasSubsidizedFeeCategory: cheapest.regularFeeCents > 0 && all.some((f) => f.hasSubsidizedFeeCategory),
  };
}
