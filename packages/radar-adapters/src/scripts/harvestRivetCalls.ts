import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRivetCallPage, type RivetOpenCall } from "./rivetParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_FILE = path.join(DATA_DIR, "rivet_calls.json");

interface EnrichedRivetCall extends RivetOpenCall {
  orgWebsite?: string | null;
  orgSocials?: Record<string, string>;
}

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
      if (i === retries) throw new Error(`Failed to fetch ${url}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return "";
}

async function run() {
  console.log("⚡ [Rivet Harvester] Discovering calls across Rivet.es...");
  const callUrls = new Set<string>();

  // 1. Discover call URLs across pagination (pages 1 to 15)
  for (let p = 1; p <= 15; p++) {
    const pageUrl = p === 1 ? "https://rivet.es/calls/" : `https://rivet.es/calls/${p}`;
    try {
      const html = await fetchWithRetry(pageUrl);
      if (!html) break;
      const links = [...html.matchAll(/href="(\/calls\/view\/[^"]+)"/g)].map((m) => `https://rivet.es${m[1]}`);
      if (links.length === 0) break;
      for (const l of links) callUrls.add(l);
      process.stdout.write(`\r  • Page ${p}: total discovered: ${callUrls.size}`);
    } catch {
      break;
    }
  }

  console.log(`\n✔ Discovered ${callUrls.size} unique open calls on Rivet.es.`);

  // 2. Fetch and parse each call concurrently
  const calls: EnrichedRivetCall[] = [];
  const orgCache = new Map<string, { website: string | null; socials: Record<string, string> }>();
  const urlList = Array.from(callUrls);

  let processed = 0;
  const CONCURRENCY = 6;

  async function worker() {
    while (urlList.length > 0) {
      const url = urlList.shift();
      if (!url) break;
      processed++;
      const current = processed;
      process.stdout.write(`\r[${current}/${callUrls.size}] Scraping: ${url.slice(22, 65)}...`);
      try {
        const html = await fetchWithRetry(url);
        if (!html) continue;
        const parsed = parseRivetCallPage(html, url);
        if (!parsed) continue;

        let orgWebsite: string | null = null;
        let orgSocials: Record<string, string> = {};

        // Enrich with host org profile if available
        if (parsed.organizationPath) {
          if (orgCache.has(parsed.organizationPath)) {
            const cached = orgCache.get(parsed.organizationPath)!;
            orgWebsite = cached.website;
            orgSocials = cached.socials;
          } else {
            try {
              const orgHtml = await fetchWithRetry(`https://rivet.es${parsed.organizationPath}`);
              const webM = orgHtml.match(/Visit website\s*->\s*(https?:\/\/[^\s"'<]+)/i)
                || orgHtml.match(/<a[^>]*class="[^"]*website[^"]*"[^>]*href="(https?:\/\/[^"]+)"/i)
                || orgHtml.match(/href="(https?:\/\/[^"]+)"[^>]*>Visit website<\/a>/i);
              if (webM) orgWebsite = webM[1];

              const socials: Record<string, string> = {};
              const fb = orgHtml.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)"/i);
              if (fb && !fb[1].includes("hellorivets")) socials.facebook = fb[1];
              const ig = orgHtml.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)"/i);
              if (ig && !ig[1].includes("hellorivets")) socials.instagram = ig[1];

              orgCache.set(parsed.organizationPath, { website: orgWebsite, socials });
              orgSocials = socials;
            } catch {
              // Ignore org fetch failure
            }
          }
        }

        calls.push({
          ...parsed,
          orgWebsite,
          orgSocials,
        });
      } catch {
        // Continue on single error
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 3. Save to disk
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(calls, null, 2), "utf8");

  console.log(`\n🎉 [Harvest Complete] Saved ${calls.length} structured calls to ${OUTPUT_FILE}`);
}

run().catch((err) => {
  console.error("Harvester failed:", err);
  process.exit(1);
});
