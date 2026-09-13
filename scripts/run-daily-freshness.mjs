import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// 1. Load DATABASE_URL
const possibleEnvFiles = [
  "/Volumes/Crucial X10/usemissa/.env.local",
  path.resolve(".env.local"),
  path.resolve("../.env.local")
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
console.log("             MISSA RADAR DAILY FRESHNESS & LIFECYCLE RECONCILER                 ");
console.log("================================================================================\n");

try {
  // 1. RECONCILE EXPIRED DEADLINES
  console.log("1. Checking for expired deadlines in 'published' state...");
  const expiredRes = await client.query(`
    UPDATE opportunities
    SET status = 'closed',
        last_changed_at = now(),
        updated_at = now()
    WHERE deadline_date < CURRENT_DATE
      AND status IN ('open', 'closing-soon', 'deadline-extended')
    RETURNING id, title, deadline_date::text;
  `);

  if (expiredRes.rowCount > 0) {
    console.log(`   ✔ Successfully auto-closed ${expiredRes.rowCount} expired opportunities:`);
    for (const row of expiredRes.rows) {
      console.log(`     • [${row.deadline_date}] ${row.title} (${row.id})`);
    }
  } else {
    console.log("   ✔ Zero expired published opportunities found. All deadlines active!");
  }

  // 2. HEALTH CHECK & URL FRESHNESS PING (Batch of 50 stale opportunities)
  console.log("\n2. Re-verifying source URLs for stale opportunities...");
  const staleBatch = await client.query(`
    SELECT id, title, guidelines_url
    FROM opportunities
    WHERE publication_state = 'published'
      AND status = 'open'
      AND guidelines_url IS NOT NULL
      AND (source_checked_at IS NULL OR source_checked_at < now() - interval '7 days')
    ORDER BY source_checked_at ASC NULLS FIRST
    LIMIT 50;
  `);

  console.log(`   Selected ${staleBatch.rows.length} stale opportunities to verify.`);
  let verifiedCount = 0;
  let closedDeadCount = 0;

  for (const opp of staleBatch.rows) {
    try {
      const res = await fetch(opp.guidelines_url, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok || res.status === 403 || res.status === 405) {
        // Source URL is alive
        await client.query(`
          UPDATE opportunities 
          SET source_checked_at = now(), updated_at = now() 
          WHERE id = $1;
        `, [opp.id]);
        verifiedCount++;
      } else if (res.status === 404 || res.status === 410) {
        // Destination URL is dead/gone -> transition status to 'closed'
        console.log(`   ⚠️ Destination 404 (Auto-closing): ${opp.title} -> ${opp.guidelines_url}`);
        await client.query(`
          UPDATE opportunities
          SET status = 'closed',
              source_checked_at = now(),
              last_changed_at = now(),
              updated_at = now()
          WHERE id = $1;
        `, [opp.id]);
        closedDeadCount++;
      }
    } catch {
      // Network hiccup; ignore politely
    }
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`   ✔ Verified source freshness for ${verifiedCount} opportunities.`);
  if (closedDeadCount > 0) {
    console.log(`   ✔ Auto-closed ${closedDeadCount} opportunities with confirmed dead/404 destination links.`);
  }

  // 3. MULTI-PORTAL DELTA HARVESTER & AUTO-PUBLISHER
  console.log("\n3. Running multi-portal delta harvesting for new opportunities...");

  function cleanSlug(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140);
  }

  let deltaPublished = 0;

  // 3A. SUBMITTABLE DISCOVER API DELTA (Pages 1-3)
  console.log("   [Submittable API] Polling recent open calls...");
  try {
    for (let page = 1; page <= 3; page++) {
      const submRes = await fetch(`https://manager.submittable.com/api/opportunities/?page=${page}&size=20`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*"
        },
        signal: AbortSignal.timeout(6000)
      });
      if (submRes.ok) {
        const data = await submRes.json();
        const items = data.items || [];
        for (const item of items) {
          const oppId = `opp_subm_${item.id}`;
          const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
          if (exists.rows.length === 0) {
            const orgName = item.organization?.name || "Submittable Organization";
            const title = item.name ? String(item.name).trim() : "Submittable Opportunity";
            const deadline = item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : null;
            const subUrl = item.organization?.subdomain
              ? `https://${item.organization.subdomain}.submittable.com/submit/${item.id}`
              : `https://manager.submittable.com/opportunities/discover/${item.id}`;
            const searchDoc = `${title} ${orgName} creative writing submissions grants fellowships art call submittable`;

            await client.query(`
              INSERT INTO opportunities (
                id, slug, title, source_id, status, publication_state, type, discipline, genres,
                deadline_date, deadline_kind, fee_status, guidelines_url, submission_url,
                submission_state, search_document, created_at, updated_at
              ) VALUES (
                $1, $2, $3, 'src_submittable_directory', 'open', 'published', 'call', 'multidisciplinary',
                ARRAY['Writing', 'Visual Art', 'Fellowship', 'Grant']::text[],
                $4::date, $5, 'unknown', $6, $6,
                'available', $7, now(), now()
              ) ON CONFLICT (id) DO NOTHING;
            `, [
              oppId,
              `${cleanSlug(title)}-${item.id}`.slice(0, 140),
              title,
              deadline,
              deadline ? 'exact' : 'rolling',
              subUrl,
              searchDoc
            ]);
            console.log(`     ✨ [Submittable] Auto-published new call: "${title}" (${orgName})`);
            deltaPublished++;
          }
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (err) {
    console.warn("     ⚠️ Submittable delta harvester notice:", err.message);
  }

  // 3B. RES ARTIS RESIDENCY LISTINGS DELTA
  console.log("   [Res Artis] Checking recent international residency listings...");
  try {
    const resArtisHtml = await fetch("https://resartis.org/listings/", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(6000)
    }).then(r => r.ok ? r.text() : "");

    if (resArtisHtml) {
      const listingSlugs = [...new Set([...resArtisHtml.matchAll(/href="https:\/\/resartis\.org\/listings\/([a-zA-Z0-9_-]+)\/"/g)].map(m => m[1]))];
      for (const slug of listingSlugs.slice(0, 20)) {
        const oppId = `opp_resartis_${slug.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 120);
        const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
        if (exists.rows.length === 0) {
          const titleName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          const title = `${titleName} Residency Program`;
          const url = `https://resartis.org/listings/${slug}/`;
          const searchDoc = `${title} international artist residency studio housing visual arts multidisciplinary res artis`;

          await client.query(`
            INSERT INTO opportunities (
              id, slug, title, source_id, status, publication_state, type, discipline, genres,
              deadline_kind, fee_status, guidelines_url, submission_url,
              submission_state, search_document, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'src_res_artis_open_calls', 'open', 'published', 'residency', 'residency',
              ARRAY['Residency', 'Visual Art', 'Studio', 'International']::text[],
              'rolling', 'no-fee', $4, $4,
              'available', $5, now(), now()
            ) ON CONFLICT (id) DO NOTHING;
          `, [
            oppId,
            `${cleanSlug(slug)}-residency`.slice(0, 140),
            title,
            url,
            searchDoc
          ]);
          console.log(`     ✨ [Res Artis] Auto-published new residency: "${title}"`);
          deltaPublished++;
        }
      }
    }
  } catch (err) {
    console.warn("     ⚠️ Res Artis delta harvester notice:", err.message);
  }

  // 3C. RIVET.ES RESIDENCY RADAR DELTA
  console.log("   [Rivet] Checking recent global residency calls...");
  try {
    const rivetHtml = await fetch("https://rivet.es/calls/?page=1", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(6000),
    }).then(r => r.ok ? r.text() : "");

    if (rivetHtml) {
      const callSlugs = [...new Set([...rivetHtml.matchAll(/href="\/calls\/([a-zA-Z0-9_-]+)\/"/g)].map((m) => m[1]))];
      for (const slug of callSlugs.slice(0, 15)) {
        const oppId = `opp_rivet_${slug.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 120);
        const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
        if (exists.rows.length === 0) {
          const titleName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          const title = `${titleName} Open Call`;
          const url = `https://rivet.es/calls/${slug}/`;
          const searchDoc = `${title} rivet artist residency international call studio grant`;

          await client.query(`
            INSERT INTO opportunities (
              id, slug, title, source_id, status, publication_state, type, discipline, genres,
              deadline_kind, fee_status, guidelines_url, submission_url,
              submission_state, search_document, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'src_rivet_directory', 'open', 'published', 'residency', 'residency',
              ARRAY['Residency', 'Visual Art', 'Studio', 'International']::text[],
              'rolling', 'no-fee', $4, $4,
              'available', $5, now(), now()
            ) ON CONFLICT (id) DO NOTHING;
          `, [
            oppId,
            `${cleanSlug(slug)}-rivet`.slice(0, 140),
            title,
            url,
            searchDoc
          ]);
          console.log(`     ✨ [Rivet] Auto-published new call: "${title}"`);
          deltaPublished++;
        }
      }
    }
  } catch (err) {
    console.warn("     ⚠️ Rivet delta harvester notice:", err.message);
  }

  // 3D. TRANSARTISTS AIR DEADLINES DELTA
  console.log("   [TransArtists] Checking upcoming European & global AIR deadlines...");
  try {
    const transHtml = await fetch("https://www.transartists.org/en/deadlines", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(6000),
    }).then(r => r.ok ? r.text() : "");

    if (transHtml) {
      const transRows = [...transHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
      for (const r of transRows.slice(0, 15)) {
        const linkM = r[1].match(/href="\/en\/air\/([^"]+)"/i);
        const nameM = r[1].match(/<a[^>]*>([^<]+)<\/a>/i);
        if (linkM) {
          const slug = linkM[1];
          const oppId = `opp_ta_${slug.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 120);
          const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
          if (exists.rows.length === 0) {
            const rawName = nameM ? nameM[1].trim() : slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            const title = `${rawName} Residency`;
            const url = `https://www.transartists.org/en/air/${slug}`;
            const searchDoc = `${title} transartists dutchculture artist in residence international program`;

            await client.query(`
              INSERT INTO opportunities (
                id, slug, title, source_id, status, publication_state, type, discipline, genres,
                deadline_kind, fee_status, guidelines_url, submission_url,
                submission_state, search_document, created_at, updated_at
              ) VALUES (
                $1, $2, $3, 'src_transartists_directory', 'open', 'published', 'residency', 'residency',
                ARRAY['Residency', 'Visual Art', 'AIR', 'International']::text[],
                'rolling', 'no-fee', $4, $4,
                'available', $5, now(), now()
              ) ON CONFLICT (id) DO NOTHING;
            `, [
              oppId,
              `${cleanSlug(slug)}-air`.slice(0, 140),
              title,
              url,
              searchDoc
            ]);
            console.log(`     ✨ [TransArtists] Auto-published new AIR call: "${title}"`);
            deltaPublished++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("     ⚠️ TransArtists delta harvester notice:", err.message);
  }

  // 3E. CURATORSPACE VISUAL ARTS & EXHIBITION DELTA
  console.log("   [CuratorSpace] Checking recent exhibition & open calls...");
  try {
    const csHtml = await fetch("https://www.curatorspace.com/opportunities", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(6000)
    }).then(r => r.ok ? r.text() : "");

    if (csHtml) {
      const csLinks = [...new Set([...csHtml.matchAll(/href="\/opportunities\/detail\/([^"]+)"/g)].map((m) => m[1]))];
      for (const slug of csLinks.slice(0, 15)) {
        const oppId = `opp_cs_${slug.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 120);
        const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
        if (exists.rows.length === 0) {
          const titleName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          const title = `${titleName}`;
          const url = `https://www.curatorspace.com/opportunities/detail/${slug}`;
          const searchDoc = `${title} curatorspace exhibition open call visual arts gallery commission`;

          await client.query(`
            INSERT INTO opportunities (
              id, slug, title, source_id, status, publication_state, type, discipline, genres,
              deadline_kind, fee_status, guidelines_url, submission_url,
              submission_state, search_document, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'src_curatorspace_directory', 'open', 'published', 'exhibition', 'visual_arts',
              ARRAY['Exhibition', 'Visual Art', 'Gallery', 'Open Call']::text[],
              'rolling', 'no-fee', $4, $4,
              'available', $5, now(), now()
            ) ON CONFLICT (id) DO NOTHING;
          `, [
            oppId,
            `${cleanSlug(slug)}-cs`.slice(0, 140),
            title,
            url,
            searchDoc
          ]);
          console.log(`     ✨ [CuratorSpace] Auto-published new exhibition call: "${title}"`);
          deltaPublished++;
        }
      }
    }
  } catch (err) {
    console.warn("     ⚠️ CuratorSpace delta harvester notice:", err.message);
  }

  console.log(`   ✔ Multi-portal delta pass complete (${deltaPublished} newly discovered opportunities auto-published).`);

  // 4. RECONCILE MAGAZINE & PRESS SUBMISSION SCHEDULES & AUTO-MATERIALIZE
  console.log("\n4. Reconciling literary magazine and press submission schedules...");
  try {
    const { resolveMagazineSchedule } = await import("../packages/radar-engine/dist/src/index.js");

    function slugify(text) {
      return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 140);
    }

    // Ensure default curated magazine source exists
    await client.query(`
      INSERT INTO opportunity_sources (
        id, name, kind, url, authority_kind, health_status, trust_status, trust_score, active, check_interval_hours, created_at, updated_at
      ) VALUES (
        'src_missa_magazines', 'Missa Magazine Directory', 'directory', 'https://usemissa.com/directory', 'directory', 'healthy', 'curated', 100, true, 24, now(), now()
      ) ON CONFLICT (id) DO UPDATE SET updated_at = now();
    `);

    const magObs = await client.query(`
      WITH latest_obs AS (
        SELECT DISTINCT ON (profile_id)
          profile_id,
          reading_period,
          reading_fee,
          payment,
          source_detail_url,
          website_url,
          submission_guidelines_url
        FROM gary_profile_observations
        ORDER BY profile_id, observed_at DESC
      )
      SELECT
        p.id,
        p.name,
        p.profile_kind,
        o.reading_period,
        o.reading_fee,
        o.payment,
        o.source_detail_url,
        COALESCE(o.submission_guidelines_url, o.website_url, 'https://usemissa.com') as source_url
      FROM gary_profiles p
      JOIN latest_obs o ON o.profile_id = p.id
      WHERE p.profile_kind IN ('literary_magazine', 'small_press');
    `);

    function toIsoDateString(val) {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return null;
    }

    const allLinksRes = await client.query(`
      SELECT
        l.profile_id,
        o.id,
        o.title,
        o.status,
        o.deadline_date::text as deadline
      FROM opportunity_profile_links l
      JOIN opportunities o ON o.id = l.opportunity_id
      WHERE l.status = 'confirmed'
    `);
    const oppsByProfileId = new Map();
    for (const opp of allLinksRes.rows) {
      const pid = String(opp.profile_id);
      if (!oppsByProfileId.has(pid)) oppsByProfileId.set(pid, []);
      oppsByProfileId.get(pid).push({
        id: String(opp.id),
        title: String(opp.title),
        status: String(opp.status),
        deadline: toIsoDateString(opp.deadline),
      });
    }

    let activeWindowsReconciled = 0;
    let autoMaterializedCount = 0;
    let openingAlertsDispatched = 0;
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    for (const mag of magObs.rows) {
      let opps = oppsByProfileId.get(String(mag.id)) || [];
      const sched = resolveMagazineSchedule({
        readingPeriod: mag.reading_period,
        opportunities: opps,
        now,
      });

      const closesAt = toIsoDateString(sched.nextDate);
      const shouldBeFindable =
        sched.state === "always_open" ||
        sched.state === "open" ||
        sched.state === "closing_soon" ||
        sched.state === "opening_soon";

      // 4A. Auto-materialize opportunity if not yet linked and magazine is active/upcoming
      if (opps.length === 0 && shouldBeFindable) {
        try {
          const rawId = String(mag.id).replace(/[^a-zA-Z0-9_-]/g, "");
          const oppId = `opp_mag_${rawId}`;
          const oppSlug = `${slugify(mag.name)}-submissions`.slice(0, 140);
          const oppTitle = `${mag.name} – Submissions`;
          const targetStatus =
            sched.state === "opening_soon" ? "opening-soon" :
            sched.state === "closing_soon" ? "closing-soon" : "open";
          const deadlineDate = sched.state === "always_open" ? null : closesAt;
          const deadlineKind =
            sched.windowKind === "year-round" || sched.windowKind === "rolling"
              ? "rolling"
              : (deadlineDate ? "exact" : "unknown");

          let feeStatus = "unknown";
          let feeCents = null;
          const feeStr = String(mag.reading_fee || "").toLowerCase();
          if (feeStr.includes("no fee") || feeStr.includes("free") || feeStr === "0" || feeStr === "$0") {
            feeStatus = "no-fee";
            feeCents = 0;
          } else if (feeStr.includes("$") || feeStr.includes("fee")) {
            feeStatus = "paid";
            const numMatch = feeStr.match(/\$(\d+)/);
            if (numMatch) feeCents = parseInt(numMatch[1], 10) * 100;
          }

          const searchDoc = `${mag.name} literary magazine poetry fiction nonfiction essay writing submission calls reading period ${sched.badgeLabel}`;

          await client.query(`
            INSERT INTO opportunities (
              id, slug, title, source_id, status, publication_state, type, discipline, genres,
              open_date, deadline_date, deadline_kind, fee_status, fee_cents, guidelines_url, submission_url,
              submission_state, search_document, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'src_missa_magazines', $4, 'published', 'magazine', 'literature',
              ARRAY['Fiction', 'Poetry', 'Nonfiction', 'Literary Magazine']::text[],
              $5::date, $6::date, $7, $8, $9, $10, $10,
              'available', $11, now(), now()
            ) ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              publication_state = 'published',
              open_date = EXCLUDED.open_date,
              deadline_date = EXCLUDED.deadline_date,
              deadline_kind = EXCLUDED.deadline_kind,
              fee_status = EXCLUDED.fee_status,
              fee_cents = COALESCE(EXCLUDED.fee_cents, opportunities.fee_cents),
              guidelines_url = COALESCE(EXCLUDED.guidelines_url, opportunities.guidelines_url),
              submission_url = COALESCE(EXCLUDED.submission_url, opportunities.submission_url),
              updated_at = now();
          `, [
            oppId,
            oppSlug,
            oppTitle,
            targetStatus,
            todayIso,
            deadlineDate,
            deadlineKind,
            feeStatus,
            feeCents,
            mag.source_url,
            searchDoc,
          ]);

          const linkId = `link_${mag.id}_${oppId}`.slice(0, 120);
          await client.query(`
            INSERT INTO opportunity_profile_links (
              id, profile_id, opportunity_id, status, confidence, verified_at, created_at, updated_at
            ) VALUES (
              $1, $2, $3, 'confirmed', 'confirmed', now(), now(), now()
            ) ON CONFLICT (profile_id, opportunity_id) DO UPDATE SET
              status = 'confirmed',
              updated_at = now();
          `, [linkId, mag.id, oppId]);

          opps = [{
            id: oppId,
            title: oppTitle,
            status: targetStatus,
            deadline: deadlineDate,
          }];
          oppsByProfileId.set(String(mag.id), opps);
          autoMaterializedCount++;
        } catch {
          // Continue
        }
      }

      // 4B. Sync call profiles and temporal windows for linked opportunities
      if (opps.length > 0) {
        for (const opp of opps) {
          try {
            await client.query(`
              INSERT INTO opportunity_call_profiles (
                opportunity_id,
                call_kind,
                market_kind,
                publication_formats,
                accepted_formats,
                subgenres,
                reading_period_kind,
                reading_period_label,
                payment_type,
                reprints_allowed,
                previously_unpublished_required,
                multiple_submissions_allowed,
                confidence,
                source_url,
                metadata,
                created_at,
                updated_at
              ) VALUES (
                $1,
                'general-submission',
                'journal',
                ARRAY['print', 'online']::text[],
                ARRAY['Fiction', 'Poetry', 'Nonfiction']::text[],
                ARRAY[]::text[],
                $2,
                $3,
                'token',
                false,
                true,
                true,
                'probable',
                $4,
                '{}'::jsonb,
                now(),
                now()
              )
              ON CONFLICT (opportunity_id) DO UPDATE SET
                reading_period_kind = EXCLUDED.reading_period_kind,
                reading_period_label = EXCLUDED.reading_period_label,
                updated_at = now();
            `, [
              opp.id,
              sched.windowKind,
              sched.badgeLabel,
              mag.source_url,
            ]);
          } catch {
            // Silently continue
          }

          if (closesAt && (sched.state === "open" || sched.state === "closing_soon" || sched.state === "opening_soon")) {
            try {
              const windowId = `win:sched:${opp.id}`;
              await client.query(`
                INSERT INTO opportunity_call_windows (
                  id, opportunity_id, label, opens_at, closes_at, kind, timezone, current, source_url, confidence, created_at, updated_at
                ) VALUES ($1, $2, $3, $4::date, $5::date, $6, 'America/New_York', true, $7, 'probable', now(), now())
                ON CONFLICT (id) DO UPDATE SET
                  closes_at = EXCLUDED.closes_at,
                  label = EXCLUDED.label,
                  current = EXCLUDED.current,
                  updated_at = now();
              `, [
                windowId,
                opp.id,
                `Reading Window: ${sched.badgeLabel}`,
                todayIso,
                closesAt,
                sched.windowKind,
                mag.source_url,
              ]);
              activeWindowsReconciled++;

              // 4C. Emit alert outbox event if newly open today
              if (sched.state === "open" || sched.state === "closing_soon") {
                const eventKey = `opp_open_${opp.id}_${todayIso}`;
                const outboxRes = await client.query(`
                  INSERT INTO outbox_events (
                    topic, aggregate_type, aggregate_id, event_key, payload, status, available_at, created_at
                  ) VALUES (
                    'opportunity.opened',
                    'opportunity',
                    $1,
                    $2,
                    $3::jsonb,
                    'pending',
                    now(),
                    now()
                  )
                  ON CONFLICT (event_key) DO NOTHING
                  RETURNING id;
                `, [
                  opp.id,
                  eventKey,
                  JSON.stringify({
                    opportunityId: opp.id,
                    title: opp.title,
                    magazineName: mag.name,
                    opensAt: todayIso,
                    closesAt,
                    badgeLabel: sched.badgeLabel,
                    sourceUrl: mag.source_url,
                  }),
                ]);
                if (outboxRes.rowCount > 0) openingAlertsDispatched++;
              }
            } catch {
              // Silently continue
            }
          }
        }
      }
    }
    console.log(`   ✔ Reconciled schedules for ${magObs.rows.length} magazines:`);
    console.log(`     • ${autoMaterializedCount} opportunities auto-materialized`);
    console.log(`     • ${activeWindowsReconciled} call windows active/updated`);
    console.log(`     • ${openingAlertsDispatched} opening alerts queued in outbox`);
  } catch (err) {
    console.warn("   ⚠️ Magazine schedule reconciliation notice:", err.message);
  }

  // 5. OVERALL SYSTEM SUMMARY
  const summary = await client.query(`
    SELECT 
      COUNT(*) FILTER (WHERE publication_state = 'published' AND status = 'open') as active_open,
      COUNT(*) FILTER (WHERE publication_state = 'published' AND status = 'closed') as published_closed,
      COUNT(*) FILTER (WHERE publication_state = 'published' AND deadline_date >= CURRENT_DATE) as upcoming_deadlines,
      COUNT(*) FILTER (WHERE publication_state = 'published' AND deadline_date IS NULL) as rolling_open
    FROM opportunities;
  `);

  const s = summary.rows[0];
  console.log("\n================================================================================");
  console.log("                        FRESHNESS RECONCILIATION SUMMARY                        ");
  console.log("================================================================================");
  console.log(`  • Active Open Opportunities:        ${s.active_open}`);
  console.log(`  • Upcoming Explicit Deadlines:     ${s.upcoming_deadlines}`);
  console.log(`  • Rolling / Year-Round Openings:    ${s.rolling_open}`);
  console.log(`  • Recently Closed Opportunities:    ${s.published_closed}`);
  console.log("================================================================================\n");

} finally {
  await client.end();
}
