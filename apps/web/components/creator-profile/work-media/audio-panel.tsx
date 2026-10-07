"use client";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PortfolioChapter } from "@/lib/creator-portfolio-schema";
import {
  activeChapterIndex,
  chapterMarks,
  formatClock,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import { ChaptersList } from "./chapters-list";
import { PlayButton } from "./play-button";
import { Transcript } from "./transcript";
import type { PlayableTrack, Player } from "./use-audio-player";
import cx from "./work-media.module.css";

/**
 * A recording in the flesh: play button, state in words, position and time,
 * chapters that jump, and the transcript. It drives the profile's one player,
 * so what it starts keeps playing in the mini player after the dialog closes.
 */
export function AudioPanel({
  track,
  player,
  chapters = [],
  transcript = "",
  className,
}: {
  track: PlayableTrack;
  player: Player;
  chapters?: readonly PortfolioChapter[];
  transcript?: string;
  className?: string;
}) {
  const marks = chapterMarks(chapters);
  const current = player.isCurrent(track);
  const playing = player.isPlaying(track);
  const loading = player.isLoading(track);
  const failed = player.hasFailed(track);
  const elapsed = current ? player.elapsed : 0;
  const total = current && player.duration ? formatClock(player.duration) : "";
  const state = failed
    ? "Not playing"
    : loading
      ? "Loading…"
      : playing
        ? "Playing"
        : current
          ? "Paused"
          : "Listen";
  return (
    <div className={cn(cx.audio, className)}>
      <div className={cx.audioBar}>
        <PlayButton track={track} player={player} />
        <span className={cx.audioText}>
          <span>{track.title}</span>
          <span role="status">{state}</span>
        </span>
        {current && !failed && (
          <span className={cn(cx.audioTime, "font-mono")}>
            <span className="sr-only">
              Played {formatClock(elapsed)}
              {total ? ` of ${total}` : ""}
            </span>
            <span aria-hidden="true">
              {formatClock(elapsed)} / {total || "--:--"}
            </span>
          </span>
        )}
      </div>
      {current && !failed && (
        <Progress
          value={Math.round(player.progress)}
          aria-label="Playback position"
          aria-valuetext={`${formatClock(elapsed)}${total ? ` of ${total}` : ""}`}
          className={cx.bar}
        />
      )}
      {failed && (
        <Alert>
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Couldn’t play this recording</AlertTitle>
          <AlertDescription>Nothing was lost. Try again.</AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="col-start-2 mt-2 justify-self-start"
            onClick={player.retry}
          >
            Try again
          </Button>
        </Alert>
      )}
      <ChaptersList
        marks={marks}
        activeIndex={current ? activeChapterIndex(marks, elapsed) : -1}
        onSelect={(mark) => player.play(track, mark.seconds)}
      />
      <Transcript text={transcript} />
    </div>
  );
}
