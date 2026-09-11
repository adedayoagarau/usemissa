import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("packages/radar-adapters/src/ranking/data/residencies");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (res.ok) return await res.text();
      console.warn(`[HTTP ${res.status}] for ${url} (attempt ${i + 1})`);
    } catch (err) {
      console.warn(`[Fetch Error] ${err.message} for ${url} (attempt ${i + 1})`);
    }
    await sleep(1000 * (i + 1));
  }
  return null;
}

function cleanHtml(raw) {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseACAPage(html, url) {
  const slug = url.split("/").pop();

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = cleanHtml(h1Match?.[1]) || slug.replace(/-/g, " ");

  // Website link
  const websiteMatch = html.match(/<a[^>]*class="[^"]*(?:website|link)[^"]*"[^>]*href="([^"]+)"/i) ||
    html.match(/<div class="field--name-field-website[^"]*"[\s\S]*?<a[^>]*href="([^"]+)"/i) ||
    html.match(/<a[^>]*href="([^"]+)"[^>]*>(?:Program Website|Visit Website)/i);
  const website = websiteMatch?.[1] || null;

  // Location / Address
  const addressMatch = html.match(/<div class="field--name-field-address[^"]*"[\s\S]*?<\/div>/i) ||
    html.match(/<div class="[^"]*location[^"]*"[\s\S]*?<\/div>/i);
  const location = cleanHtml(addressMatch?.[0]) || null;

  // Description
  const descMatch = html.match(/<div class="field--name-field-body[^"]*"[\s\S]*?<\/div>/i) ||
    html.match(/<div class="field--type-text-with-summary[^"]*"[\s\S]*?<\/div>/i);
  const description = cleanHtml(descMatch?.[0]) || null;

  // Email
  const emailMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const email = emailMatch?.[1] || null;

  // Disciplines
  const disciplines = [];
  const discMatches = [...html.matchAll(/field--name-field-disciplines[^"]*"[\s\S]*?<\/div>/gi)];
  for (const dm of discMatches) {
    disciplines.push(cleanHtml(dm[0]));
  }

  // Cost / Stipend / Housing keywords detection
  const hasStipend = /stipend|fellowship grant|artist grant|paid fellowship/i.test(html);
  const isFree = /no fee|free of charge|fully funded|100% subsidized/i.test(html);
  const hasMeals = /meals provided|chef|food provided|three meals/i.test(html);
  const hasPrivateStudio = /private studio|dedicated studio|individual studio/i.test(html);

  return {
    source: "artistcommunities.org",
    slug,
    url,
    name,
    website,
    location,
    email,
    description,
    disciplines: disciplines.join(", ") || null,
    stewardship: {
      hasStipend,
      isFree,
      hasMeals,
      hasPrivateStudio,
    },
    crawledAt: new Date().toISOString(),
  };
}

async function main() {
  console.log("Fetching ACA sitemap.xml...");
  const sitemapXml = await fetchWithRetry("https://artistcommunities.org/sitemap.xml");
  if (!sitemapXml) throw new Error("Failed to fetch ACA sitemap.xml");

  const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const orgUrls = locs.filter((u) => u.includes("/directory/organizations/"));

  console.log(`Discovered ${orgUrls.length} organization/residency profiles in ACA sitemap.`);

  const results = [];
  const concurrency = 6;

  for (let i = 0; i < orgUrls.length; i += concurrency) {
    const chunk = orgUrls.slice(i, i + concurrency);
    const promises = chunk.map(async (url) => {
      const html = await fetchWithRetry(url);
      if (!html) return null;
      return parseACAPage(html, url);
    });

    const chunkResults = await Promise.all(promises);
    for (const r of chunkResults) {
      if (r) results.push(r);
    }

    process.stdout.write(`\rCrawled ${results.length} / ${orgUrls.length} ACA programs...`);
    await sleep(200);
  }

  console.log("\nCrawl complete!");
  const outPath = path.join(OUT_DIR, "aca-residencies.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} structured residency records to ${outPath}`);
}

main().catch(console.error);
