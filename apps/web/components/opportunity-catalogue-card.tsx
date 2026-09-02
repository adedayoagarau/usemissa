"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Gift, MapPin, Tag } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import styles from "./opportunity-catalogue-card.module.css";

function initials(item: OpportunityBrowseProjection): string {
  return (
    (item.organizationName ?? item.title)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M"
  );
}

function typeLabel(type: OpportunityBrowseProjection["type"]): string {
  if (type === "open-call") return "Open call";
  return type
    .replace(/-/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function deadlineLabel(
  deadline: OpportunityBrowseProjection["deadline"],
): string {
  if (!deadline.date) {
    if (deadline.kind === "rolling") return "Rolling";
    if (deadline.kind === "until-filled") return "Until filled";
    return "Deadline not listed";
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline.date}T12:00:00`));
}

function feeLabel(item: OpportunityBrowseProjection): string {
  if (item.fee.status === "no-fee") return "No fee";
  if (item.fee.status === "unknown") return "Fee not listed";
  if (item.fee.amountCents !== undefined && item.fee.currency) {
    const currency = /^[A-Z]{3}$/u.test(item.fee.currency)
      ? item.fee.currency
      : undefined;
    if (currency) {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).format(item.fee.amountCents / 100);
    }
    return `${item.fee.currency}${(item.fee.amountCents / 100).toFixed(2)}`;
  }
  return "Application fee";
}

function statusLabel(
  status: OpportunityBrowseProjection["status"],
  deadline: OpportunityBrowseProjection["deadline"],
): string | null {
  if (status === "closing-soon" && deadline.date) {
    const deadlineTime = new Date(`${deadline.date}T23:59:59`).getTime();
    const days = Math.max(0, Math.ceil((deadlineTime - Date.now()) / 86_400_000));
    return days === 0 ? "Closes today" : `Closes in ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (status === "closing-soon") return "Closing soon";
  if (status === "deadline-extended") return "Deadline extended";
  if (status === "opening-soon") return "Opening soon";
  if (deadline.kind === "rolling" || deadline.kind === "until-filled") return "Always open";
  return null;
}

export function OpportunityCatalogueCard({
  item,
  signedIn,
  previewMode = false,
}: {
  item: OpportunityBrowseProjection;
  signedIn: boolean;
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailHref = previewMode
    ? `/opportunities?preview=public#${item.id}`
    : `/opportunities/${item.slug}`;
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const practices = Array.from(
    new Set(
      [item.discipline, ...item.genres].filter((value): value is string =>
        Boolean(value),
      ),
    ),
  ).slice(0, 2);
  const publicStatus = statusLabel(item.status, item.deadline);
  const titleId = `opportunity-${item.id}-title`;

  return (
    <article>
      <Card className={styles.card} size="lg" variant="interactive">
      <Link
        href={detailHref}
        className={styles.openLink}
        aria-labelledby={titleId}
      >
        <span className={styles.media}>
          {item.identityAssetUrl ? (
            // Only rights-cleared/permitted identity assets reach this projection.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.identityAssetUrl}
              alt={item.identityAssetAlt ?? ""}
            />
          ) : (
            <span className={styles.fallback} aria-hidden="true">
              {initials(item)}
            </span>
          )}
        </span>
        <span className={styles.body}>
          <span className={styles.kicker}>
            <span className={styles.type}>{typeLabel(item.type)}</span>
            {publicStatus ? (
              <Badge variant="secondary" className={`${styles.status} ${styles[item.status]}`}>
                {publicStatus}
              </Badge>
            ) : null}
          </span>
          <span id={titleId} className={styles.title}>{item.title}</span>
          <span className={styles.organization}>
            {item.organizationName ?? "Organization not confirmed"}
          </span>
          {item.content?.summary ? (
            <span className={styles.summary}>{item.content.summary}</span>
          ) : null}
          {practices.length ? (
            <span className={styles.practices}>{practices.join(" · ")}</span>
          ) : null}
          <span className={styles.facts}>
            <span data-kind="deadline">
              <CalendarDays aria-hidden="true" />
              {deadlineLabel(item.deadline)}
            </span>
            <span data-kind={item.fee.status === "no-fee" ? "positive" : "fee"}>
              <Tag aria-hidden="true" />
              {feeLabel(item)}
            </span>
            <span data-kind="information">
              <MapPin aria-hidden="true" />
              {item.location ?? "Location not listed"}
            </span>
            {item.prize ? (
              <span data-kind="award">
                <Gift aria-hidden="true" />
                {item.prize}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
      <div className={styles.save}>
        <SaveToTrackerButton
          opportunityId={item.id}
          tracked={item.personal?.tracked}
          compact
          signedIn={signedIn}
          returnTo={returnTo}
          opportunityTitle={item.title}
        />
        <span aria-hidden="true">
          {item.personal?.tracked ? "In Tracker" : "Save"}
        </span>
      </div>
      </Card>
    </article>
  );
}
