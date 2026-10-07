import { notFound, permanentRedirect } from "next/navigation";
import { EventCardPage } from "@/components/creator-profile/share/event-card-page";
import { findShareableEvent } from "@/lib/creator-share-kit";
import { loadPublishedPortfolio } from "@/lib/published-portfolio";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string; eventId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { handle, eventId } = await params;
  const loaded = await loadPublishedPortfolio(handle);
  const event = loaded && findShareableEvent(loaded.portfolio, eventId);
  const name = loaded?.portfolio.name || "Event card";
  // A printed card is not a page to find in search.
  return pageMetadata({
    title: event ? `${event.title} — ${name}` : "Event card",
    description: event
      ? `A printable A6 card for ${event.title}, with a QR code to ${name}’s profile.`
      : "A printable event card.",
    path: loaded ? `/@${loaded.resolved.handleKey}/events/${eventId}` : "/",
    noIndex: true,
  });
}

/** An A6 card for one upcoming event on a published profile. */
export default async function EventCardRoute({ params }: { params: Params }) {
  const { handle, eventId } = await params;
  const loaded = await loadPublishedPortfolio(handle);
  if (!loaded) notFound();
  const { portfolio, resolved, segment } = loaded;
  // Unknown, past and unpublished events are the same 404: the page never says
  // which of them it was.
  const event = findShareableEvent(portfolio, eventId);
  if (!event) notFound();
  if (resolved.resolution === "alias" || segment !== `@${resolved.handleKey}`)
    permanentRedirect(`/@${resolved.handleKey}/events/${eventId}`);
  return (
    <EventCardPage
      portfolio={portfolio}
      handleKey={resolved.handleKey}
      event={event}
      backHref={`/@${resolved.handleKey}`}
    />
  );
}
