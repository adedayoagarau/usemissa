import { resolveHandle } from "@missa/radar-adapters";
import { cache } from "react";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { portfolioSchema } from "@/lib/creator-portfolio-schema";

/**
 * Reads the published snapshot for an `@handle` route segment. Shared by the
 * profile page, its CV and its share image so each request reads it once.
 */
export const loadPublishedPortfolio = cache(async (raw: string) => {
  const segment = decodeURIComponent(raw);
  if (!segment.startsWith("@") || !process.env.DATABASE_URL) return null;
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    segment.slice(1),
  );
  if (
    !resolved ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    return null;
  const repo = getCreatorProfileRepository();
  const parsed = portfolioSchema.safeParse(
    await repo?.publicPortfolio(resolved.subjectId),
  );
  if (!parsed.success) return null;
  return { resolved, portfolio: parsed.data, segment };
});

/** Published media as a data URL for renderers that can't fetch gated routes. */
export async function publishedMediaDataUrl(url: string) {
  const id = url.split("/").pop();
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const media = await getCreatorProfileRepository()?.portfolioMedia(id);
  if (!media || !media.content_type.startsWith("image/")) return undefined;
  if (media.content_type === "image/webp" || media.content_type === "image/gif")
    return undefined; // The share-image renderer reads PNG and JPEG only.
  return `data:${media.content_type};base64,${Buffer.from(media.bytes).toString("base64")}`;
}
