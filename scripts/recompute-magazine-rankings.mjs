#!/usr/bin/env node
/**
 * Recomputes the Missa Literary Magazine Index from recorded, citable data.
 *
 *   DATABASE_URL=... node scripts/recompute-magazine-rankings.mjs            # dry run
 *   DATABASE_URL=... node scripts/recompute-magazine-rankings.mjs --write    # write
 *   ... --years=2024,2025,2026 --report=/path/report.json
 *   ... --neon-http   # use Neon's HTTPS SQL API where raw Postgres is blocked
 *
 * Sources, and nothing else:
 * - Accolades: Clifford Garstang's published Pushcart ranking tables
 *   (packages/radar-adapters/src/ranking/data/garstang-pushcart-rankings.json)
 *   and anthology selections whose source names the magazine
 *   (packages/radar-adapters/src/ranking/data/anthology-citations.json).
 * - Submission facts: the magazine's Poets & Writers listing as stored in
 *   gary_profile_observations, with its source URL. A listing is used for a
 *   ranking year only if it was last updated in or before that year.
 * - Response times: the median of writer reports once a magazine has
 *   MIN_REPORTS_FOR_MEDIAN decided reports.
 * Any fact without a source stays null and the engine scores it as unknown.
 *
 * Profiles are never created here: a listed name that matches no profile is
 * reported and left out.
 *
 * Requires built packages: npm run build --workspace=@missa/radar-engine
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  MIN_REPORTS_FOR_MEDIAN,
  rankMagazines,
} from "../packages/radar-engine/dist/src/ranking/magazineRankingEngine.js";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(repoRoot, "packages/radar-adapters/src/ranking/data");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const write = args.get("write") === "true";
const years = (args.get("years") ?? "2024,2025,2026").split(",").map(Number);
const reportPath = args.get("report");
const neonHttp = args.get("neon-http") === "true";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Point it at a Neon branch, not production, until the result is reviewed.",
  );
  process.exit(1);
}

/** Exact name key: case, punctuation, "the", "&" and parentheticals ignored. */
function exactKey(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/©|®|™/g, "")
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/,\s*the\b/g, "")
    .replace(/^the\s+/g, "")
    .replace(/['’"“”().,–—\-:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_SUFFIX =
  /\s+(a literary journal|literary magazine|literary journal|literary reader|literary review|magazine|journal|review|quarterly|press|editions|books|lit|online)$/;

/**
 * Exact key without a subtitle or one generic suffix
 * ("Ecotone: Reimagining Place" → "ecotone", "Bat City Review" → "bat city").
 */
function baseKey(name) {
  const withoutSubtitle = String(name ?? "").replace(/\s*:\s.*$/, "");
  return exactKey(withoutSubtitle).replace(GENERIC_SUFFIX, "").trim();
}

/**
 * Listed names whose base match would be a different publication, so they
 * stay unmatched until someone links them by hand:
 * - "Prism": profiles exist for both PRISM international and Prism Review.
 * - "Moon City": the only profile is Moon City Press, not Moon City Review.
 */
const AMBIGUOUS_LISTED_NAMES = new Set(["prism", "moon city"]);

/**
 * Matches a listed name to a profile. Exact keys first; otherwise only when
 * one name is the other plus a generic suffix, and that match is unique.
 * "Chicago Review" never matches "Chicago Quarterly".
 */
function matchProfile(name, index) {
  const exact = exactKey(name);
  if (!exact || AMBIGUOUS_LISTED_NAMES.has(exact)) return null;
  if (index.exact.has(exact)) return index.exact.get(exact);
  const base = baseKey(name);
  if (base !== exact && index.exact.has(base)) return index.exact.get(base);
  const candidates = index.base.get(exact);
  if (candidates && candidates.length === 1) return candidates[0];
  // "Ecotone Magazine" ↔ "Ecotone: Reimagining Place": a subtitle, not a different suffix.
  const titled = index.subtitled.get(base);
  return titled && titled.length === 1 ? titled[0] : null;
}

function buildProfileIndex(rows) {
  const exact = new Map();
  const base = new Map();
  const subtitled = new Map();
  for (const p of rows) {
    if (/:\s/.test(p.name ?? "")) {
      const title = exactKey(p.name.replace(/\s*:\s.*$/, ""));
      const list = subtitled.get(title) ?? [];
      list.push(p);
      subtitled.set(title, list);
    }
    for (const name of [p.name, p.name_key]) {
      const e = exactKey(name);
      if (e && !exact.has(e)) exact.set(e, p);
      const b = baseKey(name);
      if (b && b !== e) {
        const list = base.get(b) ?? [];
        if (!list.some((item) => item.id === p.id)) list.push(p);
        base.set(b, list);
      }
    }
  }
  return { exact, base, subtitled };
}

const RESPONSE_BANDS = {
  "less than 3 months": "under_3_months",
  "3 to 6 months": "3_to_6_months",
  "greater than 6 months": "over_6_months",
};
const PAY_KINDS = {
  cash: "cash",
  "contributor copies only": "copies_only",
  "no payment": "unpaid",
};

function yesNo(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "yes" ? true : v === "no" ? false : null;
}

/** Year a listing was last updated ("Feb 05, 2026"), else when it was observed. */
function factYear(lastUpdated, observedAt) {
  const match = String(lastUpdated ?? "").match(/(\d{4})\s*$/);
  if (match) return Number(match[1]);
  return observedAt ? new Date(observedAt).getUTCFullYear() : null;
}

function listingFacts(obs) {
  if (!obs) return null;
  const fee = yesNo(obs.reading_fee);
  const simultaneous = yesNo(obs.simultaneous_submissions);
  return {
    year: factYear(obs.last_updated, obs.observed_at),
    recordedOn: obs.last_updated
      ? new Date(`${obs.last_updated} UTC`).toISOString().slice(0, 10)
      : String(obs.observed_at).slice(0, 10),
    sourceUrl: obs.source_detail_url,
    responseTimeBand:
      RESPONSE_BANDS[
        String(obs.response_time ?? "")
          .trim()
          .toLowerCase()
      ] ?? null,
    chargesSubmissionFee: fee,
    regularSubmissionFeeCents: fee === false ? 0 : null,
    payKind:
      PAY_KINDS[
        String(obs.payment ?? "")
          .trim()
          .toLowerCase()
      ] ?? null,
    simultaneousSubmissions:
      simultaneous === true
        ? "allowed"
        : simultaneous === false
          ? "forbidden"
          : null,
  };
}

/**
 * Minimal database adapter: query() for reads and transaction() for writes.
 * pg by default; Neon's HTTPS SQL endpoint with --neon-http.
 */
async function connect(connectionString) {
  if (neonHttp) {
    const host = new URL(connectionString).hostname;
    const post = async (body, extraHeaders = {}) => {
      const response = await fetch(`https://${host}/sql`, {
        method: "POST",
        headers: {
          "Neon-Connection-String": connectionString,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message ?? `Neon HTTP ${response.status}`);
      return payload;
    };
    return {
      query: (text, params = []) => post({ query: text, params }),
      transaction: (statements) =>
        post(
          {
            queries: statements.map(([text, params]) => ({
              query: text,
              params,
            })),
          },
          { "Neon-Batch-Isolation-Level": "Serializable" },
        ),
      end: async () => undefined,
    };
  }
  const client = new pg.Client({ connectionString });
  await client.connect();
  return {
    query: (text, params = []) => client.query(text, params),
    async transaction(statements) {
      await client.query("BEGIN");
      try {
        for (const [text, params] of statements)
          await client.query(text, params);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    },
    end: () => client.end(),
  };
}

/** Multi-row INSERT statements, chunked so each stays well under parameter limits. */
function insertStatements(table, columns, rows, suffix = "") {
  const statements = [];
  const chunkSize = Math.floor(5000 / columns.length);
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const params = [];
    const tuples = chunk.map((row) => {
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

function stableId(prefix, ...parts) {
  return `${prefix}_${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
}

async function main() {
  const garstang = JSON.parse(
    readFileSync(join(dataDir, "garstang-pushcart-rankings.json"), "utf8"),
  );
  const anthologyPath = join(dataDir, "anthology-citations.json");
  const anthology = existsSync(anthologyPath)
    ? JSON.parse(readFileSync(anthologyPath, "utf8"))
    : { citations: [] };

  const client = await connect(process.env.DATABASE_URL);

  // Profiles: prefer one already in the index, then one with a P&W listing.
  const profiles = await client.query(`
    SELECT p.id, p.name, p.name_key,
           EXISTS (SELECT 1 FROM missa_magazine_rankings r WHERE r.profile_id = p.id) AS ranked,
           EXISTS (SELECT 1 FROM gary_profile_observations o WHERE o.profile_id = p.id AND o.source_id LIKE 'pw.org%') AS listed
    FROM gary_profiles p
    WHERE p.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization')
    ORDER BY ranked DESC, listed DESC, p.id ASC`);
  const profileIndex = buildProfileIndex(profiles.rows);

  // Pushcart rows per profile; a name that matches nothing is reported.
  const pushcartRows = [];
  const unmatched = new Map();
  const collisions = [];
  const pushcartByKey = new Map();
  for (const [yearKey, edition] of Object.entries(garstang.editions)) {
    const editionYear = Number(yearKey);
    for (const [genre, table] of Object.entries(edition)) {
      for (const row of table.rows) {
        const profile = matchProfile(row.name, profileIndex);
        if (!profile) {
          unmatched.set(
            `Garstang: ${row.name}`,
            (unmatched.get(`Garstang: ${row.name}`) ?? 0) + 1,
          );
          continue;
        }
        const key = `${profile.id}|${editionYear}|${genre}`;
        const record = {
          profileId: profile.id,
          editionYear,
          genre,
          rank: row.rank,
          score: row.score,
          priorRank: row.priorRank ?? null,
          listedName: row.name,
          marker: row.marker ?? null,
          sourceUrl: table.sourceUrl,
        };
        const existing = pushcartByKey.get(key);
        if (existing) {
          collisions.push(
            `${editionYear} ${genre}: "${existing.listedName}" and "${row.name}" → ${profile.id}`,
          );
          if (existing.score >= row.score) continue;
        }
        pushcartByKey.set(key, record);
      }
    }
  }
  pushcartRows.push(...pushcartByKey.values());

  // Anthology selections: only rows that carry a source naming the magazine.
  const citations = [];
  for (const c of anthology.citations ?? []) {
    if (!c.sourceUrl || !c.retrievedOn) continue;
    const profile = matchProfile(c.magazine, profileIndex);
    if (!profile) {
      unmatched.set(
        `${c.anthology}: ${c.magazine}`,
        (unmatched.get(`${c.anthology}: ${c.magazine}`) ?? 0) + 1,
      );
      continue;
    }
    citations.push({ ...c, profileId: profile.id });
  }

  // Latest P&W listing per profile.
  const listings = await client.query(`
    SELECT DISTINCT ON (profile_id) profile_id, response_time, reading_fee, payment,
           simultaneous_submissions, source_detail_url, last_updated, observed_at
    FROM gary_profile_observations
    WHERE source_id LIKE 'pw.org%' AND source_detail_url IS NOT NULL
    ORDER BY profile_id, observed_at DESC`);
  const listingByProfile = new Map(
    listings.rows.map((row) => [row.profile_id, listingFacts(row)]),
  );

  const reports = await client.query(`
    SELECT profile_id, COUNT(*)::int AS reports,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY response_days) AS median_days
    FROM missa_submission_telemetry
    WHERE response_days > 0 AND outcome IN ('accepted', 'rejected', 'withdrawn')
    GROUP BY profile_id`);
  const reportsByProfile = new Map(
    reports.rows.map((row) => [row.profile_id, row]),
  );

  const names = new Map(profiles.rows.map((p) => [p.id, p.name]));
  const results = {};
  for (const year of years) {
    const members = new Set([
      ...pushcartRows
        .filter((r) => r.editionYear === year)
        .map((r) => r.profileId),
      ...citations
        .filter((c) => year - c.year >= 0 && year - c.year <= 9)
        .map((c) => c.profileId),
    ]);
    const inputs = [];
    const factsByProfile = new Map();
    for (const profileId of members) {
      const pushcart = pushcartRows
        .filter((r) => r.profileId === profileId && r.editionYear === year)
        .map((r) => ({
          genre: r.genre,
          editionYear: r.editionYear,
          score: r.score,
          rank: r.rank,
          sourceUrl: r.sourceUrl,
        }));
      const own = citations
        .filter((c) => c.profileId === profileId)
        .map((c) => ({
          genre: c.genre,
          anthology: c.anthology,
          year: c.year,
          sourceUrl: c.sourceUrl,
        }));
      const genres = new Set(pushcart.map((r) => r.genre));
      for (const c of own)
        if (c.genre !== "hybrid" && year - c.year >= 0 && year - c.year <= 9)
          genres.add(c.genre);

      const listing = listingByProfile.get(profileId);
      const facts =
        listing && listing.year != null && listing.year <= year
          ? listing
          : null;
      const report = reportsByProfile.get(profileId);
      const reportCount = report ? Number(report.reports) : 0;
      const median =
        reportCount >= MIN_REPORTS_FOR_MEDIAN
          ? Math.round(Number(report.median_days))
          : null;
      factsByProfile.set(profileId, { facts, reportCount, median });

      inputs.push({
        profileId,
        name: names.get(profileId) ?? profileId,
        genresPublished: [...genres],
        pushcart,
        anthologyCitations: own,
        medianResponseDays: median,
        responseTimeBand: facts?.responseTimeBand ?? null,
        simultaneousSubmissions: facts?.simultaneousSubmissions ?? null,
        queryAllowedAfterDays: null,
        regularSubmissionFeeCents: facts?.regularSubmissionFeeCents ?? null,
        chargesSubmissionFee: facts?.chargesSubmissionFee ?? null,
        hasSubsidizedFeeCategory: null,
        contributorPay: { kind: facts?.payKind ?? null },
        digitalArchive: null,
        blindReading: null,
        debutFriendly: null,
      });
    }
    results[year] = { ranked: rankMagazines(inputs, year), factsByProfile };
  }

  // Summary.
  console.log(
    `Matched ${pushcartRows.length} Garstang rows; ${unmatched.size} listed names match no profile.`,
  );
  if (collisions.length)
    console.log(
      `Name collisions (kept the higher score):\n  ${collisions.join("\n  ")}`,
    );
  console.log(`Anthology selections with a source: ${citations.length}`);
  for (const year of years) {
    const { ranked } = results[year];
    const statusCounts = {};
    for (const item of ranked) {
      for (const [pillar, status] of Object.entries(
        item.overall.pillarStatus,
      )) {
        statusCounts[pillar] ??= { recorded: 0, partial: 0, unknown: 0 };
        statusCounts[pillar][status] += 1;
      }
    }
    console.log(`\n${year}: ${ranked.length} magazines`);
    console.table(statusCounts);
  }

  if (reportPath) {
    const report = {
      generatedAt: new Date().toISOString(),
      unmatchedNames: [...unmatched.keys()].sort(),
      collisions,
      years: Object.fromEntries(
        years.map((year) => [
          year,
          results[year].ranked.map((item) => ({
            profileId: item.profileId,
            name: item.name,
            overall: item.overall,
            genres: item.genres,
          })),
        ]),
      ),
    };
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport written to ${reportPath}`);
  }

  if (!write) {
    console.log(
      "\nDry run: nothing written. Re-run with --write against a Neon branch.",
    );
    await client.end();
    return;
  }

  const retrievedOn = garstang.retrievedOn;
  const statements = [
    [
      `DELETE FROM missa_pushcart_rankings WHERE edition_year = ANY($1::int[])`,
      [years],
    ],
    ...insertStatements(
      "missa_pushcart_rankings",
      [
        "profile_id",
        "edition_year",
        "genre",
        "source_rank",
        "source_score",
        "prior_rank",
        "listed_name",
        "status_marker",
        "source_name",
        "source_url",
        "retrieved_on",
      ],
      pushcartRows
        .filter((r) => years.includes(r.editionYear))
        .map((r) => [
          r.profileId,
          r.editionYear,
          r.genre,
          r.rank,
          r.score,
          r.priorRank,
          r.listedName,
          r.marker,
          garstang.source,
          r.sourceUrl,
          retrievedOn,
        ]),
    ),
    // Every award row must trace to a source; rebuild them from the file.
    [`DELETE FROM missa_literary_awards`, []],
    ...insertStatements(
      "missa_literary_awards",
      [
        "id",
        "profile_id",
        "genre",
        "anthology",
        "award_type",
        "award_year",
        "piece_title",
        "author_name",
        "source_name",
        "source_url",
        "retrieved_on",
      ],
      citations.map((c) => [
        stableId(
          "award",
          c.profileId,
          c.anthology,
          String(c.year),
          c.pieceTitle ?? "",
          c.author ?? "",
        ),
        c.profileId,
        c.genre,
        c.anthology,
        "selection",
        c.year,
        c.pieceTitle ?? null,
        c.author ?? null,
        c.sourceName ?? c.anthology,
        c.sourceUrl,
        c.retrievedOn,
      ]),
      " ON CONFLICT (id) DO NOTHING",
    ),
    [
      `DELETE FROM missa_magazine_rankings WHERE ranking_year = ANY($1::int[])`,
      [years],
    ],
  ];

  const rankingRows = [];
  for (const year of years) {
    const { ranked, factsByProfile } = results[year];
    for (const item of ranked) {
      const { facts, reportCount, median } = factsByProfile.get(item.profileId);
      for (const [genre, score] of [
        ["overall", item.overall],
        ...Object.entries(item.genres),
      ]) {
        rankingRows.push([
          item.profileId,
          year,
          genre,
          score.rankPosition,
          score.tier,
          score.totalScore,
          score.accoladesScore,
          score.payScore,
          score.turnaroundScore,
          score.feesScore,
          score.respectScore,
          score.formatAndEthicsScore,
          median,
          facts?.regularSubmissionFeeCents ?? null,
          null,
          facts?.simultaneousSubmissions ?? null,
          facts?.responseTimeBand ?? null,
          facts?.chargesSubmissionFee ?? null,
          facts?.payKind ?? null,
          reportCount,
          facts?.sourceUrl ?? null,
          facts?.recordedOn ?? null,
          JSON.stringify(score.pillarStatus),
          score.coverage,
        ]);
      }
    }
  }
  statements.push(
    ...insertStatements(
      "missa_magazine_rankings",
      [
        "profile_id",
        "ranking_year",
        "genre",
        "rank_position",
        "prestige_tier",
        "total_score",
        "accolades_score",
        "pay_score",
        "turnaround_score",
        "fees_score",
        "respect_score",
        "format_ethics_score",
        "median_response_days",
        "regular_fee_cents",
        "contributor_pay_cents",
        "simultaneous_policy",
        "response_time_band",
        "charges_reading_fee",
        "pay_kind",
        "telemetry_reports",
        "facts_source_url",
        "facts_recorded_on",
        "pillar_status",
        "coverage",
      ],
      rankingRows,
    ),
  );

  try {
    await client.transaction(statements);
    console.log(
      `\nWrote ${pushcartRows.length} Pushcart rows, ${citations.length} anthology selections and ${rankingRows.length} ranking rows for ${years.join(", ")}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
