import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Calendar } from "../components/Calendar";
import { mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

/** "Talent's your department. / Deadlines are ours." */
const MAKERS = [
  { label: "Writing", src: "media/artist-at-work.webp" },
  { label: "Visual art", src: "media/hero-artist-studio.webp" },
  { label: "Film", src: "media/creator-filmmaker.webp" },
  { label: "Music", src: "media/creator-musician.webp" },
  { label: "Performance", src: "media/festivals.webp" },
  { label: "Design", src: "media/community.webp" },
];

const HANDLED_DAYS = [6, 14, 19, 23, 30];

export const Handled: React.FC = () => {
  const start = scenes.handled.from;
  const t = useSeconds(start);
  const { width, height, shape, u } = useLayout();

  const swap = progress(t, cue("ours") - 0.3, 0.5, ease.standard);
  const leave = progress(t, scenes.handled.to - 0.3, 0.3, ease.exit);

  const cols = shape === "wide" ? 3 : 2;
  const rows = MAKERS.length / cols;
  const gridW = width;
  const gridH = height;

  const checks: Record<number, number> = {};
  HANDLED_DAYS.forEach((d, i) => {
    checks[d] = progress(t, cue("ours") + 0.15 + i * 0.16, 0.35);
  });

  const calW = (shape === "wide" ? 640 : shape === "tall" ? 860 : 700) * u;

  return (
    <AbsoluteFill style={{ backgroundColor: color.forestDeep, overflow: "hidden" }}>
      {/* makers grid */}
      <AbsoluteFill style={{ opacity: 1 - swap }}>
        {MAKERS.map((m, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const p = progress(t, start + 0.05 + i * 0.07, 0.4);
          return (
            <div
              key={m.label}
              style={{
                position: "absolute",
                left: (col * gridW) / cols,
                top: (row * gridH) / rows,
                width: gridW / cols,
                height: gridH / rows,
                overflow: "hidden",
                opacity: p,
                borderRight: `${3 * u}px solid ${color.forestDeep}`,
                borderBottom: `${3 * u}px solid ${color.forestDeep}`,
              }}
            >
              <Img src={staticFile(m.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${mix(1.15, 1.05, p)})`, filter: "brightness(0.78)" }} />
              <span
                style={{
                  position: "absolute",
                  left: 18 * u,
                  bottom: 16 * u,
                  fontFamily: font.interface,
                  fontWeight: 650,
                  fontSize: 24 * u,
                  color: color.white,
                  backgroundColor: "rgba(29,64,55,0.75)",
                  borderRadius: 999,
                  padding: `${5 * u}px ${14 * u}px`,
                }}
              >
                {m.label}
              </span>
            </div>
          );
        })}
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(23,20,24,0.55), rgba(23,20,24,0.15) 70%)" }} />
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: font.editorial,
              fontWeight: 500,
              fontSize: (shape === "tall" ? 110 : 120) * u,
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: color.white,
              textAlign: "center",
              padding: `0 ${60 * u}px`,
              opacity: progress(t, cue("department") - 0.05, 0.4),
              transform: `scale(${mix(1.08, 1, progress(t, cue("department") - 0.05, 0.6))})`,
            }}
          >
            Talent&rsquo;s your
            <br />
            <em style={{ color: color.citron }}>department.</em>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* deadlines handled */}
      <AbsoluteFill
        style={{
          backgroundColor: color.sky,
          clipPath: `inset(${(1 - swap) * 100}% 0 0 0)`,
          display: "flex",
          flexDirection: shape === "wide" ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: (shape === "wide" ? 90 : 50) * u,
          opacity: 1 - leave,
        }}
      >
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 500,
            fontSize: (shape === "wide" ? 120 : 104) * u,
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: color.forestDeep,
            textAlign: shape === "wide" ? "left" : "center",
          }}
        >
          Deadlines
          <br />
          are <em>ours.</em>
        </div>
        <div style={{ transform: `translateY(${(1 - swap) * 60 * u}px)` }}>
          <Calendar u={u} width={calW} year={2026} monthIndex={10} checks={checks} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
