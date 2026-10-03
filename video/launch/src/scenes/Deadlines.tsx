import React from "react";
import { AbsoluteFill } from "remotion";
import { Calendar } from "../components/Calendar";
import { DeadlineCard } from "../components/DeadlineCard";
import { LineReveal, mix, progress, useLayout, useSeconds } from "../components/kit";
import { cue, scenes } from "../timing";
import { color, ease, font } from "../tokens";

/**
 * "But mostly, it runs on deadlines. / Grant deadlines. Residency deadlines.
 *  That magazine that only reads submissions in March. / Miss one, and you
 *  wait a year."
 */
const CARDS = [
  { at: "grant", type: "Grant", title: "Emerging Artists Fund", organization: "Arts council", dateLabel: "Deadline", dateValue: "14 Nov", circle: 14 },
  { at: "residency", type: "Residency", title: "Coastal studio residency", organization: "Harbour Arts", dateLabel: "Closes", dateValue: "30 Nov", circle: 30 },
  { at: "magazine", type: "Publication", title: "Spring poetry issue", organization: "Literary quarterly", dateLabel: "Reads submissions", dateValue: "March only", circle: 0 },
] as const;

// Months shown while "you wait a year": April 2027 → March 2028.
const YEAR = Array.from({ length: 12 }, (_, i) => ({ year: i < 9 ? 2027 : 2028, monthIndex: (3 + i) % 12 }));

export const Deadlines: React.FC = () => {
  const start = scenes.deadlines.from;
  const t = useSeconds(start);
  const { shape, u } = useLayout();

  const slam = progress(t, cue("deadlines") - 0.05, 0.5, ease.enter);
  const shake = t > cue("deadlines") ? Math.sin((t - cue("deadlines")) * 60) * Math.exp(-(t - cue("deadlines")) * 9) : 0;
  const settle = progress(t, cue("deadlines") + 0.75, 0.55, ease.standard);
  const calIn = progress(t, cue("deadlines") + 0.95, 0.6);
  const yearStart = cue("waitYear") + 0.05;
  const yearEnd = scenes.deadlines.to - 0.35;
  const quiet = progress(t, cue("missOne"), 0.8, ease.standard);
  const leave = progress(t, scenes.deadlines.to - 0.3, 0.3, ease.exit);

  // calendar month state
  let year = 2026;
  let monthIndex = 10; // November
  let flip = 0;
  let crossed = Math.floor(mix(0, 13, progress(t, cue("deadlines") + 1.1, cue("grant") - cue("deadlines") - 1.2, (n) => n)));
  if (t >= cue("march") - 0.15) {
    year = 2027;
    monthIndex = 2;
    crossed = 0;
    flip = progress(t, cue("march") - 0.25, 0.3, (n) => n);
  }
  if (t >= yearStart) {
    const step = (yearEnd - yearStart) / YEAR.length;
    const k = Math.min(YEAR.length - 1, Math.floor((t - yearStart) / step));
    year = YEAR[k].year;
    monthIndex = YEAR[k].monthIndex;
    flip = ((t - yearStart) % step) / step;
    crossed = 40;
  }

  const circles: Record<number, number> = {};
  if (monthIndex === 10 && year === 2026) {
    circles[14] = progress(t, cue("grant") + 0.2, 0.5);
    circles[30] = progress(t, cue("residency") + 0.2, 0.5);
  }

  const L =
    shape === "wide"
      ? { cal: { x: 120, y: 290, w: 720 }, card: { x: 960, w: 820, ys: [210, 450, 690], dx: [0, 0, 0] }, head: { x: 120, y: 380 } }
      : shape === "tall"
        ? { cal: { x: 90, y: 430, w: 900 }, card: { x: 90, w: 900, ys: [1150, 1330, 1510], dx: [0, 0, 0] }, head: { x: 90, y: 560 } }
        : { cal: { x: 140, y: 230, w: 800 }, card: { x: 60, w: 680, ys: [520, 640, 760], dx: [0, 160, 320] }, head: { x: 80, y: 330 } };

  const headScale = mix(1, shape === "wide" ? 0.42 : 0.38, settle);
  const headY = mix(L.head.y * u, (shape === "tall" ? 200 : 70) * u, settle);

  return (
    <AbsoluteFill style={{ backgroundColor: color.white, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundColor: color.surfaceSubtle, opacity: quiet }} />

      {/* calendar */}
      <div
        style={{
          position: "absolute",
          left: L.cal.x * u,
          top: L.cal.y * u + (1 - calIn) * 60 * u,
          opacity: calIn * (1 - leave),
          transform: `scale(${mix(0.96, 1, calIn)})`,
          transformOrigin: "50% 0%",
        }}
      >
        <Calendar
          u={u}
          width={L.cal.w * u}
          year={year}
          monthIndex={monthIndex}
          crossedThrough={crossed}
          circles={circles}
          flip={flip}
          tone={quiet > 0.5 ? "muted" : "light"}
        />
      </div>

      {/* headline */}
      <div
        style={{
          position: "absolute",
          left: L.head.x * u,
          top: headY,
          transform: `scale(${headScale}) translateX(${shake * 8 * u}px)`,
          transformOrigin: "0% 0%",
          opacity: 1 - quiet * 0.6,
        }}
      >
        <div style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 44 * u, color: color.inkSecondary, height: 56 * u }}>
          <LineReveal t={t} enter={cue("mostly")}>But mostly, it runs on</LineReveal>
        </div>
        <div
          style={{
            fontFamily: font.editorial,
            fontWeight: 500,
            fontSize: (shape === "wide" ? 230 : 200) * u,
            lineHeight: 1,
            letterSpacing: "-0.045em",
            color: color.forestDeep,
            opacity: slam,
            transform: `scale(${mix(1.25, 1, slam)})`,
            transformOrigin: "0% 60%",
          }}
        >
          deadlines.
        </div>
      </div>

      {/* deadline cards */}
      {CARDS.map((c, i) => {
        const p = progress(t, cue(c.at) - 0.15, 0.55);
        const out = progress(t, cue("waitYear") - 0.1, 0.45, ease.exit);
        const stamp = c.circle === 0 ? progress(t, cue("missOne") - 0.05, 0.35, ease.enter) : 0;
        return (
          <div
            key={c.title}
            style={{
              position: "absolute",
              left: (L.card.x + L.card.dx[i]) * u,
              top: L.card.ys[i] * u,
              opacity: p * (1 - out),
              transform: `translateX(${(1 - p) * 120 * u}px) translateY(${out * 80 * u}px) rotate(${(1 - p) * 4}deg)`,
              zIndex: 10 + i,
            }}
          >
            <DeadlineCard
              u={u}
              width={L.card.w * u}
              type={c.type}
              title={c.title}
              organization={c.organization}
              dateLabel={c.dateLabel}
              dateValue={c.dateValue}
              stamp={stamp}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
