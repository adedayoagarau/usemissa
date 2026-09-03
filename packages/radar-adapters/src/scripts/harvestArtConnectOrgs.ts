import fs from "node:fs";
import path from "node:path";
import { parseArtConnectPage, type ArtConnectProfile } from "./artConnectParser.js";

const dataDir = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data";
const outputFile = path.join(dataDir, "artconnect_organizations.json");

fs.mkdirSync(dataDir, { recursive: true });

// Load existing if resuming
let existing: ArtConnectProfile[] = [];
const orgMap = new Map<string, ArtConnectProfile>();
if (fs.existsSync(outputFile)) {
  try {
    existing = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    existing.forEach(o => orgMap.set(o.id, o));
    console.log(`Loaded ${existing.length} existing ArtConnect organizations.`);
  } catch {}
}

// Default to all 499 pages
const maxPages = process.env.PAGES ? parseInt(process.env.PAGES, 10) : 499;
console.log(`\n================================================================================`);
console.log(`       ARTCONNECT ALL ORGANIZATIONS HARVESTER (PAGES: 1..${maxPages})           `);
console.log(`================================================================================\n`);

async function fetchPage(page: number): Promise<ArtConnectProfile[]> {
  const url = `https://www.artconnect.com/discover/organizations?page=${page}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!res.ok) {
      console.log(`   ⚠️ HTTP ${res.status} on page ${page}`);
      return [];
    }

    const html = await res.text();
    return parseArtConnectPage(html);
  } catch (err: any) {
    console.error(`   ❌ Error on page ${page}:`, err.message);
    return [];
  }
}

async function run() {
  for (let p = 1; p <= maxPages; p++) {
    const profiles = await fetchPage(p);
    if (profiles.length === 0) {
      console.log(`No more profiles returned at page ${p}. Stopping.`);
      break;
    }

    let newCount = 0;
    for (const prof of profiles) {
      if (!orgMap.has(prof.id)) {
        orgMap.set(prof.id, prof);
        newCount++;
      }
    }

    if (p % 10 === 0 || p === maxPages || p === 1) {
      console.log(`[Page ${p}/${maxPages}] Harvested cumulative: ${orgMap.size} organizations...`);
    }

    // Save incrementally every 10 pages
    if (p % 10 === 0 || p === maxPages) {
      fs.writeFileSync(outputFile, JSON.stringify(Array.from(orgMap.values()), null, 2));
    }

    await new Promise(r => setTimeout(r, 60));
  }

  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(Array.from(orgMap.values()), null, 2));

  console.log("\n================================================================================");
  console.log(`✔ HARVEST COMPLETE: ${orgMap.size} ArtConnect visual arts organizations saved!`);
  console.log(`Saved to: ${outputFile}`);
  console.log("================================================================================\n");
}

run();
