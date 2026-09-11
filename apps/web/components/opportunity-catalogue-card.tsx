"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter } from "@/components/ui/card";
import styles from "./opportunity-catalogue-card.module.css";

const EDITORIAL_PLATES = [
  "/media/home/opportunity-mountains.webp",
  "/media/home/opportunity-architecture.webp",
  "/media/home/opportunity-dance.webp",
  "/media/home/gallery-interior.webp",
  "/media/home/artist-at-work.webp",
  "/media/home/portfolio-still-life.webp",
] as const;

function typeLabel(type: OpportunityBrowseProjection["type"]): string {
  if (type === "open-call") return "Open call";
  return type
    .replace(/-/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function titleCasePractice(value: string): string {
  return value
    .replace(/[-_]/gu, " ")
    .split(/\s+/u)
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
  if (status === "closed") return "Closed";
  if (status === "archived") return "Archived";
  if (deadline.date) {
    const today = new Date().toISOString().slice(0, 10);
    if (deadline.date < today) return "Closed";
  }
  if (status === "closing-soon" && deadline.date) {
    const deadlineTime = new Date(`${deadline.date}T23:59:59`).getTime();
    const msDiff = deadlineTime - Date.now();
    if (msDiff < 0) return "Closed";
    const days = Math.ceil(msDiff / 86_400_000);
    return days <= 1 ? "Closes today" : `Closes in ${days} days`;
  }
  if (status === "closing-soon") return "Closing soon";
  if (status === "deadline-extended") return "Deadline extended";
  if (status === "opening-soon") return "Opening soon";
  if (deadline.kind === "rolling" || deadline.kind === "until-filled")
    return "Always open";
  return null;
}

const PRIZE_BADGE_MAX_CHARS = 18;

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  NGN: "₦",
  ZAR: "R",
};

function compactPrizeLabel(prize: string): string | null {
  const trimmed = prize.replace(/\s+/gu, " ").trim();
  if (!trimmed) return null;

  const symbolAmount = trimmed.match(
    /([$€£¥])\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/u,
  );
  if (symbolAmount?.[1] && symbolAmount[2]) {
    return `Prize ${symbolAmount[1]}${symbolAmount[2]}`;
  }

  const codeAfterAmount = trimmed.match(
    /(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*(USD|EUR|GBP|CAD|AUD|NGN|ZAR)\b/iu,
  );
  if (codeAfterAmount?.[1] && codeAfterAmount[2]) {
    const code = codeAfterAmount[2].toUpperCase();
    return `Prize ${currencySymbols[code] ?? code}${codeAfterAmount[1]}`;
  }

  const codeBeforeAmount = trimmed.match(
    /\b(USD|EUR|GBP|CAD|AUD|NGN|ZAR)\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/iu,
  );
  if (codeBeforeAmount?.[1] && codeBeforeAmount[2]) {
    const code = codeBeforeAmount[1].toUpperCase();
    return `Prize ${currencySymbols[code] ?? code}${codeBeforeAmount[2]}`;
  }

  const withoutPrizeWord = trimmed.replace(/^prize\s+/iu, "");
  if (withoutPrizeWord.length <= PRIZE_BADGE_MAX_CHARS) {
    return `Prize ${withoutPrizeWord}`;
  }

  return null;
}

function editorialPlate(item: OpportunityBrowseProjection): string {
  const key = `${item.type}:${item.discipline ?? ""}:${item.id}`;
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return EDITORIAL_PLATES[hash % EDITORIAL_PLATES.length] ?? EDITORIAL_PLATES[0];
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
  const [officialFailed, setOfficialFailed] = useState(false);
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
  )
    .map(titleCasePractice)
    .slice(0, 2);
  const publicStatus = statusLabel(item.status, item.deadline);
  const titleId = `opportunity-${item.id}-title`;
  const officialMedia = Boolean(item.identityAssetUrl) && !officialFailed;
  const mediaSrc =
    officialMedia && item.identityAssetUrl
      ? item.identityAssetUrl
      : editorialPlate(item);
  const prizeChip = item.prize ? compactPrizeLabel(item.prize) : null;

  function rejectNonPhotographicCover(image: HTMLImageElement) {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    // Official logos and banners are usually extreme aspect ratios; fall back to
    // editorial plates so catalogue cards keep a photographic cover rhythm.
    if (ratio > 2.2 || ratio < 0.55) {
      setOfficialFailed(true);
    }
  }

  function handleMediaLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    if (!officialMedia) return;
    rejectNonPhotographicCover(event.currentTarget);
  }

  function handleMediaRef(image: HTMLImageElement | null) {
    if (!image || !officialMedia) return;
    // Cached images may finish before React attaches onLoad.
    if (image.complete) rejectNonPhotographicCover(image);
  }

  return (
    <article className={styles.gridItem}>
      <Card
        className={styles.card}
        variant="interactive"
        aria-labelledby={titleId}
      >
        <Link
          href={detailHref}
          className={styles.media}
          tabIndex={-1}
          aria-hidden={officialMedia ? undefined : true}
          aria-label={officialMedia ? `Open ${item.title}` : undefined}
        >
          {/* Official plates are rights-cleared. Editorial plates are decorative atmosphere only. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={handleMediaRef}
            src={mediaSrc}
            alt={officialMedia ? (item.identityAssetAlt ?? "") : ""}
            onLoad={handleMediaLoad}
            onError={() => {
              if (officialMedia) setOfficialFailed(true);
            }}
          />
        </Link>

        <div className={styles.body}>
          <div className={styles.cardHeader}>
            <span className={`${styles.type} font-mono`}>
              {typeLabel(item.type)}
            </span>
            {prizeChip ? (
              <span className={`${styles.prizeBadge} font-mono`}>
                {prizeChip}
              </span>
            ) : null}
            {publicStatus ? (
              <Badge
                variant="secondary"
                className={`${styles.status} ${styles[item.status]}`}
              >
                {publicStatus}
              </Badge>
            ) : null}
          </div>

          <h3 id={titleId} className={`${styles.title} font-heading`}>
            <Link href={detailHref}>{item.title}</Link>
          </h3>

          <p className={styles.organization}>
            {item.organizationName ?? "Organization not confirmed"}
          </p>

          {practices.length ? (
            <p className={styles.practices}>{practices.join(" · ")}</p>
          ) : null}

          <dl className={styles.facts}>
            <div>
              <dt>Deadline</dt>
              <dd>
                <CalendarDays aria-hidden="true" />
                {deadlineLabel(item.deadline)}
              </dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd data-kind={item.fee.status === "no-fee" ? "positive" : undefined}>
                <Tag aria-hidden="true" />
                {feeLabel(item)}
              </dd>
            </div>
            {item.location ? (
              <div>
                <dt>Location</dt>
                <dd>
                  <MapPin aria-hidden="true" />
                  {item.location}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <CardFooter className={styles.cardActions}>
          <div className={styles.cardUtilityActions}>
            <SaveToTrackerButton
              opportunityId={item.id}
              tracked={item.personal?.tracked}
              compact={false}
              signedIn={signedIn}
              returnTo={returnTo}
              opportunityTitle={item.title}
            />
          </div>
          <Link href={detailHref} className={styles.openAction}>
            View
          </Link>
        </CardFooter>
      </Card>
    </article>
  );
}
