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

function decodeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#115;&#117;&#115;&#97;&#110;&#64;&#108;&#105;&#116;&#101;&#114;&#97;&#114;&#121;&#45;&#97;&#114;&#116;&#115;&#46;&#111;&#114;&#103;/g, "susan@literary-arts.org")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function run() {
  console.log("=== 1. CLEANING HTML ENTITIES ACROSS ORGANIZATIONS & OPPORTUNITIES ===");

  // A. Clean radar_organizations
  const orgs = await pool.query(`SELECT id, data FROM radar_organizations WHERE data::text ~ '(&amp;|&#039;|&#39;|&quot;|&lt;|&gt;|&nbsp;|&#\\d+;)'`);
  console.log(`Found ${orgs.rows.length} radar_organizations with HTML entities.`);
  for (const row of orgs.rows) {
    const data = row.data;
    if (data.name) data.name = decodeHtml(data.name);
    if (data.description) data.description = decodeHtml(data.description);
    await pool.query(`UPDATE radar_organizations SET data = $1 WHERE id = $2`, [JSON.stringify(data), row.id]);
  }

  // B. Clean opportunities titles, search_documents, guidelines_url
  const opps = await pool.query(`SELECT id, title, search_document FROM opportunities WHERE title ~ '(&amp;|&#039;|&#39;|&quot;|&lt;|&gt;|&nbsp;|&#\\d+;)'`);
  console.log(`Found ${opps.rows.length} opportunities with HTML entities in title.`);
  for (const row of opps.rows) {
    const newTitle = decodeHtml(row.title);
    const newDoc = row.search_document ? decodeHtml(row.search_document) : null;
    await pool.query(`UPDATE opportunities SET title = $1, search_document = $2 WHERE id = $3`, [newTitle, newDoc, row.id]);
  }

  console.log("\n=== 2. CONTEXTUALIZE GENERIC SINGLE-WORD TITLES ===");
  // Generic single-word titles: Poetry, Fiction, Nonfiction, Manuscripts, Art, Prose, Submissions
  const genericTitles = ['poetry', 'nonfiction', 'fiction', 'manuscripts', 'art', 'prose', 'submissions', 'general submissions'];
  const genericOpps = await pool.query(`
    SELECT o.id, o.title, o.organization_id, org.data->>'name' as org_name
    FROM opportunities o
    LEFT JOIN radar_organizations org ON org.id = o.organization_id
    WHERE lower(trim(o.title)) = ANY($1) AND o.publication_state = 'published'
  `, [genericTitles]);

  console.log(`Found ${genericOpps.rows.length} opportunities with generic titles to contextualize.`);
  for (const row of genericOpps.rows) {
    const orgName = row.org_name && row.org_name !== 'Creative Organization' && row.org_name !== 'Www' ? row.org_name.trim() : null;
    let newTitle = row.title;
    const cleanWord = row.title.charAt(0).toUpperCase() + row.title.slice(1).toLowerCase();
    if (orgName) {
      newTitle = `${orgName}: ${cleanWord} Submissions`;
    } else {
      newTitle = `Open Call: ${cleanWord} Submissions`;
    }
    await pool.query(`UPDATE opportunities SET title = $1, updated_at = NOW() WHERE id = $2`, [newTitle, row.id]);
    console.log(`  ✓ Updated title: "${row.title}" -> "${newTitle}"`);
  }

  console.log("\n=== 3. FIX DISCIPLINE / GENRE MISALIGNMENTS ===");
  // Literary calls misaligned with 'film', 'dance', etc.
  const litMisaligned = await pool.query(`
    SELECT id, title, discipline, genres
    FROM opportunities
    WHERE (
      title ILIKE '%poetry%' OR title ILIKE '%fiction%' OR title ILIKE '%manuscripts%' OR title ILIKE '%nonfiction%'
    )
    AND discipline IN ('film', 'dance', 'theatre', 'theatre-and-dramatic-arts', 'acting')
    AND title NOT ILIKE '%screenplay%' AND title NOT ILIKE '%dance%' AND title NOT ILIKE '%theatre%' AND title NOT ILIKE '%play%'
  `);

  console.log(`Found ${litMisaligned.rows.length} literary opportunities misaligned to film/dance/theatre.`);
  for (const row of litMisaligned.rows) {
    let correctedDiscipline = 'literature';
    if (row.title.toLowerCase().includes('poetry')) correctedDiscipline = 'poetry';
    else if (row.title.toLowerCase().includes('fiction') && !row.title.toLowerCase().includes('nonfiction')) correctedDiscipline = 'fiction';
    else if (row.title.toLowerCase().includes('nonfiction')) correctedDiscipline = 'nonfiction';

    await pool.query(`
      UPDATE opportunities 
      SET discipline = $1, genres = ARRAY[$1]::text[], updated_at = NOW()
      WHERE id = $2
    `, [correctedDiscipline, row.id]);
    console.log(`  ✓ Corrected discipline for [${row.id}] "${row.title}": ${row.discipline} -> ${correctedDiscipline}`);
  }

  // Also fix: Refugee Family Reunion is not dance or an artist opportunity!
  await pool.query(`
    UPDATE opportunities
    SET publication_state = 'suppressed', status = 'closed', updated_at = NOW()
    WHERE title ILIKE '%Changes to Refugee Family Reunion%'
  `);
  console.log("  ✓ Suppressed non-creative immigration notice ('Changes to Refugee Family Reunion').");

  // Fix: Fix NYFA / Literary Arts organization names
  await pool.query(`
    UPDATE radar_organizations
    SET data = jsonb_set(data, '{name}', '"New York Foundation for the Arts (NYFA)"')
    WHERE id = 'org_bd8b168b0486a52a64f00217'
  `);
  await pool.query(`
    UPDATE radar_organizations
    SET data = jsonb_set(data, '{name}', '"Literary Arts (Oregon)"')
    WHERE id = 'org_c9e55f279edb0479367157fe'
  `);
  await pool.query(`
    UPDATE radar_organizations
    SET data = jsonb_set(data, '{name}', '"European Commission"')
    WHERE id = 'org_1fb9978eb417f3b4edd78168'
  `);
  console.log("  ✓ Fixed placeholder org names: Www -> NYFA, Creative Org -> Literary Arts, Ec -> European Commission.");

  // Fix: Workshop by Adeline Kueh type
  await pool.query(`
    UPDATE opportunities
    SET type = 'open-call', updated_at = NOW()
    WHERE title ILIKE '%Where Do We Draw The Line? A drawing workshop by Adeline Kueh%'
  `);
  console.log("  ✓ Reclassified drawing workshop from 'residency' to 'open-call'.");

  await pool.end();
  console.log("\n=== MIGRATION COMPLETE ===");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
