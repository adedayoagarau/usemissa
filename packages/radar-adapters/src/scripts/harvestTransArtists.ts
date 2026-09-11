import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTransArtistsPopup, type TransArtistsProgram } from "./transartistsParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_FILE = path.join(DATA_DIR, "transartists_programs.json");

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      if (res.ok) return await res.text();
    } catch {
      if (i === retries) return "";
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return "";
}

async function run() {
  console.log("⚡ [TransArtists Harvester] Fetching map and deadlines from TransArtists.org...");

  // 1. Fetch upcoming deadlines
  const deadlineMap = new Map<string, string[]>();
  try {
    const deadlinesHtml = await fetchWithRetry("https://www.transartists.org/en/deadlines");
    const rows = [...deadlinesHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    for (const r of rows) {
      const linkM = r[1].match(/href="\/en\/air\/([^"]+)"/i);
      const dateM = r[1].match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/gi);
      if (linkM && dateM) {
        deadlineMap.set(linkM[1], dateM);
      }
    }
    console.log(`✔ Found ${deadlineMap.size} programs with active upcoming deadlines.`);
  } catch (err) {
    console.warn("Could not fetch deadlines page:", err);
  }

  // 2. Fetch rolling apply-any-time programs
  const rollingSlugs = new Set<string>();
  try {
    const applyAnyTimeHtml = await fetchWithRetry("https://www.transartists.org/en/apply-any-time");
    const links = [...applyAnyTimeHtml.matchAll(/href="\/en\/air\/([^"]+)"/g)].map((m) => m[1]);
    for (const l of links) rollingSlugs.add(l);
    console.log(`✔ Found ${rollingSlugs.size} programs accepting applications any time.`);
  } catch (err) {
    console.warn("Could not fetch apply-any-time page:", err);
  }

  // 3. Fetch map features
  const mapHtml = await fetchWithRetry("https://www.transartists.org/en/map");
  const settingsMatch = mapHtml.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([\s\S]*?)<\/script>/);
  if (!settingsMatch) {
    throw new Error("Could not find drupal settings on map page");
  }

  const mapData = JSON.parse(settingsMatch[1]);
  const leafletObj = Object.values(mapData.leaflet || {})[0] as any;
  const features: Array<{ entity_id: string; lat: number; lon: number }> = leafletObj?.features || [];
  console.log(`✔ Found ${features.length} international residency centers on TransArtists map.`);

  // 4. Concurrently fetch popups across worker pool
  const programs: TransArtistsProgram[] = [];
  const CONCURRENCY = 8;
  const queue = [...features];
  let processed = 0;

  async function worker() {
    while (queue.length > 0) {
      const f = queue.shift();
      if (!f) break;
      processed++;
      const cur = processed;
      if (cur % 25 === 0 || cur === features.length) {
        process.stdout.write(`\r[${cur}/${features.length}] Fetching residency programs...`);
      }

      try {
        const popupUrl = `https://www.transartists.org/en/leaflet-ajax-popup/node/${f.entity_id}/teaser/en`;
        const text = await fetchWithRetry(popupUrl);
        if (!text) continue;

        const commands = JSON.parse(text);
        const insertCmd = commands.find((c: any) => c.command === "insert");
        if (!insertCmd || typeof insertCmd.data !== "string") continue;

        const prog = parseTransArtistsPopup(insertCmd.data, String(f.entity_id), f.lat, f.lon);
        if (!prog) continue;

        // Attach deadlines if any
        if (deadlineMap.has(prog.slug)) {
          prog.deadlines = deadlineMap.get(prog.slug)!;
        } else if (rollingSlugs.has(prog.slug)) {
          prog.deadlines = ["rolling"];
        }

        programs.push(prog);
      } catch {
        // Continue on single error
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 5. Save to disk
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(programs, null, 2), "utf8");

  console.log(`\n🎉 [Harvest Complete] Saved ${programs.length} structured residency programs to ${OUTPUT_FILE}`);
}

run().catch((err) => {
  console.error("TransArtists harvester failed:", err);
  process.exit(1);
});
