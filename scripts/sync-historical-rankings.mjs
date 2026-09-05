import fs from "node:fs";
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

async function main() {
  await client.connect();
  console.log("=== COMPUTING HISTORICAL MISSA INDEX STANDINGS (2024 & 2025) ===");

  // Fetch all awards from DB
  const awardsRes = await client.query(`
    SELECT profile_id, genre, anthology, award_type, award_year
    FROM missa_literary_awards;
  `);

  const awardsByProfile = new Map();
  for (const row of awardsRes.rows) {
    if (!awardsByProfile.has(row.profile_id)) {
      awardsByProfile.set(row.profile_id, []);
    }
    awardsByProfile.get(row.profile_id).push({
      genre: row.genre,
      anthology: row.anthology,
      awardType: row.award_type,
      year: row.award_year,
    });
  }

  // Fetch profiles
  const profilesRes = await client.query(`
    SELECT id, name FROM gary_profiles WHERE id IN (SELECT DISTINCT profile_id FROM missa_magazine_rankings);
  `);

  for (const year of [2024, 2025]) {
    console.log(`Computing rankings for ${year}...`);
    const scoringInputs = [];

    for (const p of profilesRes.rows) {
      const allAwards = awardsByProfile.get(p.id) || [];
      // Only include awards up to that year
      const yearAwards = allAwards.filter((a) => a.year <= year);

      const genres = new Set(yearAwards.map((a) => a.genre));
      if (genres.size === 0) genres.add("fiction");

      scoringInputs.push({
        profileId: p.id,
        name: p.name,
        genresPublished: [...genres],
        awards: yearAwards,
        medianResponseDays: 90,
        simultaneousSubmissions: "allowed",
        queryAllowedAfterDays: 120,
        regularSubmissionFeeCents: 0,
        hasSubsidizedFeeCategory: false,
        contributorPay: { prosePerPieceCents: 10000, poetryPerPoemCents: 2500 },
        digitalPermanenceArchive: true,
        openAccessOnline: true,
        printArchivalLongevityYears: year - 2019,
        blindReadingProcess: false,
        debutFriendlyRoster: true,
      });
    }

    const computed = rankMagazines(scoringInputs, year);

    // Bulk insert into missa_magazine_rankings for this year
    const rankValues = [];
    const rankPlaceholders = [];

    for (const item of computed) {
      rankValues.push(
        item.profileId, year, "overall", item.overall.rankPosition, item.overall.tier,
        item.overall.totalScore, item.overall.accoladesScore, item.overall.payScore,
        item.overall.turnaroundScore, item.overall.feesScore, item.overall.respectScore,
        item.overall.formatAndEthicsScore, 90, 0, 0, "allowed"
      );
      let b = rankValues.length - 16;
      rankPlaceholders.push(`($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9}, $${b+10}, $${b+11}, $${b+12}, $${b+13}, $${b+14}, $${b+15}, $${b+16})`);

      for (const [genre, gScore] of Object.entries(item.genres)) {
        if (!gScore) continue;
        rankValues.push(
          item.profileId, year, genre, gScore.rankPosition, gScore.tier,
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
          ) VALUES ${rankPlaceholders.join(", ")}
          ON CONFLICT (profile_id, ranking_year, genre) DO UPDATE SET
            rank_position = EXCLUDED.rank_position,
            total_score = EXCLUDED.total_score,
            accolades_score = EXCLUDED.accolades_score,
            updated_at = NOW();
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
        ) VALUES ${rankPlaceholders.join(", ")}
        ON CONFLICT (profile_id, ranking_year, genre) DO UPDATE SET
          rank_position = EXCLUDED.rank_position,
          total_score = EXCLUDED.total_score,
          accolades_score = EXCLUDED.accolades_score,
          updated_at = NOW();
      `, rankValues);
    }

    console.log(`Saved ${year} rankings.`);
  }

  const counts = await client.query(`
    SELECT ranking_year, COUNT(*) FROM missa_magazine_rankings GROUP BY ranking_year ORDER BY ranking_year;
  `);
  console.log("Rankings rows per year in database:", counts.rows);

  await client.end();
}

main().catch(console.error);
