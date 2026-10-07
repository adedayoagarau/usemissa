"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { useId, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioChapter } from "@/lib/creator-portfolio-schema";
import {
  chapterMarks,
  detectVideo,
  videoEmbedSrc,
  type VideoSource,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import { safeHref } from "../sections/shared";
import { ChaptersList } from "./chapters-list";
import { Transcript } from "./transcript";
import cx from "./work-media.module.css";

/**
 * The poster of a film and, once a visitor presses play, the film itself.
 *
 * Privacy: the poster is the creator's own picture, so opening a page makes no
 * request to YouTube or Vimeo. The frame is built only after a press, from the
 * film id, on youtube-nocookie.com or player.vimeo.com (Vimeo with do-not-track
 * on). Any other address is not framed at all.
 */
export function VideoEmbed({
  source,
  title,
  poster,
  started,
  onStart,
  large = false,
}: {
  source: VideoSource;
  title: string;
  poster?: string;
  /** null until a visitor asks; `at` is where the film starts, `nonce` forces a reload. */
  started: { at: number; nonce: number } | null;
  onStart: () => void;
  large?: boolean;
}) {
  const [posterFailed, setPosterFailed] = useState(false);
  const notice = useId();
  return (
    <div className={cx.screen}>
      {started ? (
        <iframe
          // A new chapter reloads the frame at its time: both providers take a
          // start time in the address, so no provider script is needed.
          key={`${started.at}-${started.nonce}`}
          src={videoEmbedSrc(source, { startAt: started.at })}
          title={`${title} (${source.providerName})`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          {poster && !posterFailed ? (
            <img
              src={poster}
              alt=""
              className={cx.posterImage}
              onError={() => setPosterFailed(true)}
            />
          ) : (
            <span className={cx.posterTile} aria-hidden="true" />
          )}
          <Button
            type="button"
            variant="ghost"
            className={cx.posterButton}
            aria-describedby={notice}
            onClick={onStart}
          >
            <span
              className={cn(cx.posterIcon, large && cx.posterIconLarge)}
              aria-hidden="true"
            >
              <Play />
            </span>
            <span className="sr-only">
              Play {title} from {source.providerName}
            </span>
          </Button>
          <span id={notice} className="sr-only">
            Nothing loads from {source.providerName} until you press play.
          </span>
        </>
      )}
    </div>
  );
}

/**
 * A film as a visitor meets it: poster, chapters beside it, the notice about
 * where it plays from, and the transcript. A link that is not a YouTube or
 * Vimeo film opens as an ordinary link in a new tab.
 */
export function Screening({
  url,
  title,
  poster,
  chapters = [],
  transcript = "",
  autoStart = false,
  className,
}: {
  url: string;
  title: string;
  /** The creator's own picture for the film. */
  poster?: string;
  chapters?: readonly PortfolioChapter[];
  transcript?: string;
  /** The visitor already pressed play on a card, so begin straight away. */
  autoStart?: boolean;
  className?: string;
}) {
  const source = detectVideo(url);
  const marks = chapterMarks(chapters);
  const [started, setStarted] = useState<{ at: number; nonce: number } | null>(
    autoStart && source ? { at: source.startAt, nonce: 0 } : null,
  );
  if (!source)
    return (
      <div className={cn(cx.screening, className)}>
        <ExternalFilm url={url} title={title} />
        <Transcript text={transcript} />
      </div>
    );
  const begin = (at: number) =>
    setStarted((current) => ({ at, nonce: (current?.nonce ?? 0) + 1 }));
  return (
    <div className={cn(cx.screening, className)}>
      <div className={cx.screeningBody} data-chapters={marks.length > 0}>
        <div>
          <VideoEmbed
            source={source}
            title={title}
            poster={poster}
            started={started}
            onStart={() => begin(source.startAt)}
            large
          />
        </div>
        <ChaptersList marks={marks} onSelect={(mark) => begin(mark.seconds)} />
      </div>
      <p className={cx.notice}>
        <span>
          {started
            ? `Playing from ${source.providerName}.`
            : `Plays from ${source.providerName}. Nothing loads from ${source.providerName} until you press play.`}
        </span>
        <a href={source.watchUrl} target="_blank" rel="noreferrer">
          Watch on {source.providerName}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      <Transcript text={transcript} />
    </div>
  );
}

/** A film link Missa does not frame: it opens on its own site. */
function ExternalFilm({ url, title }: { url: string; title: string }) {
  const href = safeHref(url);
  if (!href) return null;
  const host = new URL(href).hostname.replace(/^www\./, "");
  return (
    <p className={cx.notice}>
      <a href={href} target="_blank" rel="noreferrer">
        Watch {title} on {host}
        <ArrowUpRight aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
