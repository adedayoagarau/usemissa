import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  MIN_REPORTS_FOR_MEDIAN,
  PILLAR_KEYS,
  rankMagazines,
  type AnthologyCitation,
  type ComputedMagazineRankings,
  type ContributorPayKind,
  type FeeFacts,
  type MagazineScoringInput,
  type PushcartRankingRecord,
  type ResponseTimeBand,
  type ScoredGenre,
  type SimultaneousPolicy,
} from "@missa/radar-engine";
import {
  BEST_SMALL_FICTIONS_INDEX_URL,
  SOURCE_NAMES,
  bestMicrofictionUrl,
  discoverBestSmallFictionsEditions,
  garstangUrl,
  parseBestMicrofiction,
  parseBestSmallFictions,
  parseGarstangTable,
  validateEdition,
  type AnthologyEntry,
  type PushcartTableRow,
  type RankingSourceId,
  type SourceEdition,
  type SourceGenre,
} from "./sources.js";
import {
  deriveFeeFacts,
  overallFeeFact,
  type GenreFeeFact,
  type SubmissionCategory,
} from "./feeFacts.js";

// --- Database -----------------------------------------------------------------

export interface RankingDb {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  /** Runs every statement in one transaction. */
  transaction(statements: Array<[string, unknown[]]>): Promise<void>;
}

export function pgRankingDb(pool: Pool): RankingDb {
  return {
    query: (text, params = []) => pool.query(text, params),
    async transaction(statements) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const [text, params] of statements) await client.query(text, params);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

/** Multi-row INSERT statements, chunked well under the parameter limit. */
export function insertStatements(
  table: string,
  columns: string[],
  rows: unknown[][],
  suffix = "",
): Array<[string, unknown[]]> {
  const statements: Array<[string, unknown[]]> = [];
  const chunkSize = Math.max(1, Math.floor(5000 / columns.length));
  for (let i = 0; i < rows.length; i += chunkSize) {
    const params: unknown[] = [];
    const tuples = rows.slice(i, i + chunkSize).map((row) => {
      const slots = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${slots.join(", ")})`;
    });
    statements.push([
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}${suffix}`,
      params,
    ]);
  }
  return statements;
}

function stableId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
}

const isoDate = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

// --- Name matching ------------------------------------------------------------

/** Exact name key: case, punctuation, "the", "&" and bracketed notes ignored. */
export function exactKey(name: unknown): string {
  if (typeof name !== "string" || !name) return "";
  return name
    .toLowerCase()
    .replace(/©|®|™/g, "")
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/,\s*the\b/g, "")
    .replace(/^the\s+/g, "")
    .replace(/['’"“”().,–—\-:/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_SUFFIX =
  /\s+(a literary journal|literary magazine|literary journal|literary reader|literary review|magazine|journal|review|quarterly|press|editions|books|lit|online)$/;

/** Exact key without a subtitle or one generic suffix ("Bat City Review" → "bat city"). */
export function baseKey(name: unknown): string {
  if (typeof name !== "string") return "";
  return exactKey(name.replace(/\s*:\s.*$/, "")).replace(GENERIC_SUFFIX, "").trim();
}

/**
 * Listed names whose base match would be a different publication; they stay
 * unmatched until linked by hand. "Prism": profiles exist for both PRISM
 * international and Prism Review. "Moon City": only Moon City Press has a
 * profile, not Moon City Review.
 */
const AMBIGUOUS_LISTED_NAMES = new Set(["prism", "moon city"]);

export interface MatchableProfile {
  id: string;
  name: string;
  name_key?: string | null;
}

export interface ProfileIndex<P extends MatchableProfile> {
  exact: Map<string, P>;
  base: Map<string, P[]>;
  subtitled: Map<string, P[]>;
}

/** Profiles should arrive in preference order: the first with a key wins it. */
export function buildProfileIndex<P extends MatchableProfile>(profiles: P[]): ProfileIndex<P> {
  const exact = new Map<string, P>();
  const base = new Map<string, P[]>();
  const subtitled = new Map<string, P[]>();
  const add = (map: Map<string, P[]>, key: string, profile: P) => {
    const list = map.get(key) ?? [];
    if (!list.some((item) => item.id === profile.id)) list.push(profile);
    map.set(key, list);
  };
  for (const profile of profiles) {
    if (/:\s/.test(profile.name)) add(subtitled, exactKey(profile.name.replace(/\s*:\s.*$/, "")), profile);
    for (const name of [profile.name, profile.name_key]) {
      const e = exactKey(name);
      if (e && !exact.has(e)) exact.set(e, profile);
      const b = baseKey(name);
      if (b && b !== e) add(base, b, profile);
    }
  }
  return { exact, base, subtitled };
}

/**
 * Exact key first; otherwise only when one name is the other plus a generic
 * suffix or a subtitle, and the match is unique. "Chicago Review" never
 * matches "Chicago Quarterly".
 */
export function matchProfile<P extends MatchableProfile>(name: string, index: ProfileIndex<P>): P | null {
  const exact = exactKey(name);
  if (!exact || AMBIGUOUS_LISTED_NAMES.has(exact)) return null;
  const direct = index.exact.get(exact);
  if (direct) return direct;
  const base = baseKey(name);
  if (base !== exact && index.exact.has(base)) return index.exact.get(base)!;
  const candidates = index.base.get(exact);
  if (candidates?.length === 1) return candidates[0]!;
  const titled = index.subtitled.get(base);
  return titled?.length === 1 ? titled[0]! : null;
}

// --- Listing facts (Poets & Writers) -----------------------------------------

const RESPONSE_BANDS: Record<string, ResponseTimeBand> = {
  "less than 3 months": "under_3_months",
  "3 to 6 months": "3_to_6_months",
  "greater than 6 months": "over_6_months",
};
const PAY_KINDS: Record<string, ContributorPayKind> = {
  cash: "cash",
  "contributor copies only": "copies_only",
  "no payment": "unpaid",
};

function yesNo(value: unknown): boolean | null {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "yes" ? true : v === "no" ? false : null;
}

export interface ListingFacts {
  year: number;
  recordedOn: string;
  url: string;
  responseTimeBand: ResponseTimeBand | null;
  chargesFee: boolean | null;
  payKind: ContributorPayKind | null;
  simultaneous: SimultaneousPolicy | null;
}

/** One Poets & Writers listing, dated by its "last updated" line. */
export function listingFacts(row: Record<string, unknown>): ListingFacts | null {
  const url = typeof row.source_detail_url === "string" ? row.source_detail_url : null;
  if (!url) return null;
  const updated = String(row.last_updated ?? "").trim();
  const parsed = updated ? Date.parse(`${updated} UTC`) : NaN;
  const recordedOn = Number.isNaN(parsed) ? isoDate(row.observed_at) : new Date(parsed).toISOString().slice(0, 10);
  const simultaneous = yesNo(row.simultaneous_submissions);
  return {
    year: Number(recordedOn.slice(0, 4)),
    recordedOn,
    url,
    responseTimeBand: RESPONSE_BANDS[String(row.response_time ?? "").trim().toLowerCase()] ?? null,
    chargesFee: yesNo(row.reading_fee),
    payKind: PAY_KINDS[String(row.payment ?? "").trim().toLowerCase()] ?? null,
    simultaneous: simultaneous === true ? "allowed" : simultaneous === false ? "forbidden" : null,
  };
}

// --- Source refresh ------------------------------------------------------------

export type FetchText = (url: string) => Promise<{ status: number; text: string }>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Responses a busy site sends when asked too quickly; worth retrying after a pause. */
const TRANSIENT_STATUS = new Set([307, 429, 502, 503, 504]);

export const defaultFetchText: FetchText = async (url) => {
  let last: { status: number; text: string } | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(2000 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "MissaIndexBot/1.0 (+https://usemissa.com/rankings/methodology)" },
        redirect: "follow",
      });
      last = { status: response.status, text: await response.text() };
      if (!TRANSIENT_STATUS.has(response.status)) return last;
    } catch (error) {
      lastError = error;
    }
  }
  if (last) return last;
  throw lastError;
};

/** Pause between requests so a source site is never hit in a burst. */
export const SOURCE_REQUEST_GAP_MS = 1500;

type ParsedRows = PushcartTableRow[] | AnthologyEntry[];

function parseEdition(edition: SourceEdition, html: string): ParsedRows {
  if (edition.source === "garstang") return parseGarstangTable(html);
  if (edition.source === "best_microfiction") return parseBestMicrofiction(html);
  return parseBestSmallFictions(html, edition.editionYear);
}

export interface RefreshResult {
  source: RankingSourceId;
  editionYear: number;
  genre: SourceGenre | null;
  outcome: "accepted" | "rejected" | "unchanged" | "not_published" | "settled" | "error";
  rows?: number;
  reason?: string;
}

/** Garstang years kept current, and the earliest anthology edition counted. */
export function maintainedEditions(today: Date, bestSmallFictions: Map<number, string>): SourceEdition[] {
  const year = today.getUTCFullYear();
  const editions: SourceEdition[] = [];
  for (let editionYear = year - 2; editionYear <= year + 1; editionYear++) {
    for (const genre of ["fiction", "poetry", "nonfiction"] as const) {
      editions.push({ source: "garstang", editionYear, genre, url: garstangUrl(editionYear, genre) });
    }
  }
  for (let editionYear = year - 9; editionYear <= year; editionYear++) {
    editions.push({ source: "best_microfiction", editionYear, genre: null, url: bestMicrofictionUrl(editionYear) });
  }
  for (const [editionYear, url] of bestSmallFictions) {
    if (editionYear >= year - 9) {
      editions.push({ source: "best_small_fictions", editionYear, genre: null, url });
    }
  }
  return editions;
}

/**
 * Fetches each maintained edition that may still change (or was never
 * stored), validates it, and archives it as a snapshot. Editions older than
 * last year that already have an accepted snapshot are settled and skipped.
 */
export async function refreshRankingSources(
  db: RankingDb,
  options: { fetchText?: FetchText; today?: Date; requestGapMs?: number } = {},
): Promise<RefreshResult[]> {
  const fetchText = options.fetchText ?? defaultFetchText;
  const today = options.today ?? new Date();
  const year = today.getUTCFullYear();

  let bsfEditions = new Map<number, string>();
  try {
    const index = await fetchText(BEST_SMALL_FICTIONS_INDEX_URL);
    if (index.status === 200) bsfEditions = discoverBestSmallFictionsEditions(index.text);
  } catch {
    // Keep stored Best Small Fictions editions; the next run tries again.
  }

  const stored = await db.query(
    `SELECT DISTINCT ON (source, edition_year, COALESCE(genre, ''))
            source, edition_year, genre, status, content_sha256,
            (SELECT s2.row_count FROM missa_ranking_source_snapshots s2
              WHERE s2.source = s.source AND s2.edition_year = s.edition_year
                AND COALESCE(s2.genre, '') = COALESCE(s.genre, '') AND s2.status = 'accepted'
              ORDER BY s2.retrieved_at DESC LIMIT 1) AS accepted_rows
     FROM missa_ranking_source_snapshots s
     ORDER BY source, edition_year, COALESCE(genre, ''), retrieved_at DESC`,
  );
  const latest = new Map(
    stored.rows.map((row) => [`${row.source}|${row.edition_year}|${row.genre ?? ""}`, row]),
  );

  const results: RefreshResult[] = [];
  let fetched = 0;
  for (const edition of maintainedEditions(today, bsfEditions)) {
    const key = `${edition.source}|${edition.editionYear}|${edition.genre ?? ""}`;
    const previous = latest.get(key);
    const acceptedRows = previous?.accepted_rows == null ? null : Number(previous.accepted_rows);
    const base = { source: edition.source, editionYear: edition.editionYear, genre: edition.genre };
    if (acceptedRows != null && edition.editionYear < year - 1) {
      results.push({ ...base, outcome: "settled" });
      continue;
    }
    try {
      if (fetched++ > 0) await sleep(options.requestGapMs ?? SOURCE_REQUEST_GAP_MS);
      const response = await fetchText(edition.url);
      if (response.status === 404 || response.status === 410) {
        results.push({ ...base, outcome: "not_published" });
        continue;
      }
      if (response.status !== 200) {
        results.push({ ...base, outcome: "error", reason: `HTTP ${response.status}` });
        continue;
      }
      const rows = parseEdition(edition, response.text);
      const sha = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      if (previous?.content_sha256 === sha) {
        results.push({ ...base, outcome: "unchanged", rows: rows.length });
        continue;
      }
      const verdict = validateEdition(edition.source, rows.length, acceptedRows);
      if (!verdict.accepted && rows.length === 0 && edition.editionYear > year) {
        // Next year's page is not up yet.
        results.push({ ...base, outcome: "not_published" });
        continue;
      }
      const status = verdict.accepted ? "accepted" : "rejected";
      const reason = verdict.accepted ? null : verdict.reason;
      await db.transaction([
        [
          `INSERT INTO missa_ranking_source_snapshots (
             id, source, edition_year, genre, url, retrieved_at, content_sha256, row_count, rows, status, reason
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
          [
            stableId("snap", edition.source, String(edition.editionYear), edition.genre ?? "", sha),
            edition.source,
            edition.editionYear,
            edition.genre,
            edition.url,
            today.toISOString(),
            sha,
            rows.length,
            JSON.stringify(rows),
            status,
            reason,
          ],
        ],
      ]);
      results.push({ ...base, outcome: status, rows: rows.length, ...(reason ? { reason } : {}) });
    } catch (error) {
      results.push({ ...base, outcome: "error", reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

// --- Recompute -----------------------------------------------------------------

interface StoredEdition {
  source: RankingSourceId;
  editionYear: number;
  genre: SourceGenre | null;
  url: string;
  retrievedOn: string;
  rows: ParsedRows;
}

async function acceptedEditions(db: RankingDb): Promise<StoredEdition[]> {
  const res = await db.query(
    `SELECT DISTINCT ON (source, edition_year, COALESCE(genre, ''))
            source, edition_year, genre, url, retrieved_at, rows
     FROM missa_ranking_source_snapshots
     WHERE status = 'accepted'
     ORDER BY source, edition_year, COALESCE(genre, ''), retrieved_at DESC`,
  );
  return res.rows.map((row) => ({
    source: row.source as RankingSourceId,
    editionYear: Number(row.edition_year),
    genre: (row.genre as SourceGenre | null) ?? null,
    url: String(row.url),
    retrievedOn: isoDate(row.retrieved_at),
    rows: (typeof row.rows === "string" ? JSON.parse(row.rows) : row.rows) as ParsedRows,
  }));
}

/** Ranking years with an accepted Garstang table in all three genres. */
export function completeRankingYears(editions: Pick<StoredEdition, "source" | "editionYear" | "genre">[]): number[] {
  const genresByYear = new Map<number, Set<string>>();
  for (const e of editions) {
    if (e.source !== "garstang" || !e.genre) continue;
    const set = genresByYear.get(e.editionYear) ?? new Set();
    set.add(e.genre);
    genresByYear.set(e.editionYear, set);
  }
  return [...genresByYear].filter(([, genres]) => genres.size === 3).map(([y]) => y).sort();
}

type FactSource = { url: string; recordedOn: string };

interface MagazineFacts {
  listing: ListingFacts | null;
  fees: Partial<Record<ScoredGenre, GenreFeeFact>>;
  overallFee: GenreFeeFact | null;
  reportCount: number;
  median: number | null;
}

export interface RecomputeSummary {
  years: number[];
  magazines: Record<number, Record<string, number>>;
  pillarStatus: Record<number, Record<string, Record<string, number>>>;
  pushcartRows: number;
  anthologySelections: number;
  unmatchedNames: string[];
  feeAmounts: { magazines: number; listingSaysNoFeeButCategoryCharges: string[]; listingSaysFeeButCategoryFree: string[] };
  rankingRows: number;
}

export async function recomputeMagazineRankings(
  db: RankingDb,
  options: { years?: number[]; write: boolean },
): Promise<{ summary: RecomputeSummary; ranked: Map<number, ComputedMagazineRankings[]> }> {
  const editions = await acceptedEditions(db);
  const available = completeRankingYears(editions);
  const years = (options.years ?? available.slice(-1)).filter((y) => available.includes(y));
  if (years.length === 0) throw new Error("No ranking year has accepted Garstang tables for all three genres.");

  const profiles = await db.query(`
    SELECT p.id, p.name, p.name_key
    FROM gary_profiles p
    WHERE p.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization')
    ORDER BY EXISTS (SELECT 1 FROM missa_magazine_rankings r WHERE r.profile_id = p.id) DESC,
             EXISTS (SELECT 1 FROM gary_profile_observations o WHERE o.profile_id = p.id AND o.source_id LIKE 'pw.org%') DESC,
             p.id ASC`);
  const index = buildProfileIndex(
    profiles.rows.map((p) => ({ id: String(p.id), name: String(p.name), name_key: (p.name_key as string | null) ?? null })),
  );
  const names = new Map(profiles.rows.map((p) => [String(p.id), String(p.name)]));
  const unmatched = new Set<string>();

  type PushcartRow = PushcartRankingRecord & { priorRank: number | null; listedName: string; marker: string | null; retrievedOn: string };
  const pushcart = new Map<string, PushcartRow>();
  const citations: Array<AnthologyCitation & { profileId: string; pieceTitle: string; author: string; retrievedOn: string }> = [];

  for (const edition of editions) {
    if (edition.source === "garstang") {
      for (const row of edition.rows as PushcartTableRow[]) {
        const profile = matchProfile(row.name, index);
        if (!profile) {
          unmatched.add(`Garstang: ${row.name}`);
          continue;
        }
        const key = `${profile.id}|${edition.editionYear}|${edition.genre}`;
        const existing = pushcart.get(key);
        if (existing && existing.score >= row.score) continue;
        pushcart.set(key, {
          genre: edition.genre as ScoredGenre,
          editionYear: edition.editionYear,
          score: row.score,
          rank: row.rank,
          sourceUrl: edition.url,
          priorRank: row.priorRank,
          listedName: row.name,
          marker: row.marker,
          retrievedOn: edition.retrievedOn,
          profileId: profile.id,
        } as PushcartRow & { profileId: string });
      }
    } else {
      for (const entry of edition.rows as AnthologyEntry[]) {
        const profile = matchProfile(entry.magazine, index);
        if (!profile) {
          unmatched.add(`${SOURCE_NAMES[edition.source]}: ${entry.magazine}`);
          continue;
        }
        citations.push({
          profileId: profile.id,
          genre: "fiction",
          anthology: SOURCE_NAMES[edition.source] as AnthologyCitation["anthology"],
          year: edition.editionYear,
          sourceUrl: edition.url,
          pieceTitle: entry.pieceTitle,
          author: entry.author,
          retrievedOn: edition.retrievedOn,
        });
      }
    }
  }
  const pushcartRows = [...pushcart.values()] as Array<PushcartRow & { profileId: string }>;

  const [listingRes, categoryRes, reportRes] = await Promise.all([
    db.query(`
      SELECT DISTINCT ON (profile_id) profile_id, response_time, reading_fee, payment,
             simultaneous_submissions, source_detail_url, last_updated, observed_at
      FROM gary_profile_observations
      WHERE source_id LIKE 'pw.org%' AND source_detail_url IS NOT NULL
      ORDER BY profile_id, observed_at DESC`),
    db.query(`
      SELECT DISTINCT profile_id, title, fee_cents, url, checked_on FROM (
        SELECT o.organization_id AS profile_id, o.title, o.fee_cents,
               COALESCE(o.submission_url, o.guidelines_url, s.url) AS url,
               COALESCE(o.source_checked_at, o.updated_at)::date AS checked_on
        FROM opportunities o JOIN opportunity_sources s ON s.id = o.source_id
        WHERE o.publication_state = 'published' AND o.fee_cents IS NOT NULL
          AND o.fee_status IN ('paid', 'fee-required', 'no-fee')
        UNION ALL
        SELECT l.profile_id, o.title, o.fee_cents,
               COALESCE(o.submission_url, o.guidelines_url, s.url),
               COALESCE(o.source_checked_at, o.updated_at)::date
        FROM opportunity_profile_links l
        JOIN opportunities o ON o.id = l.opportunity_id
        JOIN opportunity_sources s ON s.id = o.source_id
        WHERE l.status = 'confirmed' AND o.publication_state = 'published'
          AND o.fee_cents IS NOT NULL AND o.fee_status IN ('paid', 'fee-required', 'no-fee')
      ) categories
      WHERE profile_id IS NOT NULL AND url IS NOT NULL`),
    db.query(`
      SELECT profile_id, COUNT(*)::int AS reports,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) AS median_days
      FROM missa_submission_telemetry
      WHERE response_days > 0 AND outcome IN ('accepted', 'rejected', 'withdrawn')
      GROUP BY profile_id`),
  ]);

  const listings = new Map<string, ListingFacts>();
  for (const row of listingRes.rows) {
    const facts = listingFacts(row);
    if (facts) listings.set(String(row.profile_id), facts);
  }
  const categoriesByProfile = new Map<string, SubmissionCategory[]>();
  for (const row of categoryRes.rows) {
    const list = categoriesByProfile.get(String(row.profile_id)) ?? [];
    list.push({
      title: String(row.title),
      feeCents: Number(row.fee_cents),
      url: String(row.url),
      checkedOn: isoDate(row.checked_on),
    });
    categoriesByProfile.set(String(row.profile_id), list);
  }
  const reports = new Map(reportRes.rows.map((row) => [String(row.profile_id), row]));

  const factsFor = (profileId: string, year: number): MagazineFacts => {
    const listing = listings.get(profileId);
    const categories = (categoriesByProfile.get(profileId) ?? []).filter(
      (c) => Number(c.checkedOn.slice(0, 4)) <= year,
    );
    const fees = deriveFeeFacts(categories, names.get(profileId));
    const report = reports.get(profileId);
    const reportCount = report ? Number(report.reports) : 0;
    return {
      listing: listing && listing.year <= year ? listing : null,
      fees,
      overallFee: overallFeeFact(fees),
      reportCount,
      median: reportCount >= MIN_REPORTS_FOR_MEDIAN ? Math.round(Number(report!.median_days)) : null,
    };
  };

  const ranked = new Map<number, ComputedMagazineRankings[]>();
  const factsByYear = new Map<number, Map<string, MagazineFacts>>();
  const conflicts = { listingSaysNoFeeButCategoryCharges: new Set<string>(), listingSaysFeeButCategoryFree: new Set<string>() };
  const feeMagazines = new Set<string>();

  for (const year of years) {
    const members = new Set([
      ...pushcartRows.filter((r) => r.editionYear === year).map((r) => r.profileId),
      ...citations.filter((c) => year - c.year >= 0 && year - c.year <= 9).map((c) => c.profileId),
    ]);
    const yearFacts = new Map<string, MagazineFacts>();
    const inputs: MagazineScoringInput[] = [];
    for (const profileId of members) {
      const facts = factsFor(profileId, year);
      yearFacts.set(profileId, facts);
      const name = names.get(profileId) ?? profileId;
      if (facts.overallFee) {
        feeMagazines.add(profileId);
        if (facts.listing?.chargesFee === false && facts.overallFee.regularFeeCents > 0) {
          conflicts.listingSaysNoFeeButCategoryCharges.add(name);
        }
        if (facts.listing?.chargesFee === true && facts.overallFee.regularFeeCents === 0) {
          conflicts.listingSaysFeeButCategoryFree.add(name);
        }
      }
      const own = citations.filter((c) => c.profileId === profileId);
      const pushcartForYear = pushcartRows.filter((r) => r.profileId === profileId && r.editionYear === year);
      const genres = new Set<ScoredGenre>(pushcartForYear.map((r) => r.genre));
      for (const c of own) if (c.genre !== "hybrid" && year - c.year >= 0 && year - c.year <= 9) genres.add(c.genre);

      const magazineFee = feeFactsFromRecord(facts.overallFee, facts.listing);
      const feesByGenre: Partial<Record<ScoredGenre, FeeFacts>> = {};
      for (const [genre, fee] of Object.entries(facts.fees) as Array<[ScoredGenre, GenreFeeFact]>) {
        feesByGenre[genre] = feeFactsFromRecord(fee, null);
      }

      inputs.push({
        profileId,
        name,
        genresPublished: [...genres],
        pushcart: pushcartForYear.map(({ genre, editionYear, score, rank, sourceUrl }) => ({ genre, editionYear, score, rank, sourceUrl })),
        anthologyCitations: own.map(({ genre, anthology, year: y, sourceUrl }) => ({ genre, anthology, year: y, sourceUrl })),
        medianResponseDays: facts.median,
        responseTimeBand: facts.listing?.responseTimeBand ?? null,
        simultaneousSubmissions: facts.listing?.simultaneous ?? null,
        queryAllowedAfterDays: null,
        ...magazineFee,
        feesByGenre,
        contributorPay: { kind: facts.listing?.payKind ?? null },
        digitalArchive: null,
        blindReading: null,
        debutFriendly: null,
      });
    }
    ranked.set(year, rankMagazines(inputs, year));
    factsByYear.set(year, yearFacts);
  }

  const rankingRows: unknown[][] = [];
  const summary: RecomputeSummary = {
    years,
    magazines: {},
    pillarStatus: {},
    pushcartRows: pushcartRows.filter((r) => years.includes(r.editionYear)).length,
    anthologySelections: citations.length,
    unmatchedNames: [...unmatched].sort(),
    feeAmounts: {
      magazines: feeMagazines.size,
      listingSaysNoFeeButCategoryCharges: [...conflicts.listingSaysNoFeeButCategoryCharges].sort(),
      listingSaysFeeButCategoryFree: [...conflicts.listingSaysFeeButCategoryFree].sort(),
    },
    rankingRows: 0,
  };

  for (const year of years) {
    const yearFacts = factsByYear.get(year)!;
    const counts: Record<string, number> = { overall: 0, fiction: 0, poetry: 0, nonfiction: 0 };
    const statuses: Record<string, Record<string, number>> = Object.fromEntries(
      PILLAR_KEYS.map((key) => [key, { recorded: 0, partial: 0, unknown: 0 }]),
    );
    for (const item of ranked.get(year)!) {
      const facts = yearFacts.get(item.profileId)!;
      for (const key of PILLAR_KEYS) statuses[key]![item.overall.pillarStatus[key]]! += 1;
      for (const [genre, score] of [["overall", item.overall], ...Object.entries(item.genres)] as const) {
        if (!score) continue;
        counts[genre]! += 1;
        const fee = genre === "overall" ? facts.overallFee : facts.fees[genre as ScoredGenre] ?? facts.overallFee;
        const feeFacts = feeFactsFromRecord(fee, facts.listing);
        const sources: Record<string, FactSource> = {};
        const listingSource = facts.listing ? { url: facts.listing.url, recordedOn: facts.listing.recordedOn } : null;
        if (fee) sources.fee = { url: fee.sourceUrl, recordedOn: fee.recordedOn };
        else if (facts.listing?.chargesFee != null) sources.fee = listingSource!;
        if (facts.listing?.payKind) sources.pay = listingSource!;
        if (facts.listing?.responseTimeBand) sources.response = listingSource!;
        if (facts.listing?.simultaneous) sources.simultaneous = listingSource!;
        rankingRows.push([
          item.profileId, year, genre, score.rankPosition, score.tier,
          score.totalScore, score.accoladesScore, score.payScore, score.turnaroundScore, score.feesScore,
          score.respectScore, score.formatAndEthicsScore, facts.median,
          feeFacts.regularSubmissionFeeCents, null, facts.listing?.simultaneous ?? null,
          facts.listing?.responseTimeBand ?? null, feeFacts.chargesSubmissionFee, facts.listing?.payKind ?? null,
          facts.reportCount, JSON.stringify(sources), JSON.stringify(score.pillarStatus), score.coverage,
        ]);
      }
    }
    summary.magazines[year] = counts;
    summary.pillarStatus[year] = statuses;
  }
  summary.rankingRows = rankingRows.length;

  if (options.write) {
    await db.transaction([
      [`DELETE FROM missa_pushcart_rankings WHERE edition_year = ANY($1::int[])`, [years]],
      ...insertStatements(
        "missa_pushcart_rankings",
        ["profile_id", "edition_year", "genre", "source_rank", "source_score", "prior_rank", "listed_name", "status_marker", "source_name", "source_url", "retrieved_on"],
        pushcartRows
          .filter((r) => years.includes(r.editionYear))
          .map((r) => [r.profileId, r.editionYear, r.genre, r.rank, r.score, r.priorRank, r.listedName, r.marker, SOURCE_NAMES.garstang, r.sourceUrl, r.retrievedOn]),
      ),
      [`DELETE FROM missa_literary_awards`, []],
      ...insertStatements(
        "missa_literary_awards",
        ["id", "profile_id", "genre", "anthology", "award_type", "award_year", "piece_title", "author_name", "source_name", "source_url", "retrieved_on"],
        citations.map((c) => [
          stableId("award", c.profileId, c.anthology, String(c.year), c.pieceTitle, c.author),
          c.profileId, c.genre, c.anthology, "selection", c.year, c.pieceTitle, c.author, c.anthology, c.sourceUrl, c.retrievedOn,
        ]),
        " ON CONFLICT (id) DO NOTHING",
      ),
      [`DELETE FROM missa_magazine_rankings WHERE ranking_year = ANY($1::int[])`, [years]],
      ...insertStatements(
        "missa_magazine_rankings",
        ["profile_id", "ranking_year", "genre", "rank_position", "prestige_tier",
          "total_score", "accolades_score", "pay_score", "turnaround_score", "fees_score",
          "respect_score", "format_ethics_score", "median_response_days",
          "regular_fee_cents", "contributor_pay_cents", "simultaneous_policy",
          "response_time_band", "charges_reading_fee", "pay_kind",
          "telemetry_reports", "fact_sources", "pillar_status", "coverage"],
        rankingRows,
      ),
    ]);
  }

  return { summary, ranked };
}

/** Engine fee facts from a recorded category fee, else the listing's yes/no. */
function feeFactsFromRecord(fee: GenreFeeFact | null, listing: ListingFacts | null): FeeFacts {
  if (fee) {
    return {
      regularSubmissionFeeCents: fee.regularFeeCents,
      chargesSubmissionFee: fee.regularFeeCents > 0,
      hasSubsidizedFeeCategory: fee.regularFeeCents > 0 ? fee.hasSubsidizedFeeCategory : null,
    };
  }
  return {
    regularSubmissionFeeCents: listing?.chargesFee === false ? 0 : null,
    chargesSubmissionFee: listing?.chargesFee ?? null,
    hasSubsidizedFeeCategory: null,
  };
}

// --- Scheduled update ------------------------------------------------------------

export interface IndexUpdateResult {
  runId: string | null;
  status: "published" | "dry_run" | "failed" | "skipped";
  rankingYears: number[];
  refresh: RefreshResult[];
  summary?: RecomputeSummary;
  error?: string;
}

/** A recompute that loses this share of a year's magazines is held back. */
const MAX_MAGAZINE_DROP = 0.2;

/**
 * Refreshes sources and recomputes the latest complete ranking year (a new
 * year starts once Garstang publishes all three of its tables). Earlier years
 * stay as published. Rankings are written only when `publish` is true and
 * the result passes the size check; every run is logged.
 */
export async function runMagazineIndexUpdate(
  db: RankingDb,
  options: {
    trigger: string;
    publish: boolean;
    fetchText?: FetchText;
    today?: Date;
    years?: number[];
    /** Skip the size check for a deliberate, reviewed rebuild. Never set by the schedule. */
    allowShrink?: boolean;
    requestGapMs?: number;
  },
): Promise<IndexUpdateResult> {
  const running = await db.query(
    `SELECT id FROM missa_ranking_runs
     WHERE status = 'running' AND started_at > NOW() - INTERVAL '30 minutes' LIMIT 1`,
  );
  if (running.rows.length > 0) {
    return { runId: null, status: "skipped", rankingYears: [], refresh: [], error: "Another update is running." };
  }
  const runId = `mlmi_run_${randomUUID().replace(/-/g, "")}`;
  await db.query(`INSERT INTO missa_ranking_runs (id, trigger, status) VALUES ($1, $2, 'running')`, [runId, options.trigger]);
  let refresh: RefreshResult[] = [];
  try {
    refresh = await refreshRankingSources(db, {
      fetchText: options.fetchText,
      today: options.today,
      requestGapMs: options.requestGapMs,
    });
    const preview = await recomputeMagazineRankings(db, { years: options.years, write: false });
    const years = preview.summary.years;

    const current = await db.query(
      `SELECT ranking_year, COUNT(*)::int AS n FROM missa_magazine_rankings
       WHERE genre = 'overall' AND ranking_year = ANY($1::int[]) GROUP BY ranking_year`,
      [years],
    );
    for (const row of current.rows) {
      const before = Number(row.n);
      const after = preview.summary.magazines[Number(row.ranking_year)]?.overall ?? 0;
      if (!options.allowShrink && before > 0 && after < before * (1 - MAX_MAGAZINE_DROP)) {
        throw new Error(
          `${row.ranking_year} would fall from ${before} to ${after} magazines; held back for review.`,
        );
      }
    }

    let summary = preview.summary;
    if (options.publish) summary = (await recomputeMagazineRankings(db, { years, write: true })).summary;
    const status = options.publish ? "published" : "dry_run";
    await db.query(
      `UPDATE missa_ranking_runs SET status = $2, published = $3, ranking_years = $4::int[],
         summary = $5::jsonb, finished_at = NOW() WHERE id = $1`,
      [runId, status, options.publish, years, JSON.stringify({ refresh, recompute: summary })],
    );
    return { runId, status, rankingYears: years, refresh, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .query(
        `UPDATE missa_ranking_runs SET status = 'failed', summary = $2::jsonb, finished_at = NOW() WHERE id = $1`,
        [runId, JSON.stringify({ refresh, error: message })],
      )
      .catch(() => undefined);
    return { runId, status: "failed", rankingYears: [], refresh, error: message };
  }
}
