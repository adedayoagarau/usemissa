import React from "react";
import { color, font } from "../tokens";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Month label + Monday-first offset + length for a real calendar month. */
export const monthInfo = (year: number, monthIndex: number) => {
  const first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0 = Sunday
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { label: MONTHS[monthIndex], year, offset: (first + 6) % 7, days };
};

export type CalendarProps = {
  u: number;
  width: number;
  year: number;
  monthIndex: number;
  /** Days 1..n struck through (days gone by). */
  crossedThrough?: number;
  /** Day → 0..1 progress of an ochre ring drawn around it. */
  circles?: Record<number, number>;
  /** Day → 0..1 progress of a green check over it. */
  checks?: Record<number, number>;
  /** 0..1 flip of the month header (for page turns). */
  flip?: number;
  tone?: "light" | "muted";
};

export const Calendar: React.FC<CalendarProps> = ({
  u,
  width,
  year,
  monthIndex,
  crossedThrough = 0,
  circles = {},
  checks = {},
  flip = 0,
  tone = "light",
}) => {
  const { label, offset, days } = monthInfo(year, monthIndex);
  const cell = width / 7;
  const rows = Math.ceil((offset + days) / 7);
  const ink = tone === "muted" ? color.inkMuted : color.ink;

  return (
    <div
      style={{
        width,
        backgroundColor: color.white,
        borderRadius: 18 * u,
        border: `${1.5 * u}px solid ${color.border}`,
        boxShadow: "0 30px 80px rgba(23, 20, 24, 0.10)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: `${22 * u}px ${26 * u}px ${14 * u}px`,
          borderBottom: `${1.5 * u}px solid ${color.border}`,
          transformOrigin: "50% 0%",
          transform: `perspective(${900 * u}px) rotateX(${Math.sin(flip * Math.PI) * -70}deg)`,
        }}
      >
        <span style={{ fontFamily: font.editorial, fontWeight: 500, fontSize: 44 * u, color: ink, letterSpacing: "-0.02em" }}>
          {label}
        </span>
        <span style={{ fontFamily: font.data, fontSize: 24 * u, color: color.inkMuted }}>{year}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cell}px)`, padding: `${8 * u}px 0 ${14 * u}px` }}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={`w${i}`}
            style={{
              height: 40 * u,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font.interface,
              fontWeight: 600,
              fontSize: 18 * u,
              color: color.inkMuted,
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: rows * 7 }, (_, i) => {
          const day = i - offset + 1;
          const valid = day >= 1 && day <= days;
          const crossed = valid && day <= crossedThrough;
          const ring = valid ? circles[day] ?? 0 : 0;
          const check = valid ? checks[day] ?? 0 : 0;
          return (
            <div
              key={i}
              style={{
                height: cell * 0.78,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: font.data,
                fontSize: 26 * u,
                color: crossed ? color.borderStrong : ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {valid ? day : ""}
              {crossed ? (
                <svg style={{ position: "absolute", inset: "22%" }} viewBox="0 0 10 10" preserveAspectRatio="none">
                  <path d="M1 9 L9 1" stroke={color.ochre} strokeOpacity={0.55} strokeWidth={0.7} />
                </svg>
              ) : null}
              {ring > 0 ? (
                <svg
                  style={{ position: "absolute", width: cell * 0.82, height: cell * 0.68 }}
                  viewBox="0 0 100 80"
                >
                  <ellipse
                    cx="50"
                    cy="40"
                    rx="44"
                    ry="33"
                    fill="none"
                    stroke={color.ochre}
                    strokeWidth={5}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${ring} 1`}
                    transform="rotate(-100 50 40)"
                  />
                </svg>
              ) : null}
              {check > 0 ? (
                <svg style={{ position: "absolute", width: cell * 0.5, height: cell * 0.5 }} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="11" fill={color.lichen} opacity={Math.min(1, check * 2)} />
                  <path
                    d="M6.5 12.5l3.6 3.6L17.5 8.5"
                    fill="none"
                    stroke={color.white}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={`${Math.max(0, check * 2 - 1)} 1`}
                  />
                </svg>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
