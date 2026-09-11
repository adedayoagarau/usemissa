import { notFound, permanentRedirect } from "next/navigation";
import { resolveHandle } from "@missa/radar-adapters";
import { PublicSiteShell } from "@/components/public-site-shell";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { portfolioSchema } from "@/lib/creator-portfolio-schema";
export const dynamic = "force-dynamic";
export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const raw = (await params).handle;
  if (!raw.startsWith("@") || !process.env.DATABASE_URL) notFound();
  const resolved = await resolveHandle(process.env.DATABASE_URL, raw.slice(1));
  if (
    !resolved ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    notFound();
  const repo = getCreatorProfileRepository();
  const parsed = portfolioSchema.safeParse(
    await repo?.publicPortfolio(resolved.subjectId),
  );
  if (!parsed.success) notFound();
  if (resolved.resolution === "alias" || raw !== `@${resolved.handleKey}`)
    permanentRedirect(`/@${resolved.handleKey}`);
  return (
    <PublicSiteShell>
      <CreatorPortfolioStudio
        publicData={{ ...parsed.data, handle: resolved.handleKey }}
      />
    </PublicSiteShell>
  );
}
