import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import { scanLine } from "@/lib/creator-share-kit";
import { PrintButton } from "../print-button";
import { EventCard } from "./event-card";
import styles from "./event-card-page.module.css";

/**
 * The printable page for one event: the card at A6, with a way back and the
 * browser's print dialog, which also saves a PDF. Only the card is printed.
 */
export function EventCardPage({
  portfolio,
  handleKey,
  event,
  backHref,
  today,
}: {
  portfolio: PortfolioData;
  handleKey: string;
  event: PortfolioData["events"][number];
  backHref: string;
  today?: string;
}) {
  return (
    <main id="main-content" className={styles.page}>
      {/* Paper size is page-wide, so it lives with the page and not in the
          card: the card also previews inside the studio. A6 is spelled in
          millimetres because browsers don't know the keyword. */}
      <style>{"@page { size: 105mm 148mm; margin: 0; }"}</style>
      <div className={styles.toolbar}>
        <Link href={backHref} className={styles.back}>
          <ArrowLeft aria-hidden="true" />
          Back to profile
        </Link>
        <PrintButton />
      </div>
      <EventCard
        name={portfolio.name || `@${handleKey}`}
        handleKey={handleKey}
        event={event}
        scan={scanLine(portfolio)}
        today={today}
      />
      <p className={styles.note}>
        Prints on A6 (105 × 148 mm). In the print window, choose Save as PDF to
        keep a copy.
      </p>
    </main>
  );
}
