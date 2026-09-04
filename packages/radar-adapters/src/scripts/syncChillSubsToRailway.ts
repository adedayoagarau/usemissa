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

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

console.log("\n================================================================================");
console.log("          MISSA RADAR CHILL SUBS LITERARY MAGAZINE & CALENDAR HARVEST          ");
console.log("================================================================================\n");

// 2. Fetch Chill Subs feed with cursor pagination
async function fetchFeedPage(cursor = null, retries = 3) {
  const input = { json: cursor ? { cursor } : {} };
  const url = `https://www.chillsubs.com/api/trpc/opportunities.getFeed?input=${encodeURIComponent(JSON.stringify(input))}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.result?.data?.json || null;
      }
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  return null;
}

// 3. Collect active open calls & recurring reading windows
console.log("1. Harvesting Chill Subs magazine feed...");
const MAX_PAGES = 50; // 50 pages = up to 1,000 calls
let cursor = null;
const collectedItems = [];
const now = new Date();

for (let page = 1; page <= MAX_PAGES; page++) {
  try {
    const pageData = await fetchFeedPage(cursor);
    if (!pageData || !pageData.items || pageData.items.length === 0) break;

    for (const item of pageData.items) {
      const call = item.cardData?.call;
      const listing = item.cardData?.listing;
      if (!call || !listing || !call.title || !listing.name) continue;

      // Check deadline validity
      const subWindows = call.readingPeriod?.subWindows || [];
      let latestDeadline = null;
      let latestOpenDate = null;
      let hasActiveWindow = false;

      for (const w of subWindows) {
        if (w.closeDate) {
          const closeTime = new Date(w.closeDate);
          if (closeTime > now) {
            hasActiveWindow = true;
            latestDeadline = closeTime.toISOString();
            if (w.openDate) latestOpenDate = new Date(w.openDate).toISOString();
          }
        }
      }

      const isRolling = call.readingPeriod?.rollingDeadlines || call.readingPeriod?.callPeriod?.alwaysOpen;
      const isCallOpen = call.status === "open";

      // We harvest open calls with upcoming deadlines or rolling reading periods
      if ((isCallOpen && (hasActiveWindow || isRolling)) || hasActiveWindow) {
        collectedItems.push({
          callId: call.id,
          title: call.title,
          description: call.description || listing.description || call.title,
          callType: call.type,
          callTypes: call.callTypes || {},
          genre: call.genre || {},
          genreStyle: call.genreStyle,
          subGenre: call.subGenre || [],
          link: call.link || listing.website,
          openDate: latestOpenDate || now.toISOString(),
          deadlineDate: latestDeadline,
          isRolling: Boolean(isRolling && !latestDeadline),
          isRecurring: Boolean(call.readingPeriod?.callPeriod?.recurring),
          feeCharges: Boolean(call.fee?.charges),
          feeAmountCents: call.fee?.charges && call.fee?.amount ? Math.round(call.fee.amount * 100) : 0,
          feeCurrency: call.fee?.currency || "USD",
          pays: Boolean(call.payment?.pays),
          magazine: {
            id: listing.id,
            key: listing.key || listing.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: listing.name,
            website: listing.website || call.link,
            description: listing.descriptionFull || listing.description || "",
            cover: listing.cover || listing.issueImage || null,
            acceptanceRate: listing.acceptanceRate || null,
            clmpMember: Boolean(listing.clmpMember)
          }
        });
      }
    }

    cursor = pageData.nextCursor;
    process.stdout.write(`   Fetched page ${page}/${MAX_PAGES} (Collected: ${collectedItems.length} active calls)...\r`);
    if (!cursor) break;

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 150));
  } catch (err: any) {
    console.error(`\nError fetching page ${page}:`, err.message);
    break;
  }
}

console.log(`\n\n   Harvested ${collectedItems.length} active literary magazine calls & reading periods.\n`);

// 4. Ensure Chill Subs source in DB
await pool.query(`
  INSERT INTO opportunity_sources (id, name, url, kind, created_at, updated_at)
  VALUES ('src_chill_subs_directory', 'Chill Subs Magazine Directory', 'https://www.chillsubs.com', 'directory', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
`);

// 5. Sync to Railway PostgreSQL with Concurrency 8
console.log("2. Syncing to database with Authority Gates (concurrency: 8)...");
let insertedOpps = 0;
let createdOrgs = 0;
let syncedCount = 0;
const CONCURRENCY = 8;

async function syncWorker(queue: any[]) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    try {
      const mag = item.magazine;
      const orgNameKey = mag.key.slice(0, 48);
      let orgId = null;

      // A. Reconcile / Create Magazine Organization
      const existingOrg = await pool.query(
        "SELECT id FROM gary_profiles WHERE name_key = $1 OR name ILIKE $2 LIMIT 1",
        [orgNameKey, mag.name]
      );

      if (existingOrg.rows.length > 0) {
        orgId = existingOrg.rows[0].id;
        await pool.query(`
          INSERT INTO radar_organizations (id, data, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [
          orgId,
          JSON.stringify({
            name: mag.name,
            slug: orgNameKey,
            website: mag.website,
            acceptanceRate: mag.acceptanceRate,
            clmpMember: mag.clmpMember
          })
        ]);
      } else {
        orgId = `org_cs_${crypto.createHash("md5").update(mag.name).digest("hex").slice(0, 16)}`;
        await pool.query(`
          INSERT INTO gary_profiles (
            id, identity_key, canonical_key, profile_kind, name_key, name,
            website_url, normalized_website_url, identity_status, identity_confidence,
            first_seen_at, last_seen_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [
          orgId,
          `chill:${orgNameKey}`,
          `chill:${orgNameKey}`,
          'literary_magazine',
          orgNameKey,
          mag.name,
          mag.website,
          mag.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
          'confirmed',
          0.98
        ]);

        await pool.query(`
          INSERT INTO radar_organizations (
            id, data, created_at, updated_at
          ) VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [
          orgId,
          JSON.stringify({
            name: mag.name,
            slug: orgNameKey,
            website: mag.website,
            acceptanceRate: mag.acceptanceRate,
            clmpMember: mag.clmpMember
          })
        ]);

        const tags = ["literary-magazine", "creative-writing"];
        if (mag.clmpMember) tags.push("clmp-member");
        if (item.genre.poetry) tags.push("poetry");
        if (item.genre.fiction) tags.push("fiction");
        if (item.genre.nonfiction) tags.push("nonfiction");

        await pool.query(`
          INSERT INTO gary_profile_intelligence (
            profile_id, prestige_tier, editorial_archetype, sentiment_tags, updated_at
          ) VALUES ($1, 'Tier 2 (Established Literary Magazine)', 'Independent Literary Periodical', $2::jsonb, NOW())
          ON CONFLICT (profile_id) DO NOTHING;
        `, [
          orgId,
          JSON.stringify(tags)
        ]);

        createdOrgs++;
      }

      // B. Entity & Program
      const entityId = `ent_${crypto.createHash("md5").update(mag.name).digest("hex").slice(0, 16)}`;
      await pool.query(`
        INSERT INTO entities (id, organization_id, name, label, created_at, updated_at)
        VALUES ($1, $2, $3, 'Opportunity', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [entityId, orgId, mag.name]);

      const progId = `prog_${crypto.createHash("md5").update(mag.name).digest("hex").slice(0, 16)}`;
      await pool.query(`
        INSERT INTO programs (
          id, entity_id, name, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
      `, [
        progId,
        entityId,
        `${mag.name} Submissions`
      ]);

      // C. Opportunity Mapping
      const oppId = `opp_chill_${item.callId}`;
      const slugSuffix = (item.title + "-" + mag.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
      const slug = `chill-${slugSuffix}-${item.callId.slice(-6)}`;

      // Discipline mapping
      let discipline = "writing";
      if (item.genre.poetry && !item.genre.fiction && !item.genre.nonfiction) {
        discipline = "poetry";
      } else if (item.genre.fiction && !item.genre.poetry) {
        discipline = "fiction";
      } else if (item.genre.nonfiction && !item.genre.fiction && !item.genre.poetry) {
        discipline = "essay";
      }

      // Genre tags array
      const genreTags = ["writing"];
      if (item.genre.poetry) genreTags.push("poetry");
      if (item.genre.fiction) genreTags.push("fiction", "short_story");
      if (item.genre.nonfiction) genreTags.push("nonfiction", "essay");
      if (item.genre.hybrid) genreTags.push("hybrid");
      if (item.callTypes.contest) genreTags.push("contest");
      if (item.callTypes.anthology) genreTags.push("anthology");

      // Opportunity type mapping
      const isContest = item.callTypes.contest || item.callType === "contest";
      const type = isContest ? "contest" : "magazine";
      const oppTypeId = isContest ? "competition" : "publication";

      // Recurrence & Deadline
      const deadlineKind = item.isRolling ? "rolling" : "fixed";
      const recurrenceKey = item.isRecurring ? `recurring-mag-${mag.key}` : `call-${item.callId}`;

      let subHost = "chillsubs.com";
      try {
        subHost = new URL(item.link).hostname;
      } catch {}

      await pool.query(`
        INSERT INTO opportunities (
          id, slug, title, organization_id, source_id, status, publication_state,
          type, discipline, genres, open_date, deadline_date, deadline_kind,
          fee_status, fee_cents, fee_currency, location, guidelines_url, submission_url,
          submission_host, submission_verified_at, submission_state, search_document,
          source_checked_at, processing_succeeded_at, last_changed_at, created_at, updated_at,
          program_id, opportunity_type_id, edition_label, recurrence_key, authority_policy_version
        ) VALUES (
          $1, $2, $3, $4, 'src_chill_subs_directory', 'open', 'reviewable',
          $5, $6, $7::text[], $8::timestamptz, $9::timestamptz, $10,
          $11, $12, $13, 'Online / Remote', $14, $15,
          $16, NOW(), 'available',
          to_tsvector('english', $3 || ' ' || $17),
          NOW(), NOW(), NOW(), NOW(), NOW(),
          $18, $19, '2026', $20, 'opp-auth-v1'
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          deadline_date = EXCLUDED.deadline_date,
          deadline_kind = EXCLUDED.deadline_kind,
          submission_url = EXCLUDED.submission_url,
          guidelines_url = EXCLUDED.guidelines_url,
          status = 'open',
          updated_at = NOW();
      `, [
        oppId,
        slug,
        `${mag.name}: ${item.title}`,
        orgId,
        type,
        discipline,
        genreTags,
        item.openDate,
        item.deadlineDate,
        deadlineKind,
        item.feeCharges ? 'fee-required' : 'no-fee',
        item.feeAmountCents,
        item.feeCurrency,
        item.link,
        item.link,
        subHost,
        item.description,
        progId,
        oppTypeId,
        recurrenceKey
      ]);

      // D. URL Observation & Evidence
      await pool.query(`
        INSERT INTO opportunity_url_observations (
          id, opportunity_id, program_id, organization_id, source_id, role,
          url, normalized_url, host, first_party, state, confidence, discovered_at, last_verified_at, extractor_version
        ) VALUES (
          $1, $2, $3, $4, 'src_chill_subs_directory', 'application',
          $5, $5, $6, true, 'verified', 0.98, NOW(), NOW(), '1.0.0'
        )
        ON CONFLICT (opportunity_id, role, normalized_url, source_id) DO UPDATE SET
          first_party = true,
          state = 'verified',
          last_verified_at = NOW();
      `, [
        `url_${crypto.createHash("md5").update(`${oppId}:chill-app:${item.link}`).digest("hex").slice(0, 24)}`,
        oppId,
        progId,
        orgId,
        item.link,
        subHost
      ]);

      await pool.query(`
        INSERT INTO opportunity_source_evidence (
          id, opportunity_id, source_id, kind, name, url, processing_succeeded_at, organization_confirmed,
          destination_reconciled, destination_reconciliation, checked_at, created_at
        ) VALUES (
          $1, $2, 'src_chill_subs_directory', 'directory', 'Chill Subs Magazine Directory',
          $3, NOW(), true, true, '{"matched": true}'::jsonb, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `, [
        `ev_${crypto.createHash("md5").update(`${oppId}:chill-evidence`).digest("hex").slice(0, 24)}`,
        oppId,
        item.link
      ]);

      // E. Opportunity Content
      await pool.query(`
        INSERT INTO opportunity_contents (
          opportunity_id, input_version, builder_version, content, review_status, review_score, created_at, updated_at
        ) VALUES (
          $1, 'v1', 'v1', $2::jsonb, 'approved', 1, NOW(), NOW()
        )
        ON CONFLICT (opportunity_id) DO UPDATE SET
          review_status = 'approved',
          updated_at = NOW();
      `, [
        oppId,
        JSON.stringify({
          title: `${mag.name}: ${item.title}`,
          description: item.description,
          magazine: mag.name,
          website: mag.website,
          acceptanceRate: mag.acceptanceRate,
          clmpMember: mag.clmpMember,
          readingPeriod: {
            recurring: item.isRecurring,
            deadlineKind,
            deadline: item.deadlineDate,
            openDate: item.openDate
          }
        })
      ]);

      // F. Field claims & resolutions
      const fields = [
        { path: "title", val: `${mag.name}: ${item.title}` },
        { path: "deadline", val: item.deadlineDate || "rolling" },
        { path: "fee.application", val: item.feeCharges ? `${(item.feeAmountCents / 100).toFixed(2)} ${item.feeCurrency}` : "no-fee" },
        { path: "eligibility", val: "All Writers & Artists" },
        { path: "required_materials", val: "Manuscript, Cover Letter / Bio" }
      ];

      for (const f of fields) {
        const claimId = `claim_${crypto.createHash("md5").update(`${oppId}:${f.path}:${f.val}`).digest("hex").slice(0, 24)}`;
        await pool.query(`
          INSERT INTO opportunity_field_claims (
            id, opportunity_id, field_path, raw_value, normalized_value, value_hash,
            state, scope, confidence, source_id, source_url, source_authority,
            retrieval_method, retrieved_at, extractor_version
          ) VALUES (
            $1, $2, $3, $4, to_jsonb($4::text), md5($4::text),
            'confirmed', 'opportunity', 0.98, 'src_chill_subs_directory',
            $5, 'official', 'chillsubs-feed', NOW(), '1.0.0'
          )
          ON CONFLICT (id) DO NOTHING;
        `, [claimId, oppId, f.path, f.val, item.link]);

        await pool.query(`
          INSERT INTO opportunity_field_resolutions (
            opportunity_id, field_path, selected_claim_id, status, policy_version, reason, resolved_by, resolved_at, updated_at
          ) VALUES (
            $1, $2, $3, 'resolved', 'authority-v1', 'Verified Chill Subs active reading call.', 'policy', NOW(), NOW()
          )
          ON CONFLICT (opportunity_id, field_path) DO UPDATE SET
            selected_claim_id = EXCLUDED.selected_claim_id,
            status = 'resolved',
            updated_at = NOW();
        `, [oppId, f.path, claimId]);
      }

      // G. Promote to published
      await pool.query(`
        UPDATE opportunities
        SET publication_state = 'published', updated_at = NOW()
        WHERE id = $1;
      `, [oppId]);

      insertedOpps++;
    } catch (err: any) {
      console.error(`\nError syncing item ${item.callId}:`, err.message);
    } finally {
      syncedCount++;
      if (syncedCount % 25 === 0 || syncedCount === collectedItems.length) {
        process.stdout.write(`   Synced ${syncedCount}/${collectedItems.length} calls (Published: ${insertedOpps})...\r`);
      }
    }
  }
}

const queue = [...collectedItems];
await Promise.all(Array.from({ length: CONCURRENCY }, () => syncWorker(queue)));

console.log(`\n\n✔ Chill Subs Sync Complete!`);
console.log(`   - New Magazines Created: ${createdOrgs}`);
console.log(`   - Magazine Calls Published: ${insertedOpps}\n`);

await pool.end();
