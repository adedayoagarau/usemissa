import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Wordmark, mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font, shadow } from "../tokens";

/**
 * "Missa finds the opportunities that fit what you make, and reminds you
 *  before every one of them closes."
 * Reminder copy mirrors Missa's real reminder emails ("{title} closes in N days")
 * and offsets ("Two weeks before", "A week before", "The day before").
 */
const FIT = ["Painting", "Open to all nationalities", "No application fee"];
const REMINDERS = [
  { title: "Coastal studio residency closes in 14 days", meta: "Reminder · Two weeks before", at: cue("reminds") + 0.15 },
  { title: "Coastal studio residency closes in 7 days", meta: "Reminder · A week before", at: cue("closes") + 0.05 },
  { title: "Coastal studio residency closes tomorrow", meta: "Reminder · The day before", at: cue("closes") + 0.75 },
];

export const MissaFinds: React.FC = () => {
  const start = scenes.missa.from;
  const t = useSeconds(start);
  const { shape, u } = useLayout();

  const ground = progress(t, start, 0.45, ease.standard);
  const markIn = progress(t, cue("missa") - 0.05, 0.6);
  const cardIn = progress(t, cue("missa") + 0.35, 0.7);
  const fitIn = progress(t, cue("fit") - 0.1, 0.5);
  const leave = progress(t, scenes.missa.to - 0.3, 0.3, ease.exit);

  // vertical and wide frames get a slightly larger product moment
  const k = shape === "tall" ? 1.18 : shape === "wide" ? 1.1 : 1;
  const cardW = (shape === "wide" ? 720 : shape === "tall" ? 760 : 760) * u;
  const L =
    shape === "wide"
      ? { mark: { x: 120, y: 120 }, card: { x: 120, y: 330 }, notes: { x: 960, y: 260, w: 820 } }
      : shape === "tall"
        ? { mark: { x: 90, y: 200 }, card: { x: 90, y: 880 }, notes: { x: 90, y: 340, w: 900 } }
        : { mark: { x: 80, y: 70 }, card: { x: 160, y: 420 }, notes: { x: 120, y: 170, w: 840 } };
  if (shape === "tall") L.notes.w = 900 / k;
  if (shape === "wide") L.notes.w = 820 / k;

  return (
    <AbsoluteFill style={{ backgroundColor: color.surfaceSubtle, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundColor: color.forestDeep, clipPath: `circle(${ground * 130}% at 15% 15%)` }} />

      <div style={{ position: "absolute", left: L.mark.x * u, top: L.mark.y * u, opacity: markIn * (1 - leave), transform: `translateY(${(1 - markIn) * 24 * u}px)` }}>
        <Wordmark height={64 * u} color={color.white} />
      </div>

      {/* opportunity card with "why this may fit" */}
      <div
        style={{
          position: "absolute",
          left: L.card.x * u,
          top: L.card.y * u,
          width: cardW,
          opacity: cardIn * (1 - leave),
          transform: `translateY(${(1 - cardIn) * 80 * u}px) scale(${mix(0.94, 1, cardIn) * k})`,
          transformOrigin: "0% 0%",
          backgroundColor: color.white,
          borderRadius: 20 * u,
          boxShadow: shadow.lifted,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 230 * u, position: "relative", overflow: "hidden" }}>
          <Img src={staticFile("media/residencies.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${mix(1.12, 1.02, cardIn)})` }} />
        </div>
        <div style={{ padding: `${26 * u}px ${30 * u}px ${30 * u}px`, display: "flex", flexDirection: "column", gap: 14 * u }}>
          <div style={{ display: "flex", gap: 10 * u, alignItems: "center" }}>
            <span style={{ fontFamily: font.interface, fontWeight: 600, fontSize: 18 * u, color: color.forest, backgroundColor: color.forestSubtle, borderRadius: 999, padding: `${4 * u}px ${12 * u}px` }}>
              Residency
            </span>
            <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 18 * u, color: color.inkMuted }}>Harbour Arts</span>
            <span style={{ marginLeft: "auto", fontFamily: font.data, fontSize: 20 * u, color: color.ochre }}>Closes 30 Nov</span>
          </div>
          <div style={{ fontFamily: font.editorial, fontWeight: 500, fontSize: 46 * u, lineHeight: 1.04, letterSpacing: "-0.02em", color: color.ink }}>
            Coastal studio residency
          </div>
          <div style={{ opacity: fitIn, transform: `translateY(${(1 - fitIn) * 14 * u}px)` }}>
            <div style={{ fontFamily: font.interface, fontWeight: 650, fontSize: 19 * u, color: color.inkSecondary, marginBottom: 10 * u }}>Why this may fit</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 * u }}>
              {FIT.map((f, i) => {
                const p = progress(t, cue("fit") + i * 0.18, 0.4);
                return (
                  <span
                    key={f}
                    style={{
                      fontFamily: font.interface,
                      fontWeight: 600,
                      fontSize: 19 * u,
                      color: color.forestDeep,
                      backgroundColor: color.citron,
                      borderRadius: 999,
                      padding: `${6 * u}px ${14 * u}px`,
                      opacity: p,
                      transform: `scale(${mix(0.85, 1, p)})`,
                    }}
                  >
                    {f}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* reminders stack in like notifications */}
      <div style={{ position: "absolute", left: L.notes.x * u, top: L.notes.y * u, width: L.notes.w * u, display: "flex", flexDirection: "column", gap: 14 * u, transform: `scale(${k})`, transformOrigin: "0% 0%" }}>
        {REMINDERS.map((r, i) => {
          const p = progress(t, r.at, 0.45, ease.enter);
          if (p <= 0) return null;
          return (
            <div
              key={r.title}
              style={{
                opacity: p * (1 - leave),
                transform: `translateY(${(1 - p) * -40 * u}px) scale(${mix(0.92, 1, p)})`,
                backgroundColor: "rgba(255,255,255,0.97)",
                borderRadius: 22 * u,
                boxShadow: shadow.overlay,
                padding: `${18 * u}px ${22 * u}px`,
                display: "flex",
                alignItems: "center",
                gap: 18 * u,
                zIndex: 20 + i,
              }}
            >
              <div style={{ width: 58 * u, height: 58 * u, borderRadius: 14 * u, backgroundColor: color.forestDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Wordmark height={11 * u} color={color.white} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 * u, minWidth: 0 }}>
                <span style={{ fontFamily: font.interface, fontWeight: 650, fontSize: 24 * u, color: color.ink }}>{r.title}</span>
                <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 19 * u, color: color.inkMuted }}>{r.meta}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
