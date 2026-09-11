import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

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

const URL_PATTERNS = {
  2018: {
    fiction: ["https://cliffordgarstang.com/2018-literary-magazine-ranking-fiction/", "https://cliffordgarstang.com/category/2018-ranking/2018-literary-magazine-ranking-fiction/"],
    nonfiction: ["https://cliffordgarstang.com/2018-literary-magazine-ranking-nonfiction/", "https://cliffordgarstang.com/category/2018-ranking/2018-literary-magazine-ranking-nonfiction/"],
    poetry: ["https://cliffordgarstang.com/2018-literary-magazine-ranking-poetry/", "https://cliffordgarstang.com/category/2018-ranking/2018-literary-magazine-ranking-poetry/"],
  },
  2017: {
    fiction: ["https://cliffordgarstang.com/2017-perpetual-folly-literary-magazine-ranking-fiction/", "https://cliffordgarstang.com/2017-literary-magazine-ranking-fiction/"],
    nonfiction: ["https://cliffordgarstang.com/2017-perpetual-folly-literary-magazine-ranking-nonfiction/", "https://cliffordgarstang.com/2017-literary-magazine-ranking-nonfiction/"],
    poetry: ["https://cliffordgarstang.com/2017-perpetual-folly-literary-magazine-ranking-poetry/", "https://cliffordgarstang.com/2017-literary-magazine-ranking-poetry/"],
  },
  2016: {
    fiction: ["https://cliffordgarstang.com/2016-pushcart-prize-literary-magazine-rankings-fiction/", "https://cliffordgarstang.com/2016-literary-magazine-ranking-fiction/"],
    nonfiction: ["https://cliffordgarstang.com/2016-pushcart-prize-literary-magazine-rankings-nonfiction/", "https://cliffordgarstang.com/2016-literary-magazine-ranking-nonfiction/"],
    poetry: ["https://cliffordgarstang.com/2016-pushcart-prize-literary-magazine-rankings-poetry/", "https://cliffordgarstang.com/2016-literary-magazine-ranking-poetry/"],
  }
};

async function main() {
  const jsonPath = join(process.cwd(), "packages/radar-adapters/src/ranking/data/garstang-10yr-history.json");
  const data = JSON.parse(await readFile(jsonPath, "utf8"));

  for (const [year, genres] of Object.entries(URL_PATTERNS)) {
    for (const [genre, urls] of Object.entries(genres)) {
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (res.ok) {
            const html = await res.text();
            const rows = parseTableRows(html);
            if (rows.length > 0) {
              console.log(`Found ${rows.length} entries for ${year} ${genre} at ${url}`);
              data[year][genre] = rows;
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  await writeFile(jsonPath, JSON.stringify(data, null, 2), "utf8");
  console.log("Updated 10-year dataset with earlier years.");
}

main().catch(console.error);
