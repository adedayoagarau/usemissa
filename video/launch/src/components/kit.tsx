import React from "react";
import {
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ease } from "../tokens";
import { WORDMARK_PATHS } from "./wordmark-paths";

/* ---------- fonts ---------- */

const FONTS: Array<[string, string, string, string]> = [
  ["Newsreader", "fonts/newsreader-latin.woff2", "200 800", "normal"],
  ["Newsreader", "fonts/newsreader-italic-latin.woff2", "200 800", "italic"],
  ["Instrument Sans", "fonts/instrument-sans-latin.woff2", "400 700", "normal"],
  ["Fragment Mono", "fonts/fragment-mono-latin.woff2", "400", "normal"],
];

let fontsRequested = false;
export const loadFonts = () => {
  if (fontsRequested || typeof document === "undefined") return;
  fontsRequested = true;
  const handle = delayRender("Loading Missa fonts");
  Promise.all(
    FONTS.map(([family, file, weight, style]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {
        weight,
        style,
      });
      return face.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((error) => {
      console.error(error);
      continueRender(handle);
    });
};

/* ---------- time + layout ---------- */

/** Current position on the full video timeline, in seconds. */
export const useSeconds = (sceneFrom = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps + sceneFrom;
};

export type Shape = "square" | "tall" | "wide";

/** `u` scales a 1080px design unit to the current canvas. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const shape: Shape =
    width > height * 1.2 ? "wide" : height > width * 1.2 ? "tall" : "square";
  const u = Math.min(width, height) / 1080;
  return { width, height, shape, u };
};

/** 0→1 progress of a transition that starts at `start` and lasts `duration` seconds. */
export const progress = (
  t: number,
  start: number,
  duration: number,
  easing: (n: number) => number = ease.enter,
) =>
  interpolate(t, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const mix = (from: number, to: number, p: number) => from + (to - from) * p;

/** Deterministic pseudo-random in [0, 1). */
export const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- primitives ---------- */

/**
 * Text that rises into a clipping line and (optionally) leaves upward.
 * Used for every spoken word so type lands exactly on the voice.
 */
export const LineReveal: React.FC<{
  t: number;
  enter: number;
  exit?: number;
  duration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ t, enter, exit, duration = 0.42, children, style }) => {
  const pIn = progress(t, enter, duration);
  const pOut = exit === undefined ? 0 : progress(t, exit, 0.3, ease.exit);
  const y = (1 - pIn) * 130 - pOut * 130;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom",
        paddingBottom: "0.08em",
        marginBottom: "-0.08em",
        ...style,
      }}
    >
      <span style={{ display: "inline-block", transform: `translateY(${y}%)` }}>
        {children}
      </span>
    </span>
  );
};

export const Wordmark: React.FC<{ height: number; color: string; style?: React.CSSProperties }> = ({
  height,
  color,
  style,
}) => (
  <svg
    viewBox="0 0 265 57"
    height={height}
    width={(height * 265) / 57}
    style={{ display: "block", color, ...style }}
    aria-label="Missa"
  >
    {WORDMARK_PATHS.map((d, i) => (
      <path key={i} d={d} fill="currentColor" />
    ))}
  </svg>
);
