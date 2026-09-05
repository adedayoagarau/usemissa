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

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&/g, "and")
    .replace(/['’"“”\(\)\[\]\.,–—\-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^the\s+/, "")
    .trim();
}

function stripSuffixes(text) {
  return text
    .replace(/\s+(literary\s+magazine|magazine|review|journal|quarterly|press|lit|online|a\s+journal\s+of.*)$/i, "")
    .trim();
}

async function main() {
  await client.connect();
  const history = JSON.parse(fs.readFileSync("packages/radar-adapters/src/ranking/data/garstang-10yr-history.json", "utf8"));

  const crawledMags = new Map();
  for (const [year, genres] of Object.entries(history)) {
    for (const [genre, list] of Object.entries(genres)) {
      for (const item of list) {
        const name = item.name.trim();
        if (!crawledMags.has(name)) {
          crawledMags.set(name, { appearances: 0, yearRanks: [] });
        }
        crawledMags.get(name).appearances++;
        crawledMags.get(name).yearRanks.push({ year, genre, rank: item.rank, score: item.score });
      }
    }
  }

  const dbProfiles = await client.query(
    "SELECT id, name, name_key, website_url, profile_kind FROM gary_profiles WHERE profile_kind IN ('literary_magazine', 'small_press', 'organization');"
  );
  console.log(`Loaded ${dbProfiles.rows.length} DB profiles.`);

  const lookup = new Map();
  for (const p of dbProfiles.rows) {
    const norm = normalize(p.name);
    const stripped = stripSuffixes(norm);
    if (!lookup.has(norm)) lookup.set(norm, p);
    if (stripped && !lookup.has(stripped)) lookup.set(stripped, p);

    if (p.name_key) {
      const normKey = normalize(p.name_key);
      const strippedKey = stripSuffixes(normKey);
      if (!lookup.has(normKey)) lookup.set(normKey, p);
      if (strippedKey && !lookup.has(strippedKey)) lookup.set(strippedKey, p);
    }
  }

  let matched = 0;
  let unmatched = 0;
  const matchedList = [];
  const unmatchedList = [];

  for (const [name, stats] of crawledMags.entries()) {
    const norm = normalize(name);
    const stripped = stripSuffixes(norm);

    let found = lookup.get(norm) || lookup.get(stripped);

    if (found) {
      matched++;
      matchedList.push({ crawled: name, dbName: found.name, id: found.id, appearances: stats.appearances });
    } else {
      unmatched++;
      unmatchedList.push({ name, appearances: stats.appearances });
    }
  }

  console.log(`Matching results: ${matched} matched (${Math.round((matched / crawledMags.size) * 100)}%), ${unmatched} unmatched.`);
  console.log("Top matched journals (by appearances):");
  matchedList.sort((a, b) => b.appearances - a.appearances).slice(0, 20).forEach(m => {
    console.log(`  - [${m.crawled}] -> [${m.dbName}] (id: ${m.id}, apps: ${m.appearances})`);
  });

  console.log("\nTop unmatched journals (by appearances):");
  unmatchedList.sort((a, b) => b.appearances - a.appearances).slice(0, 20).forEach(u => {
    console.log(`  - ${u.name} (apps: ${u.appearances})`);
  });

  await client.end();
}

main().catch(console.error);
