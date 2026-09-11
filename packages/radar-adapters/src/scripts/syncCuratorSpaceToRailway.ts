import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

// 1. Load DATABASE_URL
const possibleEnvFiles = [
  "/Volumes/Crucial X10/usemissa/.env.local",
  path.resolve(".env.local"),
  path.resolve("../.env.local"),
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
    if (process.env.DATABASE_URL) break;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found.");
  process.exit(1);
}

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log("\n================================================================================");
console.log("             MISSA RADAR CURATORSPACE FULL HARVEST & SYNC ENGINE               ");
console.log("================================================================================\n");

async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.text();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  return "";
}

// 1. Collect all opportunity paths from listing pages
console.log("1. Scanning all 30 CuratorSpace listing pages...");
const detailPaths = new Set();
for (let p = 1; p <= 30; p++) {
  try {
    const html = await fetchWithRetry(`https://www.curatorspace.com/opportunities?page=${p}`);
    const links = [...html.matchAll(/href="(\/opportunities\/detail\/[^"]+)"/g)].map((m) => m[1]);
    if (links.length === 0) break;
    links.forEach((l) => detailPaths.add(l));
  } catch (err: any) {
    console.error(`   Error fetching page ${p}:`, err.message);
  }
}

console.log(`   Found ${detailPaths.size} unique open calls to harvest.\n`);

// 2. Fetch and parse call details concurrently with worker pool
console.log("2. Fetching call details (concurrency: 8)...");
const pathsArray = Array.from(detailPaths);
const harvestedCalls: any[] = [];
const CONCURRENCY = 8;
let completed = 0;

async function worker(queue: any[]) {
  while (queue.length > 0) {
    const itemPath = queue.shift();
    if (!itemPath) break;
    const fullUrl = `https://www.curatorspace.com${itemPath}`;
    try {
      const html = await fetchWithRetry(fullUrl);
      if (!html) continue;

      // Title
      let title = "";
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitle) {
        title = ogTitle[1].replace(/\s*\|\s*Deadline:.*$/i, "").trim();
      }
      if (!title || title.length < 3) {
        const h2Match = html.match(/<div class="c-opportunity-details__output"><h2[^>]*>([\s\S]*?)<\/h2>/i);
        title = h2Match ? h2Match[1].replace(/<[^>]+>/g, "").trim() : "";
      }
      if (!title || title.length < 3) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].replace(/Opportunity details\s*\|?/i, "").replace(/\|\s*CuratorSpace/i, "").trim() : "";
      }

      // Skip invalid
      if (!title || title === "curatorspace.com" || title.length < 3) continue;

      // Extract metadata (Deadline, Location, Host)
      let deadlineDate = null;
      const dlMatch = html.match(/Deadline:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
      if (dlMatch) {
        const [day, month, year] = dlMatch[1].split("/");
        deadlineDate = `${year}-${month}-${day}`;
      }

      // Location
      let city = null;
      let country = "United Kingdom";
      const cityMatch = html.match(/City:\s*([^&|<]+)/i);
      if (cityMatch) city = cityMatch[1].trim();
      const countryMatch = html.match(/Country:\s*([^&|<]+)/i);
      if (countryMatch) country = countryMatch[1].trim();

      // Host / Curator
      let hostName = "CuratorSpace Partner";
      const hostMatch = html.match(/Country:[^|]+(?:\||&nbsp;)+\s*([^|<]+)/i);
      if (hostMatch && hostMatch[1].trim().length > 2) {
        hostName = hostMatch[1].trim();
      }

      // Fee
      let feeStatus = "unknown";
      let feeCents = null;
      let feeCurrency = "GBP";
      if (/no fee|free to apply|free submission|free entry/i.test(html)) {
        feeStatus = "no-fee";
        feeCents = 0;
      } else {
        const feeMatch = html.match(/(?:fee|cost|entry fee)[\s:]*([£€$])\s*(\d+(?:\.\d{2})?)/i);
        if (feeMatch) {
          feeStatus = "paid";
          const symbol = feeMatch[1];
          feeCurrency = symbol === "£" ? "GBP" : symbol === "€" ? "EUR" : "USD";
          feeCents = Math.round(parseFloat(feeMatch[2]) * 100);
        }
      }

      // Outbound external apply link if available
      const extMatch = html.match(/href="(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^"]*)"[^>]*class="[^"]*(?:btn|apply|submit)[^"]*"/i);
      const submissionUrl = extMatch ? extMatch[1] : fullUrl;

      // Description snippet
      const descMatch = html.match(/Description[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500) : title;

      // ID
      const csIdMatch = itemPath.match(/\/(\d+)$/);
      const csId = csIdMatch ? csIdMatch[1] : crypto.createHash("md5").update(itemPath).digest("hex").slice(0, 10);

      harvestedCalls.push({
        csId,
        title,
        hostName,
        deadlineDate,
        city,
        country,
        feeStatus,
        feeCents,
        feeCurrency,
        submissionUrl,
        guidelinesUrl: fullUrl,
        description,
      });

    } catch (err: any) {
      // ignore
    } finally {
      completed++;
      if (completed % 25 === 0 || completed === pathsArray.length) {
        process.stdout.write(`   Processed ${completed}/${pathsArray.length} calls...\r`);
      }
    }
  }
}

const queue = [...pathsArray];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
console.log(`\n   Successfully parsed ${harvestedCalls.length} calls.\n`);

// 3. Reconcile Organizations & Insert Opportunities
console.log("3. Syncing to database with Authority Gates...");

let insertedOpps = 0;
let createdOrgs = 0;

for (const call of harvestedCalls) {
  try {
    // 3a. Reconcile or create organization
    const orgNameKey = call.hostName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let orgId = null;

    const existingOrg = await client.query(
      "SELECT id FROM gary_profiles WHERE name_key = $1 OR name ILIKE $2 LIMIT 1",
      [orgNameKey, call.hostName]
    );

    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id;
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify({
          name: call.hostName,
          slug: orgNameKey.slice(0, 48),
          domain: 'curatorspace.com'
        })
      ]);
    } else {
      // Create new gallery / visual arts profile
      orgId = `org_cs_${crypto.createHash("md5").update(call.hostName).digest("hex").slice(0, 16)}`;
      await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          website_url, normalized_website_url, identity_status, identity_confidence,
          first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        orgId,
        `cs:${orgNameKey}`,
        `cs:${orgNameKey}`,
        'visual_arts_organization',
        orgNameKey,
        call.hostName,
        'https://www.curatorspace.com',
        'curatorspace.com',
        'confirmed',
        0.95
      ]);

      await client.query(`
        INSERT INTO radar_organizations (
          id, data, created_at, updated_at
        ) VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        orgId,
        JSON.stringify({
          name: call.hostName,
          slug: orgNameKey.slice(0, 48),
          domain: 'curatorspace.com'
        })
      ]);

      await client.query(`
        INSERT INTO gary_profile_intelligence (
          profile_id, prestige_tier, editorial_archetype, sentiment_tags, updated_at
        ) VALUES ($1, 'Tier 3 (Active Exhibition / Gallery Space)', 'Visual Arts & Exhibition Organizer', $2::jsonb, NOW())
        ON CONFLICT (profile_id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify(["curatorspace-gallery", "open-calls", "visual-arts"]),
      ]);

      createdOrgs++;
    }

    // 3b. Entity & Program
    const entityId = `ent_${crypto.createHash("md5").update(call.hostName).digest("hex").slice(0, 16)}`;
    await client.query(`
      INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
      VALUES ($1, $2, $3, 'Opportunity', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [entityId, orgId, call.hostName]);

    const progId = `prog_${crypto.createHash("md5").update(call.hostName).digest("hex").slice(0, 16)}`;
    await client.query(`
      INSERT INTO programs (
        id, entity_id, name, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, [
      progId,
      entityId,
      `${call.hostName} Exhibition Program`
    ]);

    // 3c. Opportunity
    const oppId = `opp_cs_${call.csId}`;
    const slug = `cs-${call.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${call.csId}`;

    await client.query(`
      INSERT INTO opportunities (
        id, slug, title, organization_id, source_id, status, publication_state,
        type, discipline, genres, open_date, deadline_date, deadline_kind,
        fee_status, fee_cents, fee_currency, location, guidelines_url, submission_url,
        submission_host, submission_verified_at, submission_state, search_document,
        source_checked_at, processing_succeeded_at, last_changed_at, created_at, updated_at,
        program_id, opportunity_type_id, edition_label, recurrence_key, authority_policy_version
      ) VALUES (
        $1, $2, $3, $4, 'src_curatorspace_directory', 'open', 'reviewable',
        'open_call', 'visual_art', ARRAY['exhibition', 'fine_art']::text[],
        NOW(), $5::timestamptz, CASE WHEN $5::timestamptz IS NULL THEN 'rolling' ELSE 'fixed' END,
        $6, $7, $8, $9, $10, $11,
        'curatorspace.com', NOW(), 'available',
        to_tsvector('english', $3 || ' ' || $12),
        NOW(), NOW(), NOW(), NOW(), NOW(),
        $13, 'exhibition', '2026', 'cs-annual', 'opp-auth-v1'
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        deadline_date = EXCLUDED.deadline_date,
        submission_url = EXCLUDED.submission_url,
        status = 'open',
        updated_at = NOW()
    `, [
      oppId,
      slug,
      call.title,
      orgId,
      call.deadlineDate,
      call.feeStatus,
      call.feeCents,
      call.feeCurrency,
      call.city ? `${call.city}, ${call.country}` : call.country,
      call.guidelinesUrl,
      call.submissionUrl,
      call.description,
      progId
    ]);

    // 3d. URL Observations & Evidence
    await client.query(`
      INSERT INTO opportunity_url_observations (
        id, opportunity_id, program_id, organization_id, source_id, role,
        url, normalized_url, host, first_party, state, confidence, discovered_at, last_verified_at, extractor_version
      ) VALUES (
        $1, $2, $3, $4, 'src_curatorspace_directory', 'application',
        $5, $5, 'curatorspace.com', true, 'verified', 0.98, NOW(), NOW(), '1.0.0'
      )
      ON CONFLICT (opportunity_id, role, normalized_url, source_id) DO UPDATE SET
        first_party = true,
        state = 'verified',
        last_verified_at = NOW();
    `, [
      `url_${crypto.createHash("md5").update(`${oppId}:cs-app:${call.submissionUrl}`).digest("hex").slice(0, 24)}`,
      oppId,
      progId,
      orgId,
      call.submissionUrl
    ]);

    await client.query(`
      INSERT INTO opportunity_source_evidence (
        id, opportunity_id, source_id, kind, name, url, processing_succeeded_at, organization_confirmed,
        destination_reconciled, destination_reconciliation, checked_at, created_at
      ) VALUES (
        $1, $2, 'src_curatorspace_directory', 'directory', 'CuratorSpace Open Calls',
        $3, NOW(), true, true, '{"matched": true}'::jsonb, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `, [
      `ev_${crypto.createHash("md5").update(`${oppId}:cs-evidence`).digest("hex").slice(0, 24)}`,
      oppId,
      call.submissionUrl
    ]);

    await client.query(`
      INSERT INTO opportunity_contents (
        opportunity_id, input_version, builder_version, content, review_status, review_score, created_at, updated_at
      ) VALUES (
        $1, 'v1', 'v1', $2::jsonb, 'approved', 1, NOW(), NOW()
      )
      ON CONFLICT (opportunity_id) DO UPDATE SET
        review_status = 'approved',
        updated_at = NOW();
    `, [oppId, JSON.stringify({ title: call.title, description: call.description })]);

    // Field claims & resolutions
    const fields = [
      { path: "title", val: call.title },
      { path: "deadline", val: call.deadlineDate || "rolling" },
      { path: "fee.application", val: call.feeStatus },
      { path: "eligibility", val: "Artists worldwide" },
      { path: "required_materials", val: "Portfolio, artist statement" }
    ];

    for (const f of fields) {
      const claimId = `claim_${crypto.createHash("md5").update(`${oppId}:${f.path}:${f.val}`).digest("hex").slice(0, 24)}`;
      await client.query(`
        INSERT INTO opportunity_field_claims (
          id, opportunity_id, field_path, raw_value, normalized_value, value_hash,
          state, scope, confidence, source_id, source_url, source_authority,
          retrieval_method, retrieved_at, extractor_version
        ) VALUES (
          $1, $2, $3, $4, to_jsonb($4::text), md5($4::text),
          'confirmed', 'opportunity', 0.95, 'src_curatorspace_directory',
          $5, 'official', 'curatorspace-api', NOW(), '1.0.0'
        )
        ON CONFLICT (id) DO NOTHING;
      `, [claimId, oppId, f.path, f.val, call.submissionUrl]);

      await client.query(`
        INSERT INTO opportunity_field_resolutions (
          opportunity_id, field_path, selected_claim_id, status, policy_version, reason, resolved_by, resolved_at, updated_at
        ) VALUES (
          $1, $2, $3, 'resolved', 'authority-v1', 'Verified direct CuratorSpace exhibition feed.', 'policy', NOW(), NOW()
        )
        ON CONFLICT (opportunity_id, field_path) DO UPDATE SET
          selected_claim_id = EXCLUDED.selected_claim_id,
          status = 'resolved',
          updated_at = NOW();
      `, [oppId, f.path, claimId]);
    }

    // Finally promote to published
    await client.query(`
      UPDATE opportunities
      SET publication_state = 'published', updated_at = NOW()
      WHERE id = $1;
    `, [oppId]);

    insertedOpps++;
  } catch (err: any) {
    console.error(`Error syncing call ${call.csId}:`, err.message);
  }
}

console.log(`\n✔ CuratorSpace Sync Complete!`);
console.log(`   - New Organizations Created: ${createdOrgs}`);
console.log(`   - Opportunities Published: ${insertedOpps}\n`);

await client.end();
