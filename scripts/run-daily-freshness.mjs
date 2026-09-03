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
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
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

  // 3. OVERALL SYSTEM SUMMARY
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
