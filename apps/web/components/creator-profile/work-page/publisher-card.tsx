"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { provenanceCopy } from "@/components/missa/provenance-badge";
import { Sp, useSp } from "@/components/missa/spelling";
import { initials } from "@/lib/creator-profile";
import type { PortfolioRecordItem } from "@/lib/creator-portfolio-schema";
import { cn } from "@/lib/utils";
import { ExternalLink, hostname, safeHref } from "./links";
import styles from "./work-page.module.css";

/** The directory page's label for a publisher, from where its link points. */
function profileLabel(href: string) {
  if (href.startsWith("/journal/")) return "Journal profile";
  if (href.startsWith("/press/")) return "Press profile";
  if (href.startsWith("/residency/")) return "Residency profile";
  if (href.startsWith("/grant/")) return "Grant profile";
  return "Organization profile";
}

/**
 * Where the work was published, from the track record entry that names it. The
 * note under the name is the same plain-language source the profile gives for
 * that entry: Confirmed only when the organization recorded it on Missa.
 */
export function PublisherCard({
  entry,
  creator,
}: {
  entry: PortfolioRecordItem;
  creator: string;
}) {
  const sp = useSp();
  const name = entry.organization?.name || entry.venue;
  const url = safeHref(entry.url);
  const copy = provenanceCopy(entry.provenance, creator, name, sp);
  return (
    <aside className={styles.publisher} aria-label="Publication">
      <div className={styles.publisherHead}>
        <span
          aria-hidden="true"
          className={cn(styles.publisherMark, "font-heading")}
        >
          {initials(name).slice(0, 1)}
        </span>
        <div>
          <p className={styles.publisherName}>{name}</p>
          <p className={styles.publisherKind}>
            {entry.organization?.kind || "Publication"}
            {entry.year ? ` · ${entry.year}` : ""}
          </p>
        </div>
      </div>
      <p className={styles.publisherNote}>
        <strong>{copy.label}.</strong> {copy.body}
      </p>
      {(url || entry.organization?.href) && (
        <div className={styles.publisherActions}>
          {url && (
            <ExternalLink
              href={url}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "no-underline",
              )}
            >
              Read on {hostname(url)}
              <ArrowUpRight aria-hidden="true" />
            </ExternalLink>
          )}
          {entry.organization?.href && (
            <Link
              href={entry.organization.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "no-underline",
              )}
            >
              <Sp>{profileLabel(entry.organization.href)}</Sp>
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
