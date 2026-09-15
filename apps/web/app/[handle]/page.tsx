import { notFound, permanentRedirect } from "next/navigation";
import { resolveHandle } from "@missa/radar-adapters";
import { cache } from "react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { portfolioSchema } from "@/lib/creator-portfolio-schema";
import { SITE_NAME, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Shared by generateMetadata and the page so the handle resolution and
 * portfolio read happen once per request.
 */
const loadPortfolio = cache(async (raw: string) => {
  if (!raw.startsWith("@") || !process.env.DATABASE_URL) return null;
  const resolved = await resolveHandle(process.env.DATABASE_URL, raw.slice(1));
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
  return { resolved, portfolio: parsed.data };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const raw = (await params).handle;
  const loaded = await loadPortfolio(raw);
  if (!loaded) return pageMetadata({ title: "Creator", description: "Creator portfolio on Missa.", path: `/${raw}`, noIndex: true });
  const name = loaded.portfolio.name || `@${loaded.resolved.handleKey}`;
  const bio = loaded.portfolio.bio?.trim();
  const description = bio
    ? bio.slice(0, 300)
    : `${name} on ${SITE_NAME}. Selected work, publications, and contact details.`;
  return pageMetadata({
    title: `${name} — Creator portfolio`,
    description,
    path: `/@${loaded.resolved.handleKey}`,
  });
}

export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const raw = (await params).handle;
  const loaded = await loadPortfolio(raw);
  if (!loaded) notFound();
  const { resolved, portfolio } = loaded;
  if (resolved.resolution === "alias" || raw !== `@${resolved.handleKey}`)
    permanentRedirect(`/@${resolved.handleKey}`);
  return (
    <PublicSiteShell>
      <CreatorPortfolioStudio
        publicData={{ ...portfolio, handle: resolved.handleKey }}
      />
    </PublicSiteShell>
  );
}
