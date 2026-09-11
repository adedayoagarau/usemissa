import fs from "node:fs";
import path from "node:path";
import { parseAcaCallPage, type AcaOpenCall } from "./acaParser.js";

const dataDir = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data";
const outputFile = path.join(dataDir, "aca_opencalls.json");

fs.mkdirSync(dataDir, { recursive: true });

console.log(`\n================================================================================`);
console.log(`       ARTIST COMMUNITIES ALLIANCE (ACA) LIVE OPEN CALLS HARVESTER              `);
console.log(`================================================================================\n`);

async function run() {
  const directoryUrl = "https://artistcommunities.org/directory/open-calls";
  console.log(`Fetching active open call directory from: ${directoryUrl}...`);

  const res = await fetch(directoryUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!res.ok) {
    console.error(`Failed to fetch ACA directory: HTTP ${res.status}`);
    process.exit(1);
  }

  const html = await res.text();
  const rawLinks = [...html.matchAll(/href="(\/directory\/open-calls\/[^"?#]+)"/g)].map(m => m[1]);
  const uniqueUrls = [...new Set(rawLinks)].map(rel => `https://artistcommunities.org${rel}`);

  console.log(`✔ Discovered ${uniqueUrls.length} unique active open call listings on ACA!\n`);

  const results: AcaOpenCall[] = [];
  let count = 0;

  for (const callUrl of uniqueUrls) {
    count++;
    try {
      const callRes = await fetch(callUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!callRes.ok) continue;

      const callHtml = await callRes.text();
      const parsed = parseAcaCallPage(callHtml, callUrl);
      if (parsed) {
        results.push(parsed);
        const fundedTag = parsed.isFullyFunded ? " [FULLY FUNDED]" : "";
        const stipendTag = parsed.stipendAmount ? ` (Stipend: $${parsed.stipendAmount})` : "";
        console.log(`[${count}/${uniqueUrls.length}] Harvested: ${parsed.title.slice(0, 45)}...${fundedTag}${stipendTag}`);
      }
    } catch (e: any) {
      console.error(`Error on ${callUrl}:`, e.message);
    }

    // Save incrementally
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 60));
  }

  console.log(`\n================================================================================`);
  console.log(`✔ HARVEST COMPLETE: ${results.length} ACA residency open calls saved!`);
  console.log(`Saved to: ${outputFile}`);
  console.log(`================================================================================\n`);
}

run();
