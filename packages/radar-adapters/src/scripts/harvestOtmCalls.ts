import fs from "node:fs";
import path from "node:path";
import { parseOtmGrantPage, type OtmGrant } from "./otmParser.js";

const dataDir = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data";
const outputFile = path.join(dataDir, "otm_grants.json");

fs.mkdirSync(dataDir, { recursive: true });

console.log(`\n================================================================================`);
console.log(`       ON THE MOVE (OTM) INTERNATIONAL MOBILITY GRANTS HARVESTER                `);
console.log(`================================================================================\n`);

async function run() {
  const directoryUrl = "https://on-the-move.org/news/deadlines";
  console.log(`Fetching active deadlines from: ${directoryUrl}...`);

  const res = await fetch(directoryUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
  });

  if (!res.ok) {
    console.error(`Failed to fetch OTM directory: HTTP ${res.status}`);
    process.exit(1);
  }

  const html = await res.text();
  const regex = /<a href="(\/news\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<time datetime="([^"]+)"/g;
  const matches = [...html.matchAll(regex)];

  // Deduplicate and filter out self-links
  const map = new Map<string, { url: string; deadline: string }>();
  for (const m of matches) {
    if (m[1] === "/news/deadlines") continue;
    const fullUrl = `https://on-the-move.org${m[1]}`;
    if (!map.has(fullUrl)) {
      map.set(fullUrl, { url: fullUrl, deadline: m[3].slice(0, 10) });
    }
  }

  console.log(`✔ Discovered ${map.size} unique international travel & mobility grants on OTM!\n`);

  const results: OtmGrant[] = [];
  let count = 0;

  for (const item of map.values()) {
    count++;
    try {
      const grantRes = await fetch(item.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      });

      if (!grantRes.ok) continue;

      const grantHtml = await grantRes.text();
      const parsed = parseOtmGrantPage(grantHtml, item.url, item.deadline);
      if (parsed) {
        results.push(parsed);
        const prizeTag = parsed.prize ? ` [Award: ${parsed.prize}]` : "";
        console.log(`[${count}/${map.size}] Harvested: ${parsed.title.slice(0, 50)}...${prizeTag}`);
      }
    } catch (e: any) {
      console.error(`Error on ${item.url}:`, e.message);
    }

    // Save incrementally
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, 60));
  }

  console.log(`\n================================================================================`);
  console.log(`✔ HARVEST COMPLETE: ${results.length} On The Move international mobility grants saved!`);
  console.log(`Saved to: ${outputFile}`);
  console.log(`================================================================================\n`);
}

run();
