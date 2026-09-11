import fs from "node:fs";
import pg from "pg";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    dbUrl = match[1].trim().replace(/^["']|["']$/g, "");
    break;
  }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl, max: 10 });

function inferProfileKind(name: string, sampleTypes: string[]): string {
  const n = name.toLowerCase();
  if (n.includes("residency") || n.includes("retreat") || sampleTypes.includes("residency")) return "residency_center";
  if (n.includes("magazine") || n.includes("review") || n.includes("journal") || sampleTypes.includes("magazine")) return "literary_magazine";
  if (n.includes("press") || n.includes("publishing") || n.includes("books")) return "small_press";
  if (n.includes("foundation") || n.includes("fund") || n.includes("council") || sampleTypes.includes("grant")) return "grant_foundation";
  if (n.includes("gallery") || n.includes("museum")) return "gallery";
  return "organization";
}

async function run() {
  console.log("=== SYNCING ALL RADAR ORGANIZATIONS TO GARY PROFILES ===");

  // Find all radar_organizations that do NOT exist in gary_profiles
  const missing = await pool.query(`
    SELECT ro.id, ro.data->>'name' as name, ro.data->>'websiteUrl' as website_url, ro.data->>'handle' as handle
    FROM radar_organizations ro
    LEFT JOIN gary_profiles gp ON gp.id = ro.id
    WHERE gp.id IS NULL AND ro.data->>'name' IS NOT NULL AND length(trim(ro.data->>'name')) > 1
  `);

  console.log(`Found ${missing.rows.length} radar_organizations missing in gary_profiles.`);

  let inserted = 0;
  for (const org of missing.rows) {
    const rawName = org.name.trim();
    // Get sample opportunity types for this org
    const oppTypes = await pool.query(`
      SELECT DISTINCT type FROM opportunities WHERE organization_id = $1 LIMIT 5
    `, [org.id]);
    const types = oppTypes.rows.map(r => r.type);

    const kind = inferProfileKind(rawName, types);
    const nameKey = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || org.id;
    let identityKey = `profile:${kind}:${nameKey}`;
    let canonicalKey = identityKey;

    // Check if canonical_key already exists
    const existing = await pool.query(
      `SELECT id, name FROM gary_profiles WHERE canonical_key = $1 LIMIT 1`,
      [canonicalKey]
    );

    if (existing.rows.length > 0 && existing.rows[0].id !== org.id) {
      const suffix = org.id.replace(/^org_/, "").slice(0, 8);
      canonicalKey = `${canonicalKey}-${suffix}`;
      identityKey = `${identityKey}-${suffix}`;
    }

    await pool.query(`
      INSERT INTO gary_profiles (
        id, identity_key, canonical_key, profile_kind, name_key, name, 
        website_url, normalized_website_url, identity_status, identity_confidence,
        first_seen_at, last_seen_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', 0.950, NOW(), NOW(), NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        website_url = COALESCE(EXCLUDED.website_url, gary_profiles.website_url),
        profile_kind = EXCLUDED.profile_kind,
        updated_at = NOW()
    `, [
      org.id,
      identityKey,
      canonicalKey,
      kind,
      nameKey,
      rawName,
      org.website_url || null,
      org.website_url ? org.website_url.toLowerCase().replace(/\/+$/, '') : null
    ]);
    inserted++;
  }

  console.log(`Successfully synced ${inserted} organizations into gary_profiles.`);

  // Verify total coverage
  const totalOrgs = await pool.query(`SELECT count(DISTINCT organization_id) FROM opportunities WHERE publication_state = 'published' AND organization_id IS NOT NULL`);
  const covered = await pool.query(`
    SELECT count(DISTINCT o.organization_id)
    FROM opportunities o
    JOIN gary_profiles gp ON gp.id = o.organization_id
    WHERE o.publication_state = 'published' AND o.organization_id IS NOT NULL
  `);

  console.log(`\nCoverage check: ${covered.rows[0].count} / ${totalOrgs.rows[0].count} published organizations now have full directory profiles.`);

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
