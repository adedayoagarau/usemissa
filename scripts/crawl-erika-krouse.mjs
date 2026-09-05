import fs from "node:fs";

async function main() {
  const url = "https://erikakrousewriter.com/erika-krouses-ocd-ranking-of-483-literary-magazines-for-short-fiction";
  console.log("Fetching Erika Krouse 500 Litmag Ranking from:", url);
  const res = await fetch(url);
  const html = await res.text();

  // Split on strong Tier headings
  const tierParts = html.split(/<strong>(Tier\s*\d+[^<]*)<\/strong>/i);
  console.log("Found tier sections:", Math.floor(tierParts.length / 2));

  const allTiers = {};
  let totalMags = 0;

  for (let i = 1; i < tierParts.length; i += 2) {
    const header = tierParts[i].trim();
    const body = tierParts[i + 1] || "";
    const tierNumMatch = header.match(/Tier\s*(\d+)/i);
    const tierNum = tierNumMatch ? parseInt(tierNumMatch[1], 10) : i;

    // Extract all <p>...</p> tags
    const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(m => m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "-")
        .replace(/&#8212;/g, "—")
        .replace(/&amp;/g, "&")
        .trim())
      .filter(p => p.length > 5);

    const magazines = [];
    for (const p of paragraphs) {
      // Check if paragraph contains "Score:" or "Circulation:"
      if (!p.includes("Score:") && !p.includes("Circulation:") && !p.includes("Payment:")) {
        continue;
      }

      // Format is "Magazine Name — Score: 123 ..."
      const dashMatch = p.match(/^([^—–\-]+)\s*[—–\-]\s*(?:Score:\s*(\d+))?/i);
      if (dashMatch) {
        const name = dashMatch[1].trim();
        const score = dashMatch[2] ? parseInt(dashMatch[2], 10) : null;

        let payment = null;
        const payMatch = p.match(/Payment:\s*([^,]+)/i);
        if (payMatch) payment = payMatch[1].trim();

        let responseTimeMonths = null;
        const respMatch = p.match(/Response Time\s*(?:\(months\))?:\s*([^,]+)/i);
        if (respMatch) responseTimeMonths = respMatch[1].trim();

        let maxWordCount = null;
        const wcMatch = p.match(/Maximum Word Count:\s*([^,]+)/i);
        if (wcMatch) maxWordCount = wcMatch[1].trim();

        if (name && !name.toLowerCase().startsWith("tier") && name.length >= 2) {
          magazines.push({
            name,
            krouseScore: score,
            tier: tierNum,
            payment,
            responseTimeMonths,
            maxWordCount,
          });
          totalMags++;
        }
      }
    }

    allTiers[`tier_${tierNum}`] = {
      tierNumber: tierNum,
      tierTitle: header,
      count: magazines.length,
      magazines,
    };
    console.log(`Tier ${tierNum} (${header.substring(0, 40)}...): ${magazines.length} magazines`);
  }

  console.log(`Total magazines parsed across tiers: ${totalMags}`);
  const outputPath = "packages/radar-adapters/src/ranking/data/erika-krouse-tiers.json";
  fs.writeFileSync(outputPath, JSON.stringify(allTiers, null, 2), "utf8");
  console.log("Successfully saved Erika Krouse dataset to:", outputPath);
}

main().catch(console.error);
