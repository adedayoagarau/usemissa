import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Launch } from "./Launch";

/** A cutdown is a list of windows (in full-film seconds) played back to back. */
export type Clip = [from: number, to: number];

export const CUTS: Record<"cut15" | "cut6", Clip[]> = {
  // Both stay under their ad slot (14.95s and 5.9s).
  // "But mostly, it runs on deadlines." → Missa finds + reminds →
  // "Talent's your department. Deadlines are ours." → end card with CTA
  cut15: [
    [5.85, 8.95],
    [17.85, 23.5],
    [23.95, 26.95],
    [27.35, 30.55],
  ],
  // "But mostly, it runs on deadlines." → "Missa. Opportunities for every creator."
  cut6: [
    [5.95, 8.7],
    [27.4, 30.55],
  ],
};

export const cutLength = (clips: Clip[]) => clips.reduce((sum, [a, b]) => sum + (b - a), 0);

export const Cutdown: React.FC<{ cut: keyof typeof CUTS; music?: string | null; musicVolume?: number }> = ({
  cut,
  music = null,
  musicVolume = 0.35,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      {CUTS[cut].map(([from, to], i) => {
        const start = Math.round(cursor * fps);
        const length = Math.round((to - from) * fps);
        cursor += to - from;
        return (
          <Sequence key={i} from={start} durationInFrames={length} name={`clip ${from}-${to}`}>
            <Sequence from={-Math.round(from * fps)}>
              <Launch music={null} />
            </Sequence>
          </Sequence>
        );
      })}
      {music ? (
        <Audio
          src={staticFile(music)}
          volume={(f) =>
            musicVolume *
            interpolate(f, [0, 6, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
