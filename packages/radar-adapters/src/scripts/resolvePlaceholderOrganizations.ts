import fs from "node:fs";
import pg from "pg";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    dbUrl = match[1].trim().replace(/^["']|["']$/g, "");
    break;
  }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl, max: 10 });

function cleanExtractedName(raw: string): string | null {
  if (!raw) return null;
  let name = raw
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  // If it's a page title with separator like "Submit | North American Review" or "Home - SXSW"
  if (name.includes(" | ")) {
    const parts = name.split(" | ");
    name = parts[parts.length - 1].trim();
  } else if (name.includes(" - ")) {
    const parts = name.split(" - ");
    name = parts[parts.length - 1].trim();
  } else if (name.includes(" — ")) {
    const parts = name.split(" — ");
    name = parts[parts.length - 1].trim();
  } else if (name.includes(" :: ")) {
    const parts = name.split(" :: ");
    name = parts[parts.length - 1].trim();
  }

  // Strip common junk prefixes/suffixes
  name = name.replace(/^(Home|Welcome to|About|Submit to|Apply for)\s+/i, "");
  name = name.replace(/\s+(Official Website|Official Site|Home Page|Homepage)$/i, "");

  if (name.length < 3 || name.length > 80) return null;
  if (/^(404|403|not found|access denied|not acceptable|just another wordpress site)/i.test(name)) return null;

  return name.trim();
}

async function fetchOrgName(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. og:site_name
    const siteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i);
    if (siteNameMatch && siteNameMatch[1]) {
      const cleaned = cleanExtractedName(siteNameMatch[1]);
      if (cleaned) return cleaned;
    }

    // 2. Schema.org Organization name
    const schemaOrgMatch = html.match(/"@type"\s*:\s*"Organization"[^}]+"name"\s*:\s*"([^"]+)"/i);
    if (schemaOrgMatch && schemaOrgMatch[1]) {
      const cleaned = cleanExtractedName(schemaOrgMatch[1]);
      if (cleaned) return cleaned;
    }

    // 3. Document title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const cleaned = cleanExtractedName(titleMatch[1]);
      if (cleaned) return cleaned;
    }
  } catch {
    // timeout / unreachable
  }
  return null;
}

async function run() {
  console.log("=== RESOLVING PLACEHOLDER ORGANIZATION NAMES ===");

  const placeholders = [
    'creative organization',
    'www',
    'ec',
    'org',
    'submittable',
    'unknown',
    'default'
  ];

  // Fetch all radar_organizations with placeholder names that have a websiteUrl
  const orgs = await pool.query(`
    SELECT id, data
    FROM radar_organizations
    WHERE (lower(trim(data->>'name')) = ANY($1) 
       OR length(trim(data->>'name')) <= 3
       OR data->>'name' ILIKE 'creative-organization%'
       OR data->>'name' ILIKE 'org-%')
      AND data->>'websiteUrl' ~* '^https?://'
  `, [placeholders]);

  console.log(`Found ${orgs.rows.length} radar_organizations with placeholder names and valid URLs.`);

  let resolved = 0;
  const batchSize = 15;

  for (let i = 0; i < orgs.rows.length; i += batchSize) {
    const batch = orgs.rows.slice(i, i + batchSize);
    await Promise.all(batch.map(async (row) => {
      const data = row.data;
      const url = data.websiteUrl;
      const discoveredName = await fetchOrgName(url);
      if (discoveredName && discoveredName !== data.name) {
        data.name = discoveredName;
        await pool.query(
          `UPDATE radar_organizations SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(data), row.id]
        );
        console.log(`  ✓ Resolved [${row.id}]: "${discoveredName}" (from ${url})`);
        resolved++;
      }
    }));
    process.stdout.write(`Progress: ${Math.min(i + batchSize, orgs.rows.length)}/${orgs.rows.length} (Resolved: ${resolved})\r`);
  }

  console.log(`\nSuccessfully resolved and updated ${resolved} organization names in PostgreSQL.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
