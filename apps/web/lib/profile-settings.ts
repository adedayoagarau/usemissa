import { taxonomyLabelFor } from "@missa/taxonomy";

/*
 * Profile and settings: section ids and the plain-language matching summary.
 * Kept out of the client component so the server route can normalize the
 * section and the summary can be unit tested.
 */

/** Settings sections, grouped in the navigation as Profile, Settings, Discovery, Account. */
export const PROFILE_SECTIONS = [
  "profile",
  "matching",
  "notifications",
  "connections",
  "searches",
  "following",
  "account",
] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

/** Section ids from before the redesign, so existing links keep working. */
const LEGACY_SECTIONS: Record<string, ProfileSection> = {
  overview: "profile",
  identity: "profile",
  privacy: "profile",
  preferences: "matching",
  integrations: "connections",
  data: "account",
};

export function normalizeProfileSection(
  value: string | undefined,
): ProfileSection {
  if (!value) return "profile";
  if ((PROFILE_SECTIONS as readonly string[]).includes(value))
    return value as ProfileSection;
  return LEGACY_SECTIONS[value] ?? "profile";
}

export type OpportunityPreferences = {
  types: string[];
  disciplines: string[];
  genres: string[];
  locations: string[];
  careerStages: string[];
  maxFeeCents?: number;
  noFeeOnly: boolean;
  deadlineWithinDays?: number;
  simultaneousRequired: boolean;
};

/** A saved taxonomy choice: include a field, or hide it and everything inside it. */
export type TaxonomyChoice = { termId: string; preference: string };

export const OPPORTUNITY_TYPES = [
  ["open-call", "Open call"],
  ["magazine", "Publication"],
  ["grant", "Grant"],
  ["award", "Award"],
  ["fellowship", "Fellowship"],
  ["residency", "Residency"],
  ["festival", "Festival"],
  ["scholarship", "Scholarship"],
  ["conference", "Conference"],
  ["rfp", "Request for proposals"],
  ["contest", "Contest"],
  ["pitch", "Pitch"],
  ["exhibition", "Exhibition"],
  ["commission", "Commission"],
  ["other", "Other"],
] as const;

export const CAREER_STAGES: Record<string, string> = {
  emerging: "Emerging",
  "mid-career": "Mid-career",
  established: "Established",
};

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export const typeLabel = (value: string) =>
  OPPORTUNITY_TYPES.find(([id]) => id === value)?.[1] ?? value;

/** One plain sentence for what Missa looks for, from saved preferences only. */
export function matchingSummary(
  taxonomy: ReadonlyArray<TaxonomyChoice>,
  preferences: OpportunityPreferences,
): string | null {
  const fields = taxonomy
    .filter((item) => item.preference !== "exclude")
    .map((item) => taxonomyLabelFor(item.termId).toLowerCase());
  const excluded = taxonomy
    .filter((item) => item.preference === "exclude")
    .map((item) => taxonomyLabelFor(item.termId).toLowerCase());
  const types = preferences.types.map((type) => typeLabel(type).toLowerCase());
  if (
    !fields.length &&
    !types.length &&
    !preferences.locations.length &&
    !preferences.careerStages.length &&
    !preferences.noFeeOnly &&
    preferences.maxFeeCents === undefined &&
    !preferences.deadlineWithinDays &&
    !preferences.simultaneousRequired &&
    !excluded.length
  )
    return null;
  const plural = (type: string) =>
    type === "other"
      ? "other calls"
      : `${type}s`.replace(/ys$/u, "ies").replace(/ss$/u, "s");
  const what = types.length ? list(types.map(plural)) : "open calls";
  const parts = [`${what.replace(/^./u, (c) => c.toUpperCase())}`];
  if (fields.length) parts.push(`in ${list(fields)}`);
  if (preferences.locations.length)
    parts.push(`open to ${list(preferences.locations)}`);
  if (preferences.careerStages.length)
    parts.push(
      `for ${list(preferences.careerStages.map((stage) => (CAREER_STAGES[stage] ?? stage).toLowerCase()))} writers and artists`,
    );
  if (preferences.noFeeOnly) parts.push("with no fee");
  else if (preferences.maxFeeCents !== undefined)
    parts.push(
      `with a fee of at most ${(preferences.maxFeeCents / 100).toFixed(2)}`,
    );
  if (preferences.deadlineWithinDays)
    parts.push(`closing within ${preferences.deadlineWithinDays} days`);
  if (preferences.simultaneousRequired)
    parts.push("that accept simultaneous submissions");
  let sentence = `${parts.join(" ")}.`;
  if (excluded.length) sentence += ` Never ${list(excluded)}.`;
  return sentence;
}
