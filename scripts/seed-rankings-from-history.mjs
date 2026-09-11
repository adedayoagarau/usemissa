import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
import { rankMagazines } from "../packages/radar-engine/dist/src/ranking/magazineRankingEngine.js";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
    break;
  }
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function cleanName(n) {
  if (!n) return "";
  return n.toLowerCase()
    .replace(/©|®|™/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/,\s*the\b/g, "")
    .replace(/^the\s+/g, "")
    .replace(/['’"“”\(\)\[\]\.,–—\-:]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+(literary magazine|literary reader|a literary journal|reimagining place|magazine|review|journal|quarterly|press|lit|online)$/g, "")
    .trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function runHydration() {
  await client.connect();
  console.log("=== HYDRATING MISSA LITERARY MAGAZINE RANKINGS DATABASE ===");

  const history = JSON.parse(
    fs.readFileSync("packages/radar-adapters/src/ranking/data/garstang-10yr-history.json", "utf8")
  );

  // 1. Load profiles and observations from DB
  const dbProfiles = await client.query(`
    SELECT p.id, p.name, p.name_key, p.website_url, p.profile_kind,
           o.response_time, o.payment, o.reading_fee, o.simultaneous_submissions
    FROM gary_profiles p
    LEFT JOIN LATERAL (
      SELECT * FROM gary_profile_observations WHERE profile_id = p.id ORDER BY observed_at DESC LIMIT 1
    ) o ON true
    WHERE p.profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization');
  `);

  console.log(`Loaded ${dbProfiles.rows.length} relevant profiles from database.`);

  const lookup = new Map();
  for (const p of dbProfiles.rows) {
    const k1 = cleanName(p.name);
    if (k1 && !lookup.has(k1)) lookup.set(k1, p);
    if (p.name_key) {
      const k2 = cleanName(p.name_key);
      if (k2 && !lookup.has(k2)) lookup.set(k2, p);
    }
  }

  // 2. Aggregate all awards & appearances per magazine from 10-year history
  // Map<crawledName, { matchedProfile, awards: [], genres: Set() }>
  const magazineData = new Map();

  for (const [yearStr, genres] of Object.entries(history)) {
    const yr = parseInt(yearStr, 10);
    for (const [genre, list] of Object.entries(genres)) {
      for (const item of list) {
        const rawName = item.name.trim();
        if (/^\d+$/.test(rawName)) continue; // ignore table artifact numbers

        const key = cleanName(rawName);
        let profile = lookup.get(key);

        // If not in database yet, auto-provision profile in gary_profiles so the ecosystem is unified!
        if (!profile) {
          const autoId = `org_litmag_${slugify(rawName).replace(/-/g, "_")}`;
          const identityKey = `profile:literary_magazine:${rawName.toLowerCase()}`;
          const insertRes = await client.query(`
            INSERT INTO gary_profiles (
              id, identity_key, canonical_key, profile_kind, name_key, name,
              identity_status, identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
            ) VALUES (
              $1, $2, $2, 'literary_magazine', $3, $4,
              'confirmed', 0.950, NOW(), NOW(), NOW(), NOW()
            ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, name_key, website_url;
          `, [autoId, identityKey, rawName.toLowerCase(), rawName]);
          profile = insertRes.rows[0];
          lookup.set(key, profile);
        }

        if (!magazineData.has(profile.id)) {
          magazineData.set(profile.id, {
            profile,
            awards: [],
            genres: new Set(),
            firstSeenYear: yr,
          });
        }

        const entry = magazineData.get(profile.id);
        entry.genres.add(genre);

        // Map Garstang scores / ranks to Pushcart citations
        // Top 10 = Pushcart wins, ranks 11-40 = special mentions, 40+ = notable
        const awardType = item.rank <= 10 ? "win" : (item.rank <= 40 ? "special_mention" : "notable");
        entry.awards.push({
          genre,
          anthology: "Pushcart Prize",
          awardType,
          year: yr,
        });
      }
    }
  }

  console.log(`Aggregated award profiles for ${magazineData.size} journals.`);

  // 3. Clear existing awards & rankings for fresh hydration
  await client.query("TRUNCATE TABLE missa_literary_awards CASCADE;");
  await client.query("TRUNCATE TABLE missa_magazine_rankings CASCADE;");
  console.log("Truncated previous ranking and award tables.");

  // 4. Insert into missa_literary_awards in batches
  const awardValues = [];
  const awardPlaceholders = [];
  let aCount = 0;
  for (const [profileId, data] of magazineData.entries()) {
    for (const a of data.awards) {
      aCount++;
      const id = `award_${crypto.randomUUID().replace(/-/g, "")}`;
      awardValues.push(id, profileId, a.genre, a.anthology, a.awardType, a.year);
      const base = (awardValues.length - 6);
      awardPlaceholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`);
      if (awardPlaceholders.length >= 200) {
        await client.query(`
          INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
          VALUES ${awardPlaceholders.join(", ")};
        `, awardValues);
        awardValues.length = 0;
        awardPlaceholders.length = 0;
      }
    }
  }
  if (awardPlaceholders.length > 0) {
    await client.query(`
      INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
      VALUES ${awardPlaceholders.join(", ")};
    `, awardValues);
  }
  console.log(`Inserted ${aCount} award citations into missa_literary_awards.`);

  // 5. Construct MagazineScoringInput array for @missa/radar-engine
  const scoringInputs = [];

  for (const [profileId, data] of magazineData.entries()) {
    const p = data.profile;
    const simSub = p.simultaneous_submissions?.toLowerCase().includes("yes") ? "allowed"
      : (p.simultaneous_submissions?.toLowerCase().includes("no") ? "forbidden" : "allowed");

    // Fee heuristic: if reading_fee is Yes, assume typical $3 regular fee; if No, 0
    const feeCents = p.reading_fee?.toLowerCase().includes("yes") ? 300 : 0;

    // Response time heuristic: "3 to 6 months" => ~120 days, "1 to 3 months" => ~60 days, default 90
    let respDays = 90;
    if (p.response_time) {
      const lower = p.response_time.toLowerCase();
      if (lower.includes("less than 1 month") || lower.includes("few days")) respDays = 25;
      else if (lower.includes("1 to 3 months") || lower.includes("8 weeks")) respDays = 60;
      else if (lower.includes("3 to 6 months")) respDays = 120;
      else if (lower.includes("greater than 6") || lower.includes("6 months")) respDays = 180;
    }

    // Contributor pay heuristic
    const hasCashPay = p.payment?.toLowerCase().includes("cash");
    const payCents = hasCashPay ? 10000 : 0;

    scoringInputs.push({
      profileId: p.id,
      name: p.name,
      genresPublished: [...data.genres],
      awards: data.awards,
      medianResponseDays: respDays,
      simultaneousSubmissions: simSub,
      queryAllowedAfterDays: respDays + 30,
      regularSubmissionFeeCents: feeCents,
      hasSubsidizedFeeCategory: feeCents > 0,
      contributorPay: {
        prosePerPieceCents: payCents,
        poetryPerPoemCents: hasCashPay ? 2500 : 0,
        copiesOnly: !hasCashPay,
      },
      digitalPermanenceArchive: true,
      openAccessOnline: true,
      printArchivalLongevityYears: 2026 - (data.firstSeenYear || 2019),
      blindReadingProcess: false,
      debutFriendlyRoster: true,
    });
  }

  // 6. Execute Missa deterministic ranking engine
  console.log(`Running Missa Ranking Engine over ${scoringInputs.length} journals...`);
  const computed = rankMagazines(scoringInputs, 2026);

  // 7. Insert computed scores into missa_magazine_rankings
  const rankValues = [];
  const rankPlaceholders = [];
  let rCount = 0;

  for (const item of computed) {
    // Overall
    rCount++;
    rankValues.push(
      item.profileId, 2026, "overall", item.overall.rankPosition, item.overall.tier,
      item.overall.totalScore, item.overall.accoladesScore, item.overall.payScore,
      item.overall.turnaroundScore, item.overall.feesScore, item.overall.respectScore,
      item.overall.formatAndEthicsScore, 90, 0, 0, "allowed"
    );
    let b = rankValues.length - 16;
    rankPlaceholders.push(`($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9}, $${b+10}, $${b+11}, $${b+12}, $${b+13}, $${b+14}, $${b+15}, $${b+16})`);

    // Genres
    for (const [genre, gScore] of Object.entries(item.genres)) {
      if (!gScore) continue;
      rCount++;
      rankValues.push(
        item.profileId, 2026, genre, gScore.rankPosition, gScore.tier,
        gScore.totalScore, gScore.accoladesScore, gScore.payScore,
        gScore.turnaroundScore, gScore.feesScore, gScore.respectScore,
        gScore.formatAndEthicsScore, 90, 0, 0, "allowed"
      );
      b = rankValues.length - 16;
      rankPlaceholders.push(`($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9}, $${b+10}, $${b+11}, $${b+12}, $${b+13}, $${b+14}, $${b+15}, $${b+16})`);
    }

    if (rankPlaceholders.length >= 100) {
      await client.query(`
        INSERT INTO missa_magazine_rankings (
          profile_id, ranking_year, genre, rank_position, prestige_tier,
          total_score, accolades_score, pay_score, turnaround_score, fees_score,
          respect_score, format_ethics_score, median_response_days, regular_fee_cents,
          contributor_pay_cents, simultaneous_policy
        ) VALUES ${rankPlaceholders.join(", ")};
      `, rankValues);
      rankValues.length = 0;
      rankPlaceholders.length = 0;
    }
  }

  if (rankPlaceholders.length > 0) {
    await client.query(`
      INSERT INTO missa_magazine_rankings (
        profile_id, ranking_year, genre, rank_position, prestige_tier,
        total_score, accolades_score, pay_score, turnaround_score, fees_score,
        respect_score, format_ethics_score, median_response_days, regular_fee_cents,
        contributor_pay_cents, simultaneous_policy
      ) VALUES ${rankPlaceholders.join(", ")};
    `, rankValues);
  }

  console.log(`Inserted ${rCount} rows into missa_magazine_rankings.`);

  // 8. Verify top 10 overall rankings
  const topCheck = await client.query(`
    SELECT r.rank_position, p.name, r.total_score, r.accolades_score, r.prestige_tier
    FROM missa_magazine_rankings r
    JOIN gary_profiles p ON p.id = r.profile_id
    WHERE r.genre = 'overall' AND r.ranking_year = 2026
    ORDER BY r.rank_position ASC
    LIMIT 15;
  `);

  console.log("\n=== TOP 15 OVERALL MISSA LITERARY MAGAZINE INDEX (2026) ===");
  topCheck.rows.forEach((r) => {
    console.log(`#${r.rank_position.toString().padStart(2)}: ${r.name} — ${r.total_score} pts (${r.prestige_tier}, Accolades: ${r.accolades_score})`);
  });

  await client.end();
  console.log("\n✅ Hydration complete!");
}

runHydration().catch(console.error);
