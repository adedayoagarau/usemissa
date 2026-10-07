"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { useHeroMotionPaused } from "./homepage-hero-motion";
import styles from "./homepage-hero-word.module.css";

/** The kinds of call Missa lists, in the order the headline cycles them. */
const WORDS = [
  "call",
  "grant",
  "residency",
  "fellowship",
  "prize",
  "exhibition",
  "publication",
  "festival",
  "award",
];

const HOLD_MS = 2000;
/** Wide screens carry the hero pause control, so the word may loop there. */
const LOOP_QUERY = "(min-width: 1024px)";

/**
 * The last word of the headline. Screen readers and the accessible name
 * always get "call."; the visible word cycles through the kinds of call in
 * a box sized to the longest one, so the headline never reflows. It holds
 * while hovered, while the hero motion is paused, and under reduced motion.
 * Without a pause control in view (phones), it makes one pass and rests on
 * "call".
 */
export function HeroWord() {
  const reduced = useReducedMotion();
  const paused = useHeroMotionPaused();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [passes, setPasses] = useState(0);

  useEffect(() => {
    if (reduced || paused || hovered) return;
    const loops = window.matchMedia(LOOP_QUERY).matches;
    if (!loops && passes >= 1) return;
    const timer = window.setTimeout(() => {
      const next = (index + 1) % WORDS.length;
      setIndex(next);
      if (next === 0) setPasses((count) => count + 1);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index, reduced, paused, hovered, passes]);

  const word = reduced ? WORDS[0] : WORDS[index];

  return (
    <span
      className={styles.slot}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <span className="sr-only">call.</span>
      <span className={styles.box} aria-hidden="true">
        {WORDS.map((candidate) => (
          <span key={candidate} className={styles.sizer}>
            {candidate}.
          </span>
        ))}
        <AnimatePresence initial={false}>
          <motion.span
            key={word}
            className={styles.word}
            initial={{ opacity: 0, y: "0.32em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            exit={{ opacity: 0, y: "-0.32em", filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 1 }}
          >
            {word}
            <span className={styles.stop}>.</span>
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
