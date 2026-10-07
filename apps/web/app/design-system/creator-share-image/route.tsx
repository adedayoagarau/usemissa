import { creatorShareImage } from "@/components/creator-profile/share-image";
import { loadShareFonts } from "@/components/creator-profile/share/fonts";
import {
  shareSampleDelay,
  shareSampleMedia,
  shareSamplePortfolio,
  type ShareSampleOptions,
} from "../creator-share-kit/sample";

export const dynamic = "force-dynamic";

/**
 * Design review of the link card with the fictional sample creator. The states
 * are switched by query string; see `ShareSampleOptions`.
 */
export async function GET(request: Request) {
  const query = Object.fromEntries(
    new URL(request.url).searchParams,
  ) as ShareSampleOptions;
  await shareSampleDelay(query);
  const [{ photo, image }, fonts] = await Promise.all([
    shareSampleMedia(query),
    loadShareFonts(),
  ]);
  return creatorShareImage({
    portfolio: shareSamplePortfolio(query),
    handleKey: "rileychen",
    photo,
    image,
    fonts,
  });
}
