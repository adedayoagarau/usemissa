import fs from "node:fs";
import pg from "pg";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
    break;
  }
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function cleanName(n) {
  if (!n) return "";
  return n.toLowerCase()
    .replace(/©|®|™/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/,\s*the\b/g, "")
    .replace(/^the\s+/g, "")
    .replace(/['’"“”\(\)\[\]\.,–—\-:]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+(literary magazine|literary reader|a literary journal|reimagining place|magazine|review|journal|quarterly|press|lit|online)$/g, "")
    .trim();
}

async function main() {
  await client.connect();
  const history = JSON.parse(fs.readFileSync("packages/radar-adapters/src/ranking/data/garstang-10yr-history.json", "utf8"));

  const crawled = new Map();
  for (const yr of Object.values(history)) {
    for (const g of Object.values(yr)) {
      for (const item of g) {
        const name = item.name.trim();
        if (/^\d+$/.test(name)) continue; // ignore garstang table header artifact numbers like '8', '15', '22'
        if (!crawled.has(name)) crawled.set(name, 0);
        crawled.set(name, crawled.get(name) + 1);
      }
    }
  }

  const db = await client.query("SELECT id, name, name_key, profile_kind FROM gary_profiles WHERE profile_kind IN ('literary_magazine', 'small_press', 'organization', 'visual_arts_organization');");

  const map = new Map();
  for (const p of db.rows) {
    const k = cleanName(p.name);
    if (k && !map.has(k)) map.set(k, p);
    if (p.name_key) {
      const k2 = cleanName(p.name_key);
      if (k2 && !map.has(k2)) map.set(k2, p);
    }
  }

  let matched = 0;
  let unmatched = 0;
  const matches = [];
  const missing = [];

  for (const [name, count] of crawled.entries()) {
    const k = cleanName(name);
    const found = map.get(k);
    if (found) {
      matched++;
      matches.push({ crawled: name, db: found.name, id: found.id, count });
    } else {
      unmatched++;
      missing.push({ name, count });
    }
  }

  console.log(`Matched: ${matched} (${Math.round((matched / (matched + unmatched)) * 100)}%), Unmatched: ${unmatched}`);
  console.log("Sample newly matched:", matches.filter(m => ["Common, The", "Brick", "Catamaran", "Ecotone", "Tin House ©"].some(x => m.crawled.includes(x))));
  console.log("\nTop remaining unmatched (by appearances):");
  missing.sort((a, b) => b.count - a.count).slice(0, 15).forEach(m => console.log(`  - ${m.name} (${m.count} apps)`));

  await client.end();
}

main().catch(console.error);
