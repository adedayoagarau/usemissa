import { getSemanticUrlForProfile, type ProfileKind } from "@missa/radar-adapters";

/**
 * Each public profile route renders one profile kind. When a profile is
 * requested through the wrong route (or a non-canonical slug), return the
 * canonical path to redirect to; return null when the request is canonical.
 */
export function canonicalProfileRedirect(
  profile: { kind: ProfileKind; slug: string },
  route: { kind: ProfileKind; slug: string },
): string | null {
  if (profile.kind !== route.kind || safeDecode(route.slug) !== profile.slug) {
    return getSemanticUrlForProfile(profile.kind, encodeURIComponent(profile.slug));
  }
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
