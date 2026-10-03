import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LineReveal, mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

const WORDS = [
  { word: "Grants", image: "media/grants.webp", at: cue("grants") },
  { word: "Residencies", image: "media/residencies.webp", at: cue("residencies") },
  { word: "Prizes", image: "media/prizes.webp", at: cue("prizes") },
  { word: "Open calls", image: "media/exhibitions.webp", at: cue("openCalls") },
];

/** Small circles orbiting the hero circle — a quiet nod to the UDC speaker ring. */
const ORBIT = [
  "media/publications.webp",
  "media/festivals.webp",
  "media/community.webp",
  "media/feature-studio.webp",
  "media/portfolio-still-life.webp",
  "media/hero-artist-studio.webp",
];

export const Categories: React.FC = () => {
  const t = useSeconds(scenes.categories.from);
  const { width, height, shape, u } = useLayout();

  const circle = (shape === "tall" ? 640 : shape === "wide" ? 560 : 560) * u;
  const cx = shape === "wide" ? width * 0.34 : width / 2;
  const cy = shape === "tall" ? height * 0.4 : shape === "wide" ? height / 2 : height * 0.42;

  const intro = progress(t, 0, 0.7);
  const leave = progress(t, scenes.categories.to - 0.35, 0.35, ease.exit);

  const active = WORDS.reduce((index, w, i) => (t >= w.at - 0.12 ? i : index), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: color.citron, overflow: "hidden" }}>
      {/* orbit */}
      {ORBIT.map((src, i) => {
        const angle = (i / ORBIT.length) * Math.PI * 2 + t * 0.35;
        const r = circle * (shape === "tall" ? 0.86 : 0.8);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * (shape === "wide" ? 0.62 : shape === "tall" ? 0.52 : 0.5);
        const size = circle * (0.2 + 0.05 * Math.sin(angle));
        const appear = progress(t, 0.15 + i * 0.08, 0.6);
        return (
          <div
            key={src}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              overflow: "hidden",
              transform: `scale(${appear * (1 - leave)})`,
              zIndex: 1,
              filter: "grayscale(1) contrast(1.05)",
              opacity: 0.9,
              boxShadow: `0 0 0 ${6 * u}px ${color.citron}`,
            }}
          >
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}

      {/* hero circle: each new category wipes in as a growing circle */}
      <div
        style={{
          position: "absolute",
          left: cx - circle / 2,
          top: cy - circle / 2,
          width: circle,
          height: circle,
          borderRadius: "50%",
          overflow: "hidden",
          transform: `scale(${mix(0.6, 1, intro) * (1 - leave * 0.4)})`,
          opacity: 1 - leave,
          zIndex: 2,
          backgroundColor: color.forestDeep,
          boxShadow: `0 0 0 ${10 * u}px ${color.citron}`,
        }}
      >
        {WORDS.map((w, i) => {
          if (i > active) return null;
          const p = i === 0 ? 1 : progress(t, w.at - 0.12, 0.45);
          const zoom = mix(1.18, 1.04, progress(t, w.at - 0.12, 1.6, ease.standard));
          return (
            <Img
              key={w.image}
              src={staticFile(w.image)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                clipPath: `circle(${p * 75}% at 50% 50%)`,
                transform: `scale(${zoom})`,
              }}
            />
          );
        })}
      </div>

      {/* the spoken word */}
      <div
        style={{
          position: "absolute",
          left: shape === "wide" ? width * 0.62 : 0,
          right: shape === "wide" ? 80 * u : 0,
          top: shape === "wide" ? 0 : cy + circle / 2 + (shape === "tall" ? 90 : 40) * u,
          bottom: shape === "wide" ? 0 : undefined,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: shape === "wide" ? "flex-start" : "center",
        }}
      >
        <div
          style={{
            position: "relative",
            height: 170 * u,
            width: "100%",
            fontFamily: font.editorial,
            fontWeight: 500,
            fontSize: (shape === "wide" ? 128 : 158) * u,
            whiteSpace: "nowrap",
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: color.forestDeep,
            textAlign: shape === "wide" ? "left" : "center",
          }}
        >
          {WORDS.map((w, i) => (
            <div key={w.word} style={{ position: "absolute", inset: 0 }}>
              <LineReveal
                t={t}
                enter={w.at - 0.1}
                exit={i < WORDS.length - 1 ? WORDS[i + 1].at - 0.14 : scenes.categories.to - 0.3}
              >
                {w.word}
              </LineReveal>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 28 * u,
            fontFamily: font.data,
            fontSize: 26 * u,
            color: color.forestDeep,
            opacity: intro * (1 - leave),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(active + 1).padStart(2, "0")} / 04
        </div>
      </div>
    </AbsoluteFill>
  );
};
