import fs from "node:fs";
import type { AcaOpenCall } from "./acaParser.js";

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/aca_opencalls.json";

if (!fs.existsSync(dataFile)) {
  console.log(`\n❌ No data file found at ${dataFile}`);
  console.log("Run the harvester first: npm --prefix packages/radar-adapters run aca:harvest\n");
  process.exit(1);
}

const calls: AcaOpenCall[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));

console.log("\n================================================================================");
console.log("       ARTIST COMMUNITIES ALLIANCE (ACA) OPEN CALLS REVIEW                      ");
console.log("================================================================================\n");

console.log(`🏛️ Total Active Open Calls: ${calls.length}`);

// Funding & Financial Breakdown
const withStipend = calls.filter(c => !!c.stipendAmount && c.stipendAmount > 0);
const fullyFunded = calls.filter(c => c.isFullyFunded);
const freeToApply = calls.filter(c => c.isFreeToApply);
const withHousing = calls.filter(c => !!c.housingType);
const withMeals = calls.filter(c => !!c.mealsProvided && c.mealsProvided !== "No meals provided");
const withDeadline = calls.filter(c => !!c.deadlineDate);

console.log("\n💰 Financials & Support Coverage:");
console.log(`  • Fully Funded (Free/Stipend): ${fullyFunded.length} / ${calls.length} (${Math.round((fullyFunded.length / calls.length) * 100)}%)`);
console.log(`  • Providing Cash Stipend:     ${withStipend.length} / ${calls.length} (${Math.round((withStipend.length / calls.length) * 100)}%)`);
if (withStipend.length > 0) {
  const avgStipend = Math.round(withStipend.reduce((acc, c) => acc + (c.stipendAmount || 0), 0) / withStipend.length);
  const maxStipend = Math.max(...withStipend.map(c => c.stipendAmount || 0));
  console.log(`    → Average Stipend: $${avgStipend} | Maximum: $${maxStipend}`);
}
console.log(`  • Free to Apply ($0 fee):      ${freeToApply.length} / ${calls.length} (${Math.round((freeToApply.length / calls.length) * 100)}%)`);
console.log(`  • Housing Provided:            ${withHousing.length} / ${calls.length} (${Math.round((withHousing.length / calls.length) * 100)}%)`);
console.log(`  • Meals Provided:              ${withMeals.length} / ${calls.length} (${Math.round((withMeals.length / calls.length) * 100)}%)`);
console.log(`  • Explicit Deadline Date:      ${withDeadline.length} / ${calls.length} (${Math.round((withDeadline.length / calls.length) * 100)}%)`);

// Sample Cards
console.log("\n================================================================================");
console.log("                  SAMPLE RESIDENCY OPEN CALLS PREVIEW                           ");
console.log("================================================================================\n");

for (const sample of calls.slice(0, 3)) {
  console.log(`📌 ${sample.title.toUpperCase()}`);
  console.log(`   Host Organization: ${sample.organizationName}`);
  console.log(`   Deadline:          ${sample.deadlineDate || 'Rolling / Unspecified'}`);
  console.log(`   Cash Stipend:      ${sample.stipendAmount ? '$' + sample.stipendAmount : 'None reported'}`);
  console.log(`   Travel Allowance:  ${sample.travelStipend ? '$' + sample.travelStipend : 'None reported'}`);
  console.log(`   Residency Fee:     ${sample.residencyFee === 0 ? '$0 (Fully Funded)' : (sample.residencyFee ? '$' + sample.residencyFee : 'N/A')}`);
  console.log(`   Application Fee:   ${sample.applicationFee === 0 ? '$0 (Free to apply)' : (sample.applicationFee ? '$' + sample.applicationFee : 'N/A')}`);
  console.log(`   Housing:           ${sample.housingType || 'N/A'}`);
  console.log(`   Meals:             ${sample.mealsProvided || 'N/A'}`);
  console.log(`   Application URL:   ${sample.applicationUrl || sample.url}`);
  console.log(`   Description:       ${sample.description.slice(0, 180)}...`);
  console.log("--------------------------------------------------------------------------------");
}
