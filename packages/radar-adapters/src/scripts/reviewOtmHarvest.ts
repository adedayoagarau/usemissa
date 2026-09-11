import fs from "node:fs";
import type { OtmGrant } from "./otmParser.js";

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/otm_grants.json";

if (!fs.existsSync(dataFile)) {
  console.log(`\n❌ No data file found at ${dataFile}`);
  console.log("Run the harvester first: npm --prefix packages/radar-adapters run otm:harvest\n");
  process.exit(1);
}

const grants: OtmGrant[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));

console.log("\n================================================================================");
console.log("       ON THE MOVE (OTM) INTERNATIONAL MOBILITY GRANTS REVIEW                   ");
console.log("================================================================================\n");

console.log(`🏛️ Total Active International Mobility Grants: ${grants.length}`);

// Financial & Application Coverage
const withPrize = grants.filter(g => !!g.prize);
const withAppUrl = grants.filter(g => !!g.applicationUrl);
const withDeadline = grants.filter(g => !!g.deadlineDate);

console.log("\n💰 Grant Details & Link Coverage:");
console.log(`  • Explicit Funding / Prize Detected: ${withPrize.length} / ${grants.length} (${Math.round((withPrize.length / grants.length) * 100)}%)`);
console.log(`  • Official Direct Application Link:  ${withAppUrl.length} / ${grants.length} (${Math.round((withAppUrl.length / grants.length) * 100)}%)`);
console.log(`  • Explicit Deadline Date:            ${withDeadline.length} / ${grants.length} (${Math.round((withDeadline.length / grants.length) * 100)}%)`);

// Sample Cards
console.log("\n================================================================================");
console.log("                  SAMPLE MOBILITY GRANTS PREVIEW                                ");
console.log("================================================================================\n");

for (const sample of grants.slice(0, 3)) {
  console.log(`📌 ${sample.title.toUpperCase()}`);
  console.log(`   Host Foundation:   ${sample.organizationName}`);
  console.log(`   Deadline:          ${sample.deadlineDate || 'Rolling / Unspecified'}`);
  console.log(`   Funding / Award:   ${sample.prize || 'Travel / production funding'}`);
  console.log(`   Application URL:   ${sample.applicationUrl || sample.url}`);
  console.log(`   Disciplines:       ${sample.disciplines.join(', ')}`);
  console.log(`   Summary:           ${sample.description.slice(0, 180)}...`);
  console.log("--------------------------------------------------------------------------------");
}
