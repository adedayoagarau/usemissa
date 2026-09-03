import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import type { RivetOpenCall } from "./rivetParser.js";

interface EnrichedRivetCall extends RivetOpenCall {
  orgWebsite?: string | null;
  orgSocials?: Record<string, string>;
}

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

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/rivet_calls.json";
if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const calls: EnrichedRivetCall[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== SYNCING ${calls.length} RIVET OPEN CALLS WITH RECONCILIATION & DEDUPLICATION ===\n`);

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const sourceId = "src_rivet_directory";
  
  // Ensure radar_sources has record
  await client.query(`
    INSERT INTO radar_sources (id, organization_id, active, data)
    VALUES ($1, null, true, $2::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `, [
    sourceId,
    JSON.stringify({
      id: sourceId,
      name: "Rivet Global Residency Radar",
      url: "https://rivet.es",
      kind: "directory",
      active: true
    })
  ]);

  // Ensure opportunity_sources has record
  await client.query(`
    INSERT INTO opportunity_sources (id, name, url, kind, active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (id) DO NOTHING;
  `, [sourceId, "Rivet Global Residency Radar", "https://rivet.es", "directory"]);

  let createdOrgs = 0;
  let reconciledOrgs = 0;
  let insertedOpps = 0;
  let deduplicatedOpps = 0;

  for (const c of calls) {
    const orgName = c.organizationName.trim();
    if (!orgName || orgName.toLowerCase() === "unknown host") continue;

    const cleanOrgKey = orgName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);

    // 1. RECONCILIATION: Check if organization exists in gary_profiles
    const existingOrgRes = await client.query(`
      SELECT id, name, canonical_key, website_url FROM gary_profiles
      WHERE id = $1
         OR canonical_key = 'rivet:' || $2
         OR canonical_key = 'res:' || $2
         OR canonical_key = 'aca:' || $2
         OR canonical_key = 'otm:' || $2
         OR lower(name) = lower($3)
         OR ($4::text IS NOT NULL AND website_url IS NOT NULL AND lower(regexp_replace(website_url, '^https?://(www\\.)?', '')) = lower(regexp_replace($4::text, '^https?://(www\\.)?', '')))
      LIMIT 1;
    `, [`org_rivet_${cleanOrgKey}`, cleanOrgKey, orgName, c.orgWebsite || null]);

    let orgId: string;

    if (existingOrgRes.rows.length > 0) {
      orgId = existingOrgRes.rows[0].id;
      reconciledOrgs++;

      // Update website if previously missing
      if (!existingOrgRes.rows[0].website_url && c.orgWebsite) {
        await client.query(`
          UPDATE gary_profiles SET website_url = $1 WHERE id = $2;
        `, [c.orgWebsite, orgId]);
      }
    } else {
      // Create new residency center profile
      orgId = `org_rivet_${cleanOrgKey}`;
      createdOrgs++;

      const websiteUrl = c.orgWebsite || c.applicationUrl || c.url;
      let normWebsite = "";
      try { normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch {}

      // Insert into radar_organizations first (satisfies foreign key)
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
      `, [
        orgId,
        JSON.stringify({
          name: orgName,
          website_url: websiteUrl,
          biography: c.description || null,
          location: c.location || null,
          country: c.country || null,
          facilities: c.facilities || [],
          housing: c.housing || [],
          disciplines: c.disciplines || [],
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
        `rivet:${cleanOrgKey}`,
        cleanOrgKey,
        orgName,
        websiteUrl,
        normWebsite || null
      ]);

      // Insert profile intelligence
      await client.query(`
        INSERT INTO gary_profile_intelligence (
          profile_id, prestige_tier, editorial_archetype, sentiment_tags, social_links, updated_at
        ) VALUES ($1, 'Tier 2 (Established Arts Institution)', 'International Residency & Retreat', $2::jsonb, $3::jsonb, now())
        ON CONFLICT (profile_id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify(c.disciplines || ["visual-arts", "multidisciplinary"]),
        JSON.stringify(c.orgSocials || {})
      ]);
    }

    // 2. DEDUPLICATION: Check if this opportunity is already recorded
    const cleanTitle = c.title.trim();
    const existingOppRes = await client.query(`
      SELECT id, title, publication_state FROM opportunities
      WHERE organization_id = $1
        AND (
          ($2::text IS NOT NULL AND deadline_date = $2::date)
          OR lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace($3, '[^a-zA-Z0-9]', '', 'g'))
        )
      LIMIT 1;
    `, [orgId, c.deadlineDate, cleanTitle]);

    if (existingOppRes.rows.length > 0) {
      deduplicatedOpps++;
      continue;
    }

    // 3. INSERT OPPORTUNITY
    const hashSuffix = crypto.createHash("md5").update(c.url).digest("hex").slice(0, 8);
    const oppId = `opp_rivet_${hashSuffix}`;
    const oppSlug = `rivet-${c.slug.slice(0, 36)}-${hashSuffix}`;
    const prizeSummary = c.funding ? `Funding: ${c.funding}` : (c.costs ? `Fee: ${c.costs}` : null);
    const feeStatus = c.costs?.toLowerCase().includes("free") ? "free" : "unknown";

    // Ensure entity and program exist
    const entityId = `ent_${crypto.createHash("md5").update(orgName).digest("hex").slice(0, 16)}`;
    await client.query(`
      INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
      VALUES ($1, $2, $3, 'Opportunity', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `, [entityId, orgId, cleanTitle]);

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
        'open', 'reviewable', 'residency', 'visual-arts', $7,
        $8, $9, $10, $11, $12,
        $13, $14, 'opp-auth-v1',
        now(), now()
      )
      ON CONFLICT (id) DO UPDATE SET
        deadline_date = EXCLUDED.deadline_date,
        fee_status = EXCLUDED.fee_status,
        prize = EXCLUDED.prize,
        submission_url = EXCLUDED.submission_url,
        updated_at = now();
    `, [
      oppId,
      oppSlug,
      cleanTitle,
      orgId,
      sourceId,
      progId,
      c.disciplines.length ? c.disciplines : ["residency"],
      c.deadlineDate,
      c.deadlineDate ? "fixed-deadline" : "rolling",
      feeStatus,
      prizeSummary,
      c.location || "global",
      c.url,
      c.applicationUrl || c.url
    ]);

    insertedOpps++;
  }

  console.log("\n=== RIVET INGESTION & RECONCILIATION SUMMARY ===");
  console.log(`Reconciled against existing database hosts: ${reconciledOrgs}`);
  console.log(`New residency centers created:               ${createdOrgs}`);
  console.log(`Deduplicated calls (already in database):    ${deduplicatedOpps}`);
  console.log(`New verified open calls published:           ${insertedOpps}`);

} finally {
  await client.end();
}
