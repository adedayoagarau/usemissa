import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { loadFonts } from "./components/kit";
import { Categories } from "./scenes/Categories";
import { Creators } from "./scenes/Creators";
import { EndCard } from "./scenes/EndCard";
import { Product } from "./scenes/Product";
import { Scattered } from "./scenes/Scattered";
import { scenes, VO_OFFSET } from "./timing";

loadFonts();

const ORDER = [
  ["categories", Categories],
  ["scattered", Scattered],
  ["product", Product],
  ["creators", Creators],
  ["end", EndCard],
] as const;

export const Launch: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      {ORDER.map(([key, Scene]) => {
        const window = scenes[key];
        const from = Math.round(window.from * fps);
        const to = Math.round(window.to * fps);
        return (
          <Sequence key={key} name={key} from={from} durationInFrames={to - from}>
            <Scene />
          </Sequence>
        );
      })}
      <Sequence from={Math.round(VO_OFFSET * fps)} name="voiceover">
        <Audio src={staticFile("audio/voiceover-temitope.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
