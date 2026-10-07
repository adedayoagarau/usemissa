"use client";
import { useState } from "react";
import type { PortfolioWork } from "@/lib/creator-portfolio-schema";

/**
 * Which work the dialog shows. `open(work, { play: true })` is what pressing
 * play on a film's card does: it opens the work with the film already begun.
 */
export function useWorkViewer() {
  const [viewing, setViewing] = useState<{
    work: PortfolioWork;
    play: boolean;
  } | null>(null);
  const close = () => setViewing(null);
  return {
    open: (work: PortfolioWork, options?: { play?: boolean }) =>
      setViewing({ work, play: Boolean(options?.play) }),
    close,
    /** Spread onto `WorkDialog`, beside `player` and `creator`. */
    dialogProps: {
      work: viewing?.work ?? null,
      autoplay: viewing?.play ?? false,
      onClose: close,
    },
  };
}
