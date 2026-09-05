import fs from "node:fs";

const history = JSON.parse(fs.readFileSync("packages/radar-adapters/src/ranking/data/garstang-10yr-history.json", "utf8"));
const sample2026Fiction = history["2026"]["fiction"].slice(0, 10);
console.log("2026 Fiction Top 10 from Garstang:\n", sample2026Fiction);
