import {
  loadPublishedPortfolio,
  publishedMediaDataUrl,
} from "@/lib/published-portfolio";
import { featuredWork } from "@/lib/creator-profile";
import { loadShareFonts } from "@/components/creator-profile/share/fonts";
import { creatorStoryImage } from "@/components/creator-profile/share/story-image";

export const dynamic = "force-dynamic";

/** The 1080 × 1920 story, drawn from the published profile. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const loaded = await loadPublishedPortfolio((await params).handle);
  if (!loaded) return new Response("Not found", { status: 404 });
  const { portfolio, resolved } = loaded;
  const featured = featuredWork(portfolio.works);
  const [image, fonts] = await Promise.all([
    featured?.image ? publishedMediaDataUrl(featured.image) : undefined,
    loadShareFonts(),
  ]);
  return creatorStoryImage({
    portfolio,
    handleKey: resolved.handleKey,
    image,
    fonts,
  });
}
