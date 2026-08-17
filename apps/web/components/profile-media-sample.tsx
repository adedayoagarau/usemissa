"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { ProfileWorkSample } from "@missa/radar-engine";

import { Button } from "@/components/ui/button";
import styles from "./profile-media-sample.module.css";

function duration(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ProfileMediaSample({
  sample,
  title,
}: {
  sample: ProfileWorkSample;
  title: string;
}) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const isVideo = sample.kind === "video";

  async function togglePlayback() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) await media.play();
    else media.pause();
  }

  function seek(value: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = value;
    setCurrentTime(value);
  }

  const mediaProps = {
    ref: mediaRef as never,
    src: sample.publicAssetUrl,
    preload: "none" as const,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: () => setCurrentTime(mediaRef.current?.currentTime ?? 0),
    onLoadedMetadata: () => setTotalDuration(mediaRef.current?.duration ?? 0),
  };

  return (
    <figure className={styles.sample}>
      {isVideo ? (
        <video
          {...mediaProps}
          className={styles.video}
          aria-label={`${title} video sample`}
          playsInline
        />
      ) : (
        <div className={styles.audioFrame}>
          <audio {...mediaProps} aria-label={`${title} audio sample`} />
          <div className={styles.waveform} aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          onClick={togglePlayback}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>
        <input
          className={styles.seek}
          type="range"
          min={0}
          max={totalDuration || 0}
          step={0.1}
          value={Math.min(currentTime, totalDuration || 0)}
          aria-label={`Position in ${title}`}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className={styles.time} aria-live="off">
          {duration(currentTime)} / {duration(totalDuration)}
        </span>
      </div>
      {sample.accessibilityText ? (
        <figcaption className={styles.description}>
          {sample.accessibilityText}
        </figcaption>
      ) : null}
      {sample.transcript ? (
        <details className={styles.transcript}>
          <summary>Read transcript</summary>
          <p>{sample.transcript}</p>
        </details>
      ) : null}
    </figure>
  );
}
