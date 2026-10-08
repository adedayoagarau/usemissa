import { guideArticle, guideArticles } from "@/lib/guideArticles";
import { guideShareImage } from "@/components/missa/guide-share-image";
import { loadShareFonts } from "@/components/creator-profile/share/fonts";

/** One image per long-form guide, built with the site; other slugs are 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return guideArticles.map((article) => ({ slug: article.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const article = guideArticle((await params).slug);
  if (!article) return new Response("Not found", { status: 404 });
  return guideShareImage({ article, fonts: await loadShareFonts() });
}
