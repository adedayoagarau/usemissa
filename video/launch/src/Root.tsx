import React from "react";
import { Composition } from "remotion";
import { Launch } from "./Launch";
import { DURATION_SECONDS, FPS } from "./timing";

const FORMATS = [
  { id: "LaunchSquare", width: 1080, height: 1080 },
  { id: "LaunchVertical", width: 1080, height: 1920 },
  { id: "LaunchWide", width: 1920, height: 1080 },
];

export const Root: React.FC = () => (
  <>
    {FORMATS.map((format) => (
      <Composition
        key={format.id}
        id={format.id}
        component={Launch}
        width={format.width}
        height={format.height}
        fps={FPS}
        durationInFrames={DURATION_SECONDS * FPS}
      />
    ))}
  </>
);
