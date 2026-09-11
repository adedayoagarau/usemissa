export interface ResidencyProfile {
  slug: string;
  resartisUrl: string;
  name: string;
  residencyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  city: string;
  postalCode: string;
  setting: string;
  socials: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
  };
  orgDescription: string;
  residencyDescription: string;
  foundedYear: string | null;
  programSince: string | null;
  organisationType: string[];
  workingLanguages: string[];
  duration: string[];
  numberOfStudios: string | null;
  artistsInResidence: string | null;
  accommodationType: string[];
  disciplines: string[];
  facilities: string[];
  wheelchairAccessible: boolean;
  companionsAllowed: string[];
  partnerships: string | null;
  applicationProcess: string | null;
  hasApplicationFee: boolean;
  residencyFee: string | null;
  hasFunding: boolean;
  fundingDetails: string | null;
  expensesPaidByArtist: string[];
  expensesPaidByOrg: string[];
  expectationsOfArtist: string[];
  otherActivities: string[];
  selectionProcess: string | null;
  nearestAirport: string | null;
  nearestTrainStation: string | null;
  galleryImages: string[];
  relatedOpenCalls: string[];
  scrapedAt: string;
}

export function parseResidencyHtml(html: string, slug: string): ResidencyProfile {
  const clean = (val: string | null | undefined) =>
    val ? val.replace(/&nbsp;/g, " ").replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim() : "";

  // Title / Org Name
  const nameMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const name = clean(nameMatch ? nameMatch[1] : slug.replace(/-/g, " "));

  // Direct Contacts
  const emailMatch = html.match(/href="mailto:([^"?]+)/i);
  const email = emailMatch ? emailMatch[1].trim() : null;

  const phoneMatch = html.match(/href="tel:([^"]+)"/i);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  const websiteMatch = html.match(/class="[^"]*listing--website[^"]*"[^>]*href="([^"]+)"/i);
  const website = websiteMatch ? websiteMatch[1].trim() : null;

  // Residency Name
  const resNameMatch = html.match(/Name of Residency:<\/strong>\s*([^<]+)/i);
  const residencyName = clean(resNameMatch ? resNameMatch[1] : name);

  // Descriptions
  const descOrgMatch = html.match(/Description of Organisation:<\/strong>\s*([\s\S]*?)<\/div>/i);
  const orgDescription = clean(descOrgMatch ? descOrgMatch[1] : "");

  const resDescMatch = html.match(/<div class="job_description"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  const residencyDescription = clean(resDescMatch ? resDescMatch[1] : "");

  // Location & Setting
  const countryMatch = html.match(/Country long:<\/strong>\s*([^<]+)/i);
  const country = clean(countryMatch ? countryMatch[1] : "");

  const postMatch = html.match(/Postal Code:<\/strong>\s*([^<]+)/i);
  const postalCode = clean(postMatch ? postMatch[1] : "");

  const settingMatch = html.match(/Setting:<\/strong>\s*([^<]+)/i);
  const setting = clean(settingMatch ? settingMatch[1] : "");

  const airportMatch = html.match(/Nearest Airport:<\/strong>\s*([^<]+)/i);
  const nearestAirport = clean(airportMatch ? airportMatch[1] : null);

  const trainMatch = html.match(/Nearest Train Station:<\/strong>\s*([^<]+)/i);
  const nearestTrainStation = clean(trainMatch ? trainMatch[1] : null);

  // Socials
  const fbMatch = html.match(/href="([^"]*facebook\.com[^"]*)"/i);
  const igMatch = html.match(/href="([^"]*instagram\.com[^"]*)"/i);
  const twMatch = html.match(/href="([^"]*(?:twitter|x)\.com[^"]*)"/i);
  const liMatch = html.match(/href="([^"]*linkedin\.com[^"]*)"/i);

  // Years
  const foundedMatch = html.match(/Organisation founded in:<\/strong>\s*([^<]+)/i);
  const foundedYear = clean(foundedMatch ? foundedMatch[1] : null);

  const programMatch = html.match(/Residency Programme since:<\/strong>\s*([^<]+)/i);
  const programSince = clean(programMatch ? programMatch[1] : null);

  // Multi-value list helper
  const extractList = (idPrefix: string): string[] => {
    const regex = new RegExp(`<li[^>]*id="[^"]*${idPrefix}[^"]*"[^>]*>([\\s\\S]*?)<\\/li>`, "gi");
    return [...html.matchAll(regex)].map(m => clean(m[1])).filter(Boolean);
  };

  const organisationType = extractList("listing_organisation_type");
  const workingLanguages = extractList("listing_languages");
  const duration = extractList("listing_residency_duration");
  const accommodationType = [...html.matchAll(/<div[^>]*class="[^"]*listing_accommodation_type-[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
    .map(m => clean(m[1])).filter(Boolean);
  const disciplines = extractList("listing_residency_disciplines");
  const facilities = extractList("listing_resources");
  const companionsAllowed = extractList("listing_companions_allowed");
  const expensesPaidByArtist = extractList("listing_expenses_paid_by_artist");
  const expensesPaidByOrg = extractList("listing_organisation_expenses");
  const expectationsOfArtist = extractList("listing_expectations_of_artist");
  const otherActivities = extractList("listing_other_activities");

  // Operational Specs
  const studiosMatch = html.match(/Number of studios:<\/strong>\s*([^<]+)/i);
  const numberOfStudios = clean(studiosMatch ? studiosMatch[1] : null);

  const artistsMatch = html.match(/Number of artists in residence at one time:<\/strong>\s*([^<]+)/i);
  const artistsInResidence = clean(artistsMatch ? artistsMatch[1] : null);

  const wheelchairMatch = html.match(/Is your residency wheelchair accessible\?:<\/strong>\s*([^<]+)/i);
  const wheelchairAccessible = clean(wheelchairMatch ? wheelchairMatch[1] : "").toLowerCase().includes("yes");

  const partnershipsMatch = html.match(/partnerships beneficial to resident artists\?[^:]*:<\/strong>\s*([^<]+)/i);
  const partnerships = clean(partnershipsMatch ? partnershipsMatch[1] : null);

  const appProcessMatch = html.match(/Application process:<\/strong>\s*([^<]+)/i);
  const applicationProcess = clean(appProcessMatch ? appProcessMatch[1] : null);

  // Financials & Fees
  const appFeeMatch = html.match(/Do you charge an application fee[^:]*:<\/strong>\s*([^<]+)/i);
  const hasApplicationFee = clean(appFeeMatch ? appFeeMatch[1] : "").toLowerCase().includes("yes");

  const resFeeMatch = html.match(/what is the residency fee\?[^:]*:<\/strong>\s*([^<]+)/i);
  const residencyFee = clean(resFeeMatch ? resFeeMatch[1] : null);

  const fundsMatch = html.match(/Do you provide the residents with any funds[^:]*:<\/strong>\s*([^<]+)/i);
  const hasFunding = clean(fundsMatch ? fundsMatch[1] : "").toLowerCase().includes("yes");

  const grantsMatch = html.match(/amount of the fund\?[^:]*:<\/strong>\s*([^<]+)/i);
  const fundingDetails = clean(grantsMatch ? grantsMatch[1] : null);

  const selectionMatch = html.match(/Selection process:<\/strong>\s*([^<]+)/i);
  const selectionProcess = clean(selectionMatch ? selectionMatch[1] : null);

  // High-Res Photos Gallery
  const galleryRegex = /<a[^>]*class="[^"]*listing-gallery__item[^"]*"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*class="[^"]*listing-gallery__item[^"]*"/gi;
  const galleryImages = [...new Set([...html.matchAll(galleryRegex)].map(m => m[1] || m[2]).filter(Boolean))];

  // Related Open Calls
  const callsRegex = /href="(https:\/\/resartis\.org\/open-call\/[^"]+)"/g;
  const relatedOpenCalls = [...new Set([...html.matchAll(callsRegex)].map(m => m[1]))];

  return {
    slug,
    resartisUrl: `https://resartis.org/listings/${slug}/`,
    name,
    residencyName,
    website,
    email,
    phone,
    country,
    city: setting ? `${setting} region` : "",
    postalCode,
    setting,
    socials: {
      facebook: fbMatch ? fbMatch[1] : null,
      instagram: igMatch ? igMatch[1] : null,
      twitter: twMatch ? twMatch[1] : null,
      linkedin: liMatch ? liMatch[1] : null,
    },
    orgDescription,
    residencyDescription,
    foundedYear,
    programSince,
    organisationType,
    workingLanguages,
    duration,
    numberOfStudios,
    artistsInResidence,
    accommodationType,
    disciplines,
    facilities,
    wheelchairAccessible,
    companionsAllowed,
    partnerships,
    applicationProcess,
    hasApplicationFee,
    residencyFee,
    hasFunding,
    fundingDetails,
    expensesPaidByArtist,
    expensesPaidByOrg,
    expectationsOfArtist,
    otherActivities,
    selectionProcess,
    nearestAirport,
    nearestTrainStation,
    galleryImages,
    relatedOpenCalls,
    scrapedAt: new Date().toISOString(),
  };
}
