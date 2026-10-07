"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Anything with a recording behind it: a work, or one part of a work. A
 * PortfolioWork already has this shape, so it can be passed as it is.
 */
export type PlayableTrack = {
  id?: string;
  title: string;
  audio: string;
  /** A cover shown in the mini player. */
  image?: string;
};

/**
 * idle     nothing chosen yet
 * loading  waiting for the first sound, or buffering mid-way
 * playing  sound is coming out
 * paused   stopped by the visitor (or finished), position kept
 * error    the file could not be played; `retry` loads it again
 */
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

type PlayerState = {
  track: PlayableTrack | null;
  status: PlayerStatus;
  /** Seconds played. */
  elapsed: number;
  /** Seconds in the whole recording; 0 until the file says. */
  duration: number;
};

const IDLE: PlayerState = {
  track: null,
  status: "idle",
  elapsed: 0,
  duration: 0,
};

export const sameTrack = (
  a: PlayableTrack | null | undefined,
  b: PlayableTrack | null | undefined,
) => Boolean(a && b && a.audio === b.audio && a.id === b.id);

/**
 * One recording at a time for a whole profile: it keeps playing while the
 * visitor scrolls, opens a work or closes a dialog. Nothing is fetched until
 * someone presses play.
 */
export function useAudioPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  /** Where to jump once the file knows its length (a chapter, or Try again). */
  const jumpTo = useRef<number | null>(null);
  const [state, setState] = useState<PlayerState>(IDLE);

  useEffect(() => {
    const element = new Audio();
    element.preload = "none";
    const patch = (change: Partial<PlayerState>) =>
      setState((current) => ({ ...current, ...change }));
    const length = () =>
      Number.isFinite(element.duration) ? element.duration : 0;
    const listeners: [string, () => void][] = [
      [
        "timeupdate",
        () => patch({ elapsed: element.currentTime, duration: length() }),
      ],
      [
        "loadedmetadata",
        () => {
          if (jumpTo.current !== null) {
            element.currentTime = jumpTo.current;
            jumpTo.current = null;
          }
          patch({ duration: length(), elapsed: element.currentTime });
        },
      ],
      ["durationchange", () => patch({ duration: length() })],
      // Starved of data while playing: say so rather than look frozen.
      [
        "waiting",
        () =>
          setState((current) =>
            element.paused || current.status === "error"
              ? current
              : { ...current, status: "loading" },
          ),
      ],
      ["playing", () => patch({ status: "playing" })],
      [
        "pause",
        () =>
          setState((current) =>
            current.status === "error" || !current.track
              ? current
              : { ...current, status: "paused" },
          ),
      ],
      ["ended", () => patch({ status: "paused", elapsed: 0 })],
      ["error", () => patch({ status: "error" })],
    ];
    for (const [type, handler] of listeners)
      element.addEventListener(type, handler);
    audio.current = element;
    return () => {
      for (const [type, handler] of listeners)
        element.removeEventListener(type, handler);
      element.pause();
      audio.current = null;
    };
  }, []);

  const start = (element: HTMLAudioElement) => {
    element.play().catch((error: unknown) => {
      const name = error instanceof DOMException ? error.name : "";
      // Choosing another recording interrupts the first one's request.
      if (name === "AbortError") return;
      setState((current) => ({
        ...current,
        // A browser that blocks sound until a tap leaves the track ready.
        status: name === "NotAllowedError" ? "paused" : "error",
      }));
    });
  };

  const load = (track: PlayableTrack, at = 0) => {
    const element = audio.current;
    if (!element || !track.audio) return;
    jumpTo.current = at > 0 ? at : null;
    element.src = track.audio;
    setState({ track, status: "loading", elapsed: at, duration: 0 });
    start(element);
  };

  /** Starts a recording, or resumes it; with `at`, from that many seconds. */
  const play = (track: PlayableTrack, at?: number) => {
    const element = audio.current;
    if (!element || !track.audio) return;
    if (!sameTrack(state.track, track) || state.status === "error") {
      load(track, at ?? 0);
      return;
    }
    if (at !== undefined) {
      if (element.readyState >= 1) element.currentTime = at;
      else jumpTo.current = at;
      setState((current) => ({ ...current, elapsed: at }));
    }
    if (element.paused) start(element);
  };

  return {
    current: state.track,
    status: state.status,
    elapsed: state.elapsed,
    duration: state.duration,
    /** Played so far, 0 to 100. */
    progress: state.duration ? (state.elapsed / state.duration) * 100 : 0,
    playing: state.status === "playing",
    loading: state.status === "loading",
    failed: state.status === "error",
    play,
    /** Play or pause this recording; a different one replaces the current. */
    toggle: (track: PlayableTrack) => {
      const element = audio.current;
      if (!element || !track.audio) return;
      if (!sameTrack(state.track, track) || state.status === "error") {
        load(track);
        return;
      }
      if (element.paused) start(element);
      else element.pause();
    },
    pause: () => audio.current?.pause(),
    /** Loads the current recording again after an error. */
    retry: () => {
      if (state.track) load(state.track, state.elapsed);
    },
    /** Stops and puts the mini player away. */
    stop: () => {
      const element = audio.current;
      if (element) {
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
      jumpTo.current = null;
      setState(IDLE);
    },
    isCurrent: (track: PlayableTrack) => sameTrack(state.track, track),
    isPlaying: (track: PlayableTrack) =>
      sameTrack(state.track, track) && state.status === "playing",
    isLoading: (track: PlayableTrack) =>
      sameTrack(state.track, track) && state.status === "loading",
    hasFailed: (track: PlayableTrack) =>
      sameTrack(state.track, track) && state.status === "error",
  };
}

export type Player = ReturnType<typeof useAudioPlayer>;
