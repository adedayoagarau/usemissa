import fs from "node:fs";
import path from "node:path";

// Ensure data directory resolves correctly whether run from root or package dir
const baseDir = fs.existsSync(path.resolve("packages/radar-adapters"))
  ? path.resolve("packages/radar-adapters")
  : process.cwd();

const outputFile = path.resolve(baseDir, "data/resartis_slugs.json");
const outputHierarchyFile = path.resolve(baseDir, "data/resartis_regions_countries.json");

export const RESARTIS_REGIONS = [
  "europe",
  "north-america",
  "asia",
  "latin-america",
  "oceania",
  "africa",
  "middle-east",
  "polar-regions"
];

// Read cookie from env or file
const cookie = process.env.RESARTIS_COOKIE || "";

export async function crawlRegion(region: string): Promise<string[]> {
  const slugs = new Set<string>();
  console.log(`\n🌐 Crawling Region: [${region.toUpperCase()}]...`);

  for (let page = 1; page <= 10; page++) {
    const url = `https://resartis.org/listings/?fwp_region=${region}&fwp_paged=${page}`;
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://resartis.org/listings/",
        "DNT": "1"
      };

      if (cookie) {
        headers["Cookie"] = cookie;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.log(`   ⚠️ HTTP ${res.status} on page ${page} of ${region}.`);
        break;
      }

      const html = await res.text();
      if (html.includes("sgcaptcha") || html.includes("Robot Challenge")) {
        console.log(`   ⚠️ Bot challenge encountered on page ${page} of ${region}.`);
        console.log(`      (Provide your browser cookie via RESARTIS_COOKIE="...")`);
        break;
      }

      const regex = /href="https:\/\/resartis\.org\/listings\/([a-zA-Z0-9_\-%]+)\/"/g;
      let pageCount = 0;
      for (const m of html.matchAll(regex)) {
        const slug = m[1];
        if (slug !== "listings" && !slug.startsWith("?") && !slug.startsWith("feed")) {
          slugs.add(slug);
          pageCount++;
        }
      }

      console.log(`   • Page ${page}: found ${pageCount} listings (cumulative unique: ${slugs.size})`);
      if (pageCount < 100) break;

      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      console.error(`   ❌ Error fetching page ${page} of ${region}:`, err.message);
      break;
    }
  }

  return [...slugs];
}

async function run() {
  console.log("================================================================================");
  console.log("       RES ARTIS REGIONAL & COUNTRY DIRECTORY SLUG HARVESTER                    ");
  console.log("================================================================================");

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const allSlugs = new Set<string>();
  const hierarchy: Record<string, string[]> = {};

  if (fs.existsSync(outputFile)) {
    try {
      const prev: string[] = JSON.parse(fs.readFileSync(outputFile, "utf8"));
      prev.forEach(s => allSlugs.add(s));
      console.log(`Loaded ${prev.length} existing slugs to ensure no loss of progress.`);
    } catch {}
  }

  for (const region of RESARTIS_REGIONS) {
    const regionSlugs = await crawlRegion(region);
    hierarchy[region] = regionSlugs;
    regionSlugs.forEach(s => allSlugs.add(s));
  }

  const slugList = [...allSlugs].sort();
  fs.writeFileSync(outputFile, JSON.stringify(slugList, null, 2));
  fs.writeFileSync(outputHierarchyFile, JSON.stringify(hierarchy, null, 2));

  console.log("\n================================================================================");
  console.log(`✔ HARVEST COMPLETE: ${slugList.length} total unique residency listings indexed!`);
  console.log(`Saved master slugs to: ${outputFile}`);
  console.log(`Saved regional hierarchy to: ${outputHierarchyFile}`);
  console.log("================================================================================\n");
}

run();
