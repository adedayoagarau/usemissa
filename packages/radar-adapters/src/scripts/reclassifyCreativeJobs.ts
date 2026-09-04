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
const pool = new Pool({ connectionString: dbUrl, max: 5 });

async function run() {
  console.log("=== RECLASSIFYING CREATIVE JOBS & SUPPRESSING AGGREGATOR NOISE ===");

  // 1. Suppress generic aggregator archive/index URLs that are not actual individual opportunities
  const genericDirectories = [
    "%allcommunityevents.com/jobs-internships%",
    "%artdeadline.com/ops-type/type-intern%",
    "%artdeadline.com/ops/publish/%",
    "%artdeadline.com/benefits/ops-housing/%",
    "%nj.gov/dcf/stay-connected/employment-opportunities/%",
    "%artdeadline.com/ops-type/type-call/%",
    "%artdeadline.com/author/%"
  ];

  for (const pattern of genericDirectories) {
    const res = await pool.query(
      `UPDATE opportunities 
       SET publication_state = 'suppressed', status = 'closed', updated_at = NOW() 
       WHERE (submission_url ILIKE $1 OR guidelines_url ILIKE $1) AND publication_state <> 'suppressed'`,
      [pattern]
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`Suppressed ${res.rowCount} generic aggregator entries matching ${pattern}`);
    }
  }

  // Also suppress items whose title is just generic placeholder like "Job", "Jobs", "Jobs & Internships"
  const genericTitles = ["job", "jobs", "jobs & internships", "employment opportunities", "job opening archives", "directory"];
  for (const title of genericTitles) {
    const res = await pool.query(
      `UPDATE opportunities
       SET publication_state = 'suppressed', status = 'closed', updated_at = NOW()
       WHERE lower(trim(title)) = $1 AND publication_state <> 'suppressed'`,
      [title]
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`Suppressed ${res.rowCount} generic placeholder titled entries matching "${title}"`);
    }
  }

  // 2. Legitimate creative jobs, internships, and faculty appointments to reclassify to type = 'job'
  const jobRegex = '(\\b(internship|internships|assistant professor|associate professor|adjunct professor|tenure-track|visiting professor|curator of|gallery manager|project manager|communications coordinator|staff writer|copy editor|teaching position|nonfiction editor)\\b|\\bis hiring\\b|\\bjob opportunities for artists\\b)';

  const candidates = await pool.query(`
    SELECT id, title, type, submission_url, search_document
    FROM opportunities
    WHERE publication_state = 'published'
      AND (
        title ~* $1
        OR (submission_url ILIKE '%/job/%' AND title NOT ILIKE '%prize%' AND title NOT ILIKE '%grant%')
      )
      AND type <> 'job'
  `, [jobRegex]);

  console.log(`Found ${candidates.rows.length} legitimate creative job / internship opportunities to reclassify.`);

  for (const row of candidates.rows) {
    const updatedSearchDoc = row.search_document
      ? `${row.search_document} job employment position creative work hiring`
      : `${row.title} job employment position creative work hiring`;

    await pool.query(
      `UPDATE opportunities 
       SET type = 'job', search_document = $1, updated_at = NOW() 
       WHERE id = $2`,
      [updatedSearchDoc, row.id]
    );
    console.log(`  ✓ Reclassified to 'job': [${row.id}] ${row.title}`);
  }

  // 3. Verify final counts
  const jobCount = await pool.query(`SELECT COUNT(*) FROM opportunities WHERE type = 'job' AND publication_state = 'published'`);
  console.log(`\nTotal published creative jobs now live: ${jobCount.rows[0].count}`);

  await pool.end();
}

run().catch((err) => {
  console.error("Error executing reclassification:", err);
  process.exit(1);
});
