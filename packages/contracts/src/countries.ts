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
  DZ: "Algeria",
  AO: "Angola",
  BJ: "Benin",
  BW: "Botswana",
  BF: "Burkina Faso",
  BI: "Burundi",
  CM: "Cameroon",
  CV: "Cape Verde",
  CF: "Central African Republic",
  TD: "Chad",
  KM: "Comoros",
  CG: "Republic of the Congo",
  CD: "Democratic Republic of the Congo",
  CI: "Cote d'Ivoire",
  DJ: "Djibouti",
  GQ: "Equatorial Guinea",
  ER: "Eritrea",
  ET: "Ethiopia",
  SZ: "Eswatini",
  GA: "Gabon",
  GM: "Gambia",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  NG: "Nigeria",
  ZA: "South Africa",
  LS: "Lesotho",
  LR: "Liberia",
  LY: "Libya",
  MG: "Madagascar",
  MW: "Malawi",
  ML: "Mali",
  MR: "Mauritania",
  MU: "Mauritius",
  MZ: "Mozambique",
  NA: "Namibia",
  NE: "Niger",
  SC: "Seychelles",
  SL: "Sierra Leone",
  SO: "Somalia",
  SS: "South Sudan",
  SD: "Sudan",
  TG: "Togo",
  TN: "Tunisia",
  ZM: "Zambia",
  IE: "Ireland",
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
  ST: "Sao Tome and Principe",
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

export const AFRICAN_COUNTRIES = [
  { code: "DZ", name: "Algeria", region: "Africa" },
  { code: "AO", name: "Angola", region: "Africa" },
  { code: "BJ", name: "Benin", region: "Africa" },
  { code: "BW", name: "Botswana", region: "Africa" },
  { code: "BF", name: "Burkina Faso", region: "Africa" },
  { code: "BI", name: "Burundi", region: "Africa" },
  { code: "CM", name: "Cameroon", region: "Africa" },
  { code: "CV", name: "Cape Verde", region: "Africa" },
  { code: "CF", name: "Central African Republic", region: "Africa" },
  { code: "TD", name: "Chad", region: "Africa" },
  { code: "KM", name: "Comoros", region: "Africa" },
  { code: "CG", name: "Republic of the Congo", region: "Africa" },
  { code: "CD", name: "Democratic Republic of the Congo", region: "Africa" },
  { code: "CI", name: "Cote d'Ivoire", region: "Africa" },
  { code: "DJ", name: "Djibouti", region: "Africa" },
  { code: "EG", name: "Egypt", region: "Africa" },
  { code: "GQ", name: "Equatorial Guinea", region: "Africa" },
  { code: "ER", name: "Eritrea", region: "Africa" },
  { code: "SZ", name: "Eswatini", region: "Africa" },
  { code: "ET", name: "Ethiopia", region: "Africa" },
  { code: "GA", name: "Gabon", region: "Africa" },
  { code: "GM", name: "Gambia", region: "Africa" },
  { code: "GH", name: "Ghana", region: "Africa", isPublishingHub: true },
  { code: "GN", name: "Guinea", region: "Africa" },
  { code: "GW", name: "Guinea-Bissau", region: "Africa" },
  { code: "KE", name: "Kenya", region: "Africa", isPublishingHub: true },
  { code: "LS", name: "Lesotho", region: "Africa" },
  { code: "LR", name: "Liberia", region: "Africa" },
  { code: "LY", name: "Libya", region: "Africa" },
  { code: "MG", name: "Madagascar", region: "Africa" },
  { code: "MW", name: "Malawi", region: "Africa" },
  { code: "ML", name: "Mali", region: "Africa" },
  { code: "MR", name: "Mauritania", region: "Africa" },
  { code: "MU", name: "Mauritius", region: "Africa" },
  { code: "MA", name: "Morocco", region: "Africa", isPublishingHub: true },
  { code: "MZ", name: "Mozambique", region: "Africa" },
  { code: "NA", name: "Namibia", region: "Africa" },
  { code: "NE", name: "Niger", region: "Africa" },
  { code: "NG", name: "Nigeria", region: "Africa", isPublishingHub: true },
  { code: "RW", name: "Rwanda", region: "Africa" },
  { code: "ST", name: "Sao Tome and Principe", region: "Africa" },
  { code: "SC", name: "Seychelles", region: "Africa" },
  { code: "SN", name: "Senegal", region: "Africa", isPublishingHub: true },
  { code: "SL", name: "Sierra Leone", region: "Africa" },
  { code: "SO", name: "Somalia", region: "Africa" },
  { code: "ZA", name: "South Africa", region: "Africa", isPublishingHub: true },
  { code: "SS", name: "South Sudan", region: "Africa" },
  { code: "SD", name: "Sudan", region: "Africa" },
  { code: "TZ", name: "Tanzania", region: "Africa" },
  { code: "TG", name: "Togo", region: "Africa" },
  { code: "TN", name: "Tunisia", region: "Africa" },
  { code: "UG", name: "Uganda", region: "Africa", isPublishingHub: true },
  { code: "ZM", name: "Zambia", region: "Africa" },
  { code: "ZW", name: "Zimbabwe", region: "Africa" },
] as const satisfies ReadonlyArray<CountryMetadata>;

export const AFRICAN_COUNTRY_CODES = AFRICAN_COUNTRIES.map(
  (country) => country.code,
);

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
  algeria: "DZ",
  angola: "AO",
  benin: "BJ",
  botswana: "BW",
  "burkina faso": "BF",
  burundi: "BI",
  cameroon: "CM",
  "cape verde": "CV",
  cabo: "CV",
  "cabo verde": "CV",
  "central african republic": "CF",
  chad: "TD",
  comoros: "KM",
  congo: "CG",
  "republic of the congo": "CG",
  "congo-brazzaville": "CG",
  "congo brazzaville": "CG",
  "democratic republic of the congo": "CD",
  "dr congo": "CD",
  "drc": "CD",
  "congo-kinshasa": "CD",
  "congo kinshasa": "CD",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "ivory coast": "CI",
  djibouti: "DJ",
  "equatorial guinea": "GQ",
  eritrea: "ER",
  ethiopia: "ET",
  eswatini: "SZ",
  swaziland: "SZ",
  gabon: "GA",
  gambia: "GM",
  "the gambia": "GM",
  guinea: "GN",
  "guinea-bissau": "GW",
  "guinea bissau": "GW",
  nigeria: "NG",
  "south africa": "ZA",
  lesotho: "LS",
  liberia: "LR",
  libya: "LY",
  madagascar: "MG",
  malawi: "MW",
  mali: "ML",
  mauritania: "MR",
  mauritius: "MU",
  mozambique: "MZ",
  namibia: "NA",
  niger: "NE",
  seychelles: "SC",
  "sierra leone": "SL",
  somalia: "SO",
  "south sudan": "SS",
  sudan: "SD",
  togo: "TG",
  tunisia: "TN",
  zambia: "ZM",
  ireland: "IE",
  "republic of ireland": "IE",
  eire: "IE",
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
  "sao tome and principe": "ST",
  "são tomé and príncipe": "ST",
  "sao tome": "ST",
  "são tomé": "ST",
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
