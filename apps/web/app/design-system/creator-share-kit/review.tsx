"use client";
import { useState } from "react";
import {
  SharePanel,
  type ShareKitLinks,
} from "@/components/creator-profile/studio/share-panel";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";

export type ShareKitState =
  "unpublished" | "signed-out" | "published" | "changed";

/**
 * Hosts the share kit panel the way the studio does, with `onPublish` wired to
 * a visible stand-in so the offer to publish can be checked without a database.
 */
export function ShareKitReview({
  portfolio,
  state,
  handle,
  links,
}: {
  portfolio: PortfolioData;
  state: ShareKitState;
  handle: string;
  links: Omit<ShareKitLinks, "event"> & { eventBase: string };
}) {
  const [requests, setRequests] = useState(0);
  const [live, setLive] = useState(
    state === "published" || state === "changed",
  );
  const [changed, setChanged] = useState(state === "changed");
  return (
    <main id="main-content" className="mx-auto w-full max-w-[440px] px-7 py-7">
      <SharePanel
        draft={portfolio}
        handle={live ? handle : ""}
        published={live}
        changedSincePublish={changed}
        isAccount={state !== "signed-out"}
        onPublish={() => {
          setRequests((count) => count + 1);
          setLive(true);
          setChanged(false);
        }}
        links={{
          linkCard: links.linkCard,
          story: links.story,
          event: (eventId) => `${links.eventBase}event=${eventId}`,
        }}
      />
      <p role="status" data-testid="publish-requests" className="sr-only">
        {requests
          ? `Publish requested ${requests} time${requests > 1 ? "s" : ""}.`
          : ""}
      </p>
    </main>
  );
}
