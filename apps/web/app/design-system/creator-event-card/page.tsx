import { notFound } from "next/navigation";
import { EventCardPage } from "@/components/creator-profile/share/event-card-page";
import { findShareableEvent, shareableEvents } from "@/lib/creator-share-kit";
import {
  shareSamplePortfolio,
  type ShareSampleOptions,
} from "../creator-share-kit/sample";

export const metadata = {
  title: "Creator event card review",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<ShareSampleOptions & { event?: string | string[] }>;

/**
 * Design review of the event card with the fictional sample creator, drawn by
 * the same components and selection as `/@handle/events/<eventId>`. `event`
 * picks an event by id (default: the first upcoming one); an id the profile
 * doesn't list is a 404, as it is live. `long=1` sets a long title and place.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const portfolio = shareSamplePortfolio(query);
  const requested = Array.isArray(query.event) ? query.event[0] : query.event;
  const id = requested ?? shareableEvents(portfolio)[0]?.id ?? "";
  const event = findShareableEvent(portfolio, id);
  if (!event) notFound();
  return (
    <EventCardPage
      portfolio={portfolio}
      handleKey="rileychen"
      event={event}
      backHref="/design-system/creator-profile-v2"
    />
  );
}
