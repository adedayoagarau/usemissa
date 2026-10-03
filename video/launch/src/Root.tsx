import React from "react";
import { Composition } from "remotion";
import { CUTS, Cutdown, cutLength } from "./Cutdown";
import { Launch } from "./Launch";
import { DURATION_SECONDS, FPS } from "./timing";

/** Chosen score; set to null to render without music. */
export const MUSIC: string | null = "audio/score.mp3";

const FORMATS = [
  { suffix: "Square", width: 1080, height: 1080 },
  { suffix: "Vertical", width: 1080, height: 1920 },
  { suffix: "Wide", width: 1920, height: 1080 },
];

export const Root: React.FC = () => (
  <>
    {FORMATS.map((f) => (
      <Composition
        key={`Launch${f.suffix}`}
        id={`Launch${f.suffix}`}
        component={Launch}
        width={f.width}
        height={f.height}
        fps={FPS}
        durationInFrames={DURATION_SECONDS * FPS}
        defaultProps={{ music: MUSIC, musicVolume: 0.32, captions: true }}
      />
    ))}
    {FORMATS.flatMap((f) =>
      (Object.keys(CUTS) as Array<keyof typeof CUTS>).map((cut) => (
        <Composition
          key={`${cut}${f.suffix}`}
          id={`${cut === "cut15" ? "Cut15" : "Cut6"}${f.suffix}`}
          component={Cutdown}
          width={f.width}
          height={f.height}
          fps={FPS}
          durationInFrames={Math.round(cutLength(CUTS[cut]) * FPS)}
          defaultProps={{ cut, music: MUSIC, musicVolume: 0.32 }}
        />
      )),
    )}
  </>
);
