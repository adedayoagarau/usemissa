import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { cue, scenes } from "../timing";

type Hit = { at: number; file: string; volume: number; trim?: number };

/** Sound effects (ElevenLabs text-to-sound) placed on the video timeline. */
export const sfxHits = (): Hit[] => {
  const hits: Hit[] = [];
  hits.push({ at: cue("deadlines") - 0.03, file: "sfx/impact.mp3", volume: 0.85 });
  // clock ticks under the deadline montage
  hits.push({ at: cue("deadlines") + 1.0, file: "sfx/clock-tick.mp3", volume: 0.32, trim: 6 });
  hits.push({ at: cue("deadlines") + 7.0, file: "sfx/clock-tick.mp3", volume: 0.32, trim: cue("missOne") - (cue("deadlines") + 7.0) });
  hits.push({ at: cue("march") - 0.3, file: "sfx/page-flip.mp3", volume: 0.7 });
  hits.push({ at: cue("missOne") - 0.05, file: "sfx/impact.mp3", volume: 0.3 });
  // a year of pages
  const yearStart = cue("waitYear") + 0.05;
  const yearEnd = scenes.deadlines.to - 0.35;
  for (let i = 0; i < 12; i++) {
    hits.push({ at: yearStart + ((yearEnd - yearStart) / 12) * i, file: "sfx/page-flip.mp3", volume: 0.42, trim: 0.35 });
  }
  hits.push({ at: scenes.missa.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.45 });
  [cue("reminds") + 0.15, cue("closes") + 0.05, cue("closes") + 0.75].forEach((at) =>
    hits.push({ at, file: "sfx/chime.mp3", volume: 0.55 }),
  );
  hits.push({ at: scenes.handled.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.35 });
  [0, 1, 2, 3, 4].forEach((i) => hits.push({ at: cue("ours") + 0.2 + i * 0.16, file: "sfx/check.mp3", volume: 0.5, trim: 0.5 }));
  hits.push({ at: scenes.end.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.35 });
  return hits;
};

export const SoundDesign: React.FC<{ offset?: number; window?: [number, number] }> = ({ offset = 0, window }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {sfxHits()
        .filter((h) => !window || (h.at >= window[0] && h.at < window[1]))
        .map((h, i) => (
          <Sequence
            key={i}
            name={`sfx ${h.file}`}
            from={Math.round((h.at - offset) * fps)}
            durationInFrames={h.trim ? Math.round(h.trim * fps) : undefined}
            layout="none"
          >
            <Audio src={staticFile(h.file)} volume={h.volume} />
          </Sequence>
        ))}
    </>
  );
};
