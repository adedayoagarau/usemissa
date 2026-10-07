import { listCreatorWorkSitemapEntries } from "@/lib/creator-work-sitemap";
import {
  listProfileSitemapEntries,
  type SitemapEntry,
} from "@/lib/sitemapData";
import { sitemapUrlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

/**
 * Directory profiles, then the work pages of published creator profiles. If the
 * creator read fails the directory still goes out, marked as not to be cached,
 * so a partial sitemap is never kept as the real one.
 */
export async function GET() {
  try {
    const profiles = await listProfileSitemapEntries();
    let works: SitemapEntry[] = [];
    let degraded = false;
    try {
      works = await listCreatorWorkSitemapEntries();
    } catch (error) {
      degraded = true;
      console.warn(
        "Work page sitemap read failed; listing profiles only.",
        error,
      );
    }
    return xmlResponse(sitemapUrlset([...profiles, ...works]), { degraded });
  } catch {
    return xmlResponse(sitemapUrlset([]), { degraded: true });
  }
}
