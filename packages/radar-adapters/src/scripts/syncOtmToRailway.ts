import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import type { OtmGrant } from "./otmParser.js";

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

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/otm_grants.json";
if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const grants: OtmGrant[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== SYNCING ${grants.length} ON THE MOVE GRANTS WITH RECONCILIATION & DEDUPLICATION ===\n`);

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  // Ensure OTM source exists in opportunity_sources
  const sourceId = "source_otm_directory";
  await client.query(`
    INSERT INTO opportunity_sources (id, name, url, kind, active, created_at, updated_at)
    VALUES (
      $1, 'On The Move', 'https://on-the-move.org', 'directory', true, now(), now()
    )
    ON CONFLICT (id) DO NOTHING;
  `, [sourceId]);

  let createdOrgs = 0;
  let reconciledOrgs = 0;
  let insertedOpps = 0;
  let deduplicatedOpps = 0;

  for (const g of grants) {
    const orgName = g.organizationName.trim();
    const cleanOrgKey = orgName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);

    // 1. RECONCILIATION: Check if foundation / host already exists
    const existingOrgRes = await client.query(`
      SELECT id, name, website_url 
      FROM gary_profiles 
      WHERE name_key = $1 OR lower(name) = lower($2)
      LIMIT 1;
    `, [cleanOrgKey, orgName]);

    let orgId = "";
    let entityId = "";
    let progId = "";

    if (existingOrgRes.rows.length > 0) {
      orgId = existingOrgRes.rows[0].id;
      reconciledOrgs++;

      // Ensure radar_organizations
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO NOTHING;
      `, [orgId, JSON.stringify({ name: orgName })]);

      // Lookup or create program
      const progRes = await client.query(`
        SELECT p.id, p.entity_id 
        FROM programs p 
        JOIN entities e ON p.entity_id = e.id 
        WHERE e.organization_id = $1 
        LIMIT 1;
      `, [orgId]);

      if (progRes.rows.length > 0) {
        progId = progRes.rows[0].id;
        entityId = progRes.rows[0].entity_id;
      } else {
        entityId = `entity_${crypto.createHash("md5").update(orgId).digest("hex").slice(0, 16)}`;
        progId = `prog_${crypto.createHash("md5").update(orgId).digest("hex").slice(0, 16)}`;
        await client.query(`
          INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
          VALUES ($1, $2, $3, 'Grant Foundation', now(), now()) ON CONFLICT (id) DO NOTHING;
        `, [entityId, orgId, orgName]);
        await client.query(`
          INSERT INTO programs (id, entity_id, name, created_at, updated_at)
          VALUES ($1, $2, $3, now(), now()) ON CONFLICT (id) DO NOTHING;
        `, [progId, entityId, `${orgName} Mobility Grants`]);
      }
    } else {
      // Create new grant foundation profile
      orgId = `org_otm_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
      entityId = `entity_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
      progId = `prog_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
      createdOrgs++;

      const websiteUrl = g.applicationUrl || g.url;
      let normWebsite = "on-the-move.org";
      try { normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch {}

      // radar_organizations
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
      `, [orgId, JSON.stringify({ name: orgName, website_url: websiteUrl, otm_url: g.url })]);

      // gary_profiles (grant_foundation)
      await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          website_url, normalized_website_url, identity_status, identity_confidence,
          first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (
          $1, $2, $2, 'grant_foundation', $3, $4,
          $5, $6, 'confirmed', 1.0,
          now(), now(), now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET last_seen_at = now();
      `, [orgId, `otm:${cleanOrgKey}`, cleanOrgKey, orgName, websiteUrl, normWebsite]);

      // entities & programs
      await client.query(`
        INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
        VALUES ($1, $2, $3, 'Grant Foundation', now(), now())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
      `, [entityId, orgId, orgName]);

      await client.query(`
        INSERT INTO programs (id, entity_id, name, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
      `, [progId, entityId, `${orgName} Mobility Grants`]);

      // intelligence
      await client.query(`
        INSERT INTO gary_profile_intelligence (
          profile_id, prestige_tier, founding_year, honors, editorial_archetype,
          sentiment_tags, social_links, updated_at
        ) VALUES (
          $1, 'high-prestige', null, $2, 'grant-foundation', $3, '{}'::jsonb, now()
        )
        ON CONFLICT (profile_id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify(["International Mobility & Cultural Exchange Grantor"]),
        JSON.stringify(g.disciplines)
      ]);
    }

    // 2. DEDUPLICATION: Check if Opportunity already exists under this host
    const existingOppRes = await client.query(`
      SELECT id, title, deadline_date 
      FROM opportunities 
      WHERE organization_id = $1 
        AND (
          (deadline_date IS NOT NULL AND $2::date IS NOT NULL AND deadline_date = $2::date)
          OR lower(title) = lower($3)
        )
      LIMIT 1;
    `, [orgId, g.deadlineDate, g.title]);

    if (existingOppRes.rows.length > 0) {
      // Enrich existing opportunity with award & application url
      const existingOppId = existingOppRes.rows[0].id;
      deduplicatedOpps++;

      await client.query(`
        UPDATE opportunities
        SET prize = COALESCE($1, prize),
            guidelines_url = COALESCE(guidelines_url, $2),
            submission_url = COALESCE(submission_url, $3),
            updated_at = now()
        WHERE id = $4;
      `, [
        g.prize,
        g.url,
        g.applicationUrl,
        existingOppId
      ]);
    } else {
      // Insert new grant in reviewable state
      const oppId = `opp_otm_${crypto.createHash("md5").update(g.url).digest("hex").slice(0, 16)}`;
      insertedOpps++;

      await client.query(`
        INSERT INTO opportunities (
          id, slug, title, organization_id, source_id, program_id, opportunity_type_id,
          status, publication_state, type, discipline, genres,
          deadline_date, deadline_kind, fee_status, prize, location,
          guidelines_url, submission_url, authority_policy_version,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'open-call',
          'open', 'reviewable', 'grant', 'visual-arts', $7,
          $8, $9, 'free', $10, $11,
          $12, $13, 'opp-auth-v1',
          now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
          deadline_date = EXCLUDED.deadline_date,
          prize = EXCLUDED.prize,
          submission_url = EXCLUDED.submission_url,
          updated_at = now();
      `, [
        oppId,
        g.slug.slice(0, 48),
        g.title,
        orgId,
        sourceId,
        progId,
        g.disciplines,
        g.deadlineDate,
        g.deadlineDate ? "fixed-deadline" : "rolling",
        g.prize || "Travel & production grant",
        g.location || "International / Mobility",
        g.url,
        g.applicationUrl || g.url
      ]);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✔ RECONCILIATION SUMMARY:`);
  console.log(`  • Existing Host Profiles Reconciled: ${reconciledOrgs}`);
  console.log(`  • New Grant Foundation Profiles Created: ${createdOrgs}`);
  console.log(`✔ OPPORTUNITY DEDUPLICATION SUMMARY:`);
  console.log(`  • Existing Opportunities Enriched (Deduplicated): ${deduplicatedOpps}`);
  console.log(`  • New Verified Grants Staged: ${insertedOpps}`);
  console.log(`======================================================\n`);

} finally {
  await client.end();
}
