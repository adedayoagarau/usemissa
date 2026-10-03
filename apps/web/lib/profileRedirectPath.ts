/**
 * Static child routes under app/profile. These are real pages, not legacy
 * user ids, so the proxy must not probe /api/profile-redirect for them.
 */
export const RESERVED_PROFILE_SEGMENTS: ReadonlySet<string> = new Set([
  "portfolio",
]);

/**
 * Returns the legacy user id from a `/profile/<id>` path, or null when the
 * path is not a legacy profile link (including reserved static routes).
 */
export function legacyProfileUserId(pathname: string): string | null {
  const segment = pathname.match(/^\/profile\/([^/]+)$/u)?.[1];
  if (!segment) return null;
  if (RESERVED_PROFILE_SEGMENTS.has(segment.toLowerCase())) return null;
  return segment;
}
