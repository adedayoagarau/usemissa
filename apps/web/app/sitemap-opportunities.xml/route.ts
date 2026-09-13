import { listOpportunitySitemapEntries } from "@/lib/sitemapData";
import { sitemapUrlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listOpportunitySitemapEntries();
  return xmlResponse(sitemapUrlset(entries));
}
