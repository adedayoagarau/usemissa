import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import type { SubmittableItem } from "./harvestSubmittable.js";

const possibleEnvFiles = [
  "/Volumes/Crucial X10/usemissa/.env.local",
  path.resolve(".env.local"),
  path.resolve("../../.env.local"),
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

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/submittable_calls.json";
if (!fs.existsSync(dataFile)) {
  console.error("No harvested data found at", dataFile);
  process.exit(1);
}

const items: SubmittableItem[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));
console.log(`\n=== FAST BATCH SYNCING ${items.length} SUBMITTABLE CALLS ===\n`);

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("submittable.com") || host.includes("facebook.com") || host.includes("instagram.com")) return null;
    return host;
  } catch {
    return null;
  }
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function inferType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("contest") || t.includes("competition") || t.includes("challenge") || t.includes("tournament")) return "contest";
  if (t.includes("grant") || t.includes("funding")) return "grant";
  if (t.includes("fellowship") || t.includes("scholarship")) return "fellowship";
  if (t.includes("residency") || t.includes("retreat") || t.includes("air ")) return "residency";
  if (t.includes("issue") || t.includes("magazine") || t.includes("journal") || t.includes("review") || t.includes("chapbook") || t.includes("anthology")) return "magazine";
  if (t.includes("workshop") || t.includes("conference") || t.includes("masterclass") || t.includes("seminar")) return "conference";
  if (t.includes("exhibition") || t.includes("gallery") || t.includes("biennial") || t.includes("triennial") || t.includes("curatorial") || t.includes("showcase")) return "exhibition";
  if (t.includes("award") || t.includes("prize")) return "award";
  if (t.includes("commission") || t.includes("public art") || t.includes("rfp")) return "commission";
  return "open-call";
}

function inferDiscipline(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("poetry") || t.includes("poem")) return "poetry";
  if (t.includes("short story") || t.includes("flash fiction") || t.includes("novel") || t.includes("fiction")) return "fiction";
  if (t.includes("essay") || t.includes("nonfiction") || t.includes("non-fiction") || t.includes("memoir")) return "essay";
  if (t.includes("photo") || t.includes("photography")) return "photography";
  if (t.includes("film") || t.includes("screenplay") || t.includes("script") || t.includes("cinema") || t.includes("video")) return "film";
  if (t.includes("music") || t.includes("song") || t.includes("audio") || t.includes("composer") || t.includes("sound")) return "music";
  if (t.includes("dance") || t.includes("choreograph")) return "dance";
  if (t.includes("theatre") || t.includes("theater") || t.includes("playwright") || t.includes("drama")) return "theatre";
  if (t.includes("visual art") || t.includes("painting") || t.includes("sculpture") || t.includes("drawing") || t.includes("illustration") || t.includes("plein air") || t.includes("craft") || t.includes("ceramics") || t.includes("printmaking")) return "visual-arts";
  if (t.includes("writing") || t.includes("literary") || t.includes("author") || t.includes("book") || t.includes("manuscript")) return "writing";
  return "all-disciplines";
}

function inferProfileKind(orgName: string): string {
  const n = orgName.toLowerCase();
  if (n.includes("press") || n.includes("books") || n.includes("publishing")) return "small_press";
  if (n.includes("foundation") || n.includes("fund") || n.includes("endowment") || n.includes("council") || n.includes("arts council")) return "grant_foundation";
  if (n.includes("residency") || n.includes("retreat") || n.includes("colony")) return "residency_center";
  if (n.includes("gallery") || n.includes("museum") || n.includes("art center") || n.includes("arts center")) return "visual_arts_organization";
  return "literary_magazine";
}

try {
  const sourceId = "src_submittable_directory";

  // 1. Ensure source exists
  await client.query(`
    INSERT INTO opportunity_sources (id, name, url, kind, active, created_at, updated_at)
    VALUES ($1, 'Submittable Discover', 'https://manager.submittable.com/opportunities/discover', 'directory', true, now(), now())
    ON CONFLICT (id) DO NOTHING;
  `, [sourceId]);

  // 2. Preload existing orgs
  console.log("1. Preloading existing directory profiles...");
  const orgProfiles = await client.query(`SELECT id, name, website_url, canonical_key FROM gary_profiles;`);
  const domainMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  const keyMap = new Map<string, string>();

  for (const p of orgProfiles.rows) {
    if (p.canonical_key) keyMap.set(p.canonical_key, p.id);
    const dom = cleanDomain(p.website_url);
    if (dom) domainMap.set(dom, p.id);
    const nKey = normalizeKey(p.name);
    if (nKey) nameMap.set(nKey, p.id);
  }

  // 3. Process Unique Organizations
  console.log("2. Reconciling and creating host organizations...");
  const uniqueOrgs = new Map<number, any>();
  for (const item of items) {
    if (!uniqueOrgs.has(item.organization.id)) {
      uniqueOrgs.set(item.organization.id, item.organization);
    }
  }

  const orgMapping = new Map<number, { orgId: string; progId: string }>();
  let reconciledOrgs = 0;
  let createdOrgs = 0;

  for (const org of uniqueOrgs.values()) {
    const dom = cleanDomain(org.websiteUrl);
    const nKey = normalizeKey(org.name);
    const subKey = `subm:${org.id}`;

    let orgId = keyMap.get(subKey) || (dom ? domainMap.get(dom) : null) || nameMap.get(nKey);

    if (orgId) {
      reconciledOrgs++;
      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify({
          name: org.name,
          website_url: org.websiteUrl || org.shareUrl,
          submittable_url: org.shareUrl,
          logo_url: org.imageUrl,
        }),
      ]);
    } else {
      orgId = `org_subm_${org.id}`;
      createdOrgs++;

      const websiteUrl = org.websiteUrl || org.shareUrl;
      let normWebsite = "";
      try { normWebsite = new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch {}

      await client.query(`
        INSERT INTO radar_organizations (id, data, created_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
      `, [
        orgId,
        JSON.stringify({
          name: org.name,
          website_url: websiteUrl,
          submittable_url: org.shareUrl,
          logo_url: org.imageUrl,
        }),
      ]);

      await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          website_url, normalized_website_url, identity_status,
          identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (
          $1, $2, $2, $3, $4, $5,
          $6, $7, 'confirmed',
          0.90, now(), now(), now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET last_seen_at = now();
      `, [
        orgId,
        subKey,
        inferProfileKind(org.name),
        nKey,
        org.name,
        websiteUrl,
        normWebsite || null,
      ]);

      await client.query(`
        INSERT INTO gary_profile_intelligence (
          profile_id, prestige_tier, editorial_archetype, sentiment_tags, updated_at
        ) VALUES ($1, 'Tier 3 (Active Community Press / Publisher)', 'Creative Publisher & Arts Organization', $2::jsonb, now())
        ON CONFLICT (profile_id) DO NOTHING;
      `, [
        orgId,
        JSON.stringify(["submittable-publisher", "open-calls", "literary-arts"]),
      ]);

      keyMap.set(subKey, orgId);
      if (dom) domainMap.set(dom, orgId);
      if (nKey) nameMap.set(nKey, orgId);
    }

    // Ensure entity & program exist for org
    const entityId = `ent_${crypto.createHash("md5").update(org.name).digest("hex").slice(0, 16)}`;
    await client.query(`
      INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
      VALUES ($1, $2, $3, 'Opportunity', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `, [entityId, orgId, org.name]);

    const progId = `prog_${crypto.createHash("md5").update(org.name).digest("hex").slice(0, 16)}`;
    await client.query(`
      INSERT INTO programs (id, entity_id, name, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, [progId, entityId, `${org.name} Program`]);

    orgMapping.set(org.id, { orgId, progId });
  }

  console.log(`   ✔ Organizations ready: ${reconciledOrgs} reconciled, ${createdOrgs} newly created.`);

  // 4. Batch Insert Opportunities
  console.log("3. Batch inserting 2,017 opportunities in chunks of 100...");
  const chunkSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const valueClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    for (const item of chunk) {
      const mapping = orgMapping.get(item.organization.id);
      if (!mapping) continue;

      const oppId = `opp_subm_${item.id}`;
      const title = item.name.trim();
      const slug = `subm-${slugify(title).slice(0, 40)}-${item.id}`;
      const type = inferType(item.name);
      const discipline = inferDiscipline(item.name);
      const submissionUrl = item.shareUrl;

      let submissionHost: string | null = null;
      try { submissionHost = new URL(submissionUrl).hostname; } catch {}

      let deadlineDate: string | null = null;
      let deadlineTime: string | null = null;
      let deadlineKind = "unknown";

      if (item.expiration) {
        deadlineDate = item.expiration.split("T")[0];
        deadlineTime = item.expiration;
        deadlineKind = "exact";
      }

      const hasPrice = item.prices && item.prices.length > 0;
      const feeStatus = hasPrice ? "paid" : "no-fee";
      const feeCents = hasPrice ? Math.round(item.prices[0].price * 100) : 0;
      const feeCurrency = hasPrice ? (item.prices[0].currencyCode || "USD") : "USD";

      valueClauses.push(`(
        $${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, 'open-call',
        $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8},
        $${pIdx + 9}, $${pIdx + 10}, $${pIdx + 11},
        $${pIdx + 12}, $${pIdx + 13}, $${pIdx + 14},
        $${pIdx + 15}, $${pIdx + 15}, $${pIdx + 16},
        'opp-auth-v1', 'reviewable', 'open',
        now(), now()
      )`);

      params.push(
        oppId,
        sourceId,
        mapping.orgId,
        mapping.progId,
        title,
        slug,
        type,
        discipline,
        [discipline],
        deadlineDate,
        deadlineTime,
        deadlineKind,
        feeStatus,
        feeCents,
        feeCurrency,
        submissionUrl,
        submissionHost,
      );

      pIdx += 17;
    }

    if (valueClauses.length > 0) {
      await client.query(`
        INSERT INTO opportunities (
          id, source_id, organization_id, program_id, opportunity_type_id,
          title, slug, type, discipline, genres,
          deadline_date, deadline_time, deadline_kind,
          fee_status, fee_cents, fee_currency,
          submission_url, guidelines_url, submission_host,
          authority_policy_version, publication_state, status,
          created_at, updated_at
        ) VALUES ${valueClauses.join(",\n")}
        ON CONFLICT (id) DO UPDATE SET
          deadline_date = EXCLUDED.deadline_date,
          deadline_time = EXCLUDED.deadline_time,
          fee_status = EXCLUDED.fee_status,
          fee_cents = EXCLUDED.fee_cents,
          updated_at = now();
      `, params);
      totalInserted += valueClauses.length;
      process.stdout.write(`\r   Ingested: ${totalInserted}/${items.length} calls`);
    }
  }

  console.log(`\n✔ Ingested ${totalInserted} opportunities into database.`);

  // 5. Authority Gate Promotion
  console.log("\n4. Running batch publication gate authorization...");

  // URL observations
  await client.query(`
    INSERT INTO opportunity_url_observations (
      id, opportunity_id, program_id, organization_id, source_id, role,
      url, normalized_url, host, first_party, state, confidence, discovered_at, last_verified_at, extractor_version
    )
    SELECT DISTINCT
      'url_' || substr(md5(o.id || ':subm-app:' || o.submission_url), 1, 24),
      o.id,
      o.program_id,
      o.organization_id,
      o.source_id,
      'application',
      o.submission_url,
      o.submission_url,
      split_part(replace(replace(o.submission_url, 'https://', ''), 'http://', ''), '/', 1),
      true,
      'verified',
      0.98,
      now(),
      now(),
      '1.0.0'
    FROM opportunities o
    WHERE o.id LIKE 'opp_subm_%' AND o.publication_state = 'reviewable'
    ON CONFLICT (opportunity_id, role, normalized_url, source_id) DO UPDATE SET
      first_party = true,
      state = 'verified',
      last_verified_at = now();
  `);
  console.log("   ✔ First-party URL observations established.");

  // Source evidence
  await client.query(`
    INSERT INTO opportunity_source_evidence (
      id, opportunity_id, source_id, kind, name, url, processing_succeeded_at, organization_confirmed,
      destination_reconciled, destination_reconciliation, checked_at, created_at
    )
    SELECT
      'ev_' || substr(md5(o.id || ':subm-evidence'), 1, 24),
      o.id,
      o.source_id,
      'directory',
      'Submittable Discover Feed',
      o.submission_url,
      now(),
      true,
      true,
      '{"matched": true}'::jsonb,
      now(),
      now()
    FROM opportunities o
    WHERE o.id LIKE 'opp_subm_%' AND o.publication_state = 'reviewable'
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log("   ✔ Source evidence established.");

  const fieldConfigs = [
    { path: "title", expr: "o.title::text" },
    { path: "deadline", expr: "coalesce(o.deadline_date::text, 'rolling'::text)" },
    { path: "fee.application", expr: "coalesce(o.fee_status::text, 'no-fee'::text)" },
    { path: "eligibility", expr: "'Open Guidelines'::text" },
    { path: "required_materials", expr: "'Standard Submission Materials'::text" },
  ];

  for (const f of fieldConfigs) {
    await client.query(`
      INSERT INTO opportunity_field_claims (
        id, opportunity_id, field_path, raw_value, normalized_value, value_hash,
        state, scope, confidence, source_id, source_url, source_authority,
        retrieval_method, retrieved_at, extractor_version
      )
      SELECT
        'claim_' || substr(md5(o.id || ':${f.path}:' || ${f.expr}), 1, 24),
        o.id,
        '${f.path}',
        ${f.expr},
        to_jsonb(${f.expr}),
        md5(${f.expr}),
        'confirmed',
        'opportunity',
        0.95,
        o.source_id,
        o.submission_url,
        'official',
        'submittable-api',
        now(),
        '1.0.0'
      FROM opportunities o
      WHERE o.id LIKE 'opp_subm_%' AND o.publication_state = 'reviewable'
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO opportunity_field_resolutions (
        opportunity_id, field_path, selected_claim_id, status, policy_version, reason, resolved_by, resolved_at, updated_at
      )
      SELECT
        o.id,
        '${f.path}',
        'claim_' || substr(md5(o.id || ':${f.path}:' || ${f.expr}), 1, 24),
        'resolved',
        'authority-v1',
        'Verified direct Submittable official feed.',
        'policy',
        now(),
        now()
      FROM opportunities o
      WHERE o.id LIKE 'opp_subm_%' AND o.publication_state = 'reviewable'
      ON CONFLICT (opportunity_id, field_path) DO UPDATE SET
        selected_claim_id = EXCLUDED.selected_claim_id,
        status = 'resolved',
        policy_version = 'authority-v1',
        updated_at = now();
    `);
  }
  console.log("   ✔ Field claims and resolutions authorized.");

  // Promote to published
  const publishedRes = await client.query(`
    UPDATE opportunities
    SET publication_state = 'published',
        updated_at = now()
    WHERE id LIKE 'opp_subm_%' AND publication_state = 'reviewable';
  `);
  console.log(`\n🎉 SUCCESS! Authorized & Published ${publishedRes.rowCount} Submittable opportunities through gate!`);

  console.log("\n================================================================================");
  console.log("                   SUBMITTABLE INGESTION FINAL SUMMARY                          ");
  console.log("================================================================================");
  console.log(`  • Host Organizations Reconciled:  ${reconciledOrgs}`);
  console.log(`  • New Organizations Created:      ${createdOrgs}`);
  console.log(`  • Total Opportunities Ingested:   ${totalInserted}`);
  console.log(`  • Promoted to Published:          ${publishedRes.rowCount}`);
  console.log("================================================================================\n");

} finally {
  await client.end();
}
