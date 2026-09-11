import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { SubmittableItem } from "./harvestSubmittable.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../data/submittable_calls.json");

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

const items: SubmittableItem[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
console.log(`Loaded ${items.length} Submittable calls from harvest data.`);

// 1. Check existing profiles match
function cleanDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("submittable.com") || host.includes("facebook.com") || host.includes("instagram.com")) return null;
    return host;
  } catch {
    return null;
  }
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const orgProfiles = await client.query(`
  SELECT id, name, website_url as website, canonical_key 
  FROM gary_profiles;
`);

const domainMap = new Map<string, string>();
const nameMap = new Map<string, string>();
const keyMap = new Map<string, string>();

for (const p of orgProfiles.rows) {
  if (p.canonical_key) keyMap.set(p.canonical_key, p.id);
  const dom = cleanDomain(p.website);
  if (dom) domainMap.set(dom, p.id);
  const nKey = normalizeKey(p.name);
  if (nKey) nameMap.set(nKey, p.id);
}

let matchedHosts = 0;
let newHosts = 0;
const uniqueOrgs = new Map<number, any>();

for (const it of items) {
  if (!uniqueOrgs.has(it.organization.id)) {
    uniqueOrgs.set(it.organization.id, it.organization);
  }
}

for (const org of uniqueOrgs.values()) {
  const dom = cleanDomain(org.websiteUrl);
  const nKey = normalizeKey(org.name);
  const matchedId = (dom ? domainMap.get(dom) : null) || nameMap.get(nKey);
  if (matchedId) {
    matchedHosts++;
  } else {
    newHosts++;
  }
}

// 2. Check existing opportunity overlap
const existingUrls = new Set<string>();
const oppUrls = await client.query("SELECT submission_url FROM opportunities WHERE submission_url IS NOT NULL;");
for (const r of oppUrls.rows) existingUrls.add(r.submission_url);

let alreadyTrackedCalls = 0;
let brandNewCalls = 0;

for (const it of items) {
  if (existingUrls.has(it.shareUrl)) {
    alreadyTrackedCalls++;
  } else {
    brandNewCalls++;
  }
}

console.log("\n================================================================================");
console.log("                 SUBMITTABLE RECONCILIATION AUDIT                               ");
console.log("================================================================================");
console.log(`  • Total Harvested Calls:           ${items.length}`);
console.log(`  • Unique Host Organizations:       ${uniqueOrgs.size}`);
console.log(`    - Existing Hosts in Missa:       ${matchedHosts} (will be enriched)`);
console.log(`    - Brand New Hosts to Create:     ${newHosts} (new journals, presses, foundations)`);
console.log(`  • Opportunity Calls:`);
console.log(`    - Already in Database:           ${alreadyTrackedCalls}`);
console.log(`    - Brand New Live Calls:          ${brandNewCalls}`);
console.log("================================================================================\n");

await client.end();
