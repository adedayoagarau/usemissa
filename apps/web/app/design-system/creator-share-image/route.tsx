import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  creatorShareImage,
  loadEditorialFont,
} from "@/components/creator-profile/share-image";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";

export const dynamic = "force-dynamic";

async function publicPng(file: string) {
  const bytes = await readFile(path.join(process.cwd(), "public", file));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Design review of the share card with the fictional sample creator. */
export async function GET() {
  const [photo, image, font] = await Promise.all([
    publicPng("media/creator-preview-portrait.png"),
    publicPng("media/creator-preview-landscape.png"),
    loadEditorialFont(),
  ]);
  return creatorShareImage({
    portfolio: sampleCreatorPortfolio(),
    handleKey: "rileychen",
    photo,
    image,
    font,
  });
}
