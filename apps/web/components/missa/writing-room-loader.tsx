"use client";

import dynamic from "next/dynamic";
import type { WritingRoomProps } from "@/components/missa/writing-room";

// The room reads drafts kept in this browser before its first paint, so it
// renders only in the browser. The placeholder is the same blank page.
const WritingRoom = dynamic(
  () =>
    import("@/components/missa/writing-room").then(
      (module) => module.WritingRoom,
    ),
  {
    ssr: false,
    loading: () => <div className="h-dvh bg-background" aria-busy="true" />,
  },
);

export function WritingRoomLoader(props: WritingRoomProps) {
  return <WritingRoom {...props} />;
}
