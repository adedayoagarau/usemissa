"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/components/design-system/video-world-tokens.css";
import styles from "./video-world.module.css";

const branches = [
  { id: 2, label: "Scene" },
  { id: 3, label: "Lighting" },
  { id: 1, label: "Clothing" },
  { id: 4, label: "Cast" },
];
const branchClips = branches.flatMap(({ id }) => [`${id}`, `${id}-reverse`]);
const clips = ["base", ...branchClips];
const root = "/homepage/reference-study/";
type Phase =
  "base" | "starting" | "playing" | "selected" | "returning" | "error";

/** Persistent layers retain decoded endpoint frames while the next clip prepares. */
export function VideoWorld() {
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const lock = useRef(false);
  const token = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);
  const active = useRef<string | null>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const optionButtons = useRef<Record<number, HTMLButtonElement | null>>({});
  const [visible, setVisible] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("base");
  const [branch, setBranch] = useState<number | null>(null);
  const [failure, setFailure] = useState("");
  const retry = useRef<{ id: number; reverse: boolean } | null>(null);
  const selectedLabel = branches.find((item) => item.id === branch)?.label;
  const expanded = phase === "base" || phase === "returning";
  const busy =
    phase === "starting" || phase === "playing" || phase === "returning";

  useEffect(
    () => () => {
      token.current += 1;
      cleanup.current?.();
      Object.values(videos.current).forEach((video) => video?.pause());
    },
    [],
  );

  function play(id: number, reverse = false) {
    if (lock.current) return;
    lock.current = true;
    cleanup.current?.();
    const request = ++token.current;
    const key = `${id}${reverse ? "-reverse" : ""}`;
    const video = videos.current[key];
    const prior = active.current;
    retry.current = { id, reverse };
    setBranch(id);
    setFailure("");
    setPhase(reverse ? "returning" : "starting");
    let frame = 0;
    let raf = 0;
    let revealed = false;
    let settled = false;
    const valid = () => request === token.current && !settled;
    const remove = () => {
      clearTimeout(watchdog);
      cancelAnimationFrame(raf);
      if (frame && video?.cancelVideoFrameCallback)
        video.cancelVideoFrameCallback(frame);
      video?.removeEventListener("error", fail);
      video?.removeEventListener("ended", finish);
    };
    const finish = () => {
      if (!valid() || !revealed) return;
      settled = true;
      video?.pause();
      remove();
      lock.current = false;
      retry.current = null;
      setPhase(reverse ? "base" : "selected");
      requestAnimationFrame(() => {
        if (request !== token.current) return;
        if (reverse) optionButtons.current[id]?.focus({ preventScroll: true });
        else resetButton.current?.focus({ preventScroll: true });
      });
    };
    const fail = () => {
      if (!valid()) return;
      settled = true;
      video?.pause();
      remove();
      // Revert to the previously held valid layer, including if a clip stalled midway.
      active.current = prior;
      setVisible(prior);
      lock.current = false;
      setFailure(
        "The video could not finish. Your previous view is preserved. Try again.",
      );
      setPhase("error");
    };
    cleanup.current = () => {
      settled = true;
      video?.pause();
      remove();
    };
    const watchdog = setTimeout(fail, 15000);
    if (!video) {
      fail();
      return;
    }
    const reveal = () => {
      if (!valid() || revealed) return;
      revealed = true;
      active.current = key;
      setVisible(key);
      setPhase(reverse ? "returning" : "playing");
    };
    const tick = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (!valid()) return;
      if (!revealed && metadata.mediaTime < 0.5) reveal();
      const guard = key === "2-reverse" ? 0.18 : 0.08;
      if (
        revealed &&
        Number.isFinite(video.duration) &&
        metadata.mediaTime >= video.duration - guard
      )
        finish();
      else frame = video.requestVideoFrameCallback(tick);
    };
    const fallbackTick = () => {
      if (!valid()) return;
      if (video.readyState >= 2 && !video.seeking && video.currentTime < 0.5)
        reveal();
      if (
        revealed &&
        video.currentTime >=
          video.duration - (key === "2-reverse" ? 0.18 : 0.08)
      )
        finish();
      else raf = requestAnimationFrame(fallbackTick);
    };
    video.addEventListener("error", fail);
    video.addEventListener("ended", finish);
    video.pause();
    video.currentTime = 0;
    if (video.requestVideoFrameCallback)
      frame = video.requestVideoFrameCallback(tick);
    else raf = requestAnimationFrame(fallbackTick);
    void video.play().catch(fail);
  }

  return (
    <main className={`missa-video-world ${styles.world}`} data-phase={phase}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.media}
        src={`${root}state-base.png`}
        alt="A fashion portrait between pale architectural walls; interactive video reference study."
      />
      {clips.map((key) => (
        <video
          key={key}
          ref={(el) => {
            videos.current[key] = el;
          }}
          className={styles.media}
          style={{ visibility: visible === key ? "visible" : "hidden" }}
          src={`${root}video-${key === "base" ? "1" : key}.mp4`}
          onLoadedData={() => {
            if (key === "base" && token.current === 0) {
              active.current = "base";
              setVisible("base");
            }
          }}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ))}
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Missa
        </Link>
        <span className={styles.study}>Video interaction study</span>
        <Link href="/opportunities" className={styles.explore}>
          Explore opportunities ↗
        </Link>
      </header>
      <h1 className={styles.title} data-hidden={phase !== "base"}>
        A world of possibility.
      </h1>
      <div
        className={styles.controller}
        data-expanded={expanded}
        role="group"
        aria-label="Change the world"
        aria-busy={busy}
      >
        <div className={styles.options} aria-hidden={!expanded}>
          <span className={styles.label}>Change the world →</span>
          {branches.map(({ id, label }) => (
            <Button
              ref={(el) => {
                optionButtons.current[id] = el;
              }}
              key={id}
              variant="ghost"
              className={styles.control}
              disabled={phase !== "base"}
              tabIndex={expanded ? 0 : -1}
              onClick={() => play(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        {!expanded && (
          <Button
            ref={resetButton}
            className={styles.reset}
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (phase === "error" && retry.current)
                play(retry.current.id, retry.current.reverse);
              else if (branch !== null) play(branch, true);
            }}
          >
            {phase === "selected"
              ? "Reset"
              : phase === "error"
                ? "Retry"
                : selectedLabel}
          </Button>
        )}
      </div>
      <p className={styles.description}>
        A study in changing the world with a click.
        <br />
        Original Missa scenes are still in production.
      </p>
      <p className={styles.status} role={failure ? "alert" : "status"}>
        {failure ||
          (phase === "starting"
            ? "Preparing video…"
            : busy
              ? `${selectedLabel} ${phase === "returning" ? "returning" : "playing"}`
              : "")}
      </p>
      <footer className={styles.credit}>
        Reference footage and concept:{" "}
        <a href="https://github.com/amirmushichge/video-states-website">
          Amir Mušić
        </a>{" "}
        · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> ·
        Interface study adapted for Missa
      </footer>
    </main>
  );
}
