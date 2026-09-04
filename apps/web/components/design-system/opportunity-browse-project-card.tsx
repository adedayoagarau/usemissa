"use client";

import Link from "next/link";
import { useState } from "react";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { SaveOpportunityButton } from "@/components/save-opportunity-button";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { AddOpportunityToCalendarButton } from "@/components/add-opportunity-to-calendar-button";
import { NativeBadge } from "@/components/uitripled/native-badge-carbon";
import styles from "./opportunity-browse-project-card.module.css";

const TYPE_LABELS: Record<string, string> = {
  "open-call": "Open call",
  grant: "Grant",
  residency: "Residency",
  award: "Award",
  fellowship: "Fellowship",
  magazine: "Magazine",
  contest: "Contest",
  exhibition: "Exhibition",
};

function typeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ||
    type
      .replace(/-/g, " ")
      .replace(/^./, (character) => character.toUpperCase())
  );
}

function titleCasePractice(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
    const symbol =
      item.fee.currency === "USD"
        ? "$"
        : item.fee.currency === "EUR"
          ? "€"
          : item.fee.currency === "GBP"
            ? "£"
            : `${item.fee.currency} `;
    return `${symbol}${(item.fee.amountCents / 100).toFixed(2)}`;
  }
  if (item.fee.raw) return item.fee.raw;
  return "Has fee";
}

function statusBadge(
  item: OpportunityBrowseProjection,
): { label: string; variant: "neutral" | "default" } | null {
  if (item.fee.status === "no-fee") {
    return { label: "No fee", variant: "neutral" };
  }
  if (!item.deadline.date) return null;
  const today = new Date();
  const deadline = new Date(`${item.deadline.date}T12:00:00`);
  const days = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 0 && days <= 7) {
    return { label: "Closing soon", variant: "default" };
  }
  return null;
}

export function OpportunityBrowseProjectCard({
  item,
  signedIn,
}: {
  signedIn?: boolean;
  item: OpportunityBrowseProjection;
}) {
  const practices = Array.from(
    new Set(
      [item.discipline, ...item.genres]
        .filter((value): value is string => Boolean(value))
        .map(titleCasePractice),
    ),
  )
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const cardImage =
    item.identityAssetUrl && item.identityAssetUrl !== failedImage
      ? item.identityAssetUrl
      : null;
  const secondaryBadge = statusBadge(item);

  return (
    <article className={styles.card}>
      <div
        className={styles.media}
        data-identity-only={!cardImage || undefined}
      >
        <Link
          href={`/opportunities/${item.id}`}
          className={styles.mediaLink}
          tabIndex={-1}
        >
          {cardImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardImage}
              alt={item.identityAssetAlt || item.organizationName || item.title}
              loading="lazy"
              onError={() => setFailedImage(cardImage)}
            />
          ) : (
            <span className={styles.identityPlate} aria-hidden="true">
              <span className={styles.identityName}>
                {item.organizationName || typeLabel(item.type)}
              </span>
            </span>
          )}
        </Link>
        <div className={styles.badges}>
          <NativeBadge
            variant="neutral"
            className={styles.imageBadge}
            size="sm"
            animate={false}
          >
            {typeLabel(item.type)}
          </NativeBadge>
          {secondaryBadge ? (
            <NativeBadge
              variant="neutral"
              className={styles.imageBadge}
              data-urgency={
                secondaryBadge.label === "Closing soon" || undefined
              }
              size="sm"
              animate={false}
            >
              {secondaryBadge.label}
            </NativeBadge>
          ) : null}
        </div>
        {signedIn === undefined ? (
          <SaveOpportunityButton
            opportunityId={item.id}
            className={styles.saveAction}
          />
        ) : (
          <div className={styles.saveAction}>
            <SaveToTrackerButton
              opportunityId={item.id}
              opportunityTitle={item.title}
              signedIn={signedIn}
              tracked={item.personal?.tracked}
              compact
              returnTo={`/opportunities/${item.id}`}
            />
          </div>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/opportunities/${item.id}`}>{item.title}</Link>
        </h3>
        {item.organizationName && cardImage ? (
          <p className={styles.org}>{item.organizationName}</p>
        ) : null}
        {practices.length > 0 ? (
          <p className={styles.practices}>{practices.join(" · ")}</p>
        ) : null}
        <div className={styles.facts}>
          <span>
            <CalendarDays aria-hidden="true" />
            {deadlineLabel(item.deadline)}
          </span>
          <span>
            <Tag aria-hidden="true" />
            {feeLabel(item)}
          </span>
          {item.location ? (
            <span>
              <MapPin aria-hidden="true" />
              {item.location}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.footer}>
        <AddOpportunityToCalendarButton item={item} showLabel />
        <Link href={`/opportunities/${item.id}`} className={styles.view}>
          View opportunity
        </Link>
      </div>
    </article>
  );
}
