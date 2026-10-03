import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { ArtConnectProfile } from "./artConnectParser.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}

const dataFile = fileURLToPath(new URL("../../data/artconnect_organizations.json", import.meta.url));
if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const orgs: ArtConnectProfile[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== FAST VECTORIZED SYNC: ${orgs.length} ARTCONNECT ORGANIZATIONS TO RAILWAY POSTGRESQL ===\n`);

// Pre-normalize websites
const enrichedOrgs = orgs.map(o => {
  const websiteUrl = o.website || o.artconnectUrl;
  let normWebsite = "artconnect.com";
  try {
    normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, "");
  } catch {}
  return { ...o, normWebsite };
});

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const BATCH_SIZE = 500;
  let reboundCount = 0;

  for (let i = 0; i < enrichedOrgs.length; i += BATCH_SIZE) {
    const batch = enrichedOrgs.slice(i, i + BATCH_SIZE);
    const jsonStr = JSON.stringify(batch);

    // 1. Radar Organizations
    await client.query(`
      INSERT INTO radar_organizations (id, data, created_at, updated_at)
      SELECT 
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        x,
        now(),
        now()
      FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
    `, [jsonStr]);

    // 2. Gary Profiles
    await client.query(`
      INSERT INTO gary_profiles (
        id, identity_key, canonical_key, profile_kind, name_key, name,
        website_url, normalized_website_url, identity_status, identity_confidence,
        first_seen_at, last_seen_at, created_at, updated_at
      )
      SELECT 
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        'artconnect:' || (x->>'id'),
        'artconnect:' || (x->>'id'),
        (x->>'profileKind'),
        substring(regexp_replace(lower(x->>'slug'), '[^a-z0-9]', '_', 'g') from 1 for 48),
        (x->>'name'),
        coalesce(x->>'website', x->>'artconnectUrl'),
        (x->>'normWebsite'),
        'confirmed',
        1.0,
        now(), now(), now(), now()
      FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        profile_kind = EXCLUDED.profile_kind,
        website_url = COALESCE(EXCLUDED.website_url, gary_profiles.website_url),
        last_seen_at = now(),
        updated_at = now();
    `, [jsonStr]);

    // 3. Entities
    await client.query(`
      INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
      SELECT
        'entity_' || substring(md5(x->>'id') from 1 for 16),
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        (x->>'name'),
        (x->>'organizationType'),
        now(), now()
      FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
    `, [jsonStr]);

    // 4. Programs
    await client.query(`
      INSERT INTO programs (id, entity_id, name, created_at, updated_at)
      SELECT
        'prog_' || substring(md5(x->>'id') from 1 for 16),
        'entity_' || substring(md5(x->>'id') from 1 for 16),
        (x->>'name') || ' Open Program',
        now(), now()
      FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
    `, [jsonStr]);

    // 5. Gary Profile Intelligence
    await client.query(`
      INSERT INTO gary_profile_intelligence (
        profile_id, prestige_tier, founding_year, honors, editorial_archetype,
        sentiment_tags, social_links, updated_at
      )
      SELECT
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        'selective',
        null,
        jsonb_build_array('ArtConnect Verified Organization: ' || (x->>'organizationType')),
        'visual-arts-institution',
        case when jsonb_array_length(x->'artisticFields') > 0 then x->'artisticFields' else '["visual-arts"]'::jsonb end,
        jsonb_build_object('instagram', x->>'instagram', 'facebook', x->>'facebook'),
        now()
      FROM jsonb_array_elements($1::jsonb) x
      ON CONFLICT (profile_id) DO UPDATE SET
        sentiment_tags = EXCLUDED.sentiment_tags,
        social_links = EXCLUDED.social_links,
        updated_at = now();
    `, [jsonStr]);

    // 6. Gary Profile Visuals (Logos & Banners)
    await client.query(`
      INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label, created_at)
      SELECT
        'vis_' || substring(md5(x->>'id' || '_logo') from 1 for 16),
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        'logo',
        x->>'profileImageUrl',
        'Organization Logo',
        now()
      FROM jsonb_array_elements($1::jsonb) x
      WHERE x->>'profileImageUrl' IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
    `, [jsonStr]);

    await client.query(`
      INSERT INTO gary_profile_visuals (id, profile_id, asset_type, image_url, label, created_at)
      SELECT
        'vis_' || substring(md5(x->>'id' || '_banner') from 1 for 16),
        'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
        'banner',
        x->>'headerImageUrl',
        'Header Banner',
        now()
      FROM jsonb_array_elements($1::jsonb) x
      WHERE x->>'headerImageUrl' IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;
    `, [jsonStr]);

    // 7. Rebind Opportunities
    const rebindRes = await client.query(`
      UPDATE opportunities o
      SET organization_id = 'org_artconn_' || substring(md5(x->>'id') from 1 for 16),
          program_id = 'prog_' || substring(md5(x->>'id') from 1 for 16),
          updated_at = now()
      FROM jsonb_array_elements($1::jsonb) x
      WHERE (o.organization_id = 'org_41bb352fe07fb7ed24d0f843' OR o.organization_id IS NULL)
        AND (
          lower(o.title) LIKE '%' || lower(x->>'name') || '%'
          OR o.guidelines_url LIKE '%' || (x->>'id') || '%'
        );
    `, [jsonStr]);
    reboundCount += rebindRes.rowCount || 0;

    const currentSynced = Math.min(i + BATCH_SIZE, enrichedOrgs.length);
    console.log(`[${currentSynced}/${enrichedOrgs.length}] Vectorized batch committed to Railway PostgreSQL...`);
  }

  console.log(`\n======================================================`);
  console.log(`✔ Successfully synced ${enrichedOrgs.length} ArtConnect organizations!`);
  console.log(`✔ Rebound ${reboundCount} opportunities to their true host profiles!`);
  console.log(`======================================================\n`);

} finally {
  await client.end();
}
