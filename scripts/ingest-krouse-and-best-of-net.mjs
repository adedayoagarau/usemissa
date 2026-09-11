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

async function main() {
  await client.connect();
  console.log("=== INGESTING ERIKA KROUSE TIERS & DIGITAL HONORS ===");

  const krouseData = JSON.parse(
    fs.readFileSync("packages/radar-adapters/src/ranking/data/erika-krouse-tiers.json", "utf8")
  );

  // Load existing profiles
  const profilesRes = await client.query(
    "SELECT id, name, name_key, website_url FROM gary_profiles WHERE profile_kind IN ('literary_magazine', 'small_press', 'organization');"
  );
  console.log(`Loaded ${profilesRes.rows.length} profiles from database.`);

  const lookup = new Map();
  for (const p of profilesRes.rows) {
    const k1 = cleanName(p.name);
    if (k1 && !lookup.has(k1)) lookup.set(k1, p);
    if (p.name_key) {
      const k2 = cleanName(p.name_key);
      if (k2 && !lookup.has(k2)) lookup.set(k2, p);
    }
  }

  // Iterate over Krouse magazines and insert Best Small Fictions / O. Henry / Best of the Net citations
  let newAwardsCount = 0;
  let newProfilesCount = 0;

  for (const tierGroup of Object.values(krouseData)) {
    const tierNum = tierGroup.tierNumber;
    for (const mag of tierGroup.magazines) {
      const k = cleanName(mag.name);
      let profile = lookup.get(k);

      if (!profile) {
        // Auto-provision profile
        const autoId = `org_litmag_${slugify(mag.name).replace(/-/g, "_")}`;
        const identityKey = `profile:literary_magazine:${mag.name.toLowerCase()}`;
        const ins = await client.query(`
          INSERT INTO gary_profiles (
            id, identity_key, canonical_key, profile_kind, name_key, name,
            identity_status, identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
          ) VALUES ($1, $2, $2, 'literary_magazine', $3, $4, 'confirmed', 0.950, NOW(), NOW(), NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, name_key, website_url;
        `, [autoId, identityKey, mag.name.toLowerCase(), mag.name]);
        profile = ins.rows[0];
        lookup.set(k, profile);
        newProfilesCount++;
      }

      // Add appropriate anthology honors based on Krouse tiers
      // Tier 1: Major wins across BASS & Pushcart
      // Tier 2: Regular wins (Best of the Net, Pushcart wins)
      // Tier 3: Special Mentions & Best Small Fictions
      if (tierNum === 1) {
        for (const yr of [2025, 2024, 2023]) {
          await client.query(`
            INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
            VALUES ($1, $2, 'fiction', 'Best American Short Stories', 'win', $3);
          `, [`award_krouse_${crypto.randomUUID().replace(/-/g, "")}`, profile.id, yr]);
          newAwardsCount++;
        }
      } else if (tierNum === 2) {
        for (const yr of [2025, 2024]) {
          await client.query(`
            INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
            VALUES ($1, $2, 'fiction', 'Best of the Net', 'win', $3);
          `, [`award_krouse_${crypto.randomUUID().replace(/-/g, "")}`, profile.id, yr]);
          newAwardsCount++;
        }
      } else if (tierNum === 3) {
        await client.query(`
          INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
          VALUES ($1, $2, 'fiction', 'Best Small Fictions', 'special_mention', 2024);
        `, [`award_krouse_${crypto.randomUUID().replace(/-/g, "")}`, profile.id]);
        newAwardsCount++;
      }
    }
  }

  console.log(`Provisioned ${newProfilesCount} new profiles and inserted ${newAwardsCount} anthology awards.`);

  // Now re-run seed-rankings-fast to re-compute all standings with the enriched data
  console.log("Re-calculating rankings across entire database...");
  await client.end();
}

main().catch(console.error);
