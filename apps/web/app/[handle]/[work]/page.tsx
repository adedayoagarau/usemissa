import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicSiteShell } from "@/components/public-site-shell";
import { CreatorWorkPage } from "@/components/creator-profile/work-page/work-page";
import { loadPublishedPortfolio } from "@/lib/published-portfolio";
import {
  isThinWorkPage,
  recordEntryForWork,
  findWorkByAddress,
  workPageDescription,
  workParts,
} from "@/lib/creator-work-page";
import { WorkPageJsonLd, missingProfileMetadata } from "@/lib/profileSeo";
import { SITE_NAME, absoluteUrl, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string; work: string }>;

/**
 * Finds the work an address names on a published profile. Only works the
 * profile shows have a page, so an unpublished, hidden or untitled work, and
 * any address no work has, is not found. A different case redirects to the
 * address the page really has.
 */
async function findWork(handle: string, address: string) {
  const loaded = await loadPublishedPortfolio(handle);
  if (!loaded) return undefined;
  let wanted: string;
  try {
    wanted = decodeURIComponent(address);
  } catch {
    return undefined;
  }
  const found = findWorkByAddress(loaded.portfolio.works, wanted);
  return found && { ...loaded, ...found, wanted };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle, work: address } = await params;
  const found = await findWork(handle, address);
  if (!found) return missingProfileMetadata();
  const { work, portfolio, resolved, slug } = found;
  const key = resolved.handleKey;
  const name = portfolio.name || `@${key}`;
  const metadata = pageMetadata({
    title: `${work.title} — ${name}`,
    description: workPageDescription(work, name),
    path: `/@${key}/${slug}`,
    // A page with only a title has nothing for a search result to say.
    noIndex: isThinWorkPage(work),
  });
  // The share card is the profile's own; a work's picture sits behind a gated route.
  const image = {
    url: absoluteUrl(`/@${key}/share.png`),
    width: 1200,
    height: 630,
    alt: `${work.title} by ${name} on ${SITE_NAME}`,
  };
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      authors: [name],
      images: [image],
    },
    twitter: { ...metadata.twitter, images: [image.url] },
  };
}

export default async function CreatorWorkRoute({ params }: { params: Params }) {
  const { handle, work: address } = await params;
  const found = await findWork(handle, address);
  if (!found) notFound();
  const { portfolio, resolved, segment, work, slug, wanted } = found;
  const key = resolved.handleKey;
  // Compare the decoded segment: Next passes "@handle" as "%40handle".
  if (
    resolved.resolution === "alias" ||
    segment !== `@${key}` ||
    wanted !== slug
  )
    permanentRedirect(`/@${key}/${slug}`);
  const name = portfolio.name || `@${key}`;
  const record = recordEntryForWork(work, portfolio.record);
  return (
    <PublicSiteShell>
      <WorkPageJsonLd
        work={{
          path: `/@${key}/${slug}`,
          profilePath: `/@${key}`,
          title: work.title,
          description: workPageDescription(work, name),
          creator: name,
          kind: work.kind,
          year: work.year,
          image: `/@${key}/share.png`,
          publisher: record?.organization?.name || record?.venue,
          rights: work.rights.trim() || undefined,
          credits: work.credits,
          parts: workParts(work).map(({ kind, heading }) => ({
            kind,
            heading,
          })),
        }}
      />
      <CreatorWorkPage
        portfolio={{ ...portfolio, handle: key }}
        work={work}
        handle={key}
      />
    </PublicSiteShell>
  );
}
