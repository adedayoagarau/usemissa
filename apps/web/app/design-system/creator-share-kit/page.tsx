import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import { ShareKitReview, type ShareKitState } from "./review";
import { shareSamplePortfolio, type ShareSampleOptions } from "./sample";

export const metadata = {
  title: "Creator share kit review",
  robots: { index: false, follow: false },
};

type Query = ShareSampleOptions & {
  state?: string | string[];
  events?: string | string[];
  broken?: string | string[];
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const STATES: ShareKitState[] = [
  "unpublished",
  "signed-out",
  "published",
  "changed",
];

/**
 * Design review of the studio's share kit panel with the fictional sample
 * creator. It draws the same panel the studio does, pointed at the sample
 * image and card routes so no database is needed.
 *
 * - `state=unpublished|signed-out|published|changed` (default published)
 * - `events=none|hidden|many` no events, the Upcoming section off, or six
 * - `broken=1` the pictures fail to load
 * - the sample options of the image routes (`image=0`, `long=1`, `delay=2000`…)
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const requested = first(query.state) as ShareKitState | undefined;
  const state =
    requested && STATES.includes(requested) ? requested : "published";
  let portfolio: PortfolioData = shareSamplePortfolio(query);
  const events = first(query.events);
  if (events === "none") portfolio = { ...portfolio, events: [] };
  if (events === "hidden")
    portfolio = {
      ...portfolio,
      modules: [{ id: "upcoming", visible: false }],
    };
  if (events === "many") {
    const year = new Date().getUTCFullYear() + 1;
    portfolio = {
      ...portfolio,
      events: [
        ...portfolio.events,
        ...[3, 4, 5, 6].map((month) => ({
          id: `e_more_${month}`,
          kind: "Reading",
          title: `Reading ${month}, with a longer title to see how a row wraps`,
          date: `${year}-0${month}-12`,
          time: "18:30",
          place: "Harbour Arts Centre",
          url: "",
          status: "open" as const,
        })),
      ],
    };
  }

  const forwarded = new URLSearchParams();
  for (const key of [
    "image",
    "photo",
    "open",
    "text",
    "bare",
    "long",
    "empty",
    "delay",
  ] as const) {
    const value = first(query[key]);
    if (value) forwarded.set(key, value);
  }
  const qs = forwarded.toString();
  const broken = first(query.broken) === "1";
  return (
    <ShareKitReview
      portfolio={portfolio}
      state={state}
      handle="rileychen"
      links={{
        linkCard: broken
          ? "/design-system/not-a-picture.png"
          : `/design-system/creator-share-image${qs ? `?${qs}` : ""}`,
        story: broken
          ? "/design-system/not-a-picture.png"
          : `/design-system/creator-story-image${qs ? `?${qs}` : ""}`,
        eventBase: `/design-system/creator-event-card?${qs ? `${qs}&` : ""}`,
      }}
    />
  );
}
