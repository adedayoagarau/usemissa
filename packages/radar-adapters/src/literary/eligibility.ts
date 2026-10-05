import { LITERARY_PRIZES } from "./prizes.data.js";
import { PRIZE_COLLECTIONS } from "./selections.data.js";
import {
  COMPARABLE_WRITERS,
  WRITER_REGIONS,
  type WriterForm,
} from "./writers.data.js";

function countryKey(country: string): string {
  return country
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the /, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

/** Members of the Commonwealth of Nations (56, including Gabon and Togo from 2022). */
export const COMMONWEALTH_COUNTRIES = [
  "Antigua and Barbuda",
  "Australia",
  "Bahamas",
  "Bangladesh",
  "Barbados",
  "Belize",
  "Botswana",
  "Brunei",
  "Cameroon",
  "Canada",
  "Cyprus",
  "Dominica",
  "Eswatini",
  "Fiji",
  "Gabon",
  "Gambia",
  "Ghana",
  "Grenada",
  "Guyana",
  "India",
  "Jamaica",
  "Kenya",
  "Kiribati",
  "Lesotho",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Malta",
  "Mauritius",
  "Mozambique",
  "Namibia",
  "Nauru",
  "New Zealand",
  "Nigeria",
  "Pakistan",
  "Papua New Guinea",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Solomon Islands",
  "South Africa",
  "Sri Lanka",
  "Tanzania",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tuvalu",
  "Uganda",
  "United Kingdom",
  "Vanuatu",
  "Zambia",
];

const COMMONWEALTH = new Set(COMMONWEALTH_COUNTRIES.map(countryKey));
const AFRICA = new Set(
  (WRITER_REGIONS.find((region) => region.name === "Africa")?.countries ?? [])
    .concat([
      "Algeria",
      "Angola",
      "Benin",
      "Burkina Faso",
      "Burundi",
      "Cape Verde",
      "Central African Republic",
      "Chad",
      "Comoros",
      "Democratic Republic of the Congo",
      "Djibouti",
      "Egypt",
      "Equatorial Guinea",
      "Eritrea",
      "Eswatini",
      "Gabon",
      "Gambia",
      "Guinea",
      "Guinea-Bissau",
      "Ivory Coast",
      "Lesotho",
      "Liberia",
      "Libya",
      "Madagascar",
      "Malawi",
      "Mali",
      "Mauritania",
      "Mauritius",
      "Morocco",
      "Namibia",
      "Niger",
      "Republic of the Congo",
      "Rwanda",
      "São Tomé and Príncipe",
      "Senegal",
      "Seychelles",
      "Sierra Leone",
      "South Sudan",
      "Togo",
      "Tunisia",
      "Uganda",
      "Zambia",
    ])
    .map(countryKey),
);

/** Countries a writer can choose in a brief: every country in the writer catalogue. */
export const WRITER_COUNTRY_OPTIONS: string[] = [
  ...new Set(COMPARABLE_WRITERS.flatMap((writer) => writer.countries)),
].sort((a, b) => a.localeCompare(b, "en"));

/**
 * A prize or prize anthology whose picks Missa traces to the magazine that
 * first published them, with the published entry rules that decide whether
 * a writer's piece could follow the same route.
 */
export interface PrizeRoute {
  /** Prize or collection id in the literary data. */
  id: string;
  name: string;
  /** The rule in words, shown beside the route. */
  rule: string;
  forms: WriterForm[];
  minWords: number | null;
  maxWords: number | null;
  /** Whether a writer from this country may enter; null when nationality doesn't matter. */
  openToCountry: ((country: string) => boolean) | null;
}

function routeName(id: string): string {
  return (
    LITERARY_PRIZES.find((prize) => prize.id === id)?.name ??
    PRIZE_COLLECTIONS.find((collection) => collection.id === id)?.name ??
    id
  ).replace(/\s*\([^)]*\)/g, "");
}

/**
 * Entry rules as each organiser publishes them. Only prizes whose winners'
 * first publication is recorded are listed: a route needs a magazine on it.
 */
export const PRIZE_ROUTES: PrizeRoute[] = [
  {
    id: "caine",
    name: routeName("caine"),
    rule: "African writers, published stories of 3,000 to 10,000 words",
    forms: ["fiction"],
    minWords: 3000,
    maxWords: 10000,
    openToCountry: (country) => AFRICA.has(countryKey(country)),
  },
  {
    id: "commonwealth-short-story",
    name: routeName("commonwealth-short-story"),
    rule: "Citizens of Commonwealth countries, stories of 2,000 to 5,000 words",
    forms: ["fiction"],
    minWords: 2000,
    maxWords: 5000,
    openToCountry: (country) => COMMONWEALTH.has(countryKey(country)),
  },
  {
    id: "o-henry",
    name: routeName("o-henry"),
    rule: "Stories published in US and Canadian magazines, by writers of any nationality",
    forms: ["fiction"],
    minWords: null,
    maxWords: null,
    openToCountry: null,
  },
  {
    id: "best-american-short-stories",
    name: routeName("best-american-short-stories"),
    rule: "Stories by American or Canadian writers in North American magazines",
    forms: ["fiction"],
    minWords: null,
    maxWords: null,
    openToCountry: (country) =>
      ["united states", "canada"].includes(countryKey(country)),
  },
  {
    id: "sunday-times-short-story-award",
    name: routeName("sunday-times-short-story-award"),
    rule: "Writers previously published in the UK or Ireland, stories up to 6,000 words",
    forms: ["fiction"],
    minWords: null,
    maxWords: 6000,
    openToCountry: null,
  },
];

export function prizeRouteById(id: string): PrizeRoute | undefined {
  return PRIZE_ROUTES.find((route) => route.id === id);
}

/** Whether a country is in Africa, for prizes open to African writers. */
export function isAfricanCountry(country: string): boolean {
  return AFRICA.has(countryKey(country));
}

export function isCommonwealthCountry(country: string): boolean {
  return COMMONWEALTH.has(countryKey(country));
}
