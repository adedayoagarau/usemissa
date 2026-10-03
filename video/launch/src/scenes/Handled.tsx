import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font, shadow } from "../tokens";

/** "Talent's your department. / Deadlines are ours." */
const MAKERS = [
  { label: "Writing", src: "media/artist-at-work.webp" },
  { label: "Visual art", src: "media/hero-artist-studio.webp" },
  { label: "Film", src: "media/creator-filmmaker.webp" },
  { label: "Music", src: "media/creator-musician.webp" },
  { label: "Performance", src: "media/festivals.webp" },
  { label: "Design", src: "media/community.webp" },
];

// Real Missa calendar (month view, captured from the app with its sample
// opportunities). Boxes are the deadline and reminder chips, as fractions of
// the 2060×1514 capture: reminder 7, North River 9, Orchard 14, Harbor 23, Meridian 30.
const CAL_ASPECT = 2060 / 1514;
const CHIPS = [
  [609, 731, 863, 796],
  [1195, 731, 1449, 796],
  [609, 948, 863, 1012],
  [1195, 1164, 1449, 1229],
  [1195, 1380, 1449, 1445],
].map(([x0, y0, x1, y1]) => ({ x: x0 / 2060, y: y0 / 1514, w: (x1 - x0) / 2060, h: (y1 - y0) / 1514 }));

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

  const calW = (shape === "wide" ? 940 : shape === "tall" ? 900 : 760) * u;
  const calH = calW / CAL_ASPECT;
  const push = progress(t, cue("ours") - 0.3, scenes.handled.to - cue("ours") + 0.3, (n) => n);

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
        <div
          style={{
            position: "relative",
            width: calW,
            height: calH,
            borderRadius: 18 * u,
            overflow: "hidden",
            boxShadow: shadow.lifted,
            transform: `translateY(${(1 - swap) * 60 * u}px) scale(${mix(1, 1.03, push)})`,
          }}
        >
          <Img src={staticFile("ui/calendar-october.webp")} style={{ width: "100%", height: "100%", display: "block" }} />
          <svg width={calW} height={calH} style={{ position: "absolute", inset: 0 }}>
            {CHIPS.map((c, i) => {
              const p = progress(t, cue("ours") + 0.15 + i * 0.16, 0.35);
              const pad = 5 * u;
              return (
                <rect
                  key={i}
                  x={c.x * calW - pad}
                  y={c.y * calH - pad}
                  width={c.w * calW + pad * 2}
                  height={c.h * calH + pad * 2}
                  rx={10 * u}
                  fill="none"
                  stroke={color.ochre}
                  strokeWidth={3.5 * u}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - p}
                  opacity={p > 0 ? 1 : 0}
                />
              );
            })}
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
