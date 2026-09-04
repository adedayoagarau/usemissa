"use client";

import Link from "next/link";
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

const FALLBACK_PLATES = {
  grant: "/media/home/artist-at-work.webp",
  residency: "/media/home/opportunity-architecture.webp",
  award: "/media/home/opportunity-mountains.webp",
  contest: "/media/home/opportunity-mountains.webp",
  fellowship: "/media/home/opportunity-dance.webp",
  "open-call": "/media/home/gallery-interior.webp",
  exhibition: "/media/home/gallery-interior.webp",
  default: "/media/home/portfolio-still-life.webp",
} as const;

function typeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ||
    type.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase())
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

function fallbackPlateFor(type: string): string {
  return (
    FALLBACK_PLATES[type as keyof typeof FALLBACK_PLATES] ??
    FALLBACK_PLATES.default
  );
}

export function OpportunityBrowseProjectCard({
  item,
}: {
  item: OpportunityBrowseProjection;
}) {
  const practices = [item.discipline, ...item.genres]
    .filter((value): value is string => Boolean(value))
    .slice(0, 2)
    .map(titleCasePractice);
  const cardImage = item.identityAssetUrl || fallbackPlateFor(item.type);
  const secondaryBadge = statusBadge(item);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Link
          href={`/opportunities/${item.id}`}
          className={styles.mediaLink}
          tabIndex={-1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImage}
            alt={item.identityAssetAlt || item.title}
            loading="lazy"
          />
        </Link>
        <div className={styles.badges}>
          <NativeBadge variant="glass" size="sm" animate={false}>
            {typeLabel(item.type)}
          </NativeBadge>
          {secondaryBadge ? (
            <NativeBadge
              variant={secondaryBadge.variant}
              size="sm"
              animate={false}
            >
              {secondaryBadge.label}
            </NativeBadge>
          ) : null}
        </div>
        <AddOpportunityToCalendarButton item={item} className={styles.calendarAction} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/opportunities/${item.id}`}>{item.title}</Link>
        </h3>
        {item.organizationName ? (
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
        <Link href={`/opportunities/${item.id}`} className={styles.view}>
          View opportunity
        </Link>
      </div>
    </article>
  );
}
