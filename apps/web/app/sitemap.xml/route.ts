import { sitemapIndex, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

/**
 * Sitemap index. The catalogue has far more public pages than a single
 * sitemap should carry, so the static pages and the two dynamic collections
 * are published separately and listed here.
 */
export async function GET() {
  return xmlResponse(
    sitemapIndex([
      "/sitemap-pages.xml",
      "/sitemap-opportunities.xml",
      "/sitemap-profiles.xml",
    ]),
  );
}
