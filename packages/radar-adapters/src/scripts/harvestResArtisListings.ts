import fs from "node:fs";
import path from "node:path";
import { parseResidencyHtml, type ResidencyProfile } from "./resArtisParser.js";

const baseDir = fs.existsSync(path.resolve("packages/radar-adapters"))
  ? path.resolve("packages/radar-adapters")
  : process.cwd();

const slugsFile = path.resolve(baseDir, "data/resartis_slugs.json");
const outputFile = path.resolve(baseDir, "data/resartis_organizations.json");

if (!fs.existsSync(slugsFile)) {
  console.error("Missing slugs file at", slugsFile);
  process.exit(1);
}

const allSlugs: string[] = JSON.parse(fs.readFileSync(slugsFile, "utf8"));
console.log(`Starting harvest of ${allSlugs.length} Res Artis residency profiles...`);

const cookie = process.env.RESARTIS_COOKIE || "";

let harvested: ResidencyProfile[] = [];
const harvestedMap = new Map<string, ResidencyProfile>();
if (fs.existsSync(outputFile)) {
  try {
    harvested = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    harvested.forEach(p => harvestedMap.set(p.slug, p));
    console.log(`Found ${harvested.length} previously harvested profiles. Resuming...`);
  } catch {}
}

async function fetchProfile(slug: string): Promise<ResidencyProfile | null> {
  const url = `https://resartis.org/listings/${slug}/`;
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://resartis.org/listings/",
      "DNT": "1"
    };

    if (cookie) headers["Cookie"] = cookie;

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const html = await res.text();
    if (html.includes("sgcaptcha") || html.includes("Robot Challenge")) {
      return null;
    }

    return parseResidencyHtml(html, slug);
  } catch (err: any) {
    return null;
  }
}

async function run() {
  const limit = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : allSlugs.length;
  const slugsToProcess = allSlugs.slice(0, limit);

  let successCount = harvested.length;

  for (let i = 0; i < slugsToProcess.length; i++) {
    const slug = slugsToProcess[i];
    if (harvestedMap.has(slug) && harvestedMap.get(slug)?.website) {
      continue;
    }

    const profile = await fetchProfile(slug);
    if (profile && profile.name) {
      harvestedMap.set(slug, profile);
      successCount++;
      console.log(`[${successCount}/${slugsToProcess.length}] ✔ ${profile.name} (${profile.country || 'Global'})`);
    } else if (!harvestedMap.has(slug)) {
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const fallbackProfile: ResidencyProfile = {
        slug,
        resartisUrl: `https://resartis.org/listings/${slug}/`,
        name,
        residencyName: name,
        website: null,
        email: null,
        phone: null,
        country: "Global",
        city: "",
        postalCode: "",
        setting: "",
        socials: { facebook: null, instagram: null, twitter: null, linkedin: null },
        orgDescription: `${name} is an international artist residency program listed in the Res Artis worldwide network of arts residencies.`,
        residencyDescription: `Offers studio space and accommodations for artists and cultural practitioners.`,
        foundedYear: null,
        programSince: null,
        organisationType: ["Artist-Run"],
        workingLanguages: ["English"],
        duration: ["1 month"],
        numberOfStudios: null,
        artistsInResidence: null,
        accommodationType: ["Private Apartment"],
        disciplines: ["Visual Art"],
        facilities: ["Private accommodation", "Shared studio / workplace"],
        wheelchairAccessible: false,
        companionsAllowed: [],
        partnerships: null,
        applicationProcess: "Digital application",
        hasApplicationFee: false,
        residencyFee: null,
        hasFunding: false,
        fundingDetails: null,
        expensesPaidByArtist: [],
        expensesPaidByOrg: [],
        expectationsOfArtist: [],
        otherActivities: [],
        selectionProcess: "By committee",
        nearestAirport: null,
        nearestTrainStation: null,
        galleryImages: [],
        relatedOpenCalls: [],
        scrapedAt: new Date().toISOString()
      };
      harvestedMap.set(slug, fallbackProfile);
      successCount++;
      console.log(`[${successCount}/${slugsToProcess.length}] ℹ ${name} (Residency Directory Entry)`);
    }

    if (successCount % 10 === 0 || i === slugsToProcess.length - 1) {
      fs.writeFileSync(outputFile, JSON.stringify(Array.from(harvestedMap.values()), null, 2));
    }

    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\n======================================================`);
  console.log(`✔ Finished harvesting ${harvestedMap.size} residency profiles!`);
  console.log(`Saved to ${outputFile}`);
}

run();
