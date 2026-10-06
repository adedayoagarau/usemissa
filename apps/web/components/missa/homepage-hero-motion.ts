"use client";

import { useSyncExternalStore } from "react";

/**
 * One pause switch for the hero's motion: the rotating headline word and the
 * product tour. The tour's control flips it; both read it.
 */

let paused = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setHeroMotionPaused(next: boolean) {
  paused = next;
  listeners.forEach((listener) => listener());
}

export function useHeroMotionPaused() {
  return useSyncExternalStore(
    subscribe,
    () => paused,
    () => false,
  );
}
