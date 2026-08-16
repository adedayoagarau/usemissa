import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isPublicProfileIndexable } from "@missa/radar-engine";

import { PublicProfileView } from "@/components/public-profile-view";
import { PublicSiteShell } from "@/components/public-site-shell";
import { publicProfileForHandle } from "@/lib/public-profile-for-handle";
import { absoluteUrl, JsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const rawHandle = (await params).handle;
  const result = await publicProfileForHandle(rawHandle);
  if (!result)
    return pageMetadata({
      title: "Profile not found",
      description: "This Profile is not available.",
      path: "/profiles",
      noIndex: true,
    });
  const description =
    result.profile.oneLine ??
    result.profile.bio ??
    `${result.profile.displayName ?? "A creator"} on Missa.`;
  const indexable = isPublicProfileIndexable(result.profile);
  return pageMetadata({
    title: result.profile.displayName ?? `@${result.handle}`,
    description,
    path: result.path,
    noIndex: !indexable,
    socialImagePath: `${result.path}/opengraph-image`,
    socialImageAlt: `${result.profile.displayName ?? `@${result.handle}`}, @${result.handle} on Missa.`,
  });
}

export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const rawHandle = (await params).handle;
  const result = await publicProfileForHandle(rawHandle);
  if (!result) notFound();
  if (result.redirectTo) permanentRedirect(result.redirectTo);
  const name = result.profile.displayName ?? `@${result.handle}`;
  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: absoluteUrl(result.path),
    ...(result.profile.oneLine ? { description: result.profile.oneLine } : {}),
    ...(result.profile.profileImageUrl
      ? { image: result.profile.profileImageUrl }
      : {}),
    ...(result.profile.selectedWorks?.length
      ? {
          hasPart: result.profile.selectedWorks.map((work) => ({
            "@type": "CreativeWork",
            name: work.title,
            ...(work.description ? { description: work.description } : {}),
            ...(work.url ? { url: work.url } : {}),
            ...(work.year ? { datePublished: String(work.year) } : {}),
          })),
        }
      : {}),
  };

  return (
    <PublicSiteShell current="profile">
      <JsonLd data={personJsonLd} />
      <PublicProfileView
        profile={result.profile}
        handle={result.handle}
        shareUrl={absoluteUrl(result.path)}
      />
    </PublicSiteShell>
  );
}
