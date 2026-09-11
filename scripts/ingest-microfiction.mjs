import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    dbUrl = match[1].trim().replace(/^["\x27]|["\x27]$/g, "");
    break;
  }
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

function cleanName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL for microfiction ingestion...");

  const rawAwards = JSON.parse(
    fs.readFileSync("/Volumes/Crucial X10/usemissa/packages/radar-adapters/src/ranking/data/microfiction-awards.json", "utf8")
  );

  const dbProfiles = await client.query(`
    SELECT id, name, name_key, website_url FROM gary_profiles;
  `);

  const lookup = new Map();
  for (const p of dbProfiles.rows) {
    if (p.name) lookup.set(cleanName(p.name), p);
    if (p.name_key) lookup.set(cleanName(p.name_key), p);
  }

  let insertedCount = 0;
  for (const item of rawAwards) {
    const key = cleanName(item.name);
    let profile = lookup.get(key);

    if (!profile) {
      const autoId = `org_litmag_${key.slice(0, 25)}_${crypto.randomUUID().slice(0, 6)}`;
      const identityKey = `profile:literary_magazine:${item.name.toLowerCase()}`;
      const res = await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          identity_status, identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES ($1, $2, $2, 'literary_magazine', $3, $4, 'confirmed', 0.950, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, name_key, website_url;
      `, [autoId, identityKey, item.name.toLowerCase(), item.name]);
      profile = res.rows[0];
      lookup.set(key, profile);
    }

    const awardId = `award_micro_${crypto.randomUUID().replace(/-/g, "")}`;
    await client.query(`
      INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING;
    `, [awardId, profile.id, item.genre, item.anthology, item.awardType, item.year]);
    insertedCount++;
  }

  console.log(`Ingested ${insertedCount} microfiction & small fiction awards.`);
  await client.end();
}

run().catch(console.error);
