/** The public beta exposes discovery while account workflows remain in development. */
export const DISCOVERY_BETA = true;

const discoveryRoots = [
  "/saved",
  "/tracker",
  "/library",
  "/calendar",
  "/inbox",
  "/opportunities",
  "/directory",
  "/residencies",
  "/journals",
  "/journal",
  "/presses",
  "/grants",
  "/organizations",
  "/discover",
  "/guides",
];
const discoveryPages = new Set([
  "/",
  "/signup",
  "/onboarding",
  "/about",
  "/methodology",
  "/terms",
  "/rankings/magazines",
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
