import React from "react";
import { color, font, shadow } from "../tokens";

/** Compact opportunity card used in the deadline montage. Content is illustrative. */
export const DeadlineCard: React.FC<{
  u: number;
  width: number;
  type: string;
  title: string;
  organization: string;
  dateLabel: string;
  dateValue: string;
  /** 0..1 "Closed" stamp. */
  stamp?: number;
}> = ({ u, width, type, title, organization, dateLabel, dateValue, stamp = 0 }) => (
  <div
    style={{
      position: "relative",
      width,
      backgroundColor: color.white,
      borderRadius: 16 * u,
      border: `${1.5 * u}px solid ${color.border}`,
      boxShadow: shadow.lifted,
      padding: `${22 * u}px ${26 * u}px`,
      display: "flex",
      flexDirection: "column",
      gap: 12 * u,
      overflow: "hidden",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 * u }}>
      <span
        style={{
          fontFamily: font.interface,
          fontWeight: 600,
          fontSize: 18 * u,
          color: color.forest,
          backgroundColor: color.forestSubtle,
          borderRadius: 999,
          padding: `${4 * u}px ${12 * u}px`,
        }}
      >
        {type}
      </span>
      <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 18 * u, color: color.inkMuted }}>
        {organization}
      </span>
    </div>
    <div style={{ fontFamily: font.editorial, fontWeight: 500, fontSize: 36 * u, lineHeight: 1.05, letterSpacing: "-0.015em", color: color.ink }}>
      {title}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 * u }}>
      <span style={{ width: 10 * u, height: 10 * u, borderRadius: "50%", backgroundColor: color.ochre }} />
      <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: 20 * u, color: color.inkSecondary }}>{dateLabel}</span>
      <span style={{ fontFamily: font.data, fontSize: 21 * u, color: color.ochre }}>{dateValue}</span>
    </div>
    {stamp > 0 ? (
      <div
        style={{
          position: "absolute",
          right: 22 * u,
          top: "50%",
          transform: `translateY(-50%) rotate(-12deg) scale(${1.6 - 0.6 * Math.min(1, stamp)})`,
          opacity: Math.min(1, stamp * 1.5),
          border: `${4 * u}px solid ${color.inkSecondary}`,
          color: color.inkSecondary,
          borderRadius: 10 * u,
          padding: `${6 * u}px ${16 * u}px`,
          fontFamily: font.interface,
          fontWeight: 700,
          fontSize: 30 * u,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          backgroundColor: "rgba(255,255,255,0.85)",
        }}
      >
        Closed
      </div>
    ) : null}
  </div>
);
