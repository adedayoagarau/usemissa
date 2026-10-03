import React from "react";
import { mix } from "./kit";
import { color, font, shadow } from "../tokens";

/**
 * A Missa opportunity card, drawn with the product's tokens (white surface,
 * 12px radius, hairline border, Newsreader title, Fragment Mono facts).
 * Content is illustrative — swap for a live catalogue record before publishing.
 */
export const SAMPLE = {
  type: "Residency",
  title: "Coastal studio residency",
  organization: "Harbour Arts Foundation",
  facts: [
    { label: "Deadline", value: "30 Nov 2026" },
    { label: "Application fee", value: "None" },
    { label: "Open to", value: "All nationalities" },
    { label: "Support", value: "Studio + $2,000" },
  ],
  steps: ["Saved", "Submitted", "In review", "Decision"],
};

export type CardState = {
  /** 0→1 per fact row: citron marker sweeping behind the value. */
  compare: number[];
  /** 0→1 press on the official source button. */
  sourcePress: number;
  /** 0→1 the "Opened official guidelines" line. */
  sourceOpened: number;
  /** 0→1 Save → Saved. */
  saved: number;
  /** 0→1 tracker strip appearing; then per-step completion. */
  trackIn: number;
  steps: number[];
};

const Check: React.FC<{ size: number; stroke: string }> = ({ size, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const External: React.FC<{ size: number; stroke: string }> = ({ size, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const OpportunityCard: React.FC<{ u: number; width: number; state: CardState }> = ({
  u,
  width,
  state,
}) => {
  const s = (n: number) => n * u;
  const savedLabelY = state.saved * 100;

  return (
    <div
      style={{
        width,
        backgroundColor: color.white,
        borderRadius: s(18),
        border: `${s(1.5)}px solid ${color.border}`,
        boxShadow: shadow.lifted,
        padding: s(36),
        display: "flex",
        flexDirection: "column",
        gap: s(22),
        color: color.ink,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
        <span
          style={{
            fontFamily: font.interface,
            fontWeight: 600,
            fontSize: s(20),
            letterSpacing: "0.01em",
            color: color.forest,
            backgroundColor: color.forestSubtle,
            borderRadius: 999,
            padding: `${s(5)}px ${s(14)}px`,
          }}
        >
          {SAMPLE.type}
        </span>
        <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: s(20), color: color.inkMuted }}>
          {SAMPLE.organization}
        </span>
      </div>

      <div
        style={{
          fontFamily: font.editorial,
          fontWeight: 500,
          fontSize: s(54),
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
        }}
      >
        {SAMPLE.title}
      </div>

      {/* facts */}
      <div style={{ display: "flex", flexDirection: "column", borderTop: `${s(1.5)}px solid ${color.border}` }}>
        {SAMPLE.facts.map((fact, i) => {
          const p = state.compare[i] ?? 0;
          return (
            <div
              key={fact.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `${s(13)}px 0`,
                borderBottom: `${s(1.5)}px solid ${color.border}`,
              }}
            >
              <span style={{ fontFamily: font.interface, fontWeight: 500, fontSize: s(23), color: color.inkSecondary }}>
                {fact.label}
              </span>
              <span style={{ position: "relative", padding: `${s(2)}px ${s(8)}px` }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${p * 100}%`,
                    backgroundColor: color.citron,
                    borderRadius: s(6),
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    fontFamily: font.data,
                    fontSize: s(24),
                    color: color.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fact.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: s(14) }}>
        <div
          style={{
            flex: 1.4,
            height: s(64),
            borderRadius: s(10),
            border: `${s(1.5)}px solid ${color.borderStrong}`,
            backgroundColor: mix(0, 1, state.sourcePress) > 0.5 ? color.surfaceSubtle : color.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: s(10),
            fontFamily: font.interface,
            fontWeight: 600,
            fontSize: s(23),
            transform: `scale(${1 - 0.05 * Math.sin(state.sourcePress * Math.PI)})`,
            boxShadow: state.sourcePress > 0 && state.sourcePress < 1 ? `0 0 0 ${s(4)}px ${color.forestSubtle}` : "none",
          }}
        >
          Open official source <External size={s(24)} stroke={color.ink} />
        </div>
        <div
          style={{
            flex: 1,
            height: s(64),
            borderRadius: s(10),
            backgroundColor: color.forest,
            color: color.white,
            fontFamily: font.interface,
            fontWeight: 600,
            fontSize: s(23),
            overflow: "hidden",
            position: "relative",
            transform: `scale(${1 - 0.05 * Math.sin(state.saved * Math.PI)})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `translateY(${-savedLabelY}%)`,
            }}
          >
            Save
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: s(8),
              transform: `translateY(${100 - savedLabelY}%)`,
            }}
          >
            <Check size={s(24)} stroke={color.white} /> Saved
          </div>
        </div>
      </div>

      {/* official source confirmation */}
      <div
        style={{
          height: s(34) * state.sourceOpened * (1 - state.trackIn),
          opacity: state.sourceOpened * (1 - state.trackIn),
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: s(10),
          fontFamily: font.interface,
          fontWeight: 500,
          fontSize: s(21),
          color: color.inkSecondary,
          marginTop: -s(6) * (1 - state.sourceOpened),
        }}
      >
        <span style={{ width: s(10), height: s(10), borderRadius: "50%", backgroundColor: color.lichen }} />
        Opened the organization's official guidelines
      </div>

      {/* tracker */}
      <div
        style={{
          height: s(78) * state.trackIn,
          opacity: state.trackIn,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", paddingTop: s(6) }}>
          {SAMPLE.steps.map((step, i) => {
            const done = state.steps[i] ?? 0;
            const current = i === SAMPLE.steps.length - 2 && done > 0.5;
            const last = i === SAMPLE.steps.length - 1;
            return (
              <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", gap: s(10) }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      width: s(30),
                      height: s(30),
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `${s(2)}px solid ${done > 0.5 ? (current ? color.forest : color.lichen) : color.borderStrong}`,
                      backgroundColor: done > 0.5 && !current ? color.lichen : color.white,
                      transform: `scale(${1 + 0.18 * Math.sin(done * Math.PI)})`,
                    }}
                  >
                    {done > 0.5 && !current ? <Check size={s(18)} stroke={color.white} /> : null}
                    {current ? (
                      <span style={{ width: s(12), height: s(12), borderRadius: "50%", backgroundColor: color.forest }} />
                    ) : null}
                  </span>
                  {!last ? (
                    <span style={{ flex: 1, height: s(2), backgroundColor: color.border, position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${(state.steps[i + 1] ?? 0) * 100}%`,
                          backgroundColor: color.lichen,
                        }}
                      />
                    </span>
                  ) : null}
                </div>
                <span
                  style={{
                    fontFamily: font.interface,
                    fontWeight: current ? 650 : 500,
                    fontSize: s(19),
                    color: done > 0.5 ? color.ink : color.inkMuted,
                  }}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
