import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LineReveal, mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

/**
 * "Some people will tell you the art world runs on talent. / Talent helps."
 * A slow push across a working studio; the word "talent" lands big, then
 * shrinks to a footnote on the dry beat.
 */
export const Talent: React.FC = () => {
  const t = useSeconds(scenes.talent.from);
  const { shape, u } = useLayout();

  const push = progress(t, 0, scenes.talent.to, (n) => n);
  const lineIn = progress(t, cue("open"), 0.8);
  const word = progress(t, cue("talent") - 0.05, 0.55);
  const shrink = progress(t, cue("helps") - 0.15, 0.6, ease.standard);
  const dim = progress(t, cue("helps") - 0.15, 0.5, ease.standard);

  const wordSize = mix((shape === "wide" ? 260 : 230) * u, (shape === "wide" ? 64 : 60) * u, shrink);

  return (
    <AbsoluteFill style={{ backgroundColor: color.ink, overflow: "hidden" }}>
      <Img
        src={staticFile("media/hero-artist-studio.webp")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: shape === "tall" ? "62% 50%" : "50% 45%",
          transform: `scale(${mix(1.06, 1.16, push)}) translateX(${mix(0, -2, push)}%)`,
          filter: `saturate(${mix(1, 0.35, dim)}) brightness(${mix(0.62, 0.32, dim)})`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, rgba(23,20,24,0.85), rgba(23,20,24,0.15) 55%, rgba(23,20,24,0.35))`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: (shape === "wide" ? 120 : 72) * u,
          right: (shape === "wide" ? 120 : 72) * u,
          bottom: (shape === "tall" ? 420 : shape === "wide" ? 150 : 170) * u,
          color: color.white,
        }}
      >
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 400,
            fontSize: (shape === "wide" ? 56 : 52) * u,
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            opacity: lineIn * (1 - dim * 0.55),
            transform: `translateY(${(1 - lineIn) * 24 * u}px)`,
            maxWidth: (shape === "wide" ? 1100 : 900) * u,
          }}
        >
          Some people will tell you
          <br />
          the art world runs on
        </div>
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 500,
            fontStyle: "italic",
            fontSize: wordSize,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: color.citron,
            marginTop: mix(6, 2, shrink) * u,
            opacity: word,
            transform: `translateY(${(1 - word) * 40 * u}px)`,
            transformOrigin: "left bottom",
          }}
        >
          talent.
        </div>
        <div
          style={{
            marginTop: 26 * u,
            fontFamily: font.interface,
            fontWeight: 500,
            fontSize: 40 * u,
            letterSpacing: "-0.01em",
            color: color.white,
            minHeight: 50 * u,
          }}
        >
          <LineReveal t={t} enter={cue("helps") + 0.05}>
            Talent helps.
          </LineReveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};
