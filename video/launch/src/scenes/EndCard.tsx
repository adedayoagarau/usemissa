import React from "react";
import { AbsoluteFill } from "remotion";
import { LineReveal, Wordmark, mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

/** "Missa. Opportunities for every creator." + call to action. */
export const EndCard: React.FC<{ from?: number }> = ({ from }) => {
  const start = from ?? scenes.end.from;
  const t = useSeconds(start);
  const { shape, u } = useLayout();

  const wipe = progress(t, start, 0.3, ease.standard);
  const mark = progress(t, cue("name") - 0.05, 0.7);
  const lift = progress(t, cue("tagline") - 0.25, 0.6, ease.standard);
  const cta = progress(t, cue("end") + 0.2, 0.6);

  const words = ["Opportunities", "for", "every", "creator."];
  const wordAt = (i: number) => mix(cue("tagline") - 0.08, cue("end") - 0.45, i / (words.length - 1));

  return (
    <AbsoluteFill style={{ backgroundColor: color.sky, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundColor: color.forestDeep, clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)` }} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 52 * u,
          padding: `0 ${70 * u}px`,
          textAlign: "center",
        }}
      >
        <div style={{ transform: `translateY(${(1 - mark) * 50 * u - lift * 10 * u}px) scale(${mix(1.15, 1, mark) * mix(1, 0.72, lift)})`, opacity: mark }}>
          <Wordmark height={150 * u} color={color.white} />
        </div>
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 500,
            fontSize: (shape === "tall" ? 92 : 100) * u,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            color: color.white,
            marginTop: -20 * u,
          }}
        >
          {words.map((w, i) => (
            <React.Fragment key={w}>
              <LineReveal
                t={t}
                enter={wordAt(i)}
                style={i >= 2 ? { color: color.citron, fontStyle: "italic" } : undefined}
              >
                {w}
              </LineReveal>
              {i === 0 && shape !== "wide" ? <br /> : " "}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * u, opacity: cta, transform: `translateY(${(1 - cta) * 30 * u}px)` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14 * u,
              backgroundColor: color.citron,
              color: color.forestDeep,
              borderRadius: 999,
              padding: `${20 * u}px ${38 * u}px`,
              fontFamily: font.interface,
              fontWeight: 650,
              fontSize: 32 * u,
            }}
          >
            Browse opportunities
            <svg width={30 * u} height={30 * u} viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke={color.forestDeep} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 30 * u, color: color.white, opacity: 0.9 }}>usemissa.com</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
