"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import {
  ArrowUpRight,
  BellRing,
  Bookmark,
  CalendarCheck,
  Check,
  Pause,
  Play,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./homepage-morph.module.css";

/**
 * Missa in one shape. A single element morphs through the product: search,
 * a call, the shortlist, the Tracker, a reminder, a portfolio. Its size,
 * radius and tint change on one spring; its content swaps with a short blur;
 * a cursor drives every change. Built from a call open today. Decorative:
 * the same features are described in text on the page. Pauses off-screen and
 * on request; reduced motion shows one still state.
 */

export type MorphCall = {
  title: string;
  /** The call type as the card badge shows it, e.g. "Residency". */
  typeLabel: string;
  organizationName?: string | null;
  deadline: { date?: string | null };
};

type StepId =
  | "search"
  | "searchGo"
  | "card"
  | "saved"
  | "chip"
  | "tracker"
  | "reminder"
  | "portfolio"
  | "following";

type Step = {
  id: StepId;
  width: number;
  height: number;
  radius: number;
  /** How long the step holds before the next morph, in ms. */
  hold: number;
  /** Cursor target relative to the shape's centre, and whether it presses. */
  cursor: { x: number; y: number; press?: boolean };
};

const STEPS: Step[] = [
  { id: "search", width: 340, height: 56, radius: 28, hold: 1700, cursor: { x: 138, y: -3 } },
  { id: "searchGo", width: 340, height: 56, radius: 28, hold: 450, cursor: { x: 138, y: -3, press: true } },
  { id: "card", width: 360, height: 196, radius: 18, hold: 1500, cursor: { x: 146, y: -72 } },
  { id: "saved", width: 360, height: 196, radius: 18, hold: 1100, cursor: { x: 146, y: -72, press: true } },
  { id: "chip", width: 268, height: 52, radius: 26, hold: 1500, cursor: { x: 170, y: 60 } },
  { id: "tracker", width: 372, height: 88, radius: 14, hold: 1900, cursor: { x: 200, y: 70 } },
  { id: "reminder", width: 352, height: 104, radius: 18, hold: 2000, cursor: { x: 190, y: 80 } },
  { id: "portfolio", width: 340, height: 150, radius: 20, hold: 1500, cursor: { x: -25, y: 27 } },
  { id: "following", width: 340, height: 150, radius: 20, hold: 1600, cursor: { x: -25, y: 27, press: true } },
];

/** A firm spring with at most a hair of overshoot. */
const SHAPE: Transition = { type: "spring", stiffness: 340, damping: 34, mass: 1 };
const CURSOR: Transition = { type: "spring", stiffness: 160, damping: 26, mass: 1 };
const SWAP: Transition = { duration: 0.2, ease: [0.2, 0, 0, 1] };
const SWAP_OUT: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] };

function shortDate(iso: string | null | undefined, minusDays = 0) {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - minusDays);
  return date.toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Content({ step, call }: { step: StepId; call: MorphCall }) {
  const closes = shortDate(call.deadline.date);
  const weekBefore = shortDate(call.deadline.date, 7);
  const [month, day] = (closes ?? "").split(" ");
  switch (step) {
    case "search":
    case "searchGo":
      return (
        <div className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <motion.span
            className={styles.typed}
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ delay: 0.35, duration: 0.9, ease: (t: number) => Math.floor(t * 9) / 9 }}
          >
            {call.typeLabel.toLowerCase()}
          </motion.span>
          <motion.span
            className={styles.caret}
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
          <span className={styles.go} data-on={step === "searchGo" || undefined}>
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </div>
      );
    case "card":
    case "saved":
      return (
        <div className={styles.card}>
          <div className={styles.cardCover}>
            <span className={styles.badge}>{call.typeLabel}</span>
            <span className={styles.save} data-on={step === "saved" || undefined}>
              <Bookmark size={16} aria-hidden="true" />
            </span>
            {call.organizationName ? (
              <span className={styles.plate}>{call.organizationName}</span>
            ) : null}
          </div>
          <div className={styles.cardBody}>
            <strong>{call.title}</strong>
            <span>{closes ? `Closes ${closes}` : call.organizationName}</span>
          </div>
        </div>
      );
    case "chip":
      return (
        <div className={styles.chip}>
          <Bookmark size={16} aria-hidden="true" />
          <span>Shortlisted</span>
          <span className={styles.chipCount}>1</span>
        </div>
      );
    case "tracker":
      return (
        <div className={styles.tracker}>
          <span className={styles.dateBlock}>
            <small>{month ?? ""}</small>
            <strong>{day ?? ""}</strong>
          </span>
          <span className={styles.trackerText}>
            <strong>{call.title}</strong>
            <span>
              <CalendarCheck size={14} aria-hidden="true" /> In your Tracker
            </span>
          </span>
        </div>
      );
    case "reminder":
      return (
        <div className={styles.reminder}>
          <span className={styles.bell}>
            <BellRing size={18} aria-hidden="true" />
          </span>
          <span className={styles.reminderText}>
            <small>Reminder{weekBefore ? `, ${weekBefore}` : ""}</small>
            <strong>Closes in a week</strong>
            <span>{call.title}</span>
          </span>
        </div>
      );
    case "portfolio":
    case "following":
      return (
        <div className={styles.portfolio}>
          <span className={styles.portrait} />
          <span className={styles.portfolioText}>
            <strong className="font-heading">Riley Chen</strong>
            <span>Poet, sound artist and photographer</span>
            <span className={styles.follow} data-on={step === "following" || undefined}>
              {step === "following" ? (
                <>
                  <Check size={14} aria-hidden="true" /> Following
                </>
              ) : (
                <>
                  <UserPlus size={14} aria-hidden="true" /> Follow
                </>
              )}
            </span>
          </span>
        </div>
      );
  }
}

export function HomepageMorph({ call }: { call: MorphCall | null }) {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.4 });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const running = Boolean(call) && !reduced && !paused && inView;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % STEPS.length),
      STEPS[index].hold,
    );
    return () => window.clearTimeout(timer);
  }, [running, index]);

  if (!call) return null;
  // Reduced motion: one still, the call card, with no cursor and no loop.
  const step = reduced ? STEPS[2] : STEPS[index];
  // The shape's own state (card and saved share one; so do the two portfolio steps).
  const swapKey =
    step.id === "saved"
      ? "card"
      : step.id === "following"
        ? "portfolio"
        : step.id === "searchGo"
          ? "search"
          : step.id;

  return (
    <div className={styles.stage} ref={stage}>
      <div className={styles.canvas} aria-hidden="true">
        <motion.div
          className={styles.shape}
          data-state={step.id}
          initial={false}
          animate={{ width: step.width, height: step.height, borderRadius: step.radius }}
          transition={reduced ? { duration: 0 } : SHAPE}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={swapKey}
              className={styles.content}
              initial={{ opacity: 0, filter: "blur(6px)", scale: 0.98 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98, transition: SWAP_OUT }}
              transition={{ ...SWAP, delay: 0.06 }}
            >
              <Content step={step.id} call={call} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {reduced ? null : (
          <motion.svg
            className={styles.cursor}
            viewBox="0 0 24 24"
            initial={false}
            animate={{
              x: step.cursor.x,
              y: step.cursor.y,
              scale: step.cursor.press ? [1, 0.82, 1] : 1,
            }}
            transition={{
              x: CURSOR,
              y: CURSOR,
              scale: { duration: 0.28, ease: [0.2, 0, 0, 1] },
            }}
          >
            <path d="M5 3l14 8-6 1.6L10 19z" />
          </motion.svg>
        )}
      </div>
      {reduced ? null : (
        <button
          type="button"
          className={styles.pause}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {paused ? "Play the tour" : "Pause the tour"}
        </button>
      )}
    </div>
  );
}
