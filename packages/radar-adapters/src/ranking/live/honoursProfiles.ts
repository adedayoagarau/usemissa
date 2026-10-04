import { exactKey } from "./indexUpdate.js";

/**
 * Honours lists mark titles with "*", "©" (closed) and "(H)" (on hiatus), and
 * file "The" last ("Point, The"). Profiles created from those lines carry the
 * marks in their names. This plans their cleanup: merge into the real profile
 * when exactly one exists, otherwise rename.
 */
const MARKED = /^\s*\*|\*\s*$|©|\(H\)|,\s*The\s*$/i;

export function isHonoursMarkedName(name: string): boolean {
  return MARKED.test(name);
}

/** "*   Offing, The" → "The Offing"; "Gettysburg Review ©" → "Gettysburg Review". */
export function cleanHonoursName(name: string): string {
  const bare = name
    .replace(/\*/g, " ")
    .replace(/©/g, " ")
    .replace(/\(H\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const inverted = bare.match(/^(.*\S),\s*The$/i);
  return inverted ? `The ${inverted[1]}` : bare;
}

export interface CleanupProfile {
  id: string;
  name: string;
  kind: string;
}

export interface HonoursCleanupPlan {
  merges: Array<{ from: CleanupProfile; to: CleanupProfile }>;
  renames: Array<{ profile: CleanupProfile; name: string; nameKey: string }>;
  /** Marked profiles whose clean name fits more than one real profile; left alone. */
  ambiguous: Array<{ profile: CleanupProfile; candidates: CleanupProfile[] }>;
}

const KIND_PREFERENCE = ["literary_magazine", "small_press", "organization"];
const slug = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export function planHonoursProfileCleanup(
  profiles: CleanupProfile[],
  takenNameKeys: Set<string>,
): HonoursCleanupPlan {
  const real = new Map<string, CleanupProfile[]>();
  for (const profile of profiles) {
    if (isHonoursMarkedName(profile.name)) continue;
    const key = exactKey(profile.name);
    if (key) real.set(key, [...(real.get(key) ?? []), profile]);
  }
  const plan: HonoursCleanupPlan = { merges: [], renames: [], ambiguous: [] };
  const usedKeys = new Set(takenNameKeys);
  const renamedTo = new Map<string, CleanupProfile>();
  for (const profile of profiles.filter((p) => isHonoursMarkedName(p.name))) {
    const name = cleanHonoursName(profile.name);
    const key = exactKey(name);
    if (!key) continue;
    const candidates = real.get(key) ?? [];
    const preferred = candidates.filter((c) => c.kind === profile.kind);
    const pool = preferred.length ? preferred : candidates;
    if (pool.length === 1) {
      plan.merges.push({ from: profile, to: pool[0] });
    } else if (pool.length > 1) {
      plan.ambiguous.push({ profile, candidates: pool });
    } else if (renamedTo.has(key)) {
      // Two marked spellings of one title: the second joins the first.
      plan.merges.push({ from: profile, to: renamedTo.get(key)! });
    } else {
      let nameKey = slug(name);
      if (usedKeys.has(nameKey)) nameKey = `${nameKey}_${profile.id.slice(-6)}`;
      usedKeys.add(nameKey);
      plan.renames.push({ profile, name, nameKey });
      renamedTo.set(key, { ...profile, name });
    }
  }
  plan.merges.sort(
    (a, b) => KIND_PREFERENCE.indexOf(a.to.kind) - KIND_PREFERENCE.indexOf(b.to.kind) || a.from.id.localeCompare(b.from.id),
  );
  return plan;
}

type Statement = [string, unknown[]];

/** Moves every row from one profile to another, keeping the target's row where both have one. */
function mergeStatements(from: string, to: string, fromSlug: string): Statement[] {
  const p = [from, to];
  return [
    [`UPDATE gary_profile_observations SET profile_id = $2 WHERE profile_id = $1`, p],
    [`UPDATE gary_profile_visuals SET profile_id = $2 WHERE profile_id = $1`, p],
    [`UPDATE gary_organization_media SET profile_id = $2 WHERE profile_id = $1`, p],
    [`UPDATE opportunities SET organization_id = $2 WHERE organization_id = $1`, p],
    [`UPDATE gary_profile_aliases a SET profile_id = $2 WHERE profile_id = $1
       AND NOT EXISTS (SELECT 1 FROM gary_profile_aliases b WHERE b.profile_id = $2 AND b.normalized_url = a.normalized_url)`, p],
    [`UPDATE opportunity_profile_links a SET profile_id = $2 WHERE profile_id = $1
       AND NOT EXISTS (SELECT 1 FROM opportunity_profile_links b
                       WHERE b.profile_id = $2 AND b.opportunity_id = a.opportunity_id AND b.relation = a.relation)`, p],
    [`UPDATE gary_profile_intelligence SET profile_id = $2 WHERE profile_id = $1
       AND NOT EXISTS (SELECT 1 FROM gary_profile_intelligence WHERE profile_id = $2)`, p],
    [`UPDATE gary_organization_media_refresh_status SET profile_id = $2 WHERE profile_id = $1
       AND NOT EXISTS (SELECT 1 FROM gary_organization_media_refresh_status WHERE profile_id = $2)`, p],
    [`UPDATE missa_pushcart_rankings a SET profile_id = $2 WHERE profile_id = $1
       AND NOT EXISTS (SELECT 1 FROM missa_pushcart_rankings b
                       WHERE b.profile_id = $2 AND b.edition_year = a.edition_year AND b.genre = a.genre)`, p],
    // Rankings are rebuilt for every year after the cleanup.
    [`DELETE FROM missa_magazine_rankings WHERE profile_id = $1`, [from]],
    [`UPDATE gary_profile_redirects SET target_profile_id = $2 WHERE target_profile_id = $1`, p],
    [`INSERT INTO gary_profile_redirects (source_id_or_slug, target_profile_id)
      VALUES ($1, $2), ($3, $2) ON CONFLICT (source_id_or_slug) DO NOTHING`, [from, to, fromSlug]],
    [`DELETE FROM gary_profiles WHERE id = $1`, [from]],
  ];
}

/** Every statement for a plan, to run in one transaction. */
export function honoursCleanupStatements(plan: HonoursCleanupPlan): Statement[] {
  const publicSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return [
    ...plan.renames.map(
      ({ profile, name, nameKey }) =>
        [`UPDATE gary_profiles SET name = $2, name_key = $3, updated_at = NOW() WHERE id = $1`, [profile.id, name, nameKey]] as Statement,
    ),
    ...plan.merges.flatMap(({ from, to }) => mergeStatements(from.id, to.id, publicSlug(from.name))),
  ];
}
