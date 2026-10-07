"use client";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { PlayableTrack, Player } from "./use-audio-player";
import cx from "./work-media.module.css";

/**
 * Play or pause one recording. While the file is arriving it shows a spinner
 * and can still be paused; the label always says what pressing it will do.
 */
export function PlayButton({
  track,
  player,
  className,
}: {
  track: PlayableTrack;
  player: Player;
  className?: string;
}) {
  const playing = player.isPlaying(track);
  const loading = player.isLoading(track);
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn(cx.play, className)}
      aria-label={`${playing || loading ? "Pause" : "Play"} ${track.title}`}
      aria-busy={loading || undefined}
      onClick={() => player.toggle(track)}
    >
      {loading ? (
        <Spinner
          role="presentation"
          aria-hidden="true"
          className={cx.spinner}
        />
      ) : playing ? (
        <Pause aria-hidden="true" />
      ) : (
        <Play aria-hidden="true" />
      )}
    </Button>
  );
}
