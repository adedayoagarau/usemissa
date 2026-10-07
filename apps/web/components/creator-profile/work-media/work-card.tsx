"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { ArrowUpRight, Globe, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  PortfolioData,
  PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import { firstLines, readingMinutes, workFormats } from "@/lib/creator-profile";
import {
  accessNotes,
  caseStudyFacts,
  detectVideo,
  formatClock,
  hasWallLabel,
  partsLabel,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import {
  Heading,
  hostname,
  profileStyles as styles,
  safeHref,
} from "../sections/shared";
import { MediaError, useImageStatus } from "./media-image";
import { PlayButton } from "./play-button";
import type { Player } from "./use-audio-player";
import { WallLabelDetails } from "./wall-label";
import cx from "./work-media.module.css";

export type OpenWork = (
  work: PortfolioWork,
  options?: { play?: boolean },
) => void;

/**
 * One work in the grid. Its picture, text or recording is the way in; the
 * title opens the same work. A film plays only after a press, a picture that
 * fails says so and offers Try again, and one still arriving holds its place
 * with a skeleton.
 */
export function WorkCard({
  work,
  index,
  level,
  onOpen,
  player,
  lens,
}: {
  work: PortfolioWork;
  index: number;
  level: number;
  onOpen: OpenWork;
  player: Player;
  lens: PortfolioData["lens"];
}) {
  const formats = workFormats(work);
  const excerpt = firstLines(work.text, 4, 220);
  const href = safeHref(work.url);
  const filmHref = work.video.trim() ? safeHref(work.video) : undefined;
  const film = work.video.trim() ? detectVideo(work.video) : null;
  const linkOnly =
    !work.image && !work.text.trim() && !work.audio && !filmHref && href;
  const image = useImageStatus(work.image);
  const playing = player.isPlaying(work);
  const notes = accessNotes(work);
  const parts = partsLabel(work);
  const showSound = Boolean(work.audio) && !filmHref;
  const label = hasWallLabel(work);
  const client = caseStudyFacts(work).find((fact) => fact.label === "Client");

  const posterImage =
    work.image && image.status !== "error" ? (
      <img
        key={image.attempt}
        {...image.imageProps}
        src={work.image}
        alt=""
        className={cx.posterImage}
        loading="lazy"
      />
    ) : (
      <span className={cx.posterTile} aria-hidden="true" />
    );

  return (
    <article className={styles.card}>
      {filmHref ? (
        <div className={cx.film}>
          {posterImage}
          {film ? (
            <Button
              type="button"
              variant="ghost"
              className={cx.posterButton}
              onClick={() => onOpen(work, { play: true })}
            >
              <span className={cx.posterIcon} aria-hidden="true">
                <Play />
              </span>
              <span className="sr-only">Play {work.title}</span>
            </Button>
          ) : (
            <a
              className={cx.filmLink}
              href={filmHref}
              target="_blank"
              rel="noreferrer"
            >
              <span className={cx.posterIcon} aria-hidden="true">
                <ArrowUpRight />
              </span>
              <span className="sr-only">
                Watch {work.title} on {hostname(filmHref)} (opens in a new tab)
              </span>
            </a>
          )}
          <span className={cn(cx.filmTag, "font-mono")}>
            {work.kind || "Film"}
          </span>
        </div>
      ) : work.image ? (
        <div className={cx.mediaBox} data-loading={image.status === "loading"}>
          {image.status === "error" ? (
            <MediaError
              title={work.title}
              onRetry={image.retry}
              className={cx.mediaErrorFill}
            />
          ) : (
            <>
              {image.status === "loading" && (
                <Skeleton className={cx.skeleton} />
              )}
              <Button
                type="button"
                variant="ghost"
                className={styles.cardMedia}
                onClick={() => onOpen(work)}
                aria-label={`Open ${work.title}`}
              >
                <img
                  key={image.attempt}
                  {...image.imageProps}
                  src={work.image}
                  alt={work.caption || ""}
                  loading="lazy"
                />
              </Button>
              {(playing || parts) && (
                <span className={cx.chips}>
                  {playing && (
                    <span className={cx.chip}>
                      <span className={cx.chipDot} aria-hidden="true" />
                      Playing
                    </span>
                  )}
                  {parts && (
                    <span className={cn(cx.chip, cx.chipMono, "font-mono")}>
                      {parts}
                    </span>
                  )}
                </span>
              )}
              {showSound && (
                <div className={cx.strip}>
                  <PlayButton track={work} player={player} />
                  <SoundProgress
                    work={work}
                    player={player}
                    label={work.kind || "Recording"}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ) : work.text.trim() ? (
        <Button
          type="button"
          variant="ghost"
          className={styles.cardText}
          onClick={() => onOpen(work)}
          aria-label={`Read ${work.title}`}
        >
          <span className={cn(styles.cardTextMeta, "font-mono")}>
            {[work.kind, `${readingMinutes(work.text)} min read`]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className={cn(styles.cardExcerpt, "font-heading")}>
            {excerpt}
          </span>
        </Button>
      ) : work.audio ? (
        <div className={styles.cardSound}>
          <PlayButton track={work} player={player} />
          <span className={cx.soundBody}>
            <SoundProgress
              work={work}
              player={player}
              label={work.kind || "Recording"}
            />
          </span>
        </div>
      ) : linkOnly ? (
        <a
          className={styles.cardLink}
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <span className="font-mono">
            <Globe aria-hidden="true" /> {hostname(work.url)}
          </span>
          <span className="font-heading">{work.title}</span>
          <span className={styles.readLink}>
            Open <ArrowUpRight aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </a>
      ) : null}
      {work.audio && !work.image && work.text.trim() && !filmHref && (
        <PlayButton track={work} player={player} className={styles.cardPlay} />
      )}
      <div className={cn(styles.cardMeta, "font-mono")}>
        <span>
          {String(index + 1).padStart(2, "0")} —{" "}
          {work.kind || formats.join(" · ") || "Work"}
        </span>
        <span>{work.year}</span>
      </div>
      <Heading level={level} className={cn(styles.cardTitle, "font-heading")}>
        <Button
          type="button"
          variant="rowTitle"
          size="inline"
          onClick={() => onOpen(work)}
        >
          {work.title}
        </Button>
      </Heading>
      {label ? (
        <WallLabelDetails work={work} />
      ) : (
        lens === "visual" &&
        work.caption && <p className={styles.cardCaption}>{work.caption}</p>
      )}
      {work.summary && <p className={styles.cardSummary}>{work.summary}</p>}
      {notes.length > 0 && (
        <p className={cn(cx.cardNotes, "font-mono")}>{notes.join(" · ")}</p>
      )}
      {client && (
        <p className={cn(cx.cardNotes, "font-mono")}>
          Case study · {client.value}
        </p>
      )}
      {href && !linkOnly && (
        <a
          className={styles.cardOut}
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {hostname(work.url)}
          <ArrowUpRight aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}

/**
 * Where a recording is, on its card: its kind while idle, then position and
 * time once it is the one playing. Decorative; the mini player has the values.
 */
function SoundProgress({
  work,
  player,
  label,
}: {
  work: PortfolioWork;
  player: Player;
  label: string;
}) {
  const current = player.isCurrent(work);
  const total = current && player.duration ? formatClock(player.duration) : "";
  if (!current)
    return <span className={cn(cx.stripLabel, "font-mono")}>{label}</span>;
  return (
    <>
      <span className={cx.stripTrack} aria-hidden="true">
        <Progress
          value={Math.round(player.progress)}
          aria-hidden="true"
          className={cx.bar}
        />
      </span>
      <span className={cn(cx.stripTime, "font-mono")}>
        {formatClock(player.elapsed)} / {total || "--:--"}
      </span>
    </>
  );
}
