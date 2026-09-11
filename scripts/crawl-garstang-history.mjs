import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
const GENRES = ["fiction", "poetry", "nonfiction"];

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseTableRows(html) {
  const rows = [];
  const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (const tr of trMatches) {
    const tdMatches = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tdMatches.length >= 2) {
      const cells = tdMatches.map((m) => cleanText(m[1]));
      // Exclude header row
      if (cells[0].toLowerCase().includes("rank") || cells[1].toLowerCase().includes("magazine")) {
        continue;
      }
      const rank = parseInt(cells[0].replace(/\D/g, ""), 10);
      const name = cells[1].replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
      const score = cells.length >= 4 ? parseFloat(cells[3]) : (cells.length >= 3 ? parseFloat(cells[2]) : null);
      if (name && !isNaN(rank)) {
        rows.push({ rank, name, score: isNaN(score) ? null : score });
      }
    }
  }
  return rows;
}

async function fetchGenreYear(year, genre) {
  const urls = [
    `https://cliffordgarstang.com/${year}-literary-magazine-ranking-${genre}/`,
    `https://cliffordgarstang.com/${year}-literary-magazine-ranking-${genre.replace("nonfiction", "non-fiction")}/`,
    `https://cliffordgarstang.com/${year}-literary-magazine-ranking—${genre}/`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MissaResearchCrawler/1.0)" },
      });
      if (res.ok) {
        const html = await res.text();
        const rows = parseTableRows(html);
        if (rows.length > 0) {
          return { url, rows };
        }
      }
    } catch {
      // try next
    }
  }
  return { url: urls[0], rows: [] };
}

async function main() {
  console.log("Starting 10-year historical crawl...");
  const historicalRecord = {};

  for (const year of YEARS) {
    historicalRecord[year] = {};
    for (const genre of GENRES) {
      process.stdout.write(`Fetching ${year} ${genre}... `);
      const result = await fetchGenreYear(year, genre);
      historicalRecord[year][genre] = result.rows;
      console.log(`Found ${result.rows.length} entries.`);
      // Small pause to be a polite crawler
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  const outPath = join(process.cwd(), "packages/radar-adapters/src/ranking/data/garstang-10yr-history.json");
  await writeFile(outPath, JSON.stringify(historicalRecord, null, 2), "utf8");
  console.log(`Successfully saved 10-year dataset to ${outPath}`);
}

main().catch(console.error);
