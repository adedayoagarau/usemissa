import {
  loadPublishedPortfolio,
  publishedMediaDataUrl,
} from "@/lib/published-portfolio";
import { featuredWork } from "@/lib/creator-profile";
import { creatorShareImage } from "@/components/creator-profile/share-image";
import { loadShareFonts } from "@/components/creator-profile/share/fonts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const loaded = await loadPublishedPortfolio((await params).handle);
  if (!loaded) return new Response("Not found", { status: 404 });
  const { portfolio, resolved } = loaded;
  const featured = featuredWork(portfolio.works);
  const [photo, image, fonts] = await Promise.all([
    portfolio.photo ? publishedMediaDataUrl(portfolio.photo) : undefined,
    featured?.image ? publishedMediaDataUrl(featured.image) : undefined,
    loadShareFonts(),
  ]);
  return creatorShareImage({
    portfolio,
    handleKey: resolved.handleKey,
    photo,
    image,
    fonts,
  });
}
