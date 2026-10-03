/**
 * Facts read from residency program pages in the Artist Communities Alliance
 * directory (artistcommunities.org/directory/residencies/…). Each value comes
 * from a named field on the program's own listing; a field the program left
 * empty stays null.
 */
import { decodeEntities } from "../live/sources.js";
import type { ResidencyMeals } from "@missa/radar-engine";

export interface AcaAmount {
  /** Whole currency units as listed (for example 600 for $600). */
  amount: number;
  currency: string | null;
}

export interface AcaProgramRecord {
  url: string;
  crawledAt: string;
  name: string;
  organizationUrl: string | null;
  website: string | null;
  locality: string | null;
  region: string | null;
  country: string | null;
  foundedYear: number | null;
  residencyFee: AcaAmount | null;
  artistStipend: AcaAmount | null;
  applicationFee: AcaAmount | null;
  acceptedCount: number | null;
  applicantPool: number | null;
  meals: ResidencyMeals | null;
  privateStudio: boolean | null;
  housing: string | null;
  wheelchair: string | null;
  residencyLength: string | null;
  disciplines: string[];
  openCallUrls: string[];
}

export interface AcaOpenCallRecord {
  url: string;
  title: string;
  /** Deadline date (YYYY-MM-DD), or null when the call lists none. */
  deadline: string | null;
  /** True when the call states it has no deadline (rolling). */
  rolling: boolean;
  applicationUrl: string | null;
}

const ACA_ORIGIN = "https://artistcommunities.org";
const NESTED_FIELDS = new Set(["amount", "currency"]);

function text(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Top-level Drupal field blocks by field name (nested amount/currency stay inside). */
function fieldBlocks(html: string): Map<string, string> {
  const starts: Array<{ index: number; name: string }> = [];
  for (const match of html.matchAll(/<div class="[^"]*\bfield--name-field-([a-z0-9-]+)\b[^"]*"/g)) {
    if (!NESTED_FIELDS.has(match[1])) starts.push({ index: match.index ?? 0, name: match[1] });
  }
  const blocks = new Map<string, string>();
  starts.forEach((start, i) => {
    if (blocks.has(start.name)) return;
    const end = i + 1 < starts.length ? starts[i + 1].index : html.length;
    blocks.set(start.name, html.slice(start.index, end));
  });
  return blocks;
}

function items(block: string | undefined): string[] {
  if (!block) return [];
  return [...block.matchAll(/<div class="field__item">([\s\S]*?)<\/div>/g)]
    .map((match) => text(match[1]))
    .filter((value) => value && value !== "N/A");
}

function integer(block: string | undefined): number | null {
  const value = items(block)[0];
  if (!value || !/^\d[\d,]*$/.test(value)) return null;
  return Number(value.replace(/,/g, ""));
}

function amount(block: string | undefined): AcaAmount | null {
  if (!block) return null;
  const value = block.match(/field--name-field-amount[^>]*>\s*(\d[\d,]*)\s*</);
  if (!value) return null;
  const currency = block.match(/field--name-field-currency[^>]*>([^<]*)</);
  return {
    amount: Number(value[1].replace(/,/g, "")),
    currency: currency?.[1].trim() || null,
  };
}

function absolute(href: string): string {
  return href.startsWith("http") ? href : `${ACA_ORIGIN}${href}`;
}

/** "All meals" → all; some meals, groceries or a food stipend → some; "No meals" → none. */
export function mealsFrom(values: string[]): ResidencyMeals | null {
  const lower = values.map((value) => value.toLowerCase());
  if (lower.some((value) => value.startsWith("all meals"))) return "all";
  if (
    lower.some(
      (value) =>
        value.startsWith("some meals") ||
        value.startsWith("groceries provided") ||
        value.startsWith("food stipend"),
    )
  )
    return "some";
  if (lower.some((value) => value.startsWith("no meals"))) return "none";
  return null;
}

/** Private studios on offer → true; only shared studios → false; neither listed → null. */
export function privateStudioFrom(values: string[]): boolean | null {
  if (values.includes("Private Studios")) return true;
  if (values.includes("Shared Studios")) return false;
  return null;
}

function wheelchairFrom(values: string[]): string | null {
  const value = values[0];
  if (!value) return null;
  if (value === "ADA Compliant" || value === "Universally designed") return "Accessible";
  if (value === "Inaccessible") return "Not accessible";
  return value;
}

export function parseAcaProgram(html: string, url: string, crawledAt: string): AcaProgramRecord {
  const blocks = fieldBlocks(html);
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const organization = html.match(/pseudo-group_node:organization-link-list[\s\S]*?href="(\/directory\/organizations\/[^"]+)"/);
  const website = blocks.get("website")?.match(/href="([^"]+)"/);
  const length = html.match(/pseudo-residency-length"><div class="field__label">[^<]*<\/div><div class="field__item">([^<]*)</);
  const address = (cls: string) => {
    const match = html.match(new RegExp(`class="${cls}"[^>]*>([^<]*)<`));
    return match ? decodeEntities(match[1]).trim() || null : null;
  };
  const openCallUrls = [
    ...new Set(
      [...html.matchAll(/href="(\/directory\/open-calls\/[^"#?]+)"/g)].map((match) => absolute(match[1])),
    ),
  ];
  return {
    url,
    crawledAt,
    name: title ? text(title[1]) : "",
    organizationUrl: organization ? absolute(organization[1]) : null,
    website: website ? decodeEntities(website[1]) : null,
    locality: address("locality"),
    region: address("administrative-area"),
    country: address("country"),
    foundedYear: integer(blocks.get("year-founded")),
    residencyFee: amount(blocks.get("residency-fees")),
    artistStipend: amount(blocks.get("artist-stipend")),
    applicationFee: amount(blocks.get("application-fee")),
    acceptedCount: integer(blocks.get("number-of-artists-accepted")),
    applicantPool: integer(blocks.get("applicant-pool")),
    meals: mealsFrom(items(blocks.get("meals-provided"))),
    privateStudio: privateStudioFrom(items(blocks.get("studios-special-equipment"))),
    housing: items(blocks.get("type-of-housing"))[0] ?? null,
    wheelchair: wheelchairFrom(items(blocks.get("wheelchair-accessible"))),
    residencyLength: length ? text(length[1]) || null : null,
    disciplines: items(blocks.get("discipline")),
    openCallUrls,
  };
}

export function parseAcaOpenCall(html: string, url: string): AcaOpenCallRecord {
  const blocks = fieldBlocks(html);
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const deadline = blocks.get("deadline")?.match(/datetime="(\d{4}-\d{2}-\d{2})/);
  const noDeadline = blocks.get("no-deadline");
  const application = blocks.get("application-url")?.match(/href="([^"]+)"/);
  return {
    url,
    title: title ? text(title[1]) : "",
    deadline: deadline ? deadline[1] : null,
    rolling: Boolean(noDeadline && /field__item">\s*(On|1|True)\s*</i.test(noDeadline)),
    applicationUrl: application ? decodeEntities(application[1]) : null,
  };
}
