import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../data/transartists_programs.json");

if (!fs.existsSync(DATA_FILE)) {
  console.error("Data file not found. Run npm run transartists:harvest first.");
  process.exit(1);
}

// Load DATABASE_URL
const possibleEnvFiles = [
  "/Volumes/Crucial X10/usemissa/.env.local",
  path.resolve(".env.local"),
  path.resolve("../../.env.local")
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

const programs = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
console.log(`\n📊 [TransArtists Harvest Review]`);
console.log(`Total residency programs harvested: ${programs.length}`);

const withWebsite = programs.filter((p: any) => p.website);
const withStudio = programs.filter((p: any) => p.studioInfo);
const withAccommodation = programs.filter((p: any) => p.accommodationInfo);
const withDeadlines = programs.filter((p: any) => p.deadlines && p.deadlines.length > 0);

console.log(`With verified official websites:     ${withWebsite.length}`);
console.log(`With studio facility specifications: ${withStudio.length}`);
console.log(`With housing & accommodation data:   ${withAccommodation.length}`);
console.log(`With active deadlines or rolling:    ${withDeadlines.length}`);

// Test reconciliation against database
if (process.env.DATABASE_URL) {
  const { Client } = pg;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let existingCount = 0;
  let newCount = 0;

  for (const p of programs) {
    let normWeb = "";
    try { normWeb = new URL(p.website || "").hostname.replace(/^www\./, ""); } catch {}
    const cleanKey = p.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);

    const res = await client.query(`
      SELECT id, name FROM gary_profiles 
      WHERE ($1::text IS NOT NULL AND $1::text != '' AND (normalized_website_url = $1 OR website_url ILIKE '%' || $1 || '%'))
         OR name_key = $2
         OR lower(name) = lower($3)
      LIMIT 1;
    `, [normWeb || null, cleanKey, p.name]);

    if (res.rows.length > 0) existingCount++;
    else newCount++;
  }

  console.log(`\n🔍 Reconciliation Audit against Missa's Database:`);
  console.log(`  • Programs already in Missa (to enrich without duplicating): ${existingCount}`);
  console.log(`  • Brand-new international residency programs to add:          ${newCount}`);

  await client.end();
}
