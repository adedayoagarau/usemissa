import { notFound, permanentRedirect } from "next/navigation";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PublicCreatorProfile } from "@/components/creator-profile/public-profile";
import { loadPublishedPortfolio as loadPortfolio } from "@/lib/published-portfolio";
import { SITE_NAME, absoluteUrl, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const raw = (await params).handle;
  const loaded = await loadPortfolio(raw);
  if (!loaded)
    return pageMetadata({
      title: "Creator",
      description: "Creator portfolio on Missa.",
      path: `/${raw}`,
      noIndex: true,
    });
  const name = loaded.portfolio.name || `@${loaded.resolved.handleKey}`;
  const bio = loaded.portfolio.statement.trim() || loaded.portfolio.bio?.trim();
  const description = bio
    ? bio.slice(0, 300)
    : `${name} on ${SITE_NAME}. Selected work, publications, and contact details.`;
  const metadata = pageMetadata({
    title: `${name} — Creator portfolio`,
    description,
    path: `/@${loaded.resolved.handleKey}`,
  });
  // The share card is drawn from the published profile itself.
  const image = {
    url: absoluteUrl(`/@${loaded.resolved.handleKey}/share.png`),
    width: 1200,
    height: 630,
    alt: `${name} on ${SITE_NAME}`,
  };
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, type: "profile", images: [image] },
    twitter: { ...metadata.twitter, images: [image.url] },
  };
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
      <PublicCreatorProfile
        portfolio={{ ...portfolio, handle: resolved.handleKey }}
        handle={resolved.handleKey}
      />
    </PublicSiteShell>
  );
}
