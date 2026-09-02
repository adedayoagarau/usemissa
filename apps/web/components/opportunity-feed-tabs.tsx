"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock3, Coins, LayoutGrid, Sparkles } from "lucide-react";
import styles from "./opportunity-feed-tabs.module.css";

const feeds = [
  {
    id: "all",
    label: "Open now",
    changes: { deadlineWithinDays: undefined, fee: undefined, sort: undefined },
    icon: LayoutGrid,
  },
  {
    id: "closing",
    label: "Closing soon",
    changes: { deadlineWithinDays: "14", fee: undefined, sort: undefined },
    icon: Clock3,
  },
  {
    id: "free",
    label: "Free to submit",
    changes: { fee: "no-fee", deadlineWithinDays: undefined, sort: undefined },
    icon: Coins,
  },
  {
    id: "recent",
    label: "Recently added",
    changes: { sort: "recently-added", deadlineWithinDays: undefined, fee: undefined },
    icon: Sparkles,
  },
] as const;

export type OpportunityFeedId = (typeof feeds)[number]["id"];

export function OpportunityFeedTabs({
  activeFeed,
}: {
  activeFeed: OpportunityFeedId;
}) {
  const searchParams = useSearchParams();

  function hrefFor(changes: (typeof feeds)[number]["changes"]) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cursor");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    return query ? `/opportunities?${query}` : "/opportunities";
  }

  return (
    <nav className={styles.feedNav} aria-label="Browse opportunities by timing and cost">
      <span className={styles.label}>Browse by</span>
      <div className={styles.feedList}>
        {feeds.map((feed) => {
          const Icon = feed.icon;
          const active = feed.id === activeFeed;
          return (
            <Link
              key={feed.id}
              href={hrefFor(feed.changes)}
              className={active ? styles.active : undefined}
              data-feed={feed.id}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{feed.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
