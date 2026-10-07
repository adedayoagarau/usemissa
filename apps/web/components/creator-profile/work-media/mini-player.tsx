"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatClock } from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import { PlayButton } from "./play-button";
import type { Player } from "./use-audio-player";
import cx from "./work-media.module.css";

/**
 * The profile's one player, docked while the visitor scrolls. Four states, as
 * drawn on the Components board: playing or paused (a pause or play button),
 * loading (spinner, "Loading…"), and error ("Try again" reloads the file).
 * Closing it stops the recording.
 */
export function MiniPlayer({ player }: { player: Player }) {
  const track = player.current;
  if (!track) return null;
  const failed = player.status === "error";
  const loading = player.status === "loading";
  const played = formatClock(player.elapsed);
  const total = player.duration ? formatClock(player.duration) : "";
  return (
    <section
      className={cx.mini}
      aria-label="Now playing"
      data-status={player.status}
    >
      {track.image && <img src={track.image} alt="" />}
      <div className={cx.miniText}>
        <span className={cx.miniTitle}>{track.title}</span>
        {failed ? (
          <p role="status" className={cx.miniMessage}>
            Couldn’t play this recording. Try again.
          </p>
        ) : (
          <div className={cx.miniLine}>
            <Progress
              value={Math.round(player.progress)}
              aria-label="Playback position"
              aria-valuetext={`${played}${total ? ` of ${total}` : ""}`}
              className={cx.bar}
            />
            <span className={cn(cx.miniTime, "font-mono")}>
              {loading ? (
                <span role="status">Loading…</span>
              ) : (
                <>
                  <span className="sr-only">
                    Played {played}
                    {total ? ` of ${total}` : ""}
                  </span>
                  <span aria-hidden="true">
                    {played} / {total || "--:--"}
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
      {failed ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cx.play}
          aria-label={`Try ${track.title} again`}
          onClick={player.retry}
        >
          <RotateCcw aria-hidden="true" className={cx.stroke} />
        </Button>
      ) : (
        <PlayButton track={track} player={player} />
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cx.miniClose}
        aria-label="Close player"
        onClick={player.stop}
      >
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
