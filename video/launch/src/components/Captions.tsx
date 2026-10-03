import React from "react";
import { progress, useLayout, useSeconds } from "./kit";
import { captions, cue, type Cue } from "../timing";
import { color, font } from "../tokens";

/**
 * Burned-in captions for muted autoplay. Lines the film already sets as large
 * type on screen are skipped so the words never appear twice.
 */
const ON_SCREEN = new Set([
  "Some people will tell you the art world runs on talent.",
  "Talent helps.",
  "But mostly, it runs on deadlines.",
  "Talent's your department.",
  "Deadlines are ours.",
]);

export const Captions: React.FC = () => {
  const t = useSeconds();
  const { shape, u } = useLayout();
  const active = captions.find((c) => {
    const from = cue(c.from);
    const to = typeof c.to === "number" ? c.to : cue(c.to as Cue);
    return t >= from - 0.05 && t < to - 0.1;
  });
  if (!active || ON_SCREEN.has(active.text)) return null;
  const p = progress(t, cue(active.from) - 0.05, 0.18);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: (shape === "tall" ? 120 : shape === "wide" ? 60 : 48) * u,
        display: "flex",
        justifyContent: "center",
        padding: `0 ${60 * u}px`,
        opacity: p,
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontFamily: font.interface,
          fontWeight: 600,
          fontSize: (shape === "tall" ? 38 : 34) * u,
          lineHeight: 1.3,
          color: color.white,
          backgroundColor: "rgba(23, 20, 24, 0.78)",
          borderRadius: 14 * u,
          padding: `${10 * u}px ${20 * u}px`,
          textAlign: "center",
          maxWidth: (shape === "wide" ? 1300 : 900) * u,
        }}
      >
        {active.text}
      </span>
    </div>
  );
};
