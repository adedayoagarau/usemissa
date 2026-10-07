import { resolveHandle } from "@missa/radar-adapters";
import { cache } from "react";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { verifiedOutcomes } from "@/lib/accepted-outcomes";
import {
  portfolioSchema,
  publicPortfolioProjection,
  withServerProvenance,
} from "@/lib/creator-portfolio-schema";
import { portfolioServerFacts } from "@/lib/portfolio-server-facts";

/**
 * A user's published snapshot as visitors may see it. Confirmed entries are
 * re-checked against the owner's current acceptances on every read, so a
 * withdrawn decision stops showing as Confirmed without a republish.
 */
export const readPublishedPortfolio = cache(async (userId: string) => {
  const published =
    await getCreatorProfileRepository()?.publishedPortfolio(userId);
  const parsed = portfolioSchema.safeParse(published?.data);
  if (!published || !parsed.success) return undefined;
  const confirmable = parsed.data.record.some((item) => item.outcomeId);
  // Credits and file facts are read fresh on every read, like outcomes: a
  // collaborator who removes the credit, or a file that is gone, stops showing
  // without a republish.
  const facts = await portfolioServerFacts(parsed.data, {
    accountId: published.accountId,
    userId,
  });
  return publicPortfolioProjection(
    withServerProvenance(
      parsed.data,
      confirmable ? await verifiedOutcomes(published.accountId) : new Map(),
      facts,
    ),
  );
});

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
  const portfolio = await readPublishedPortfolio(resolved.subjectId);
  if (!portfolio) return null;
  return { resolved, portfolio, segment };
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
