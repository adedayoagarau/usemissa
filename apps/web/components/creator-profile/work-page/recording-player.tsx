"use client";
import { createContext, useContext, type ReactNode } from "react";
import {
  AudioPanel,
  MiniPlayer,
  useAudioPlayer,
  type Player,
} from "../work-media";

const PagePlayer = createContext<{ player: Player; cover: string } | null>(
  null,
);

/**
 * One player for the whole work page, the same one the profile uses: a
 * recording started here keeps playing in the mini player as the visitor
 * scrolls, and starting another stops the first.
 */
export function WorkPagePlayer({
  cover,
  children,
}: {
  /** The work's picture, shown in the mini player. */
  cover: string;
  children: ReactNode;
}) {
  const player = useAudioPlayer();
  return (
    <PagePlayer.Provider value={{ player, cover }}>
      {children}
      {player.current && <MiniPlayer player={player} />}
    </PagePlayer.Provider>
  );
}

/** The recording on a work page: the shared listening block. */
export function RecordingPlayer({
  src,
  title,
  id,
}: {
  src: string;
  title: string;
  id?: string;
}) {
  const page = useContext(PagePlayer);
  if (!page) return null;
  return (
    <AudioPanel
      track={{ id: id ?? src, title, audio: src, image: page.cover }}
      player={page.player}
    />
  );
}
