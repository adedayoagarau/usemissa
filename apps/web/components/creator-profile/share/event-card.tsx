import type { ElementType } from "react";
import type { PortfolioEvent } from "@/lib/creator-portfolio-schema";
import {
  eventLabel,
  profileAddress,
  profileLink,
} from "@/lib/creator-share-kit";
import { cn } from "@/lib/utils";
import { QrCodeSvg } from "./qr-code";
import styles from "./event-card.module.css";

/** The title steps down so a long one still leaves room for the code. */
function titleSize(title: string) {
  if (title.length <= 24) return "large";
  if (title.length <= 48) return "medium";
  if (title.length <= 90) return "small";
  return "smallest";
}

/**
 * One upcoming event as an A6 card (105 × 148 mm): when and what, who and where,
 * and a QR code to the profile. Everything is sized from the card's own width,
 * so the same markup is a preview in the studio, a card on screen and exactly
 * A6 on paper.
 */
export function EventCard({
  name,
  handleKey,
  event,
  scan,
  today,
  headingAs: Heading = "h1",
}: {
  /** The profile's display name. */
  name: string;
  handleKey: string;
  event: Pick<PortfolioEvent, "kind" | "title" | "date" | "time" | "place">;
  /** The line beside the wordmark, like "Scan for the writing and images." */
  scan: string;
  today?: string;
  /** Use a lower level where the card sits under other headings. */
  headingAs?: ElementType;
}) {
  const label = eventLabel(event, today);
  return (
    <article className={styles.sheet} aria-label={`Event card: ${event.title}`}>
      <div className={styles.card}>
        <header className={styles.head}>
          {label && <p className={cn(styles.label, "font-mono")}>{label}</p>}
          <Heading
            className={cn(styles.title, "font-heading")}
            data-size={titleSize(event.title)}
          >
            {event.title}
          </Heading>
          <p className={styles.who}>{name}</p>
          {event.place && <p className={styles.place}>{event.place}</p>}
        </header>
        <div className={styles.code}>
          <QrCodeSvg
            value={profileLink(handleKey)}
            label={`QR code linking to ${name}’s profile`}
            className={styles.qr}
          />
          <p className={cn(styles.address, "font-mono")}>
            {profileAddress(handleKey)}
          </p>
        </div>
        <footer className={styles.foot}>
          <p className={styles.scan}>{scan}</p>
          <span className={cn(styles.brand, "font-heading")}>Missa</span>
        </footer>
      </div>
    </article>
  );
}
