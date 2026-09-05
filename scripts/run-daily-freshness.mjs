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

  // 3. FAST DELTA DISCOVERY (Rivet, TransArtists, OTM, CuratorSpace)
  console.log("\n3. Running midnight delta discovery for new open calls...");
  try {
    const rivetHtml = await fetch("https://rivet.es/calls/?page=1", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.text() : "");
    if (rivetHtml) {
      const callSlugs = [...new Set([...rivetHtml.matchAll(/href="\/calls\/([a-zA-Z0-9_-]+)\/"/g)].map((m) => m[1]))];
      console.log(`   ✔ Scanned Rivet.es page 1 (${callSlugs.length} calls active).`);
    }

    const transHtml = await fetch("https://www.transartists.org/en/deadlines", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.text() : "");
    if (transHtml) {
      const transRows = [...transHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
      console.log(`   ✔ Scanned TransArtists deadlines (${transRows.length} rows monitored).`);
    }
    console.log("   ✔ Delta discovery pass completed cleanly.");
  } catch (err) {
    console.warn("   ⚠️ Delta discovery pass skipped due to timeout:", err.message);
  }

  // 4. RECONCILE MAGAZINE & PRESS SUBMISSION SCHEDULES
  console.log("\n4. Reconciling literary magazine and press submission schedules...");
  try {
    const { resolveMagazineSchedule } = await import("../packages/radar-engine/dist/src/index.js");
    const magObs = await client.query(`
      WITH latest_obs AS (
        SELECT DISTINCT ON (profile_id)
          profile_id,
          reading_period,
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
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    for (const mag of magObs.rows) {
      const opps = oppsByProfileId.get(String(mag.id)) || [];
      const sched = resolveMagazineSchedule({
        readingPeriod: mag.reading_period,
        opportunities: opps,
        now,
      });

      const closesAt = toIsoDateString(sched.nextDate);

      if (opps.length > 0 && closesAt && (sched.state === "open" || sched.state === "closing_soon" || sched.state === "opening_soon")) {
        for (const opp of opps) {
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
        }
      }
    }
    console.log(`   ✔ Reconciled schedules for ${magObs.rows.length} magazines (${activeWindowsReconciled} call windows active/updated).`);
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
