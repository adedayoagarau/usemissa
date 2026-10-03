/**
 * Rebuilds the Missa residency index from cited directory listings.
 *
 * Sources: Artist Communities Alliance program pages (fees, stipends, meals,
 * studios, founding year, selection), RateMyArtistResidency pages (residents'
 * ratings, open calls), Missa writers' reviews, and Missa's own open-call
 * listings. A program is ranked when at least one of the two directories
 * describes it and its website matches a Missa profile; facts nobody records
 * stay null and score the middle of their range in the engine.
 */
import {
  rankResidencies,
  type RankedResidency,
  type ResidencyMeals,
  type ResidencyScoringInput,
} from "@missa/radar-engine";
import { insertStatements, type RankingDb } from "../live/indexUpdate.js";
import type { AcaAmount, AcaOpenCallRecord, AcaProgramRecord } from "./acaDirectory.js";

export interface RmarRecord {
  url: string;
  name: string;
  website?: string | null;
  location?: string | null;
  foundingDate?: string | null;
  ratingValue?: number | null;
  ratingCount?: number | null;
  reviewCount?: number | null;
  callInfo?: {
    name?: string | null;
    applicationUrl?: string | null;
    deadline?: string | null;
  } | null;
  crawledAt: string;
}

export interface ResidencySources {
  rmar: RmarRecord[];
  acaPrograms: AcaProgramRecord[];
  acaCalls: AcaOpenCallRecord[];
}

export interface ResidencyProfile {
  id: string;
  name: string;
  kind: string;
  website: string | null;
  city: string | null;
  country: string | null;
}

export interface OpenCall {
  title: string;
  url: string;
  deadline: string | null;
  sourceUrl: string;
  recordedOn: string;
}

type FactSource = { url: string; recordedOn: string };

export interface ResidencyFacts {
  freeToAttend: boolean | null;
  residencyFee: AcaAmount | null;
  hasStipend: boolean | null;
  stipend: AcaAmount | null;
  applicationFee: AcaAmount | null;
  meals: ResidencyMeals | null;
  privateStudio: boolean | null;
  acceptedCount: number | null;
  applicantPool: number | null;
  housing: string | null;
  wheelchair: string | null;
  residencyLength: string | null;
  disciplines: string[];
  foundedYear: number | null;
  location: string | null;
  rmarRating: number | null;
  rmarRatingsCount: number;
  rmarReviewsCount: number;
  rating: { value: number; count: number } | null;
  directories: string[];
  openCall: OpenCall | null;
  sources: Record<string, FactSource>;
}

/** Profile kinds that can be residency programs; magazines and presses are not. */
export const RESIDENCY_PROFILE_KINDS = [
  "residency_center",
  "organization",
  "visual_arts_organization",
  "grant_foundation",
  "gallery",
];

const KIND_PREFERENCE = new Map(RESIDENCY_PROFILE_KINDS.map((kind, index) => [kind, index]));

/** Hosts that list many programs; their pages identify a listing, not an institution. */
const SHARED_HOSTS = new Set([
  "facebook.com",
  "instagram.com",
  "linktr.ee",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "sites.google.com",
  "artistcommunities.org",
  "ratemyartistresidency.com",
  "resartis.org",
  "transartists.org",
  "artconnect.com",
  "curatorspace.com",
]);

/** Directories a Missa profile was imported from, by profile id prefix. */
const DIRECTORY_PREFIXES: Array<[RegExp, string]> = [
  [/^org_resartis_/, "Res Artis"],
  [/^org_(trans|ta)_/, "TransArtists"],
  [/^org_artconn/, "ArtConnect"],
  [/^org_rivet_/, "Rivet"],
];

/** "https://www.macdowell.org/apply" → "macdowell.org"; shared hosts keep their first path segment. */
export function siteKey(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  if (SHARED_HOSTS.has(host)) {
    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    return segment ? `${host}/${segment.toLowerCase()}` : null;
  }
  return host;
}

export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function preferred(profiles: ResidencyProfile[]): ResidencyProfile {
  return [...profiles].sort(
    (a, b) =>
      (KIND_PREFERENCE.get(a.kind) ?? 99) - (KIND_PREFERENCE.get(b.kind) ?? 99) ||
      a.id.localeCompare(b.id),
  )[0];
}

export interface ResidencyMatch {
  profile: ResidencyProfile;
  /** Every profile sharing the program's website, including the chosen one. */
  siblings: ResidencyProfile[];
  aca: AcaProgramRecord[];
  rmar: RmarRecord[];
}

/**
 * Matches directory listings to profiles: by website first; by exact name
 * among residency profiles only when the website does not match and the name
 * is unique. Returns the matches and the listings no profile matched.
 */
export function matchResidencyListings(
  profiles: ResidencyProfile[],
  sources: Pick<ResidencySources, "rmar" | "acaPrograms">,
): { matches: Map<string, ResidencyMatch>; unmatched: string[] } {
  const bySite = new Map<string, ResidencyProfile[]>();
  const byName = new Map<string, ResidencyProfile[]>();
  for (const profile of profiles) {
    const key = siteKey(profile.website);
    if (key) bySite.set(key, [...(bySite.get(key) ?? []), profile]);
    if (profile.kind === "residency_center") {
      const name = nameKey(profile.name);
      byName.set(name, [...(byName.get(name) ?? []), profile]);
    }
  }
  const matches = new Map<string, ResidencyMatch>();
  const unmatched: string[] = [];
  const attach = (
    listing: { name: string; website?: string | null; url: string },
    add: (match: ResidencyMatch) => void,
  ) => {
    const key = siteKey(listing.website);
    let siblings = key ? bySite.get(key) : undefined;
    if (!siblings?.length) {
      const named = byName.get(nameKey(listing.name));
      siblings = named?.length === 1 ? named : undefined;
    }
    if (!siblings?.length) {
      unmatched.push(`${listing.name} (${listing.url})`);
      return;
    }
    const profile = preferred(siblings);
    const match =
      matches.get(profile.id) ?? { profile, siblings, aca: [], rmar: [] };
    add(match);
    matches.set(profile.id, match);
  };
  for (const program of sources.acaPrograms) attach(program, (m) => m.aca.push(program));
  for (const record of sources.rmar) attach(record, (m) => m.rmar.push(record));

  // One program can sit under two domains; profiles with the same name merge.
  const byProfileName = new Map<string, ResidencyMatch>();
  for (const match of [...matches.values()]) {
    const key = nameKey(match.profile.name);
    const kept = byProfileName.get(key);
    if (!kept) {
      byProfileName.set(key, match);
      continue;
    }
    const keep = preferred([kept.profile, match.profile]) === kept.profile ? kept : match;
    const drop = keep === kept ? match : kept;
    keep.aca.push(...drop.aca);
    keep.rmar.push(...drop.rmar);
    keep.siblings.push(...drop.siblings.filter((s) => !keep.siblings.includes(s)));
    matches.delete(drop.profile.id);
    byProfileName.set(key, keep);
  }
  return { matches, unmatched };
}

const day = (value: string) => value.slice(0, 10);

function yearFrom(value: string | null | undefined): number | null {
  const match = value?.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/** The facts for one matched program, each with the listing that records it. */
export function residencyFacts(
  match: ResidencyMatch,
  context: {
    today: string;
    acaCalls: Map<string, AcaOpenCallRecord>;
    missaCalls: OpenCall[];
    missaRatings: number[];
  },
): ResidencyFacts {
  const sources: Record<string, FactSource> = {};
  const cite = (key: string, url: string, recordedOn: string) => {
    sources[key] ??= { url, recordedOn: day(recordedOn) };
  };
  const programs = match.aca;
  const withAmount = (pick: (p: AcaProgramRecord) => AcaAmount | null) =>
    programs.filter((p) => pick(p) != null);

  // Fee: free when any program records no fee; otherwise the cheapest recorded fee.
  let freeToAttend: boolean | null = null;
  let residencyFee: AcaAmount | null = null;
  const feePrograms = withAmount((p) => p.residencyFee).sort(
    (a, b) => a.residencyFee!.amount - b.residencyFee!.amount,
  );
  if (feePrograms.length) {
    residencyFee = feePrograms[0].residencyFee;
    freeToAttend = residencyFee!.amount === 0;
    cite("fee", feePrograms[0].url, feePrograms[0].crawledAt);
  }

  // Stipend: the largest recorded stipend; a recorded zero means none.
  let hasStipend: boolean | null = null;
  let stipend: AcaAmount | null = null;
  const stipendPrograms = withAmount((p) => p.artistStipend).sort(
    (a, b) => b.artistStipend!.amount - a.artistStipend!.amount,
  );
  if (stipendPrograms.length) {
    stipend = stipendPrograms[0].artistStipend;
    hasStipend = stipend!.amount > 0;
    cite("stipend", stipendPrograms[0].url, stipendPrograms[0].crawledAt);
  }

  const applicationPrograms = withAmount((p) => p.applicationFee).sort(
    (a, b) => a.applicationFee!.amount - b.applicationFee!.amount,
  );
  const applicationFee = applicationPrograms[0]?.applicationFee ?? null;
  if (applicationPrograms.length) {
    cite("applicationFee", applicationPrograms[0].url, applicationPrograms[0].crawledAt);
  }

  const mealsRank: Record<ResidencyMeals, number> = { all: 3, some: 2, none: 1 };
  const mealPrograms = programs
    .filter((p) => p.meals)
    .sort((a, b) => mealsRank[b.meals!] - mealsRank[a.meals!]);
  const meals = mealPrograms[0]?.meals ?? null;
  if (mealPrograms.length) cite("meals", mealPrograms[0].url, mealPrograms[0].crawledAt);

  const studioPrograms = programs
    .filter((p) => p.privateStudio != null)
    .sort((a, b) => Number(b.privateStudio) - Number(a.privateStudio));
  const privateStudio = studioPrograms[0]?.privateStudio ?? null;
  if (studioPrograms.length) cite("studio", studioPrograms[0].url, studioPrograms[0].crawledAt);

  // Selection counts only when the pool is real and at least the number accepted.
  const selection = programs.find(
    (p) =>
      p.acceptedCount != null &&
      p.applicantPool != null &&
      p.applicantPool > 0 &&
      p.acceptedCount <= p.applicantPool,
  );
  if (selection) cite("selection", selection.url, selection.crawledAt);

  const first = <T>(pick: (p: AcaProgramRecord) => T | null): [T | null, AcaProgramRecord | null] => {
    const program = programs.find((p) => pick(p) != null) ?? null;
    return [program ? pick(program) : null, program];
  };
  const [housing, housingProgram] = first((p) => p.housing);
  if (housingProgram) cite("housing", housingProgram.url, housingProgram.crawledAt);
  const [wheelchair, wheelchairProgram] = first((p) => p.wheelchair);
  if (wheelchairProgram) cite("wheelchair", wheelchairProgram.url, wheelchairProgram.crawledAt);
  const [residencyLength, lengthProgram] = first((p) => p.residencyLength);
  if (lengthProgram) cite("length", lengthProgram.url, lengthProgram.crawledAt);

  const disciplines = [...new Set(programs.flatMap((p) => p.disciplines))];

  // Founding year: the directory program page, else the ratings site.
  let foundedYear: number | null = null;
  const founded = programs
    .filter((p) => p.foundedYear != null)
    .sort((a, b) => a.foundedYear! - b.foundedYear!)[0];
  if (founded) {
    foundedYear = founded.foundedYear;
    cite("founded", founded.url, founded.crawledAt);
  } else {
    const rmarFounded = match.rmar.find((r) => yearFrom(r.foundingDate) != null);
    if (rmarFounded) {
      foundedYear = yearFrom(rmarFounded.foundingDate);
      cite("founded", rmarFounded.url, rmarFounded.crawledAt);
    }
  }

  // Residents' ratings: the ratings site's aggregate plus Missa writers' reviews.
  const rated = match.rmar.find((r) => (r.ratingCount ?? 0) > 0 && r.ratingValue != null);
  const rmarRating = rated ? Number(rated.ratingValue) : null;
  const rmarRatingsCount = rated ? Number(rated.ratingCount) : 0;
  const rmarReviewsCount = Math.max(0, ...match.rmar.map((r) => Number(r.reviewCount ?? 0)));
  const missaCount = context.missaRatings.length;
  const missaSum = context.missaRatings.reduce((sum, value) => sum + value, 0);
  const ratingCount = rmarRatingsCount + missaCount;
  const rating =
    ratingCount > 0
      ? {
          value: Math.round((((rmarRating ?? 0) * rmarRatingsCount + missaSum) / ratingCount) * 100) / 100,
          count: ratingCount,
        }
      : null;
  if (rated) cite("rating", rated.url, rated.crawledAt);
  else if (missaCount) cite("rating", "https://usemissa.com/rankings/residencies", context.today);

  // Location: the program page's address, else the ratings site, else the profile.
  const located = programs.find((p) => p.locality || p.country);
  const location = located
    ? [located.locality, located.region, located.country].filter(Boolean).join(", ")
    : match.rmar.find((r) => r.location)?.location ??
      ([match.profile.city, match.profile.country].filter(Boolean).join(", ") || null);

  // Directories that list the program.
  const directories = new Set<string>();
  if (programs.length) directories.add("Artist Communities Alliance");
  if (match.rmar.length) directories.add("RateMyArtistResidency");
  for (const sibling of match.siblings) {
    for (const [pattern, directory] of DIRECTORY_PREFIXES) {
      if (pattern.test(sibling.id)) directories.add(directory);
    }
  }

  // Open call: the soonest current call from Missa listings, the directory or the ratings site.
  const calls: OpenCall[] = [...context.missaCalls];
  for (const program of programs) {
    for (const url of program.openCallUrls) {
      const call = context.acaCalls.get(url);
      if (call && (call.rolling || (call.deadline && call.deadline >= context.today))) {
        calls.push({
          title: call.title,
          url: call.applicationUrl ?? call.url,
          deadline: call.deadline,
          sourceUrl: call.url,
          recordedOn: program.crawledAt,
        });
      }
    }
  }
  for (const record of match.rmar) {
    const deadline = record.callInfo?.deadline ?? null;
    if (deadline && deadline >= context.today) {
      calls.push({
        title: record.callInfo?.name ?? "Open call",
        url: record.callInfo?.applicationUrl ?? record.url,
        deadline,
        sourceUrl: record.url,
        recordedOn: record.crawledAt,
      });
    }
  }
  const openCall =
    calls.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))[0] ?? null;
  if (openCall) cite("openCall", openCall.sourceUrl, openCall.recordedOn);

  return {
    freeToAttend,
    residencyFee,
    hasStipend,
    stipend,
    applicationFee,
    meals,
    privateStudio,
    acceptedCount: selection?.acceptedCount ?? null,
    applicantPool: selection?.applicantPool ?? null,
    housing,
    wheelchair,
    residencyLength,
    disciplines,
    foundedYear,
    location,
    rmarRating,
    rmarRatingsCount,
    rmarReviewsCount,
    rating,
    directories: [...directories].sort(),
    openCall,
    sources,
  };
}

export function scoringInput(profile: ResidencyProfile, facts: ResidencyFacts): ResidencyScoringInput {
  return {
    profileId: profile.id,
    name: profile.name,
    freeToAttend: facts.freeToAttend,
    hasStipend: facts.hasStipend,
    meals: facts.meals,
    privateStudio: facts.privateStudio,
    rating: facts.rating,
    foundedYear: facts.foundedYear,
    directoryCount: Math.max(1, facts.directories.length),
    openCall: facts.openCall ? true : null,
  };
}

export interface ResidencyRecomputeSummary {
  ranked: number;
  unmatchedListings: number;
  unmatchedSample: string[];
  tiers: Record<string, number>;
  averageCoverage: number;
  facts: Record<string, number>;
  top: Array<{ rank: number; name: string; total: number; coverage: number }>;
}

const RANKING_COLUMNS = [
  "profile_id", "rank_position", "prestige_tier", "total_score", "funding_score",
  "rating_score", "facilities_score", "access_score", "free_to_attend", "is_fully_funded",
  "residency_fee_amount", "residency_fee_currency", "has_stipend", "stipend_amount",
  "stipend_currency", "application_fee_amount", "application_fee_currency", "meals",
  "has_meals", "has_private_studio", "accepted_count", "applicant_pool", "housing",
  "wheelchair", "residency_length", "disciplines", "founding_year", "location",
  "rmar_rating", "rmar_ratings_count", "rmar_reviews_count", "rating_value", "rating_count",
  "directories", "open_call_title", "open_call_url", "open_call_deadline", "fact_sources",
  "pillar_status", "coverage", "computed_on",
];

function rankingRowValues(ranked: RankedResidency, facts: ResidencyFacts, today: string): unknown[] {
  return [
    ranked.profileId, ranked.rankPosition, ranked.tier, ranked.totalScore, ranked.fundingScore,
    ranked.ratingsScore, ranked.facilitiesScore, ranked.accessScore, facts.freeToAttend,
    facts.freeToAttend, facts.residencyFee?.amount ?? null, facts.residencyFee?.currency ?? null,
    facts.hasStipend, facts.stipend?.amount ?? null, facts.stipend?.currency ?? null,
    facts.applicationFee?.amount ?? null, facts.applicationFee?.currency ?? null, facts.meals,
    facts.meals ? facts.meals !== "none" : null, facts.privateStudio, facts.acceptedCount,
    facts.applicantPool, facts.housing, facts.wheelchair, facts.residencyLength,
    facts.disciplines.length ? facts.disciplines.join(", ") : null, facts.foundedYear,
    facts.location, facts.rmarRating, facts.rmarRatingsCount, facts.rmarReviewsCount,
    facts.rating?.value ?? null, facts.rating?.count ?? 0, facts.directories,
    facts.openCall?.title ?? null, facts.openCall?.url ?? null, facts.openCall?.deadline ?? null,
    JSON.stringify(facts.sources), JSON.stringify(ranked.pillarStatus), ranked.coverage, today,
  ];
}

/**
 * Matches, scores and ranks every described program. Writes the index in one
 * transaction when `write` is set; otherwise only returns the summary.
 */
export async function recomputeResidencyRankings(
  db: RankingDb,
  sources: ResidencySources,
  options: { write: boolean; today?: Date },
): Promise<{ summary: ResidencyRecomputeSummary; ranked: RankedResidency[] }> {
  const today = (options.today ?? new Date()).toISOString().slice(0, 10);
  const year = Number(today.slice(0, 4));

  const profileRows = await db.query(
    `SELECT p.id, p.name, p.profile_kind,
            COALESCE(NULLIF(BTRIM(p.website_url), ''), p.normalized_website_url) AS website,
            to_jsonb(p)->>'city' AS city, to_jsonb(p)->>'country' AS country
     FROM gary_profiles p
     WHERE p.profile_kind = ANY($1::text[])`,
    [RESIDENCY_PROFILE_KINDS],
  );
  const profiles: ResidencyProfile[] = profileRows.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    kind: String(row.profile_kind),
    website: row.website ? String(row.website) : null,
    city: row.city ? String(row.city) : null,
    country: row.country ? String(row.country) : null,
  }));
  const { matches, unmatched } = matchResidencyListings(profiles, sources);

  const siblingIds = [...new Set([...matches.values()].flatMap((m) => m.siblings.map((s) => s.id)))];
  const callRows = await db.query(
    `SELECT DISTINCT ON (o.id) COALESCE(l.profile_id, o.organization_id) AS profile_id,
            o.id, o.title, o.deadline_date::text AS deadline, o.updated_at::date::text AS recorded_on,
            COALESCE(o.guidelines_url, s.url) AS source_url
     FROM opportunities o
     JOIN opportunity_sources s ON s.id = o.source_id
     LEFT JOIN opportunity_profile_links l
       ON l.opportunity_id = o.id AND l.status = 'confirmed' AND l.verified_until > now()
     WHERE (o.organization_id = ANY($1::text[]) OR l.profile_id = ANY($1::text[]))
       AND o.publication_state = 'published'
       AND o.status IN ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
       AND (o.deadline_date IS NULL OR o.deadline_date >= $2::date)`,
    [siblingIds, today],
  );
  const callsByProfile = new Map<string, OpenCall[]>();
  for (const row of callRows.rows) {
    const call: OpenCall = {
      title: String(row.title),
      url: `/opportunities/${String(row.id)}`,
      deadline: row.deadline ? String(row.deadline) : null,
      sourceUrl: row.source_url ? String(row.source_url) : `https://usemissa.com/opportunities/${String(row.id)}`,
      recordedOn: row.recorded_on ? String(row.recorded_on) : today,
    };
    const id = String(row.profile_id);
    callsByProfile.set(id, [...(callsByProfile.get(id) ?? []), call]);
  }

  const reviewRows = await db.query(
    `SELECT profile_id, rating_score FROM missa_residency_reviews
     WHERE rating_score IS NOT NULL AND source NOT ILIKE '%ratemyartistresidency%'
       AND profile_id = ANY($1::text[])`,
    [[...matches.keys()]],
  );
  const missaRatings = new Map<string, number[]>();
  for (const row of reviewRows.rows) {
    const id = String(row.profile_id);
    missaRatings.set(id, [...(missaRatings.get(id) ?? []), Number(row.rating_score)]);
  }

  const acaCalls = new Map(sources.acaCalls.map((call) => [call.url, call]));
  const factsById = new Map<string, ResidencyFacts>();
  const inputs: ResidencyScoringInput[] = [];
  for (const match of matches.values()) {
    const facts = residencyFacts(match, {
      today,
      acaCalls,
      missaCalls: match.siblings.flatMap((s) => callsByProfile.get(s.id) ?? []),
      missaRatings: missaRatings.get(match.profile.id) ?? [],
    });
    factsById.set(match.profile.id, facts);
    inputs.push(scoringInput(match.profile, facts));
  }
  const ranked = rankResidencies(inputs, year);

  const tiers: Record<string, number> = {};
  for (const r of ranked) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
  const count = (pick: (f: ResidencyFacts) => unknown) =>
    [...factsById.values()].filter((f) => pick(f) != null && pick(f) !== false).length;
  const summary: ResidencyRecomputeSummary = {
    ranked: ranked.length,
    unmatchedListings: unmatched.length,
    unmatchedSample: unmatched.slice(0, 25),
    tiers,
    averageCoverage: ranked.length
      ? Math.round((ranked.reduce((s, r) => s + r.coverage, 0) / ranked.length) * 1000) / 1000
      : 0,
    facts: {
      fee: count((f) => f.residencyFee),
      free: count((f) => f.freeToAttend === true || null),
      stipend: count((f) => f.stipend),
      paidStipend: count((f) => f.hasStipend === true || null),
      meals: count((f) => f.meals),
      studio: count((f) => f.privateStudio),
      selection: count((f) => f.acceptedCount),
      rating: count((f) => f.rating),
      founded: count((f) => f.foundedYear),
      openCall: count((f) => f.openCall),
    },
    top: ranked.slice(0, 25).map((r) => ({
      rank: r.rankPosition,
      name: r.name,
      total: r.totalScore,
      coverage: r.coverage,
    })),
  };

  if (options.write) {
    const rows = ranked.map((r) => rankingRowValues(r, factsById.get(r.profileId)!, today));
    const reviewSources = [...matches.values()]
      .filter((m) => m.rmar.length)
      .map((m) => [m.profile.id, m.rmar[0].url]);
    await db.transaction([
      [`DELETE FROM missa_residency_rankings`, []],
      ...insertStatements("missa_residency_rankings", RANKING_COLUMNS, rows),
      ...reviewSources.map(
        ([profileId, url]) =>
          [
            `UPDATE missa_residency_reviews SET source_url = $2
             WHERE profile_id = $1 AND source ILIKE '%ratemyartistresidency%' AND source_url IS NULL`,
            [profileId, url],
          ] as [string, unknown[]],
      ),
    ]);
  }

  return { summary, ranked };
}
