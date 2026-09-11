import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Item, ItemContent } from "@/components/ui/item";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { parseOpportunityBrowseQuery } from "@/lib/opportunityQuery";
import { opportunityFreshness } from "@/lib/opportunityFreshness";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import styles from "./homepage-studio.module.css";

export function HomepageCollections() {
  return (
    <section className={styles.openings} aria-labelledby="openings-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Find your next opportunity</p>
          <h2
            id="openings-title"
            className={`font-heading ${styles.sectionTitle}`}
          >
            What could come next?
          </h2>
        </div>
      </div>
      <div className={styles.collectionGrid}>
        {[
          {
            label: "Open calls",
            description:
              "Find places to publish, exhibit, perform, and share your work.",
            href: "/opportunities?type=open-call",
            action: "Explore open calls",
          },
          {
            label: "Grants",
            description:
              "Look for funding opportunities and check who can apply.",
            href: "/opportunities?type=grant",
            action: "Explore grants",
          },
          {
            label: "Residencies",
            description:
              "Discover time and space to develop your creative work.",
            href: "/opportunities?type=residency",
            action: "Explore residencies",
          },
        ].map((item) => (
          <article key={item.label} className={styles.collection}>
            <h3 className="font-heading">{item.label}</h3>
            <p>{item.description}</p>
            <Link className={styles.textLink} href={item.href}>
              {item.action}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The homepage never substitutes seed fixtures for current public records. */
type HomepageOpeningsResult =
  | { state: "not-configured"; items: [] }
  | { state: "empty"; items: [] }
  | { state: "unavailable"; items: [] }
  | { state: "ready"; items: OpportunityBrowseProjection[] };

async function loadHomepageOpenings(): Promise<HomepageOpeningsResult> {
  const relational =
    process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY === "1" ||
    process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres";
  if (!relational || !process.env.DATABASE_URL)
    return { state: "not-configured", items: [] };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const query = parseOpportunityBrowseQuery(
      new URLSearchParams({ limit: "12", openNow: "true" }),
    );
    const result = await Promise.race([
      getOpportunityRepository().browse(query),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 2500);
      }),
    ]);
    if (!result) return { state: "unavailable", items: [] };
    const today = new Date().toISOString().slice(0, 10);
    const items = result.items
      .filter(
        (item) =>
          ["open", "closing-soon", "deadline-extended"].includes(item.status) &&
          (!item.deadline.date || item.deadline.date >= today) &&
          ["fresh", "aging"].includes(
            opportunityFreshness(item.source.processingSucceededAt).state,
          ),
      )
      .slice(0, 3);
    return items.length ? { state: "ready", items } : { state: "empty", items: [] };
  } catch {
    return { state: "unavailable", items: [] };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function HomepageOpeningsUnavailable() {
  return (
    <section className={styles.openings} aria-labelledby="openings-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Catalogue connection</p>
          <h2 id="openings-title" className={`font-heading ${styles.sectionTitle}`}>
            Live openings are temporarily unavailable.
          </h2>
          <p>Open the catalogue to try again or continue browsing.</p>
        </div>
        <Link className={styles.textLink} href="/opportunities">
          Open the catalogue <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function HomepageOpeningsEmpty() {
  return (
    <section className={styles.openings} aria-labelledby="openings-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Catalogue status</p>
          <h2 id="openings-title" className={`font-heading ${styles.sectionTitle}`}>
            No current openings to show.
          </h2>
          <p>Browse the catalogue for opportunities with different timelines.</p>
        </div>
        <Link className={styles.textLink} href="/opportunities">
          Browse the catalogue <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export async function HomepageOpenings() {
  const result = await loadHomepageOpenings();
  if (result.state === "not-configured") return <HomepageCollections />;
  if (result.state === "unavailable") return <HomepageOpeningsUnavailable />;
  if (result.state === "empty") return <HomepageOpeningsEmpty />;
  const { items } = result;
  return (
    <section className={styles.openings} aria-labelledby="openings-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>In the catalogue</p>
          <h2
            id="openings-title"
            className={`font-heading ${styles.sectionTitle}`}
          >
            Open for your next step.
          </h2>
        </div>
        <Link className={styles.textLink} href="/opportunities">
          View all opportunities
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.openingList}>
        {items.map((item) => (
          <Item key={item.id} variant="outline">
            <ItemContent>
              <p className={styles.eyebrow}>
                {item.organizationName || item.source.name}
              </p>
              <h3 className="font-heading text-xl">
                <Link href={`/opportunities/${encodeURIComponent(item.slug)}`}>
                  {item.title}
                </Link>
              </h3>
              {item.deadline.date && (
                <p className="font-mono text-xs">
                  Deadline: {item.deadline.date}
                </p>
              )}
              <Link
                className={styles.textLink}
                href={`/opportunities/${encodeURIComponent(item.slug)}`}
              >
                View opportunity
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </ItemContent>
          </Item>
        ))}
      </div>
    </section>
  );
}
