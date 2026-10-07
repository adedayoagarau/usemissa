"use client";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import styles from "./work-page.module.css";

/**
 * The recording on a work page: the browser's own audio control plus a plain
 * message and Try again when the file won't play. It stands in for the profile's
 * shared player, whose play, pause and time display replace it when the two
 * pages are joined; the page around it does not change.
 */
export function RecordingPlayer({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.player}>
      <audio
        ref={audio}
        controls
        preload="none"
        src={src}
        aria-label={`Recording: ${title}`}
        onError={() => setFailed(true)}
        onPlay={() => setFailed(false)}
      >
        Your browser can’t play this recording.
      </audio>
      {failed && (
        <Alert className={styles.playerNote}>
          <AlertDescription>
            Couldn’t play this recording. Nothing was lost.
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => {
              setFailed(false);
              audio.current?.load();
              void audio.current?.play().catch(() => setFailed(true));
            }}
          >
            Try again
          </Button>
        </Alert>
      )}
    </div>
  );
}
