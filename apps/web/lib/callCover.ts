/**
 * Which illustrated cover a call gets. Its own type decides when it is
 * specific; calls filed only as an open call (or rfp, commission, job,
 * other) are read from their title, so a page of open calls does not show
 * one pinboard over and over. Pure, tested in callCover.test.ts.
 */

export type CoverKey =
  | "open-call"
  | "magazine"
  | "publication"
  | "grant"
  | "award"
  | "contest"
  | "fellowship"
  | "residency"
  | "festival"
  | "exhibition";

/** Types from radar-engine OpportunityType that name a cover outright. */
const COVER_FOR_TYPE: Record<string, CoverKey> = {
  magazine: "magazine",
  pitch: "publication",
  grant: "grant",
  scholarship: "grant",
  award: "award",
  contest: "contest",
  fellowship: "fellowship",
  conference: "fellowship",
  residency: "residency",
  festival: "festival",
  exhibition: "exhibition",
};

/** Title words, most specific first. */
const TITLE_RULES: [RegExp, CoverKey][] = [
  [/\bresiden(cy|cies|ce)\b/i, "residency"],
  [/\bfestival\b/i, "festival"],
  [/\b(contest|competition)s?\b/i, "contest"],
  [/\b(prize|award)s?\b/i, "award"],
  [/\b(fellowship|conference|workshop|mentorship|retreat)s?\b/i, "fellowship"],
  [/\b(grant|bursary|bursaries|scholarship|stipend|funding|fund)s?\b/i, "grant"],
  [/\b(exhibition|exhibit|biennale|biennial|gallery|art fair)s?\b/i, "exhibition"],
  [/\b(magazine|journal|review|zine|anthology|literary)s?\b/i, "magazine"],
  [/\b(publication|publishing|press|book|chapbook|manuscript|pitch|reads?)s?\b/i, "publication"],
];

export function coverKey(type: string | null | undefined, title?: string | null): CoverKey {
  const byType = COVER_FOR_TYPE[type ?? ""];
  if (byType) return byType;
  if (title) {
    for (const [pattern, key] of TITLE_RULES) {
      if (pattern.test(title)) return key;
    }
  }
  return "open-call";
}
