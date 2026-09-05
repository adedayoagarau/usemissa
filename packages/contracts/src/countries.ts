import { z } from "zod";

/**
 * ISO 3166-1 alpha-2 country code schema.
 * Two uppercase ASCII characters or special 'global' indicator.
 */
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (code) => /^[A-Z]{2}$/.test(code) || code === "GLOBAL",
    "Expected a 2-letter ISO 3166-1 country code or 'GLOBAL'",
  );

export type CountryCode = z.infer<typeof countryCodeSchema>;

export interface CountryMetadata {
  code: string;
  name: string;
  region?: string;
  isPublishingHub?: boolean;
}

/**
 * Canonical ISO-3166-1 alpha-2 mapping with common publishing names.
 */
export const CANONICAL_COUNTRIES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  NG: "Nigeria",
  IE: "Ireland",
  ZA: "South Africa",
  KE: "Kenya",
  GH: "Ghana",
  NZ: "New Zealand",
  IN: "India",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  JP: "Japan",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PT: "Portugal",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  PL: "Poland",
  GR: "Greece",
  TR: "Turkey",
  EG: "Egypt",
  MA: "Morocco",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  SN: "Senegal",
  ZW: "Zimbabwe",
  JM: "Jamaica",
  TT: "Trinidad and Tobago",
  SG: "Singapore",
  MY: "Malaysia",
  PH: "Philippines",
  KR: "South Korea",
  CN: "China",
  TW: "Taiwan",
  HK: "Hong Kong",
  IL: "Israel",
  PS: "Palestine",
  LB: "Lebanon",
  JO: "Jordan",
  AE: "United Arab Emirates",
};

/**
 * Common aliases, variations, and legacy names mapped to 2-letter code.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  "u.s.a.": "US",
  "u.s.": "US",
  "the united states": "US",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "u.k.": "GB",
  canada: "CA",
  australia: "AU",
  nigeria: "NG",
  ireland: "IE",
  "republic of ireland": "IE",
  eire: "IE",
  "south africa": "ZA",
  kenya: "KE",
  ghana: "GH",
  "new zealand": "NZ",
  india: "IN",
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  spain: "ES",
  españa: "ES",
  italy: "IT",
  italia: "IT",
  netherlands: "NL",
  holland: "NL",
  japan: "JP",
  brazil: "BR",
  brasil: "BR",
  mexico: "MX",
  méxico: "MX",
  argentina: "AR",
  chile: "CL",
  colombia: "CO",
  portugal: "PT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  iceland: "IS",
  switzerland: "CH",
  austria: "AT",
  belgium: "BE",
  poland: "PL",
  greece: "GR",
  turkey: "TR",
  egypt: "EG",
  morocco: "MA",
  uganda: "UG",
  tanzania: "TZ",
  rwanda: "RW",
  senegal: "SN",
  zimbabwe: "ZW",
  jamaica: "JM",
  trinidad: "TT",
  "trinidad and tobago": "TT",
  singapore: "SG",
  malaysia: "MY",
  philippines: "PH",
  "south korea": "KR",
  korea: "KR",
  china: "CN",
  taiwan: "TW",
  "hong kong": "HK",
  israel: "IL",
  palestine: "PS",
  lebanon: "LB",
  jordan: "JO",
  uae: "AE",
  "united arab emirates": "AE",
  global: "GLOBAL",
  worldwide: "GLOBAL",
  international: "GLOBAL",
};

/**
 * Normalizes an arbitrary country string or code to canonical code and display name.
 */
export function normalizeCountry(
  input?: string | null,
): { countryCode: string; country: string } | null {
  if (!input || typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper === "GLOBAL" || upper === "WORLDWIDE" || upper === "INTERNATIONAL") {
    return { countryCode: "GLOBAL", country: "Worldwide" };
  }

  // Exact 2-letter match
  if (/^[A-Z]{2}$/.test(upper) && CANONICAL_COUNTRIES[upper]) {
    return { countryCode: upper, country: CANONICAL_COUNTRIES[upper] };
  }

  const lower = raw.toLowerCase();
  const matchedCode = COUNTRY_ALIASES[lower];
  if (matchedCode) {
    if (matchedCode === "GLOBAL") {
      return { countryCode: "GLOBAL", country: "Worldwide" };
    }
    return {
      countryCode: matchedCode,
      country: CANONICAL_COUNTRIES[matchedCode] ?? raw,
    };
  }

  // If 2-letter uppercase unknown code, keep as fallback
  if (/^[A-Z]{2}$/.test(upper)) {
    return { countryCode: upper, country: upper };
  }

  // Check if string ends with a country name or alias (e.g. from address line)
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (alias === "global" || alias === "worldwide") continue;
    const regex = new RegExp(`\\b${alias}\\b`, "i");
    if (regex.test(lower)) {
      return {
        countryCode: code,
        country: CANONICAL_COUNTRIES[code] ?? raw,
      };
    }
  }

  return null;
}

/**
 * Lookup country name from ISO code.
 */
export function countryNameFromCode(code?: string | null): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (upper === "GLOBAL") return "Worldwide";
  return CANONICAL_COUNTRIES[upper] ?? upper;
}

/**
 * Curated primary publishing hub countries for top-level filter tabs/pills.
 */
export const PRIMARY_PUBLISHING_COUNTRIES = [
  { code: "", name: "All countries" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NG", name: "Nigeria" },
  { code: "IE", name: "Ireland" },
  { code: "ZA", name: "South Africa" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GLOBAL", name: "Worldwide" },
] as const;
