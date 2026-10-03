import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { Captions } from "./components/Captions";
import { loadFonts } from "./components/kit";
import { SoundDesign } from "./components/SoundDesign";
import { Deadlines } from "./scenes/Deadlines";
import { EndCard } from "./scenes/EndCard";
import { Handled } from "./scenes/Handled";
import { MissaFinds } from "./scenes/MissaFinds";
import { Talent } from "./scenes/Talent";
import { scenes, VO_OFFSET, VOICEOVER_FILE } from "./timing";

loadFonts();

const ORDER = [
  ["talent", Talent],
  ["deadlines", Deadlines],
  ["missa", MissaFinds],
  ["handled", Handled],
  ["end", EndCard],
] as const;

export type LaunchProps = { music?: string | null; musicVolume?: number; captions?: boolean };

export const Launch: React.FC<LaunchProps> = ({ music = null, musicVolume = 0.35, captions = true }) => {
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
      {captions ? <Captions /> : null}
      <Sequence from={Math.round(VO_OFFSET * fps)} name="voiceover">
        <Audio src={staticFile(VOICEOVER_FILE)} />
      </Sequence>
      <SoundDesign />
      {music ? <Audio src={staticFile(music)} volume={musicVolume} /> : null}
    </AbsoluteFill>
  );
};
