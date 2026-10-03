import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

/** Ring order. Spoken creators sit on even slots; the odd slots keep the ring full. */
const RING = [
  "media/artist-at-work.webp",
  "media/publications.webp",
  "media/hero-artist-studio.webp",
  "media/feature-studio.webp",
  "media/creator-filmmaker.webp",
  "media/festivals.webp",
  "media/creator-musician.webp",
  "media/community.webp",
];

const NAMES = [
  { name: "Writers", slot: 0, at: cue("writers") },
  { name: "Painters", slot: 2, at: cue("painters") },
  { name: "Filmmakers", slot: 4, at: cue("filmmakers") },
  { name: "Musicians", slot: 6, at: cue("musicians") },
];

const STEP = (Math.PI * 2) / RING.length;
const FRONT = Math.PI / 2; // bottom of the ellipse faces the viewer
const thetaFor = (slot: number) => FRONT - slot * STEP;

export const Creators: React.FC = () => {
  const start = scenes.creators.from;
  const t = useSeconds(start);
  const { width, height, shape, u } = useLayout();

  // ring rotation: spin in, then ease to rest on each spoken creator
  let theta = thetaFor(-3);
  let previous = theta;
  NAMES.forEach((n, i) => {
    const target = thetaFor(n.slot);
    const from = i === 0 ? thetaFor(-3) : previous;
    const p = progress(t, i === 0 ? start : n.at - 0.32, i === 0 ? cue("writers") - start + 0.1 : 0.62, ease.enter);
    if (p > 0) theta = mix(from, target, p);
    previous = target;
  });

  const geometry =
    shape === "tall"
      ? { cx: width / 2, cy: height * 0.36, rx: width * 0.4, ry: height * 0.1, front: 600 * u }
      : shape === "wide"
        ? { cx: width / 2, cy: height * 0.36, rx: width * 0.3, ry: height * 0.13, front: 430 * u }
        : { cx: width / 2, cy: height * 0.33, rx: width * 0.38, ry: height * 0.14, front: 450 * u };

  const intro = progress(t, start, 0.5);
  const leave = progress(t, scenes.creators.to - 0.3, 0.3, ease.exit);

  const items = RING.map((src, i) => {
    const angle = i * STEP + theta;
    const depth = (Math.sin(angle) + 1) / 2; // 1 = front
    return { src, i, angle, depth };
  }).sort((a, b) => a.depth - b.depth);

  const active = NAMES.reduce((index, n, i) => (t >= n.at - 0.32 ? i : index), 0);
  const blockTop = geometry.cy + geometry.ry + geometry.front / 2 + 48 * u;

  return (
    <AbsoluteFill style={{ backgroundColor: color.sky, overflow: "hidden" }}>
      {items.map(({ src, i, angle, depth }) => {
        const size = geometry.front * mix(0.3, 1, Math.pow(depth, 1.6));
        const x = geometry.cx + Math.cos(angle) * geometry.rx;
        const y = geometry.cy + Math.sin(angle) * geometry.ry;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              overflow: "hidden",
              backgroundColor: color.forestDeep,
              boxShadow: `0 0 0 ${8 * u * depth}px ${color.sky}`,
              transform: `scale(${intro * (1 - leave * 0.3)})`,
              opacity: 1 - leave,
            }}
          >
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* everything except the front circle is tinted; it eases off as a circle arrives */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: color.forestDeep,
                opacity: 0.62 * (1 - Math.pow(depth, 3)),
              }}
            />
          </div>
        );
      })}

      {/* rotating name block */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: blockTop,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22 * u,
          opacity: intro * (1 - leave),
        }}
      >
        <div
          style={{
            position: "relative",
            width: (shape === "tall" ? 820 : 760) * u,
            height: 150 * u,
            perspective: 2400 * u,
          }}
        >
          {NAMES.map((n, i) => {
            const pin = i === 0 ? 1 : progress(t, n.at - 0.32, 0.55, ease.enter);
            const pout = i < NAMES.length - 1 ? progress(t, NAMES[i + 1].at - 0.32, 0.55, ease.enter) : 0;
            if (pin <= 0 || pout >= 1) return null;
            const rotate = (1 - pin) * 90 - pout * 90;
            return (
              <div
                key={n.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: color.citron,
                  borderRadius: 20 * u,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: `0 ${44 * u}px`,
                  transformOrigin: `50% 50% ${-75 * u}px`,
                  transform: `rotateX(${rotate}deg)`,
                  backfaceVisibility: "hidden",
                  boxShadow: `0 ${18 * u}px ${40 * u}px rgba(29, 64, 55, 0.18)`,
                }}
              >
                <span
                  style={{
                    fontFamily: font.editorial,
                    fontWeight: 500,
                    fontSize: 104 * u,
                    letterSpacing: "-0.03em",
                    color: color.forestDeep,
                    lineHeight: 1,
                  }}
                >
                  {n.name}
                </span>
                <span
                  style={{
                    fontFamily: font.data,
                    fontSize: 26 * u,
                    color: color.forestDeep,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: font.interface,
            fontWeight: 600,
            fontSize: 28 * u,
            color: color.forestDeep,
            letterSpacing: "0.01em",
          }}
        >
          {["Writers", "Painters", "Filmmakers", "Musicians"].map((label, i) => (
            <span key={label} style={{ opacity: i === active ? 1 : 0.45 }}>
              {label}
              {i < 3 ? "  ·  " : ""}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
