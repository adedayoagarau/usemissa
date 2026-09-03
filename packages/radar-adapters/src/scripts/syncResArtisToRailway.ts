import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import type { ResidencyProfile } from "./resArtisParser.js";

// Load DATABASE_URL
const possibleEnvFiles = [
  "/Volumes/Crucial X10/usemissa/.env.local",
  path.resolve(".env.local"),
  path.resolve("../../.env.local")
];

for (const envFile of possibleEnvFiles) {
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
      if (match) {
        process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
    if (process.env.DATABASE_URL) {
      console.log(`🔑 Loaded DATABASE_URL from ${envFile}`);
      break;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL could not be found in .env.local");
  process.exit(1);
}

const dataDir = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data";
const dataFile = path.join(dataDir, "resartis_organizations.json");
const downloadsFile = path.join(os.homedir(), "Downloads", "resartis_organizations.json");

if (fs.existsSync(downloadsFile)) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.copyFileSync(downloadsFile, dataFile);
  console.log(`📥 Found fresh dataset in Downloads! Copied to ${dataFile}`);
}

if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const orgs: ResidencyProfile[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== SYNCING ${orgs.length} RES ARTIS RESIDENCY ORGANIZATIONS TO RAILWAY POSTGRESQL ===\n`);

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  let orgCount = 0;
  let reboundCalls = 0;

  for (const o of orgs) {
    const orgId = `org_resartis_${crypto.createHash("md5").update(o.slug).digest("hex").slice(0, 16)}`;
    const entityId = `entity_${crypto.createHash("md5").update(o.slug).digest("hex").slice(0, 16)}`;
    const progId = `prog_${crypto.createHash("md5").update(o.slug).digest("hex").slice(0, 16)}`;

    // 1. Radar Organizations (id, data, created_at, updated_at)
    const orgData = {
      name: o.name,
      slug: o.slug,
      residency_name: o.residencyName,
      website_url: o.website || o.resartisUrl,
      email: o.email,
      phone: o.phone,
      country: o.country,
      city: o.city,
      setting: o.setting,
      postal_code: o.postalCode,
      socials: o.socials,
      disciplines: o.disciplines,
      facilities: o.facilities,
      fees: {
        has_application_fee: o.hasApplicationFee,
        residency_fee: o.residencyFee,
        has_funding: o.hasFunding,
        funding_details: o.fundingDetails
      },
      gallery_images: o.galleryImages,
      related_open_calls: o.relatedOpenCalls,
      resartis_url: o.resartisUrl
    };

    await client.query(`
      INSERT INTO radar_organizations (id, data, created_at, updated_at)
      VALUES ($1, $2, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = now();
    `, [orgId, JSON.stringify(orgData)]);

    // 2. Gary Profiles (Residency Center Profile)
    const websiteUrl = o.website || o.resartisUrl;
    let normWebsite = "";
    try {
      normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, "");
    } catch {
      normWebsite = "resartis.org";
    }

    await client.query(`
      INSERT INTO gary_profiles (
        id, identity_key, canonical_key, profile_kind, name_key, name,
        website_url, normalized_website_url, identity_status, identity_confidence,
        first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES (
        $1, $2, $2, 'residency_center', $3, $4,
        $5, $6, 'confirmed', 1.0,
        now(), now(), now(), now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        website_url = COALESCE(EXCLUDED.website_url, gary_profiles.website_url),
        normalized_website_url = COALESCE(EXCLUDED.normalized_website_url, gary_profiles.normalized_website_url),
        last_seen_at = now(),
        updated_at = now();
    `, [
      orgId,
      `resartis:${o.slug}`,
      o.slug.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      o.name,
      websiteUrl,
      normWebsite
    ]);

    // 3. Entities & Programs
    await client.query(`
      INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
      VALUES ($1, $2, $3, 'Residency Center', now(), now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now();
    `, [entityId, orgId, o.name]);

    await client.query(`
      INSERT INTO programs (id, entity_id, name, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now();
    `, [progId, entityId, o.residencyName || o.name]);

    // 4. Gary Profile Intelligence
    const foundingYear = o.foundedYear ? parseInt(o.foundedYear, 10) || null : null;
    await client.query(`
      INSERT INTO gary_profile_intelligence (
        profile_id, prestige_tier, founding_year, honors, editorial_archetype,
        sentiment_tags, social_links, updated_at
      ) VALUES (
        $1, 'selective', $2, $3, 'international-residency', $4, $5, now()
      )
      ON CONFLICT (profile_id) DO UPDATE SET
        prestige_tier = EXCLUDED.prestige_tier,
        founding_year = COALESCE(EXCLUDED.founding_year, gary_profile_intelligence.founding_year),
        sentiment_tags = EXCLUDED.sentiment_tags,
        social_links = EXCLUDED.social_links,
        updated_at = now();
    `, [
      orgId,
      foundingYear,
      JSON.stringify([`Res Artis Network Member since ${o.programSince || o.foundedYear || "2020"}`]),
      JSON.stringify(o.disciplines?.length ? o.disciplines : ["visual-arts", "residency"]),
      JSON.stringify(o.socials || {})
    ]);

    // 5. Gary Profile Visuals (Primary image from gallery)
    if (o.galleryImages && o.galleryImages.length > 0) {
      const visualId = `vis_${crypto.createHash("md5").update(orgId + "_hero").digest("hex").slice(0, 16)}`;
      await client.query(`
        INSERT INTO gary_profile_visuals (
          id, profile_id, asset_type, image_url, label, created_at
        ) VALUES (
          $1, $2, 'banner', $3, 'Residency Campus / Studio', now()
        )
        ON CONFLICT (id) DO UPDATE SET
          image_url = EXCLUDED.image_url;
      `, [visualId, orgId, o.galleryImages[0]]);
    }

    // 6. Rebind matching opportunities in database!
    if (o.relatedOpenCalls && o.relatedOpenCalls.length > 0) {
      const rebindRes = await client.query(`
        UPDATE opportunities
        SET organization_id = $1,
            program_id = $2,
            updated_at = now()
        WHERE guidelines_url = ANY($3::text[])
           OR submission_url = ANY($3::text[]);
      `, [orgId, progId, o.relatedOpenCalls]);
      reboundCalls += rebindRes.rowCount || 0;
    }

    // Also rebind by fuzzy title match if on fallback directory
    const titleMatchRes = await client.query(`
      UPDATE opportunities
      SET organization_id = $1,
          program_id = $2,
          updated_at = now()
      WHERE organization_id = 'org_c5bce68f0d3831e0575b5823'
        AND lower(title) LIKE '%' || lower($3) || '%';
    `, [orgId, progId, o.name]);
    reboundCalls += titleMatchRes.rowCount || 0;

    orgCount++;
    if (orgCount % 50 === 0 || orgCount === orgs.length) {
      console.log(`[${orgCount}/${orgs.length}] Synced ${o.name} to Railway PostgreSQL...`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✔ Successfully synced ${orgCount} residency organizations!`);
  console.log(`✔ Rebound ${reboundCalls} opportunities to their true host profiles!`);
  console.log(`======================================================\n`);

} finally {
  await client.end();
}
