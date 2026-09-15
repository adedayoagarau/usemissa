import { discoveryCollections } from "@/lib/discoveryGuides";
import { sitemapUrlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/opportunities",
  "/directory",
  "/journals",
  "/residencies",
  "/grants",
  "/presses",
  "/countries",
  "/rankings/magazines",
  "/rankings/residencies",
  "/rankings/methodology",
  "/rankings/compare",
  "/discover/match",
  "/about",
  "/methodology",
  "/for-organizations",
  "/waitlist",
  "/rankings/plan",
  "/rankings/claim",
  "/terms",
  "/privacy",
];

export async function GET() {
  const entries = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...discoveryCollections.map((collection) => ({
      path: `/discover/${collection.slug}`,
    })),
  ];
  return xmlResponse(sitemapUrlset(entries));
}
