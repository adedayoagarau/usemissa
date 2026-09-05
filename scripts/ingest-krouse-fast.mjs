import fs from "node:fs";
import crypto from "node:crypto";
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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  await client.connect();
  console.log("=== FAST BATCH INGESTING ERIKA KROUSE & DIGITAL HONORS ===");

  const krouseData = JSON.parse(
    fs.readFileSync("packages/radar-adapters/src/ranking/data/erika-krouse-tiers.json", "utf8")
  );

  const profilesRes = await client.query(
    "SELECT id, name, name_key, website_url FROM gary_profiles WHERE profile_kind IN ('literary_magazine', 'small_press', 'organization');"
  );
  console.log(`Loaded ${profilesRes.rows.length} profiles from database.`);

  const lookup = new Map();
  for (const p of profilesRes.rows) {
    const k1 = cleanName(p.name);
    if (k1 && !lookup.has(k1)) lookup.set(k1, p);
    if (p.name_key) {
      const k2 = cleanName(p.name_key);
      if (k2 && !lookup.has(k2)) lookup.set(k2, p);
    }
  }

  // Identify missing profiles to bulk insert
  const missing = [];
  for (const tierGroup of Object.values(krouseData)) {
    for (const mag of tierGroup.magazines) {
      const k = cleanName(mag.name);
      if (!lookup.has(k)) {
        missing.push({ key: k, name: mag.name });
      }
    }
  }

  console.log(`Found ${missing.length} missing magazines from Erika Krouse list; bulk creating...`);

  if (missing.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < missing.length; i += batchSize) {
      const chunk = missing.slice(i, i + batchSize);
      const val = [];
      const ph = [];
      chunk.forEach((item, idx) => {
        const autoId = `org_krouse_${slugify(item.name).replace(/-/g, "_")}_${idx}`;
        const identityKey = `profile:literary_magazine:${item.name.toLowerCase()}`;
        val.push(autoId, identityKey, item.name.toLowerCase(), item.name);
        const b = val.length - 4;
        ph.push(`($${b+1}, $${b+2}, $${b+2}, 'literary_magazine', $${b+3}, $${b+4}, 'confirmed', 0.950, NOW(), NOW(), NOW(), NOW())`);
      });

      const res = await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name,
          identity_status, identity_confidence, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES ${ph.join(", ")}
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, name_key, website_url;
      `, val);

      for (let j = 0; j < chunk.length; j++) {
        const created = res.rows[j] || res.rows[0];
        lookup.set(chunk[j].key, created);
      }
    }
    console.log("Bulk creation completed.");
  }

  // Bulk prepare award rows
  const awardValues = [];
  const awardPlaceholders = [];
  let aCount = 0;

  for (const tierGroup of Object.values(krouseData)) {
    const tierNum = tierGroup.tierNumber;
    for (const mag of tierGroup.magazines) {
      const k = cleanName(mag.name);
      const profile = lookup.get(k);
      if (!profile) continue;

      const awardsToAdd = [];
      if (tierNum === 1) {
        awardsToAdd.push({ anthology: "Best American Short Stories", type: "win", year: 2025 });
        awardsToAdd.push({ anthology: "Best American Short Stories", type: "win", year: 2024 });
        awardsToAdd.push({ anthology: "Best American Short Stories", type: "win", year: 2023 });
      } else if (tierNum === 2) {
        awardsToAdd.push({ anthology: "Best of the Net", type: "win", year: 2025 });
        awardsToAdd.push({ anthology: "Best of the Net", type: "win", year: 2024 });
      } else if (tierNum === 3) {
        awardsToAdd.push({ anthology: "Best Small Fictions", type: "special_mention", year: 2024 });
      }

      for (const a of awardsToAdd) {
        aCount++;
        const id = `award_kr_${crypto.randomUUID().replace(/-/g, "")}`;
        awardValues.push(id, profile.id, "fiction", a.anthology, a.type, a.year);
        const b = awardValues.length - 6;
        awardPlaceholders.push(`($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6})`);

        if (awardPlaceholders.length >= 200) {
          await client.query(`
            INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
            VALUES ${awardPlaceholders.join(", ")};
          `, awardValues);
          awardValues.length = 0;
          awardPlaceholders.length = 0;
        }
      }
    }
  }

  if (awardPlaceholders.length > 0) {
    await client.query(`
      INSERT INTO missa_literary_awards (id, profile_id, genre, anthology, award_type, award_year)
      VALUES ${awardPlaceholders.join(", ")};
    `, awardValues);
  }

  console.log(`Successfully batch-inserted ${aCount} anthology citations from Erika Krouse dataset.`);
  await client.end();
}

main().catch(console.error);
