import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import type { TransArtistsProgram } from "./transartistsParser.js";
import { runFastPipeline } from "./runPlatformOpportunityPipelineFast.js";

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

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/transartists_programs.json";
if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const programs: TransArtistsProgram[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== SYNCING ${programs.length} TRANSARTISTS RESIDENCY PROGRAMS WITH RECONCILIATION & DEDUPLICATION ===\n`);

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const sourceId = "src_transartists_directory";

  // Ensure radar_sources has record
  await client.query(`
    INSERT INTO radar_sources (id, organization_id, active, data)
    VALUES ($1, null, true, $2::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `, [
    sourceId,
    JSON.stringify({
      id: sourceId,
      name: "TransArtists DutchCulture AIR Radar",
      url: "https://www.transartists.org",
      kind: "directory",
      active: true
    })
  ]);

  // Ensure opportunity_sources has record
  await client.query(`
    INSERT INTO opportunity_sources (id, name, url, kind, active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (id) DO NOTHING;
  `, [sourceId, "TransArtists DutchCulture AIR Radar", "https://www.transartists.org", "directory"]);

  let createdOrgs = 0;
  let reconciledOrgs = 0;
  let insertedOpps = 0;
  let deduplicatedOpps = 0;

  for (const p of programs) {
    const orgName = p.name.trim();
    if (!orgName) continue;

    const cleanOrgKey = orgName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);

    // 1. STRICT RECONCILIATION: Check if host organization already exists in Missa
    const existingOrgRes = await client.query(`
      SELECT id, name, canonical_key, website_url FROM gary_profiles
      WHERE id = $1
         OR canonical_key = 'trans:' || $2
         OR canonical_key = 'res:' || $2
         OR canonical_key = 'aca:' || $2
         OR canonical_key = 'otm:' || $2
         OR canonical_key = 'rivet:' || $2
         OR lower(name) = lower($3)
         OR ($4::text IS NOT NULL AND website_url IS NOT NULL AND lower(regexp_replace(website_url, '^https?://(www\\.)?', '')) = lower(regexp_replace($4::text, '^https?://(www\\.)?', '')))
      LIMIT 1;
    `, [`org_trans_${cleanOrgKey}`, cleanOrgKey, orgName, p.website || null]);

    let orgId: string;

    if (existingOrgRes.rows.length > 0) {
      // Organization already exists -> RECONCILE & ENRICH without creating duplicate
      orgId = existingOrgRes.rows[0].id;
      reconciledOrgs++;

      // Enrich missing website or contact info
      if (!existingOrgRes.rows[0].website_url && p.website) {
        await client.query(`UPDATE gary_profiles SET website_url = $1 WHERE id = $2;`, [p.website, orgId]);
      }
    } else {
      // Truly new international residency center -> CREATE
      orgId = `org_trans_${cleanOrgKey}`;
      createdOrgs++;

      const websiteUrl = p.website || `https://www.transartists.org/en/air/${p.slug}`;
      let normWebsite = "";
      try { normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch {}

      // Insert into radar_organizations
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
      `, [
        orgId,
        JSON.stringify({
          name: orgName,
          website_url: websiteUrl,
          biography: p.description || null,
          studioInfo: p.studioInfo || null,
          accommodationInfo: p.accommodationInfo || null,
          technicalInfo: p.technicalInfo || null,
          lat: p.lat,
          lon: p.lon,
          email: p.email,
          phone: p.phone,
        })
      ]);

      // Insert into gary_profiles
      await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          website_url, normalized_website_url, identity_status, identity_confidence,
          first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (
          $1, $2, $2, 'residency_center', $3, $4,
          $5, $6, 'confirmed', 0.95,
          now(), now(), now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET last_seen_at = now();
      `, [
        orgId,
        `trans:${cleanOrgKey}`,
        cleanOrgKey,
        orgName,
        websiteUrl,
        normWebsite || null
      ]);

      // Insert profile intelligence
      await client.query(`
        INSERT INTO gary_profile_intelligence (
          profile_id, prestige_tier, editorial_archetype, sentiment_tags, updated_at
        ) VALUES ($1, 'Tier 2 (Established Arts Institution)', 'International Residency & Retreat', $2::jsonb, now())
        ON CONFLICT (profile_id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify(["artist-in-residence", "international-residency", "studio-program"])
      ]);
    }

    // 2. OPPORTUNITY DEDUPLICATION & INGESTION
    if (p.deadlines && p.deadlines.length > 0) {
      for (const dl of p.deadlines) {
        let deadlineDate: string | null = null;
        if (dl !== "rolling") {
          // parse "Sep 10" or similar with current/next year
          const parsed = Date.parse(`${dl} 2026`);
          if (!isNaN(parsed)) {
            deadlineDate = new Date(parsed).toISOString().slice(0, 10);
          }
        }

        const callTitle = `${orgName} Artist Residency Call`;

        // Check deduplication
        const existingOppRes = await client.query(`
          SELECT id FROM opportunities
          WHERE organization_id = $1
            AND (
              ($2::text IS NOT NULL AND deadline_date = $2::date)
              OR lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace($3, '[^a-zA-Z0-9]', '', 'g'))
            )
          LIMIT 1;
        `, [orgId, deadlineDate, callTitle]);

        if (existingOppRes.rows.length > 0) {
          deduplicatedOpps++;
          continue;
        }

        // Insert opportunity
        const hashSuffix = crypto.createHash("md5").update(`${p.slug}-${dl}`).digest("hex").slice(0, 8);
        const oppId = `opp_trans_${hashSuffix}`;
        const oppSlug = `trans-${p.slug.slice(0, 36)}-${hashSuffix}`;

        const entityId = `ent_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
        await client.query(`
          INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
          VALUES ($1, $2, $3, 'Opportunity', now(), now())
          ON CONFLICT (id) DO NOTHING;
        `, [entityId, orgId, callTitle]);

        const progId = `prog_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
        await client.query(`
          INSERT INTO programs (id, entity_id, name, created_at, updated_at)
          VALUES ($1, $2, $3, now(), now())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        `, [progId, entityId, `${orgName} Residency Program`]);

        await client.query(`
          INSERT INTO opportunities (
            id, slug, title, organization_id, source_id, program_id, opportunity_type_id,
            status, publication_state, type, discipline, genres,
            deadline_date, deadline_kind, fee_status, prize, location,
            guidelines_url, submission_url, authority_policy_version,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'open-call',
            'open', 'reviewable', 'residency', 'visual-arts', ARRAY['residency'],
            $7, $8, 'unknown', 'Artist in Residence Program', 'global',
            $9, $10, 'opp-auth-v1',
            now(), now()
          )
          ON CONFLICT (id) DO UPDATE SET
            deadline_date = EXCLUDED.deadline_date,
            updated_at = now();
        `, [
          oppId,
          oppSlug,
          callTitle,
          orgId,
          sourceId,
          progId,
          deadlineDate,
          deadlineDate ? "fixed-deadline" : "rolling",
          `https://www.transartists.org/en/air/${p.slug}`,
          p.website || `https://www.transartists.org/en/air/${p.slug}`
        ]);

        insertedOpps++;
      }
    }
  }

  console.log("\n=== TRANSARTISTS INGESTION & RECONCILIATION SUMMARY ===");
  console.log(`Reconciled against existing database hosts: ${reconciledOrgs}`);
  console.log(`New residency centers created:               ${createdOrgs}`);
  console.log(`Deduplicated calls (already in database):    ${deduplicatedOpps}`);
  console.log(`New verified open calls staged:              ${insertedOpps}`);

  if (insertedOpps > 0) {
    console.log("\nPromoting staged opportunities via Authority Gate...");
    await runFastPipeline();
  }

} finally {
  await client.end();
}
