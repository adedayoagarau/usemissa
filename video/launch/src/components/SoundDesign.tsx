import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { cue, scenes } from "../timing";

type Hit = { at: number; file: string; volume: number; trim?: number; loop?: boolean };

// Seconds from the start of each file to the moment that should land on the cue.
const PEAK: Record<string, number> = {
  "sfx/marker-strike.mp3": 0.72,
  "sfx/marker-circle.mp3": 0.75,
  "sfx/paper-slide.mp3": 1.5,
  "sfx/pop.mp3": 0.4,
  "sfx/logo-swell.mp3": 0.15,
};
/** A hit whose audible peak lands on `at`. */
const on = (at: number, file: string, volume: number, trim?: number): Hit => ({ at: at - (PEAK[file] ?? 0), file, volume, trim });

/** Sound effects (ElevenLabs text-to-sound) placed on the video timeline. */
export const sfxHits = (): Hit[] => {
  const hits: Hit[] = [];
  // studio room tone under the opening shot
  hits.push({ at: 0, file: "sfx/studio-room.mp3", volume: 0.22, trim: scenes.talent.to, loop: true });

  hits.push({ at: cue("deadlines") - 0.03, file: "sfx/impact.mp3", volume: 0.85 });
  // clock ticks under the deadline montage
  hits.push({ at: cue("deadlines") + 1.0, file: "sfx/clock-tick.mp3", volume: 0.3, trim: 6 });
  hits.push({ at: cue("deadlines") + 7.0, file: "sfx/clock-tick.mp3", volume: 0.3, trim: Math.max(0, cue("missOne") - (cue("deadlines") + 7.0)) });
  // days crossed off as the calendar lands
  [0, 1, 2].forEach((i) => hits.push(on(cue("deadlines") + 1.2 + i * 0.28, "sfx/marker-strike.mp3", 0.32)));
  // deadline cards slide in; grant and residency dates get circled
  (["grant", "residency", "magazine"] as const).forEach((c) => hits.push(on(cue(c) + 0.15, "sfx/paper-slide.mp3", 0.4)));
  hits.push(on(cue("grant") + 0.5, "sfx/marker-circle.mp3", 0.5));
  hits.push(on(cue("residency") + 0.5, "sfx/marker-circle.mp3", 0.5));
  hits.push({ at: cue("march") - 0.3, file: "sfx/page-flip.mp3", volume: 0.7 });
  // "Miss one" — the Closed stamp
  hits.push({ at: cue("missOne") + 0.02, file: "sfx/stamp.mp3", volume: 0.6 });
  // a year of pages
  const yearStart = cue("waitYear") + 0.05;
  const yearEnd = scenes.deadlines.to - 0.35;
  for (let i = 0; i < 12; i++) {
    hits.push({ at: yearStart + ((yearEnd - yearStart) / 12) * i, file: "sfx/page-flip.mp3", volume: 0.42, trim: 0.35 });
  }
  hits.push({ at: scenes.missa.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.45 });
  hits.push(on(cue("missa") + 0.1, "sfx/logo-swell.mp3", 0.35));
  // "why this may fit" chips
  [0, 1, 2].forEach((i) => hits.push(on(cue("fit") + i * 0.18 + 0.12, "sfx/pop.mp3", 0.3)));
  [cue("reminds") + 0.15, cue("closes") + 0.05, cue("closes") + 0.75].forEach((at) =>
    hits.push({ at, file: "sfx/chime.mp3", volume: 0.55 }),
  );
  hits.push({ at: scenes.handled.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.35 });
  // discipline tiles
  [0, 1, 2, 3, 4, 5].forEach((i) => hits.push(on(scenes.handled.from + 0.15 + i * 0.07, "sfx/pop.mp3", 0.14)));
  // ochre rings drawn round each deadline on the real calendar
  [0, 1, 2, 3, 4].forEach((i) => hits.push(on(cue("ours") + 0.4 + i * 0.16, "sfx/marker-circle.mp3", 0.3, 0.95)));
  hits.push({ at: scenes.end.from - 0.1, file: "sfx/whoosh.mp3", volume: 0.35 });
  hits.push(on(cue("name") + 0.1, "sfx/logo-swell.mp3", 0.38));
  hits.push(on(cue("end") + 0.45, "sfx/pop.mp3", 0.3));
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
            <Audio src={staticFile(h.file)} volume={h.volume} loop={h.loop} />
          </Sequence>
        ))}
    </>
  );
};
