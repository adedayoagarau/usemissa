import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { normalizeCountry, countryNameFromCode } from "@missa/contracts";

const { Client } = pg;

const dryRun = process.argv.includes("--dry-run");

// Load DATABASE_URL from .env.local if not already in process.env
if (!process.env.DATABASE_URL) {
  const possiblePaths = [
    path.resolve(".env.local"),
    path.resolve("../../.env.local"),
    "/Volumes/Crucial X10/usemissa/.env.local",
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
        if (match) {
          process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
          console.log(`[BACKFILL] Loaded DATABASE_URL from ${envPath}`);
          break;
        }
      }
      if (process.env.DATABASE_URL) break;
    }
  }
}

async function runCountryBackfill() {
  console.log(`=== MISSA GEOGRAPHY & COUNTRY BASELINE BACKFILL ===`);
  if (dryRun) {
    console.log(`[MODE] Dry-run enabled. No database writes will be committed.`);
  }

  if (!process.env.DATABASE_URL) {
    console.log(`[NOTICE] DATABASE_URL is not set. Auditing static datasets only.`);
  }

  // 1. Audit / Prepare Datasets
  const dataDir = path.resolve("packages/radar-adapters/data");
  let resArtisCount = 0;
  let artConnectCount = 0;
  let rivetCount = 0;

  const resArtisPath = path.join(dataDir, "resartis_organizations.json");
  let resArtisData = [];
  if (fs.existsSync(resArtisPath)) {
    try {
      resArtisData = JSON.parse(fs.readFileSync(resArtisPath, "utf8"));
      resArtisCount = resArtisData.length;
      console.log(`[DATASET] Res Artis organizations: ${resArtisCount}`);
    } catch (e) {
      console.warn(`[WARN] Failed to parse resartis_organizations.json:`, e.message);
    }
  }

  const artConnectPath = path.join(dataDir, "artconnect_organizations.json");
  let artConnectData = [];
  if (fs.existsSync(artConnectPath)) {
    try {
      artConnectData = JSON.parse(fs.readFileSync(artConnectPath, "utf8"));
      artConnectCount = artConnectData.length;
      console.log(`[DATASET] Artconnect organizations: ${artConnectCount}`);
    } catch (e) {
      console.warn(`[WARN] Failed to parse artconnect_organizations.json:`, e.message);
    }
  }

  if (!process.env.DATABASE_URL) {
    console.log(`\n[DONE] Dataset audit completed.`);
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`[DB] Connected to PostgreSQL.`);

    // 2. Ensure columns exist (safe, idempotent DDL)
    await client.query(`
      ALTER TABLE gary_profiles
        ADD COLUMN IF NOT EXISTS country_code text,
        ADD COLUMN IF NOT EXISTS country text,
        ADD COLUMN IF NOT EXISTS city text;
      CREATE INDEX IF NOT EXISTS gary_profiles_country_code_idx ON gary_profiles(country_code);

      ALTER TABLE opportunities
        ADD COLUMN IF NOT EXISTS country_code text,
        ADD COLUMN IF NOT EXISTS country text;
      CREATE INDEX IF NOT EXISTS opportunities_country_code_idx ON opportunities(country_code);
    `);
    console.log(`[DB] Ensured country_code, country, and city columns exist.`);


    // 3. Backfill from radar_organizations JSON data
    const radarOrgsRes = await client.query(`
      SELECT id, data->>'country' as org_country, data->>'city' as org_city
      FROM radar_organizations
      WHERE data->>'country' IS NOT NULL;
    `);

    let radarOrgsUpdated = 0;
    for (const row of radarOrgsRes.rows) {
      const norm = normalizeCountry(row.org_country);
      if (norm) {
        if (!dryRun) {
          await client.query(
            `UPDATE gary_profiles
             SET country_code = COALESCE(country_code, $1),
                 country = COALESCE(country, $2),
                 city = COALESCE(city, $3)
             WHERE id = $4`,
            [norm.countryCode, norm.country, row.org_city || null, row.id],
          );
        }
        radarOrgsUpdated++;
      }
    }
    console.log(`[STEP 1] Normalized and synced ${radarOrgsUpdated} profiles from radar_organizations.`);

    // 4. Backfill from Res Artis dataset
    let resArtisUpdated = 0;
    for (const item of resArtisData) {
      if (!item.country && !item.city) continue;
      const norm = normalizeCountry(item.country);
      const canonicalKey = `resartis:${item.slug}`;
      if (norm) {
        if (!dryRun) {
          await client.query(
            `UPDATE gary_profiles
             SET country_code = COALESCE(country_code, $1),
                 country = COALESCE(country, $2),
                 city = COALESCE(city, $3)
             WHERE canonical_key = $4 OR id LIKE $5`,
            [
              norm.countryCode,
              norm.country,
              item.city || null,
              canonicalKey,
              `%${item.slug}%`,
            ],
          );
        }
        resArtisUpdated++;
      }
    }
    console.log(`[STEP 2] Normalized and synced ${resArtisUpdated} profiles from Res Artis dataset.`);

    // 5. Backfill from Artconnect dataset
    let artConnectUpdated = 0;
    for (const item of artConnectData) {
      if (!item.country && !item.city) continue;
      const norm = normalizeCountry(item.country);
      const canonicalKey = `artconn:${item.slug}`;
      if (norm) {
        if (!dryRun) {
          await client.query(
            `UPDATE gary_profiles
             SET country_code = COALESCE(country_code, $1),
                 country = COALESCE(country, $2),
                 city = COALESCE(city, $3)
             WHERE canonical_key = $4 OR id LIKE $5`,
            [
              norm.countryCode,
              norm.country,
              item.city || null,
              canonicalKey,
              `%${item.slug}%`,
            ],
          );
        }
        artConnectUpdated++;
      }
    }
    console.log(`[STEP 3] Normalized and synced ${artConnectUpdated} profiles from Artconnect dataset.`);

    // 6. Backfill from gary_profile_observations contact_details (e.g. Poets & Writers address)
    const obsRes = await client.query(`
      WITH latest AS (
        SELECT DISTINCT ON (profile_id) profile_id, contact_details
        FROM gary_profile_observations
        WHERE contact_details IS NOT NULL AND TRIM(contact_details) != ''
        ORDER BY profile_id, observed_at DESC
      )
      SELECT p.id, l.contact_details
      FROM latest l
      JOIN gary_profiles p ON p.id = l.profile_id
      WHERE p.country_code IS NULL;
    `);

    let obsUpdated = 0;
    for (const row of obsRes.rows) {
      const norm = normalizeCountry(row.contact_details);
      if (norm) {
        if (!dryRun) {
          await client.query(
            `UPDATE gary_profiles
             SET country_code = $1, country = $2
             WHERE id = $3`,
            [norm.countryCode, norm.country, row.id],
          );
        }
        obsUpdated++;
      }
    }
    console.log(`[STEP 4] Extracted country for ${obsUpdated} literary journal profiles from contact observations.`);

    // 7. Sync opportunities country_code from location or organization profile
    const oppsRes = await client.query(`
      SELECT o.id, o.location, p.country_code as profile_country_code, p.country as profile_country
      FROM opportunities o
      LEFT JOIN gary_profiles p ON p.id = o.organization_id
      WHERE o.country_code IS NULL;
    `);

    let oppsUpdated = 0;
    for (const opp of oppsRes.rows) {
      let norm = opp.location ? normalizeCountry(opp.location) : null;
      let code = norm?.countryCode || opp.profile_country_code;
      let name = norm?.country || opp.profile_country;

      if (code && name) {
        if (!dryRun) {
          await client.query(
            `UPDATE opportunities
             SET country_code = $1, country = $2
             WHERE id = $3`,
            [code, name, opp.id],
          );
        }
        oppsUpdated++;
      }
    }
    console.log(`[STEP 5] Synced country on ${oppsUpdated} opportunities from location/organization profile.`);

    // 8. Coverage Summary
    const summary = await client.query(`
      SELECT
        COUNT(*) as total_profiles,
        COUNT(country_code) as profiles_with_country,
        COUNT(city) as profiles_with_city
      FROM gary_profiles;
    `);

    const s = summary.rows[0];
    console.log(`\n=== FINAL GEOGRAPHY COVERAGE ===`);
    console.log(`Total Profiles: ${s.total_profiles}`);
    console.log(`Profiles with Country: ${s.profiles_with_country} (${Math.round((s.profiles_with_country / s.total_profiles) * 100)}%)`);
    console.log(`Profiles with City: ${s.profiles_with_city} (${Math.round((s.profiles_with_city / s.total_profiles) * 100)}%)`);

    const topCountries = await client.query(`
      SELECT country_code, country, COUNT(*) as count
      FROM gary_profiles
      WHERE country_code IS NOT NULL
      GROUP BY country_code, country
      ORDER BY count DESC
      LIMIT 10;
    `);

    console.log(`\nTop 10 Countries in Directory:`);
    for (const row of topCountries.rows) {
      console.log(` - ${row.country} (${row.country_code}): ${row.count}`);
    }

  } catch (err) {
    console.error(`[ERROR] Backfill failed:`, err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runCountryBackfill();
