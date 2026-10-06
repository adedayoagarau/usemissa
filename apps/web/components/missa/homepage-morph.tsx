"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useSpring,
  type Transition,
} from "framer-motion";
import { Play } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { setHeroMotionPaused, useHeroMotionPaused } from "./homepage-hero-motion";
import {
  CallCardVignette,
  ProfileVignette,
  ReminderEmailVignette,
  SavedToast,
  SearchVignette,
  TrackerItemVignette,
  type VignetteCall,
} from "./homepage-vignettes";
import styles from "./homepage-morph.module.css";

/**
 * Missa in one shape. A single element morphs through the shipped product,
 * drawn by the shared vignettes: the browse search, a call card being saved,
 * the save toast, the Tracker item, the reminder email and a portfolio being
 * followed. Size and radius ride one firm spring; content swaps with a short
 * blur; a cursor aims at whatever it clicks. Built from a call open today.
 *
 * Decorative: the page describes the same features in text. It pauses while
 * a pointer rests on it or it has focus, holds when tapped, clicked or
 * toggled with Space or Enter, stops when the tab is hidden or it leaves the
 * view, and tilts gently toward a mouse. Reduced motion shows one still.
 */

type StepId =
  | "search"
  | "searchGo"
  | "card"
  | "saved"
  | "toast"
  | "tracker"
  | "reminder"
  | "profile"
  | "following";

type Step = {
  id: StepId;
  /** The surface this step shows; steps sharing one change only details. */
  surface: "search" | "card" | "toast" | "tracker" | "reminder" | "profile";
  width: number;
  height: number;
  radius: number;
  hold: number;
  /** Aim at the step's [data-cursor-target]; otherwise rest beside the shape. */
  aim?: boolean;
  press?: boolean;
};

const STEPS: Step[] = [
  { id: "search", surface: "search", width: 360, height: 50, radius: 10, hold: 1900, aim: true },
  { id: "searchGo", surface: "search", width: 360, height: 50, radius: 10, hold: 450, aim: true, press: true },
  { id: "card", surface: "card", width: 300, height: 196, radius: 12, hold: 1400, aim: true },
  { id: "saved", surface: "card", width: 300, height: 196, radius: 12, hold: 900, aim: true, press: true },
  { id: "toast", surface: "toast", width: 232, height: 52, radius: 10, hold: 1300 },
  { id: "tracker", surface: "tracker", width: 380, height: 118, radius: 14, hold: 2200 },
  { id: "reminder", surface: "reminder", width: 340, height: 232, radius: 12, hold: 2400 },
  { id: "profile", surface: "profile", width: 340, height: 186, radius: 16, hold: 1400, aim: true },
  { id: "following", surface: "profile", width: 340, height: 186, radius: 16, hold: 1700, aim: true, press: true },
];

const SHAPE: Transition = { type: "spring", stiffness: 340, damping: 34, mass: 1 };
const CURSOR: Transition = { type: "spring", stiffness: 150, damping: 24, mass: 1 };
const SWAP: Transition = { duration: 0.2, ease: [0.2, 0, 0, 1] };
const SWAP_OUT: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] };
const TILT = { stiffness: 180, damping: 22, mass: 0.6 };
const MAX_TILT = 5;
/** The cursor's hotspot sits this far inside its 22px box. */
const HOTSPOT = { x: 4.6, y: 2.75 };

function Surface({ step, call }: { step: Step; call: VignetteCall }) {
  switch (step.surface) {
    case "search":
      return (
        <SearchVignette
          pressed={step.press}
          query={
            <motion.span
              style={{ display: "inline-block" }}
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{
                delay: 0.35,
                duration: 0.9,
                ease: (t: number) => Math.floor(t * 9) / 9,
              }}
            >
              {call.typeLabel.toLowerCase()}
            </motion.span>
          }
        />
      );
    case "card":
      return <CallCardVignette call={call} saved={step.id === "saved"} pressed={step.press} />;
    case "toast":
      return <SavedToast />;
    case "tracker":
      return <TrackerItemVignette call={call} />;
    case "reminder":
      return <ReminderEmailVignette call={call} />;
    case "profile":
      return <ProfileVignette following={step.id === "following"} pressed={step.press} />;
  }
}

export function HomepageMorph({ call }: { call: VignetteCall | null }) {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.4 });
  const [index, setIndex] = useState(0);
  // Held: tapped, clicked or toggled from the keyboard. Shared with the
  // headline word so one gesture stills the whole hero.
  const held = useHeroMotionPaused();
  // Attending: a mouse rests on the tour or it has keyboard focus.
  const [attending, setAttending] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [cursor, setCursor] = useState({ x: 200, y: 40 });
  const running =
    Boolean(call) && !reduced && !held && !attending && !tabHidden && inView;
  const tiltX = useSpring(0, TILT);
  const tiltY = useSpring(0, TILT);
  const step = STEPS[index];

  useEffect(() => {
    const sync = () => setTabHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % STEPS.length),
      STEPS[index].hold,
    );
    return () => window.clearTimeout(timer);
  }, [running, index]);

  // Aim the cursor once the shape has mostly settled into this step.
  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(
      () => {
        const box = canvas.current?.getBoundingClientRect();
        if (!box) return;
        const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        const target = step.aim
          ? canvas.current?.querySelector<HTMLElement>("[data-current] [data-cursor-target]")
          : null;
        if (target) {
          const rect = target.getBoundingClientRect();
          setCursor({
            x: rect.left + rect.width / 2 - centre.x - HOTSPOT.x,
            y: rect.top + rect.height / 2 - centre.y - HOTSPOT.y,
          });
        } else {
          setCursor({ x: step.width / 2 + 18, y: step.height / 2 + 14 });
        }
      },
      step.press ? 0 : 340,
    );
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  if (!call) return null;

  if (reduced) {
    const still = STEPS[2];
    return (
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.canvas}>
          <div
            className={styles.shape}
            style={{ width: still.width, height: still.height, borderRadius: still.radius }}
          >
            <div className={styles.content}>
              <Surface step={still} call={call} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    tiltY.set(((event.clientX - box.left) / box.width - 0.5) * MAX_TILT * 2);
    tiltX.set(-((event.clientY - box.top) / box.height - 0.5) * MAX_TILT * 2);
  };
  const settle = () => {
    tiltX.set(0);
    tiltY.set(0);
  };
  const toggleHold = () => setHeroMotionPaused(!held);

  return (
    <div
      ref={stage}
      className={styles.stage}
      role="button"
      tabIndex={0}
      aria-pressed={held}
      aria-label={held ? "Play the product animation" : "Pause the product animation"}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setAttending(true);
      }}
      onPointerLeave={() => {
        setAttending(false);
        settle();
      }}
      onPointerMove={onPointerMove}
      onFocus={() => setAttending(true)}
      onBlur={() => setAttending(false)}
      onClick={toggleHold}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleHold();
        }
      }}
    >
      <div className={styles.canvas} ref={canvas} aria-hidden="true">
        <motion.div className={styles.tilt} style={{ rotateX: tiltX, rotateY: tiltY }}>
          <motion.div
            className={styles.shape}
            initial={false}
            animate={{ width: step.width, height: step.height, borderRadius: step.radius }}
            transition={SHAPE}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={step.surface}
                data-current
                className={styles.content}
                initial={{ opacity: 0, filter: "blur(6px)", scale: 0.98 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98, transition: SWAP_OUT }}
                transition={{ ...SWAP, delay: 0.06 }}
              >
                <Surface step={step} call={call} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
        {/* The demo cursor steps aside while the visitor's own pointer is here. */}
        <motion.svg
          className={styles.cursor}
          viewBox="0 0 24 24"
          initial={false}
          animate={{
            x: cursor.x,
            y: cursor.y,
            opacity: attending || held ? 0 : 1,
            scale: step.press ? [1, 0.82, 1] : 1,
          }}
          transition={{
            x: CURSOR,
            y: CURSOR,
            opacity: { duration: 0.18 },
            scale: { duration: 0.28, ease: [0.2, 0, 0, 1] },
          }}
        >
          <path d="M5 3l14 8-6 1.6L10 19z" />
        </motion.svg>
        {/* Only a held tour shows a mark, so a tap is never a mystery. */}
        <AnimatePresence>
          {held ? (
            <motion.span
              className={styles.heldMark}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <Play size={12} aria-hidden="true" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
