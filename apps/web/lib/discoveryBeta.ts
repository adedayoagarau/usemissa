/** The public beta exposes discovery while account workflows remain in development. */
export const DISCOVERY_BETA = true;

const discoveryRoots = [
  "/saved",
  "/ask",
  "/tracker",
  "/library",
  "/calendar",
  "/inbox",
  "/insights",
  "/messages",
  "/my-submissions",
  "/following",
  "/goals",
  "/opportunities",
  "/directory",
  "/countries",
  "/residencies",
  "/residency",
  "/journals",
  "/journal",
  "/presses",
  "/press",
  "/grants",
  "/grant",
  "/org",
  "/organizations",
  "/discover",
  "/guides",
  "/workspace",
  "/submissions",
  "/reviewer",
  "/reviews",
  "/organization",
  "/import",
];
const discoveryPages = new Set([
  "/",
  "/home",
  "/auth/callback",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unsubscribe",
  "/onboarding",
  "/welcome",
  "/about",
  "/for-organizations",
  "/methodology",
  "/terms",
  "/rankings/magazines",
  "/rankings/residencies",
  "/rankings/methodology",
  "/rankings/compare",
]);

export function isDiscoveryBetaPath(pathname: string): boolean {
  return (
    discoveryPages.has(pathname) ||
    discoveryRoots.some(
      (root) => pathname === root || pathname.startsWith(`${root}/`),
    )
  );
}
