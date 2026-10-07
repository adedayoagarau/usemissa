"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PortfolioWork } from "@/lib/creator-portfolio-schema";
import {
  detectVideo,
  hasCaseStudy,
  hasWallLabel,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import {
  hostname,
  profileStyles as styles,
  safeHref,
} from "../sections/shared";
import { AudioPanel } from "./audio-panel";
import { CaseStudyFacts } from "./case-study";
import { MediaImage } from "./media-image";
import { Screening } from "./screening";
import type { Player } from "./use-audio-player";
import { WallLabel } from "./wall-label";
import cx from "./work-media.module.css";

/**
 * One work, opened. A film (poster, chapters, transcript), a recording
 * (player, chapters, transcript) or a picture with its wall label comes first,
 * then a case study's facts, then the writing.
 */
export function WorkDialog({
  work,
  autoplay = false,
  onClose,
  player,
  creator,
  pageHref,
}: {
  /** Where the work's own page lives; absent in previews and samples. */
  pageHref?: string;
  work: PortfolioWork | null;
  /** A visitor pressed play on the card, so the film begins at once. */
  autoplay?: boolean;
  onClose: () => void;
  player: Player;
  creator: string;
}) {
  const href = work ? safeHref(work.url) : undefined;
  // Chapters and a transcript belong to the film when there is one.
  const hasFilm = Boolean(work?.video.trim());
  const framedFilm = Boolean(work && detectVideo(work.video));
  return (
    <Dialog open={Boolean(work)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialog}>
        {work && (
          <>
            <div className={styles.dialogHead}>
              <span className="font-mono">
                {[work.kind, work.year].filter(Boolean).join(" · ")}
              </span>
              <DialogTitle className={cn(styles.dialogTitle, "font-heading")}>
                {work.title}
              </DialogTitle>
              <DialogDescription>
                {work.summary || `By ${creator}`}
              </DialogDescription>
            </div>
            {hasFilm && (
              <Screening
                url={work.video}
                title={work.title}
                poster={work.image}
                chapters={work.chapters}
                transcript={work.transcript}
                autoStart={autoplay}
              />
            )}
            {work.image && !framedFilm && (
              <figure className={styles.dialogFigure}>
                <MediaImage
                  src={work.image}
                  alt={work.caption || ""}
                  title={work.title}
                  loading="eager"
                />
                {(hasWallLabel(work) || work.caption) && (
                  <figcaption>
                    {hasWallLabel(work) ? (
                      <WallLabel work={work} />
                    ) : (
                      work.caption
                    )}
                  </figcaption>
                )}
              </figure>
            )}
            {work.audio && (
              <AudioPanel
                track={work}
                player={player}
                chapters={hasFilm ? [] : work.chapters}
                transcript={hasFilm ? "" : work.transcript}
              />
            )}
            {hasCaseStudy(work) && <CaseStudy work={work} />}
            {work.text.trim() && (
              <div className={cn(styles.reading, "font-heading")}>
                {work.text}
              </div>
            )}
            {pageHref && (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={pageHref}
              >
                Open the page
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {href && (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                Open on {hostname(work.url)}
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CaseStudy({ work }: { work: PortfolioWork }) {
  return (
    <section aria-label="Case study" className="grid gap-3">
      <p aria-hidden="true" className={cn(cx.eyebrow, "font-mono")}>
        Case study
      </p>
      <CaseStudyFacts work={work} />
    </section>
  );
}
