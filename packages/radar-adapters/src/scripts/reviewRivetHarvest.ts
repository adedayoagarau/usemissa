import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../data/rivet_calls.json");

if (!fs.existsSync(DATA_FILE)) {
  console.error("Data file not found. Run npm run rivet:harvest first.");
  process.exit(1);
}

const calls = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const today = new Date().toISOString().slice(0, 10);

console.log(`\n📊 [Rivet Harvest Review]`);
console.log(`Total calls harvested: ${calls.length}`);

const withDeadline = calls.filter((c: any) => c.deadlineDate);
const activeDeadlines = calls.filter((c: any) => c.deadlineDate && c.deadlineDate >= today);
const withoutDeadline = calls.filter((c: any) => !c.deadlineDate);

console.log(`Calls with deadlines: ${withDeadline.length}`);
console.log(`Active / upcoming deadlines: ${activeDeadlines.length}`);
console.log(`Rolling / no deadline: ${withoutDeadline.length}`);

// Unique hosts
const hosts = new Set(calls.map((c: any) => c.organizationName));
console.log(`Unique host organizations: ${hosts.size}`);

// Unique countries
const countries = new Set(calls.map((c: any) => c.country).filter(Boolean));
console.log(`Countries represented: ${countries.size} (${[...countries].slice(0, 10).join(", ")})`);

console.log(`\nSample active upcoming opportunities:`);
for (const c of activeDeadlines.slice(0, 8)) {
  console.log(`  • [${c.deadlineDate}] ${c.title} — Host: ${c.organizationName} (${c.country || c.location || "International"})`);
  if (c.facilities?.length) console.log(`    Facilities: ${c.facilities.slice(0, 4).join(", ")}`);
  if (c.costs) console.log(`    Costs/Fee: ${c.costs}`);
}
