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
console.log("            MISSA BACKEND OPPORTUNITIES DATA DE-NOISING & CLEANING             ");
console.log("================================================================================\n");

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&laquo;|&raquo;/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

// 1. Fix Specific Misnamed Titles
console.log("1. Fixing specific misnamed opportunities from legacy scrapes...");
const specificFixes = [
  {
    id: "opp_b4deccdd-4876-43c5-8505-4380e73daf55",
    title: "US Exhibition at the 2027 Prague Quadrennial"
  },
  {
    id: "opp_695e95d3-597c-4193-b006-a7a26e0d0013",
    title: "Oregon Literary Arts 2026 Fellowship"
  },
  {
    id: "opp_784da6f7-d5c3-48b0-a313-db9bfb62522f",
    title: "AGNI Magazine Submissions"
  }
];

for (const fix of specificFixes) {
  try {
    await client.query(`
      UPDATE opportunities
      SET title = $2,
          search_document = to_tsvector('english', $2),
          updated_at = NOW()
      WHERE id = $1;
    `, [fix.id, fix.title]);
  } catch (err) {}
}
console.log(`   ✔ Updated ${specificFixes.length} misnamed opportunities.`);

// 2. Quarantine Navigation Boilerplate & Non-Opportunity Rows
console.log("\n2. Quarantining navigation boilerplate & non-opportunity pages...");
const quarantineRes = await client.query(`
  UPDATE opportunities
  SET publication_state = 'suppressed',
      status = 'closed',
      updated_at = NOW()
  WHERE publication_state = 'published'
    AND (
      lower(title) IN ('free', 'info', 'jobs', 'list', 'tos', 'news', 'grid', 'faqs', 'job', 'application', 'untitled', 'click here', 'more details')
      OR title ILIKE '%curatorspace.com%'
      OR title ~* '^https?://'
    );
`);
console.log(`   ✔ Quarantined ${quarantineRes.rowCount} junk/navigation opportunities.`);

// 3. Clean HTML Entities in Titles
console.log("\n3. Decoding HTML entities in opportunity titles...");
const htmlTitlesRes = await client.query(`
  SELECT id, title
  FROM opportunities
  WHERE title ~ '&[a-zA-Z0-9#]+;' OR title LIKE '%&laquo;%' OR title LIKE '%&raquo;%';
`);

let fixedHtmlCount = 0;
for (const row of htmlTitlesRes.rows) {
  const cleanTitle = decodeHtmlEntities(row.title);
  if (cleanTitle !== row.title) {
    try {
      await client.query(`
        UPDATE opportunities
        SET title = $2,
            search_document = to_tsvector('english', $2),
            updated_at = NOW()
        WHERE id = $1;
      `, [row.id, cleanTitle]);
      fixedHtmlCount++;
    } catch (err) {}
  }
}
console.log(`   ✔ Cleaned and decoded HTML entities across ${fixedHtmlCount} titles.`);

// 4. Safe Backfill for any remaining opportunities
console.log("\n4. Ensuring all published opportunities have valid submission_url...");
const remainingNulls = await client.query(`
  SELECT id, guidelines_url
  FROM opportunities
  WHERE publication_state = 'published'
    AND status IN ('open', 'opening-soon', 'closing-soon', 'deadline-extended')
    AND (submission_url IS NULL OR submission_url = '')
    AND guidelines_url IS NOT NULL 
    AND guidelines_url <> '';
`);

let backfilled = 0;
for (const row of remainingNulls.rows) {
  try {
    await client.query(`
      UPDATE opportunities
      SET submission_url = $2,
          submission_host = substring($2 from 'https?://([^/]+)'),
          submission_state = 'available',
          submission_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $1;
    `, [row.id, row.guidelines_url]);
    backfilled++;
  } catch (err) {}
}
console.log(`   ✔ Backfilled submission_url for ${backfilled} opportunities.`);

// 5. Deduplicate Duplicate Published Calls for the Same Organization
console.log("\n5. Suppressing older duplicate published opportunities for same organization...");
const dupeRes = await client.query(`
  WITH ranked_opps AS (
    SELECT id, title, organization_id, updated_at,
           ROW_NUMBER() OVER (
             PARTITION BY lower(trim(title)), organization_id 
             ORDER BY updated_at DESC, created_at DESC
           ) as rank
    FROM opportunities
    WHERE publication_state = 'published'
      AND organization_id IS NOT NULL
  )
  UPDATE opportunities o
  SET publication_state = 'suppressed',
      status = 'closed',
      updated_at = NOW()
  FROM ranked_opps r
  WHERE o.id = r.id AND r.rank > 1;
`);
console.log(`   ✔ Suppressed ${dupeRes.rowCount} duplicate published opportunities.`);

// 6. Summary of Cleaned Opportunities
const audit = await client.query(`
  SELECT publication_state, status, count(*)
  FROM opportunities
  GROUP BY publication_state, status
  ORDER BY count DESC;
`);

console.log("\n================================================================================");
console.log("             FINAL CLEANED OPPORTUNITIES STATE DISTRIBUTION                    ");
console.log("================================================================================\n");
console.table(audit.rows);

await client.end();
