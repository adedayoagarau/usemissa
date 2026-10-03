import React from "react";
import { AbsoluteFill } from "remotion";
import { LineReveal, Wordmark, mix, progress, useLayout, useSeconds } from "../components/kit";
import { OpportunityCard, SAMPLE } from "../components/OpportunityCard";
import { FRAGMENTS, FragmentCard, fragmentPlacement } from "./Scattered";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

const VERBS = [
  { text: "Compare the facts.", at: cue("compare") },
  { text: "Open the official source.", at: cue("openSource") },
  { text: "Save your decision.", at: cue("save") },
  { text: "Track what comes next.", at: cue("track") },
];

export const Product: React.FC = () => {
  const start = scenes.product.from;
  const t = useSeconds(start);
  const { width, height, shape, u } = useLayout();

  // forest ground grows out of the centre as the fragments collapse into it
  const ground = progress(t, start, 0.55, ease.standard);
  const gather = progress(t, start, 0.55, ease.exit);
  const cardIn = progress(t, start + 0.35, 0.7);
  const markIn = progress(t, cue("together") - 0.05, 0.6);
  const leave = progress(t, scenes.product.to - 0.3, 0.3, ease.exit);

  const cardScale = shape === "tall" ? 1.2 : 1;
  const cardWidth = (shape === "wide" ? 760 : shape === "tall" ? 820 : 800) * u * cardScale;
  const cardCenter =
    shape === "wide"
      ? { x: width * 0.68, y: height / 2 }
      : shape === "tall"
        ? { x: width / 2, y: height * 0.54 }
        : { x: width / 2, y: height * 0.6 };

  const state = {
    compare: SAMPLE.facts.map((_, i) => progress(t, cue("compare") + 0.1 + i * 0.16, 0.35, ease.standard)),
    sourcePress: progress(t, cue("openSource") + 0.55, 0.3, ease.standard),
    sourceOpened: progress(t, cue("openSource") + 0.8, 0.35),
    saved: progress(t, cue("save") + 0.3, 0.35, ease.standard),
    trackIn: progress(t, cue("track") - 0.05, 0.45),
    steps: [0, 1, 2, 3].map((i) => (i === 3 ? 0 : progress(t, cue("track") + 0.25 + i * 0.32, 0.25, ease.standard))),
  };

  const textBlock =
    shape === "wide"
      ? { left: 110 * u, top: 0, bottom: 0, width: width * 0.36, align: "flex-start" as const }
      : { left: 70 * u, right: 70 * u, top: (shape === "tall" ? 180 : 70) * u, align: "center" as const };

  // card nudges slightly per verb so each action feels like a beat
  const beat = VERBS.reduce((acc, v) => acc + progress(t, v.at, 0.5), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: color.white, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: color.forestDeep,
          clipPath: `circle(${ground * 120}% at 50% 55%)`,
        }}
      />

      {/* fragments from the previous scene, collapsing into the card */}
      {gather < 1
        ? FRAGMENTS.map((fragment, i) => {
            const place = fragmentPlacement(i, width, height);
            const x = mix(place.x, cardCenter.x, gather);
            const y = mix(place.y, cardCenter.y, gather);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) rotate(${place.rotate * (1 - gather)}deg) scale(${1 - gather * 0.8})`,
                  opacity: 1 - gather,
                }}
              >
                <FragmentCard fragment={fragment} t={t} u={u} />
              </div>
            );
          })
        : null}

      {/* wordmark + spoken verbs */}
      <div
        style={{
          position: "absolute",
          ...textBlock,
          display: "flex",
          flexDirection: "column",
          justifyContent: shape === "wide" ? "center" : "flex-start",
          alignItems: textBlock.align,
          gap: (shape === "wide" ? 48 : 34) * u,
          opacity: 1 - leave,
        }}
      >
        <div style={{ transform: `translateY(${(1 - markIn) * 30 * u}px)`, opacity: markIn }}>
          <Wordmark height={(shape === "wide" ? 70 : 62) * u} color={color.white} />
        </div>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: (shape === "wide" ? 220 : 90) * u,
            fontFamily: font.editorial,
            fontWeight: 500,
            fontSize: (shape === "wide" ? 86 : shape === "tall" ? 74 : 68) * u,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: color.white,
            textAlign: shape === "wide" ? "left" : "center",
          }}
        >
          {VERBS.map((v, i) => (
            <div key={v.text} style={{ position: "absolute", inset: 0 }}>
              {/* split per word so long lines wrap gracefully in the wide layout */}
              {v.text.split(" ").map((word, w) => (
                <React.Fragment key={w}>
                  <LineReveal
                    t={t}
                    enter={v.at - 0.08 + w * 0.06}
                    exit={i < VERBS.length - 1 ? VERBS[i + 1].at - 0.2 : scenes.product.to - 0.35}
                  >
                    {word}
                  </LineReveal>{" "}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* the card */}
      <div
        style={{
          position: "absolute",
          left: cardCenter.x,
          top: cardCenter.y,
          transform: `translate(-50%, -50%) translateY(${(1 - cardIn) * 120 * u - leave * 80 * u}px) scale(${mix(0.55, 1, cardIn) * (1 + 0.012 * Math.sin(beat * Math.PI))}) rotate(${(1 - cardIn) * -4}deg)`,
          opacity: Math.min(cardIn * 1.5, 1) * (1 - leave),
        }}
      >
        <OpportunityCard u={u * cardScale} width={cardWidth} state={state} />
      </div>
    </AbsoluteFill>
  );
};
