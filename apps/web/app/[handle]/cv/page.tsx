import { notFound, permanentRedirect } from "next/navigation";
import { CreatorCv } from "@/components/creator-profile/creator-cv";
import { loadPublishedPortfolio } from "@/lib/published-portfolio";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const loaded = await loadPublishedPortfolio((await params).handle);
  const name = loaded?.portfolio.name || "Creator";
  return pageMetadata({
    title: `${name} — CV`,
    description: `Publications, prizes, residencies and shows for ${name}.`,
    path: loaded ? `/@${loaded.resolved.handleKey}/cv` : "/",
    noIndex: true,
  });
}

export default async function CreatorCvPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const loaded = await loadPublishedPortfolio((await params).handle);
  if (!loaded) notFound();
  const { portfolio, resolved, segment } = loaded;
  if (resolved.resolution === "alias" || segment !== `@${resolved.handleKey}`)
    permanentRedirect(`/@${resolved.handleKey}/cv`);
  return (
    <CreatorCv
      portfolio={portfolio}
      handleKey={resolved.handleKey}
      backHref={`/@${resolved.handleKey}`}
    />
  );
}
