import fs from "node:fs";
import path from "node:path";
import type { ArtConnectProfile } from "./artConnectParser.js";

const dataFile = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data/artconnect_organizations.json";

if (!fs.existsSync(dataFile)) {
  console.log(`\n❌ No data file found at ${dataFile}`);
  console.log("Run the harvester first: npx tsx packages/radar-adapters/src/scripts/harvestArtConnectOrgs.ts\n");
  process.exit(1);
}

const orgs: ArtConnectProfile[] = JSON.parse(fs.readFileSync(dataFile, "utf8"));

console.log("\n================================================================================");
console.log("           ARTCONNECT VISUAL ARTS ORGANIZATIONS HARVEST REVIEW                  ");
console.log("================================================================================\n");

console.log(`🏛️ Total Organizations Harvested: ${orgs.length}`);

// Contact Coverage
const withWebsite = orgs.filter(o => !!o.website).length;
const withEmail = orgs.filter(o => !!o.email).length;
const withInsta = orgs.filter(o => !!o.instagram).length;
const withLogo = orgs.filter(o => !!o.profileImageUrl).length;
const withBanner = orgs.filter(o => !!o.headerImageUrl).length;

console.log("\n📊 Contact & Visual Media Coverage:");
console.log(`  • Official Website: ${withWebsite} / ${orgs.length} (${Math.round((withWebsite / orgs.length) * 100)}%)`);
console.log(`  • Direct Email:     ${withEmail} / ${orgs.length} (${Math.round((withEmail / orgs.length) * 100)}%)`);
console.log(`  • Instagram:        ${withInsta} / ${orgs.length} (${Math.round((withInsta / orgs.length) * 100)}%)`);
console.log(`  • Profile Logo:     ${withLogo} / ${orgs.length} (${Math.round((withLogo / orgs.length) * 100)}%)`);
console.log(`  • Header Banner:    ${withBanner} / ${orgs.length} (${Math.round((withBanner / orgs.length) * 100)}%)`);

// Type Breakdown
const typeMap = new Map<string, number>();
for (const o of orgs) {
  const t = o.organizationType || "ORGANIZATION";
  typeMap.set(t, (typeMap.get(t) || 0) + 1);
}
console.log("\n🎨 Organization Types:");
for (const [t, count] of [...typeMap.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  • ${t.padEnd(20)}: ${count}`);
}

// Geographic Breakdown
const countryMap = new Map<string, number>();
for (const o of orgs) {
  const c = o.country || "Global";
  countryMap.set(c, (countryMap.get(c) || 0) + 1);
}
const sortedCountries = [...countryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

console.log("\n🌍 Top 10 Countries:");
for (const [country, count] of sortedCountries) {
  console.log(`  • ${country.padEnd(25)}: ${count} organizations`);
}

// Sample Organization Cards
console.log("\n================================================================================");
console.log("                  SAMPLE ORGANIZATION PROFILES PREVIEW                          ");
console.log("================================================================================\n");

for (const sample of orgs.slice(0, 3)) {
  console.log(`📍 [${sample.country || 'Global'}] ${sample.name.toUpperCase()} (${sample.organizationType})`);
  console.log(`   Profile Kind: ${sample.profileKind}`);
  console.log(`   Location:     ${sample.city ? sample.city + ', ' : ''}${sample.country}`);
  console.log(`   Website:      ${sample.website || 'N/A'}`);
  console.log(`   Email:        ${sample.email || 'N/A'}`);
  console.log(`   Instagram:    ${sample.instagram || 'N/A'}`);
  console.log(`   Logo URL:     ${sample.profileImageUrl || 'N/A'}`);
  console.log(`   Disciplines:  ${sample.artisticFields.join(', ')}`);
  console.log(`   Bio:          ${sample.about.slice(0, 180)}...`);
  console.log("--------------------------------------------------------------------------------");
}
