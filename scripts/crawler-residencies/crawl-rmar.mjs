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

function parseResidencyPage(html, url) {
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let org = null;
  let event = null;

  for (const j of jsonLdMatches) {
    try {
      const parsed = JSON.parse(j[1]);
      const graph = parsed["@graph"] || (Array.isArray(parsed) ? parsed : [parsed]);
      for (const item of graph) {
        if (
          item["@type"] === "EducationalOrganization" ||
          item["@type"] === "Organization" ||
          (item["@type"] && item.aggregateRating)
        ) {
          if (!org || item.aggregateRating) {
            org = item;
          }
        }
        if (item["@type"] === "Event") {
          event = item;
        }
      }
    } catch {}
  }

  // Fallback regex scraping if JSON-LD is minimal
  const slug = url.split("/").pop();
  const name = org?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const website = org?.sameAs?.[0] || org?.url || null;
  const location = org?.address?.addressLocality
    ? `${org.address.addressLocality}, ${org.address.addressCountry || ""}`.trim()
    : null;
  const ratingValue = org?.aggregateRating?.ratingValue ? Number(org.aggregateRating.ratingValue) : null;
  const ratingCount = org?.aggregateRating?.ratingCount ? Number(org.aggregateRating.ratingCount) : null;
  const reviewCount = org?.aggregateRating?.reviewCount ? Number(org.aggregateRating.reviewCount) : null;
  const foundingDate = org?.foundingDate ? String(org.foundingDate) : null;

  const reviews = (org?.review || []).map((r) => ({
    author: r.author?.name || "Anonymous",
    name: r.name || "",
    body: r.reviewBody || "",
    date: r.datePublished || "",
    rating: r.reviewRating?.ratingValue ? Number(r.reviewRating.ratingValue) : null,
  }));

  const callInfo = event
    ? {
        name: event.name || null,
        description: event.description || null,
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        applicationUrl: event.offers?.url || null,
        deadline: event.offers?.validThrough || null,
        price: event.offers?.price != null ? Number(event.offers.price) : null,
      }
    : null;

  return {
    source: "ratemyartistresidency.com",
    slug,
    url,
    name,
    website,
    location,
    foundingDate,
    ratingValue,
    ratingCount,
    reviewCount,
    reviews,
    callInfo,
    crawledAt: new Date().toISOString(),
  };
}

async function main() {
  console.log("Fetching RMAR sitemap.xml...");
  const sitemapXml = await fetchWithRetry("https://ratemyartistresidency.com/sitemap.xml");
  if (!sitemapXml) {
    throw new Error("Failed to fetch sitemap.xml");
  }

  const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const residencyUrls = locs.filter((u) => u.includes("/residency/"));

  console.log(`Discovered ${residencyUrls.length} individual residency programs in RMAR sitemap.`);

  const results = [];
  const concurrency = 5;

  for (let i = 0; i < residencyUrls.length; i += concurrency) {
    const chunk = residencyUrls.slice(i, i + concurrency);
    const promises = chunk.map(async (url) => {
      const html = await fetchWithRetry(url);
      if (!html) return null;
      return parseResidencyPage(html, url);
    });

    const chunkResults = await Promise.all(promises);
    for (const r of chunkResults) {
      if (r) results.push(r);
    }

    process.stdout.write(`\rCrawled ${results.length} / ${residencyUrls.length} residencies...`);
    await sleep(250);
  }

  console.log("\nCrawl complete!");
  const outPath = path.join(OUT_DIR, "rmar-residencies.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} structured residency records to ${outPath}`);
}

main().catch(console.error);
