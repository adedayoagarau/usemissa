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

const { Client } = pg;
const client = new Client({ connectionString: dbUrl });
await client.connect();

console.log("Connected. Reading current state...");

const existingHandlesRes = await client.query("SELECT handle_key FROM handles");
const takenHandles = new Set(existingHandlesRes.rows.map(r => r.handle_key.toLowerCase()));

function cleanHandleCandidate(candidate: string): string {
  if (!candidate) return "";
  let h = candidate.trim().toLowerCase();
  h = h.replace(/^@+/, "");
  h = h.replace(/[^a-z0-9_.-]/g, "-");
  h = h.replace(/[-_.]{2,}/g, "-");
  h = h.replace(/^[-_.]+|[-_.]+$/g, "");
  if (h.length > 30) h = h.slice(0, 30);
  h = h.replace(/^[-_.]+|[-_.]+$/g, "");
  if (h.length < 3) return "";
  return h;
}

function extractSocialHandle(urlStr: string): string {
  if (!urlStr || typeof urlStr !== "string") return "";
  const cleanUrl = urlStr.trim();
  const igMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i);
  if (igMatch && !["p", "reel", "explore", "stories", "tv", "accounts", "direct"].includes(igMatch[1].toLowerCase())) {
    return igMatch[1];
  }
  const xMatch = cleanUrl.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i);
  if (xMatch && !["home", "explore", "intent", "search", "share", "i", "settings"].includes(xMatch[1].toLowerCase())) {
    return xMatch[1];
  }
  const fbMatch = cleanUrl.match(/facebook\.com\/(?:pages\/[^\/]+\/)?([A-Za-z0-9_.]+)/i);
  if (fbMatch && !["sharer", "share", "profile.php", "groups", "events", "watch"].includes(fbMatch[1].toLowerCase())) {
    return fbMatch[1];
  }
  return "";
}

const orgsRes = await client.query("SELECT id, data FROM radar_organizations ORDER BY created_at ASC");
console.log(`Evaluating ${orgsRes.rows.length} organizations...`);

const handleRows = [];
const orgUpdates = [];

for (const org of orgsRes.rows) {
  const orgData = org.data || {};
  let currentHandle = orgData.handle;
  if (currentHandle) continue;

  let rawCandidate = "";
  let derivation = "name";

  const socialLinks = [
    orgData.instagram,
    orgData.instagram_url,
    orgData.socials?.instagram,
    orgData.twitter,
    orgData.twitter_url,
    orgData.x,
    orgData.socials?.twitter,
    orgData.facebook,
    orgData.facebook_url,
    orgData.socials?.facebook,
  ].filter(Boolean);

  for (const s of socialLinks) {
    const extracted = extractSocialHandle(s);
    if (extracted) {
      rawCandidate = extracted;
      derivation = "name";
      break;
    }
  }

  if (!rawCandidate && orgData.name) {
    rawCandidate = orgData.name;
    derivation = "name";
  }

  if (!rawCandidate && (orgData.domain || orgData.url)) {
    const d = orgData.domain || orgData.url?.replace(/https?:\/\/(?:www\.)?/, "").split("/")[0];
    if (d) {
      rawCandidate = d.split(".")[0];
      derivation = "domain";
    }
  }

  let baseHandle = cleanHandleCandidate(rawCandidate) || `org-${org.id.slice(0, 8)}`;

  let candidate = baseHandle;
  let counter = 2;
  while (takenHandles.has(candidate)) {
    const suffix = `-${counter}`;
    const truncatedBase = baseHandle.slice(0, 30 - suffix.length);
    candidate = `${truncatedBase}${suffix}`;
    counter++;
  }

  takenHandles.add(candidate);

  handleRows.push([
    candidate,
    candidate,
    "organization",
    org.id,
    "reserved",
    derivation,
    orgData.gary_profile_id || null
  ]);

  orgUpdates.push([org.id, candidate]);
}

console.log(`Ready to insert ${handleRows.length} handles and update ${orgUpdates.length} org records.`);

await client.query("BEGIN");
try {
  // Batch insert into handles with multi-row INSERTs
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < handleRows.length; i += CHUNK_SIZE) {
    const chunk = handleRows.slice(i, i + CHUNK_SIZE);
    const valuePlaceholders: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((row, idx) => {
      const offset = idx * 7;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, NOW(), NOW())`);
      params.push(...row);
    });

    const insertSql = `
      INSERT INTO handles (
        handle_key, display_handle, subject_type, subject_id, state, derivation, reserved_from_profile_id, created_at, updated_at
      ) VALUES ${valuePlaceholders.join(", ")}
      ON CONFLICT (handle_key) DO NOTHING
    `;
    await client.query(insertSql, params);
    console.log(`Handles chunk ${Math.min(i + CHUNK_SIZE, handleRows.length)} / ${handleRows.length} inserted.`);
  }

  // Fast bulk update of radar_organizations using UNNEST
  console.log("Updating radar_organizations in bulk...");
  const orgIds = orgUpdates.map(u => u[0]);
  const handles = orgUpdates.map(u => u[1]);

  await client.query(`
    UPDATE radar_organizations AS r
    SET data = COALESCE(r.data, '{}'::jsonb) || jsonb_build_object('handle', v.handle)
    FROM (
      SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS handle
    ) AS v
    WHERE r.id = v.id
  `, [orgIds, handles]);

  await client.query("COMMIT");
  console.log("Bulk update transaction committed successfully in seconds!");
} catch (e) {
  await client.query("ROLLBACK");
  console.error("Bulk update failed:", e);
  throw e;
} finally {
  await client.end();
}
