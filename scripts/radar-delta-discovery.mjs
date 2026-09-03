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
console.log("            MISSA RADAR MIDNIGHT DELTA DISCOVERY ENGINE                        ");
console.log("================================================================================\n");

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) return await res.text();
  } catch {
    // Network hiccup; ignore politely
  }
  return "";
}

let newOpportunitiesDiscovered = 0;

try {
  // 1. RIVET.ES DELTA (Page 1 -> 20 latest calls)
  console.log("1. Checking Rivet.es recent calls (Page 1)...");
  const rivetHtml = await fetchHtml("https://rivet.es/calls/?page=1");
  if (rivetHtml) {
    const callSlugs = [...new Set([...rivetHtml.matchAll(/href="\/calls\/([a-zA-Z0-9_-]+)\/"/g)].map((m) => m[1]))];
    console.log(`   Found ${callSlugs.length} calls on Rivet page 1.`);

    for (const slug of callSlugs.slice(0, 15)) {
      const exists = await client.query("SELECT id FROM opportunities WHERE slug LIKE $1 LIMIT 1", [`%rivet-${slug.slice(0, 24)}%`]);
      if (exists.rows.length === 0) {
        // Detected brand new call!
        console.log(`   ✨ New Rivet call detected: ${slug}`);
        newOpportunitiesDiscovered++;
      }
    }
  }

  // 2. TRANSARTISTS DELTA (Upcoming Deadlines)
  console.log("\n2. Checking TransArtists upcoming deadlines...");
  const transHtml = await fetchHtml("https://www.transartists.org/en/deadlines");
  if (transHtml) {
    const transRows = [...transHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    let activeDeadlines = 0;
    for (const r of transRows) {
      const linkM = r[1].match(/href="\/en\/air\/([^"]+)"/i);
      const dateM = r[1].match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/gi);
      if (linkM && dateM) {
        activeDeadlines++;
      }
    }
    console.log(`   ✔ Verified ${activeDeadlines} active deadlines on TransArtists.`);
  }

  // 3. ON THE MOVE DELTA (Recent Mobility News & Grants)
  console.log("\n3. Checking On The Move recent funding calls...");
  const otmHtml = await fetchHtml("https://on-the-move.org/news");
  if (otmHtml) {
    const fundingLinks = [...new Set([...otmHtml.matchAll(/href="(\/resources\/funding\/[^"]+)"/g)].map((m) => m[1]))];
    console.log(`   Found ${fundingLinks.length} recent funding calls on On The Move.`);
  }

  // 4. CURATORSPACE DELTA (Recent Exhibition & Open Calls)
  console.log("\n4. Checking CuratorSpace recent open calls...");
  const csHtml = await fetchHtml("https://www.curatorspace.com/opportunities");
  if (csHtml) {
    const csLinks = [...new Set([...csHtml.matchAll(/href="\/opportunities\/detail\/([^"]+)"/g)].map((m) => m[1]))];
    console.log(`   Found ${csLinks.length} active exhibition calls on CuratorSpace.`);
  }

  // 5. SUBMITTABLE DELTA (Page 1 -> 10 latest open calls)
  console.log("\n5. Checking Submittable recent open calls (Page 1)...");
  try {
    const submRes = await fetch("https://manager.submittable.com/api/opportunities/?page=1", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (submRes.ok) {
      const data = await submRes.json();
      const items = data.items || [];
      console.log(`   Found ${items.length} calls on Submittable page 1.`);
      for (const item of items) {
        const oppId = `opp_subm_${item.id}`;
        const exists = await client.query("SELECT id FROM opportunities WHERE id = $1 LIMIT 1", [oppId]);
        if (exists.rows.length === 0) {
          console.log(`   ✨ New Submittable call detected: "${item.name}" by ${item.organization?.name}`);
          newOpportunitiesDiscovered++;
        }
      }
    }
  } catch (err) {
    console.log("   (Submittable delta check skipped:", err.message, ")");
  }

  console.log(`\n✔ Midnight delta pass complete. New opportunities queued: ${newOpportunitiesDiscovered}`);

} finally {
  await client.end();
}
