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

console.log("=== ENRICHING OPPORTUNITY BODY TEXT & GUIDELINES ===");

// Helper to decode HTML entities
function decodeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

// Extract rich description from HTML
function extractDescription(html: string): string {
  if (!html) return "";

  // 1. og:description
  const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);

  let desc = "";
  if (ogMatch && ogMatch[1]) {
    desc = decodeHtml(ogMatch[1]);
  }

  // Filter out boilerplate platform descriptions
  const boilerplate = [
    "accept and curate digital content",
    "powered by submittable",
    "the premier submission platform",
    "find submission opportunities"
  ];
  const isBoilerplate = boilerplate.some(b => desc.toLowerCase().includes(b) && desc.length < 150);
  if (!isBoilerplate && desc.length > 80) {
    return desc;
  }

  // 2. Body description containers
  const bodyMatch = html.match(/<div[^>]*class="[^"]*(?:form-description|instructions|description|field__item)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bodyMatch && bodyMatch[1]) {
    const text = decodeHtml(bodyMatch[1].replace(/<[^>]+>/g, " "));
    if (text.length > 80) return text;
  }

  return desc;
}

// Query opportunities needing body text
const queryRes = await pool.query(`
  SELECT o.id, o.title, o.submission_url, o.guidelines_url, o.type, o.discipline, o.genres, o.location, o.prize,
         r.data->>'name' as org_name, r.data->>'handle' as org_handle
  FROM opportunities o
  LEFT JOIN opportunity_contents c ON c.opportunity_id = o.id
  LEFT JOIN radar_organizations r ON r.id = o.organization_id
  WHERE o.publication_state = 'published' AND o.status = 'open'
    AND (
      c.opportunity_id IS NULL 
      OR length(coalesce(c.content->>'description', c.content->>'summary', '')) <= 150
    )
    AND (o.submission_url IS NOT NULL OR o.guidelines_url IS NOT NULL)
  ORDER BY 
    CASE WHEN o.source_id = 'src_submittable_directory' THEN 1 ELSE 2 END,
    o.created_at ASC;
`);

console.log(`Found ${queryRes.rows.length} opportunities needing rich body text.\n`);

const CONCURRENCY = 12;
const queue = [...queryRes.rows];
let enrichedCount = 0;
let failedCount = 0;
let processedCount = 0;

async function worker() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const targetUrl = item.submission_url || item.guidelines_url;
    if (!targetUrl || targetUrl.startsWith("#") || targetUrl.length < 10) {
      processedCount++;
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        failedCount++;
        processedCount++;
        continue;
      }

      const html = await res.text();
      const extractedDesc = extractDescription(html);

      if (extractedDesc && extractedDesc.length > 100) {
        // Save to opportunity_contents
        await pool.query(`
          INSERT INTO opportunity_contents (
            opportunity_id, input_version, builder_version, content, review_status, review_score, created_at, updated_at
          ) VALUES (
            $1, 'v1', 'v1', $2::jsonb, 'approved', 1, NOW(), NOW()
          )
          ON CONFLICT (opportunity_id) DO UPDATE SET
            content = opportunity_contents.content || $2::jsonb,
            updated_at = NOW();
        `, [
          item.id,
          JSON.stringify({
            description: extractedDesc,
            summary: extractedDesc.slice(0, 300)
          })
        ]);

        // Refresh search_document
        const searchDoc = `${item.title} ${item.type} ${item.discipline} ${(item.genres || []).join(' ')} ${item.location || ''} ${item.prize || ''} ${item.org_name || ''} ${item.org_handle || ''} ${extractedDesc}`.toLowerCase().trim();
        
        await pool.query(`
          UPDATE opportunities
          SET search_document = $1, updated_at = NOW()
          WHERE id = $2;
        `, [searchDoc, item.id]);

        enrichedCount++;
      } else {
        failedCount++;
      }
    } catch (e) {
      failedCount++;
    } finally {
      processedCount++;
      if (processedCount % 20 === 0 || processedCount === queryRes.rows.length) {
        process.stdout.write(`   Progress: ${processedCount}/${queryRes.rows.length} (Enriched: ${enrichedCount}, Skipped/NoDesc: ${failedCount})\r`);
      }
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

console.log(`\n\nEnrichment complete! Successfully enriched ${enrichedCount} opportunity descriptions.\n`);
await pool.end();
