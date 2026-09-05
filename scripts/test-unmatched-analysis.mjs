import fs from "node:fs";

const history = JSON.parse(fs.readFileSync("packages/radar-adapters/src/ranking/data/garstang-10yr-history.json", "utf8"));
const names = new Set();
for (const yr of Object.values(history)) {
  for (const g of Object.values(yr)) {
    for (const item of g) {
      names.add(item.name);
    }
  }
}

const numericOnly = [...names].filter(n => /^\d+$/.test(n.trim()));
console.log("Numeric names found in crawl:", numericOnly);

const sampleOdd = [...names].filter(n => n.length <= 3 || /[0-9]/.test(n));
console.log("Odd/short names:", sampleOdd.slice(0, 20));
