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
async function loadHomepageOpenings(): Promise<OpportunityBrowseProjection[]> {
  const relational =
    process.env.MISSA_CREATOR_RELATIONAL_AUTHORITY === "1" ||
    process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres";
  if (!relational || !process.env.DATABASE_URL) return [];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let items: OpportunityBrowseProjection[] = [];
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
    const today = new Date().toISOString().slice(0, 10);
    items = (result?.items ?? [])
      .filter(
        (item) =>
          ["open", "closing-soon", "deadline-extended"].includes(item.status) &&
          (!item.deadline.date || item.deadline.date >= today) &&
          ["fresh", "aging"].includes(
            opportunityFreshness(item.source.processingSucceededAt).state,
          ),
      )
      .slice(0, 3);
  } catch {
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return items;
}

export async function HomepageOpenings() {
  const items = await loadHomepageOpenings();
  if (!items.length) return <HomepageCollections />;
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
