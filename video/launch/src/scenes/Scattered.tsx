import React from "react";
import { AbsoluteFill } from "remotion";
import { LineReveal, mix, progress, seeded, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font, shadow } from "../tokens";

type Kind = "deadline" | "fee" | "rules";
type Fragment = { title?: string; chips: Array<{ kind: Kind; text: string }> };

/** Illustrative listing fragments: the mess of facts a creator pieces together today. */
const FRAGMENTS: Fragment[] = [
  { title: "Emerging writers fellowship", chips: [{ kind: "deadline", text: "Deadline 30 Nov" }] },
  { chips: [{ kind: "fee", text: "Entry fee $35" }] },
  { title: "Open call: photography", chips: [{ kind: "rules", text: "Max 10 images" }] },
  { chips: [{ kind: "deadline", text: "Rolling deadline" }] },
  { title: "Artist residency 2027", chips: [{ kind: "rules", text: "Ages 21–35" }, { kind: "fee", text: "No fee" }] },
  { chips: [{ kind: "rules", text: "PDF only, under 5 MB" }] },
  { title: "Short film fund", chips: [{ kind: "deadline", text: "Closes 12 Jan" }] },
  { chips: [{ kind: "fee", text: "Fee not stated" }] },
  { title: "Poetry prize", chips: [{ kind: "rules", text: "Unpublished work only" }] },
  { chips: [{ kind: "deadline", text: "Deadline not confirmed" }] },
  { title: "Music production grant", chips: [{ kind: "fee", text: "$20 per track" }] },
  { chips: [{ kind: "rules", text: "Residents of West Africa" }] },
  { title: "Group exhibition", chips: [{ kind: "deadline", text: "Due 1 Mar" }] },
  { chips: [{ kind: "rules", text: "Three references" }] },
];

const KIND_CUE: Record<Kind, number> = {
  deadline: cue("deadline"),
  fee: cue("fee"),
  rules: cue("rules"),
};

/** Where each fragment sits; shared with the next scene so they can fly together. */
export const fragmentPlacement = (i: number, width: number, height: number) => {
  const cols = width > height * 1.2 ? 5 : 3;
  const rows = Math.ceil(FRAGMENTS.length / cols);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cellW = width / cols;
  const cellH = (height * 0.78) / rows;
  return {
    x: cellW * (col + 0.5) + (seeded(i + 1) - 0.5) * cellW * 0.5,
    y: height * 0.08 + cellH * (row + 0.5) + (seeded(i + 40) - 0.5) * cellH * 0.45,
    rotate: (seeded(i + 90) - 0.5) * 14,
  };
};

export const FragmentCard: React.FC<{ fragment: Fragment; t: number; u: number }> = ({
  fragment,
  t,
  u,
}) => (
  <div
    style={{
      backgroundColor: color.white,
      border: `${1.5 * u}px solid ${color.border}`,
      borderRadius: 14 * u,
      boxShadow: shadow.overlay,
      padding: fragment.title ? `${14 * u}px ${18 * u}px ${18 * u}px` : 10 * u,
      display: "flex",
      flexDirection: "column",
      gap: 12 * u,
      width: "max-content",
      maxWidth: 340 * u,
    }}
  >
    {fragment.title ? (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * u }}>
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{ width: 9 * u, height: 9 * u, borderRadius: "50%", backgroundColor: color.borderStrong }}
            />
          ))}
          <span
            style={{
              marginLeft: 8 * u,
              height: 12 * u,
              width: 150 * u,
              borderRadius: 6 * u,
              backgroundColor: color.surfaceSubtle,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 550,
            fontSize: 30 * u,
            lineHeight: 1.15,
            letterSpacing: "-0.012em",
            color: color.ink,
          }}
        >
          {fragment.title}
        </div>
      </>
    ) : null}
    <div style={{ display: "flex", gap: 8 * u, flexWrap: "wrap" }}>
      {fragment.chips.map((chip) => {
        const lit = progress(t, KIND_CUE[chip.kind] - 0.05, 0.25, ease.standard);
        return (
          <span
            key={chip.text}
            style={{
              fontFamily: font.interface,
              fontWeight: 600,
              fontSize: 22 * u,
              padding: `${6 * u}px ${14 * u}px`,
              borderRadius: 999,
              whiteSpace: "nowrap",
              color: lit > 0.5 ? color.white : color.inkSecondary,
              backgroundColor: lit > 0 ? `rgba(120, 85, 30, ${lit})` : color.surfaceSubtle,
              border: `${1.5 * u}px solid ${lit > 0.5 ? color.ochre : color.border}`,
              transform: `scale(${1 + 0.08 * Math.sin(lit * Math.PI)})`,
            }}
          >
            {chip.text}
          </span>
        );
      })}
    </div>
  </div>
);

export const Scattered: React.FC = () => {
  const t = useSeconds(scenes.scattered.from);
  const { width, height, shape, u } = useLayout();
  const start = scenes.scattered.from;

  const captions: Array<{ text: string; at: number }> = [
    { text: "Deadlines.", at: cue("deadline") },
    { text: "Fees.", at: cue("fee") },
    { text: "Rules.", at: cue("rules") },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: color.white, overflow: "hidden" }}>
      {FRAGMENTS.map((fragment, i) => {
        const place = fragmentPlacement(i, width, height);
        const appear = progress(t, start + 0.04 + i * 0.11, 0.5);
        const driftX = Math.sin(t * 0.6 + i) * 10 * u;
        const driftY = Math.cos(t * 0.5 + i * 1.7) * 8 * u;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: place.x,
              top: place.y,
              transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY + (1 - appear) * 40 * u}px) rotate(${place.rotate}deg) scale(${mix(0.85, 1, appear)})`,
              opacity: appear,
            }}
          >
            <FragmentCard fragment={fragment} t={t} u={u} />
          </div>
        );
      })}

      {/* spoken emphasis */}
      <div
        style={{
          position: "absolute",
          left: 64 * u,
          right: 64 * u,
          bottom: (shape === "tall" ? 140 : 56) * u,
          display: "flex",
          gap: 26 * u,
          justifyContent: shape === "wide" ? "flex-start" : "center",
          fontFamily: font.editorial,
          fontWeight: 500,
          fontSize: (shape === "tall" ? 96 : 104) * u,
          letterSpacing: "-0.03em",
          color: color.ink,
        }}
      >
        {captions.map((c) => (
          <span
            key={c.text}
            style={{
              backgroundColor: color.white,
              borderRadius: 12 * u,
              padding: `0 ${10 * u}px`,
            }}
          >
            <LineReveal t={t} enter={c.at - 0.05}>
              {c.text}
            </LineReveal>
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export { FRAGMENTS };
