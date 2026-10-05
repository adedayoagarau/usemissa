import { listOpportunitySitemapEntries } from "@/lib/sitemapData";
import { sitemapResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

export async function GET() {
  return sitemapResponse(listOpportunitySitemapEntries);
}
