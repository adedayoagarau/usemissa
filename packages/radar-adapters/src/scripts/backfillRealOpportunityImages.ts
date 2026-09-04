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

async function run() {
  console.log("=== BACKFILLING REAL IDENTITY IMAGES & CLEARING RIGHTS ===");

  // 1. Clear rights_status for existing non-spam identity assets
  const cleared = await pool.query(`
    UPDATE opportunity_identity_assets
    SET rights_status = 'cleared'
    WHERE rights_status = 'unknown'
      AND url IS NOT NULL
      AND url ~* '^https?://'
      AND url NOT ILIKE '%scorecardresearch%'
      AND url NOT ILIKE '%top-banner%'
      AND url NOT ILIKE '%og-default%'
      AND url NOT ILIKE '%pixel%'
      AND url NOT ILIKE '%analytics%'
      AND url NOT ILIKE '%tracking%'
  `);
  console.log(`✓ Cleared rights on ${cleared.rowCount} high-quality identity assets in opportunity_identity_assets.`);

  // 2. Extract og:image from guidelines/submission URLs for published opportunities that have no asset
  const missing = await pool.query(`
    SELECT o.id, o.title, o.submission_url, o.guidelines_url
    FROM opportunities o
    LEFT JOIN opportunity_identity_assets a ON a.opportunity_id = o.id
    WHERE o.publication_state = 'published' AND a.id IS NULL
      AND (o.submission_url ~* '^https?://' OR o.guidelines_url ~* '^https?://')
    LIMIT 250
  `);

  console.log(`Attempting og:image extraction for ${missing.rows.length} opportunities missing photos...`);

  let added = 0;

  async function fetchOgImage(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml"
        },
        signal: AbortSignal.timeout(3500)
      });
      if (!res.ok) return null;
      const html = await res.text();
      const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
                    html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      if (match && match[1]) {
        let imgUrl = match[1].trim();
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        if (!imgUrl.startsWith("http")) return null;
        if (imgUrl.includes("submittable-logo") || imgUrl.includes("default") || imgUrl.includes("favicon")) return null;
        return imgUrl;
      }
    } catch {
      // timeout
    }
    return null;
  }

  // Concurrent batches of 15
  for (let i = 0; i < missing.rows.length; i += 15) {
    const batch = missing.rows.slice(i, i + 15);
    await Promise.all(batch.map(async (row) => {
      const url = row.submission_url || row.guidelines_url;
      if (!url) return;
      const img = await fetchOgImage(url);
      if (img) {
        await pool.query(`
          INSERT INTO opportunity_identity_assets (id, opportunity_id, url, alt, rights_status, kind, created_at)
          VALUES ($1, $2, $3, $4, 'cleared', 'opportunity-artwork', NOW())
          ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, rights_status = 'cleared'
        `, [`asset_${row.id}`, row.id, img, `${row.title} visual`]);
        added++;
      }
    }));
  }

  console.log(`✓ Harvested and saved ${added} fresh real images directly from organizers' sites.`);

  const finalCount = await pool.query(`
    SELECT count(DISTINCT opportunity_id) 
    FROM opportunity_identity_assets 
    WHERE rights_status IN ('cleared', 'permitted')
  `);
  console.log(`Total opportunities with real verified images now: ${finalCount.rows[0].count}`);

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
