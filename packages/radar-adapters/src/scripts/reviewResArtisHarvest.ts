import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ResidencyProfile } from "./resArtisParser.js";

// Canonical data directory path
const dataDir = "/Volumes/Crucial X10/usemissa/packages/radar-adapters/data";
const dataFile = path.join(dataDir, "resartis_organizations.json");
const downloadsFile = path.join(os.homedir(), "Downloads", "resartis_organizations.json");

// Auto-copy from Downloads if user downloaded it from browser
if (fs.existsSync(downloadsFile)) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.copyFileSync(downloadsFile, dataFile);
  console.log(`📥 Found fresh dataset in Downloads! Copied to ${dataFile}`);
}

if (!fs.existsSync(dataFile)) {
  console.log(`\n❌ No data file found at ${dataFile}`);
  console.log("Please paste the script in Chrome DevTools Console first (Cmd+V, then Enter).\n");
  process.exit(1);
}

const raw = fs.readFileSync(dataFile, "utf8");
const orgs: ResidencyProfile[] = JSON.parse(raw);

console.log("\n================================================================================");
console.log("           RES ARTIS RESIDENCY ORGANIZATIONS HARVEST REVIEW                    ");
console.log("================================================================================\n");

console.log(`🏛️ Total Residency Organizations Harvested: ${orgs.length}`);

const withWebsite = orgs.filter(o => !!o.website).length;
const withEmail = orgs.filter(o => !!o.email).length;
const withPhone = orgs.filter(o => !!o.phone).length;
const withSocials = orgs.filter(o => !!o.socials?.instagram || !!o.socials?.facebook).length;
const withGallery = orgs.filter(o => o.galleryImages?.length > 0).length;
const withCalls = orgs.filter(o => o.relatedOpenCalls?.length > 0).length;

console.log("\n📊 Contact & Media Coverage:");
console.log(`  • Official Website: ${withWebsite} / ${orgs.length} (${Math.round((withWebsite / orgs.length) * 100)}%)`);
console.log(`  • Direct Email:     ${withEmail} / ${orgs.length} (${Math.round((withEmail / orgs.length) * 100)}%)`);
console.log(`  • Phone Number:     ${withPhone} / ${orgs.length} (${Math.round((withPhone / orgs.length) * 100)}%)`);
console.log(`  • Social Media:     ${withSocials} / ${orgs.length} (${Math.round((withSocials / orgs.length) * 100)}%)`);
console.log(`  • Photo Gallery:    ${withGallery} / ${orgs.length} (${Math.round((withGallery / orgs.length) * 100)}%)`);
console.log(`  • Linked Open Calls:${withCalls} / ${orgs.length} (${Math.round((withCalls / orgs.length) * 100)}%)`);

const countryMap = new Map<string, number>();
for (const o of orgs) {
  const c = o.country || "Unspecified";
  countryMap.set(c, (countryMap.get(c) || 0) + 1);
}
const sortedCountries = [...countryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

console.log("\n🌍 Top 10 Countries:");
for (const [country, count] of sortedCountries) {
  console.log(`  • ${country.padEnd(25)}: ${count} residency centers`);
}

console.log("\n================================================================================");
console.log("                  SAMPLE RESIDENCY PROFILES PREVIEW                             ");
console.log("================================================================================\n");

for (const sample of orgs.slice(0, 3)) {
  console.log(`📍 [${sample.country || 'Global'}] ${sample.name.toUpperCase()}`);
  console.log(`   Program:    ${sample.residencyName}`);
  console.log(`   Website:    ${sample.website || 'N/A'}`);
  console.log(`   Email:      ${sample.email || 'N/A'}`);
  console.log(`   Phone:      ${sample.phone || 'N/A'}`);
  console.log(`   Instagram:  ${sample.socials?.instagram || 'N/A'}`);
  console.log(`   Setting:    ${sample.setting || 'N/A'}`);
  console.log(`   Fees:       App Fee: ${sample.hasApplicationFee ? 'Yes' : 'No'} | Funding Provided: ${sample.hasFunding ? 'Yes' : 'No'}`);
  if (sample.residencyFee) console.log(`   Fee Details:${sample.residencyFee.slice(0, 100)}...`);
  console.log(`   Photos:     ${sample.galleryImages?.length || 0} images`);
  console.log(`   Open Calls: ${sample.relatedOpenCalls?.length || 0} linked call(s)`);
  console.log(`   Bio:        ${(sample.orgDescription || sample.residencyDescription || '').slice(0, 180)}...`);
  console.log("--------------------------------------------------------------------------------");
}
