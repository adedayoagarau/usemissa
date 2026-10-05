import { createHash } from "node:crypto";
import type { RankingDb } from "../live/indexUpdate.js";
import {
  loadResidencyProfiles,
  matchResidencyListings,
  nameKey,
  siteKey,
  type ResidencySources,
  type UnmatchedListing,
} from "./recompute.js";

/** Form and submission hosts: a link there is an application, not the program's site. */
const FORM_HOSTS = [
  "forms.gle",
  "docs.google.com",
  "forms.google.com",
  "submittable.com",
  "airtable.com",
  "jotform.com",
  "typeform.com",
  "tally.so",
];

/** A residency profile to create from directory listings that match no Missa profile. */
export interface PlannedResidencyProfile {
  id: string;
  name: string;
  /** Public slug, unique across every profile. */
  nameKey: string;
  canonicalKey: string;
  website: string | null;
  city: string | null;
  country: string | null;
  /** The directory pages the profile was created from. */
  listings: string[];
}

function ownWebsite(url: string | null | undefined): string | null {
  const key = siteKey(url);
  if (!key || !url) return null;
  const host = key.split("/")[0];
  if (FORM_HOSTS.some((form) => host === form || host.endsWith(`.${form}`))) return null;
  const compact = url.replace(/\s+/g, "");
  return /^https?:\/\//i.test(compact) ? compact : `https://${compact}`;
}

/** "Peterborough, NH, United States" → city "Peterborough", country "United States". */
function placeFromLocation(location: string | null | undefined) {
  const parts = (location ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  return {
    city: parts.length > 1 ? parts[0] : null,
    country: parts.length ? parts[parts.length - 1] : null,
  };
}

function listingName(listing: UnmatchedListing): string {
  if (listing.source === "aca") return (listing.record.organizationName ?? listing.record.name).trim();
  return listing.record.name.trim();
}

const slugOf = (name: string) => nameKey(name).replace(/ /g, "_");

/**
 * Groups listings that match no profile into one new profile per program
 * website, or per organisation name when the listing has no site of its own.
 * Names come from the directory; nothing is inferred. Slugs never collide with
 * an existing profile's, so profile links resolve to the right page.
 */
export function planResidencyProfiles(
  listings: UnmatchedListing[],
  taken: { nameKeys: Set<string>; canonicalKeys: Set<string>; profileNames?: Set<string> },
): PlannedResidencyProfile[] {
  const groups = new Map<string, UnmatchedListing[]>();
  for (const listing of listings) {
    const name = listingName(listing);
    // The directory's own placeholder listing.
    if (!name || /\bsample\b/i.test(`${name} ${listing.record.name}`)) continue;
    // Courses and one-off workshops: a programme title, not a residency.
    if (name.length > 70 || /\/courses?\b|\bcourses?-/i.test(listing.record.website ?? "")) continue;
    const website = ownWebsite(listing.record.website);
    const key = website ? `site:${siteKey(website)}` : `name:${nameKey(name)}`;
    groups.set(key, [...(groups.get(key) ?? []), listing]);
  }

  const usedSlugs = new Set([...taken.nameKeys].map((key) => key.replace(/[\s-]+/g, "_")));
  const planned: PlannedResidencyProfile[] = [];
  for (const [key, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // The organisation as ACA names it, else the most common listing name.
    const aca = members.filter((m) => m.source === "aca");
    const names = (aca.length ? aca : members).map(listingName);
    const counts = new Map<string, number>();
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
    const name = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];

    const first = aca[0]?.record ?? members[0].record;
    const place =
      aca[0]?.source === "aca"
        ? { city: aca[0].record.locality, country: aca[0].record.country }
        : placeFromLocation(members[0].source === "rmar" ? members[0].record.location : null);

    // A name Missa already has (even on duplicate profiles) is not a missing program.
    if (taken.profileNames?.has(nameKey(name))) continue;
    let slug = slugOf(name);
    if (!slug) continue;
    if (usedSlugs.has(slug) && place.city) slug = `${slug}_${slugOf(place.city)}`;
    if (usedSlugs.has(slug)) slug = `${slug}_${createHash("sha1").update(key).digest("hex").slice(0, 6)}`;
    const canonicalKey = `${aca.length ? "aca" : "rmar"}:${slug}`;
    if (taken.canonicalKeys.has(canonicalKey)) continue;
    usedSlugs.add(slug);

    planned.push({
      id: `org_resdir_${createHash("sha1").update(key).digest("hex").slice(0, 16)}`,
      name,
      nameKey: slug,
      canonicalKey,
      website: ownWebsite(first.website),
      city: place.city ?? null,
      country: place.country ?? null,
      listings: [...new Set(members.map((m) => m.record.url))],
    });
  }
  return planned;
}

/**
 * Creates residency profiles for directory programs Missa has no profile for.
 * Dry run unless `write` is set. Safe to repeat: a created profile matches its
 * listings next time, so nothing is created twice.
 */
export async function provisionResidencyProfiles(
  db: RankingDb,
  sources: ResidencySources,
  options: { write: boolean },
): Promise<{ planned: PlannedResidencyProfile[]; unmatchedListings: number }> {
  const profiles = await loadResidencyProfiles(db);
  const { unmatchedListings } = matchResidencyListings(profiles, sources);
  const keys = await db.query(`SELECT name_key, canonical_key FROM gary_profiles`);
  const planned = planResidencyProfiles(unmatchedListings, {
    nameKeys: new Set(keys.rows.map((row) => String(row.name_key ?? "")).filter(Boolean)),
    canonicalKeys: new Set(keys.rows.map((row) => String(row.canonical_key))),
    profileNames: new Set(profiles.map((profile) => nameKey(profile.name))),
  });

  if (options.write && planned.length) {
    await db.transaction(
      planned.map((profile) => [
        `INSERT INTO gary_profiles (
           id, identity_key, canonical_key, profile_kind, name_key, name,
           website_url, normalized_website_url, city, country,
           identity_status, identity_confidence
         ) VALUES ($1, $2, $2, 'residency_center', $3, $4, $5, $6, $7, $8, 'confirmed', 0.9)
         ON CONFLICT DO NOTHING`,
        [
          profile.id,
          profile.canonicalKey,
          profile.nameKey,
          profile.name,
          profile.website,
          profile.website ? siteKey(profile.website) : null,
          profile.city,
          profile.country,
        ],
      ]),
    );
  }
  return { planned, unmatchedListings: unmatchedListings.length };
}
