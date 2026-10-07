import { loadShareFonts } from "@/components/creator-profile/share/fonts";
import { creatorStoryImage } from "@/components/creator-profile/share/story-image";
import {
  shareSampleDelay,
  shareSampleMedia,
  shareSamplePortfolio,
  type ShareSampleOptions,
} from "../creator-share-kit/sample";

export const dynamic = "force-dynamic";

/**
 * Design review of the story with the fictional sample creator. The states are
 * switched by query string; see `ShareSampleOptions`.
 */
export async function GET(request: Request) {
  const query = Object.fromEntries(
    new URL(request.url).searchParams,
  ) as ShareSampleOptions;
  await shareSampleDelay(query);
  const [{ image }, fonts] = await Promise.all([
    shareSampleMedia(query),
    loadShareFonts(),
  ]);
  return creatorStoryImage({
    portfolio: shareSamplePortfolio(query),
    handleKey: "rileychen",
    image,
    fonts,
  });
}
