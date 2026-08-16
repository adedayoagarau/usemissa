import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveHandle } from "@missa/radar-adapters";

import { PublicProfileView } from "@/components/public-profile-view";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import { absoluteUrl, JsonLd, pageMetadata } from "@/lib/seo";

async function profileForHandle(rawHandle: string) {
  if (!rawHandle.startsWith("@") || !process.env.DATABASE_URL) return null;
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    rawHandle.slice(1),
  ).catch(() => null);
  if (
    !resolved ||
    resolved.resolution !== "canonical" ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    return null;
  const engine = await getEngine();
  const user = engine.store.users.get(resolved.subjectId);
  if (!user?.publicProfilePublishedAt) return null;
  const profile = engine.publicUserProfile(user.id);
  if (!profile || profile.isPrivate) return null;
  return {
    handle: rawHandle.slice(1),
    path: `/@${rawHandle.slice(1)}`,
    profile,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const rawHandle = (await params).handle;
  const result = await profileForHandle(rawHandle);
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
  const indexable = Boolean(
    result.profile.oneLine && result.profile.selectedWorks?.length,
  );
  return pageMetadata({
    title: result.profile.displayName ?? `@${result.handle}`,
    description,
    path: result.path,
    noIndex: !indexable,
  });
}

export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const rawHandle = (await params).handle;
  const result = await profileForHandle(rawHandle);
  if (!result) notFound();
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
