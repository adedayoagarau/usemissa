"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bookmark,
  Compass,
  Sprout,
} from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { welcomeMotion } from "@/components/design-system/welcome-motion";
import { createWelcomeRenderer } from "./welcome-glass-renderer";
import "@/components/design-system/welcome-tokens.css";
import styles from "./liquid-glass-welcome.module.css";

type Drag = {
  id: number;
  y: number;
  lastY: number;
  lastTime: number;
  start: number;
  velocity: number;
  moved: boolean;
};

export function LiquidGlassWelcome() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const progress = useMotionValue(0);
  const plume = useMotionValue(0);
  const leaving = useRef(false);
  const isOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [graphics, setGraphics] = useState(false);
  const reduced = useReducedMotion();
  const gateOpacity = useTransform(progress, [0, 0.65], [1, 0]);
  const revealOpacity = useTransform(plume, [0, 0.5], [0, 1]);

  const show = useCallback(
    (next: boolean) => {
      if (isOpen.current === next) return;
      isOpen.current = next;
      leaving.current = !next;
      setOpen(next);
      plume.stop();
      if (reduced) {
        plume.set(next ? 1 : 0);
        return;
      }
      if (next) plume.set(0);
      animate(plume, next ? 1 : 0, {
        duration: next
          ? welcomeMotion.plumeDuration
          : welcomeMotion.exitDuration,
        delay: next ? welcomeMotion.emissionDelay : 0,
        ease: "linear",
      });
    },
    [plume, reduced],
  );

  const settle = useCallback(
    (target: number, velocity = 0) => {
      progress.stop();
      if (reduced) {
        progress.set(target);
        show(target === 1);
        return;
      }
      animate(progress, target, { ...welcomeMotion.spring, velocity });
    },
    [progress, reduced, show],
  );

  useEffect(
    () =>
      progress.on("change", (value) => {
        if (value > welcomeMotion.enter && !drag.current) show(true);
        if (value < welcomeMotion.leave) show(false);
      }),
    [progress, show],
  );

  useEffect(() => {
    if (reduced) {
      progress.stop();
      plume.stop();
      const target = progress.get() >= 0.5 ? 1 : 0;
      progress.set(target);
      show(target === 1);
      plume.set(target);
    }
  }, [reduced, progress, plume, show]);

  useEffect(() => {
    if (!canvas.current || !scene.current) return;
    const element = canvas.current;
    let renderer: ReturnType<typeof createWelcomeRenderer> | undefined;
    let frame = 0;
    let disposed = false;
    function draw() {
      frame = 0;
      renderer?.render({
        progress: progress.get(),
        plume: plume.get(),
        leaving: leaving.current,
        force: reduced ? 0 : progress.getVelocity() * 0.1,
      });
    }
    function invalidate() {
      if (!disposed && !frame && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function initialize() {
      renderer?.dispose();
      try {
        renderer = createWelcomeRenderer(element, invalidate);
        setGraphics(true);
        invalidate();
      } catch {
        renderer = undefined;
        setGraphics(false);
      }
    }
    function lost(event: Event) {
      event.preventDefault();
      setGraphics(false);
    }
    initialize();
    const observer = new ResizeObserver(() => {
      if (drag.current) {
        drag.current = null;
        settle(progress.get() > 0.5 ? 1 : 0);
      }
      invalidate();
    });
    observer.observe(scene.current);
    const offProgress = progress.on("change", invalidate);
    const offPlume = plume.on("change", invalidate);
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", initialize);
    document.addEventListener("visibilitychange", invalidate);
    void document.fonts.ready.then(invalidate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer?.dispose();
      observer.disconnect();
      offProgress();
      offPlume();
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", initialize);
      document.removeEventListener("visibilitychange", invalidate);
    };
  }, [progress, plume, reduced, settle]);

  useEffect(
    () => () => {
      progress.stop();
      plume.stop();
    },
    [progress, plume],
  );

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    progress.stop();
    suppressClick.current = false;
    drag.current = {
      id: event.pointerId,
      y: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      start: progress.get(),
      velocity: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const travel = Math.max(1, (scene.current?.clientHeight ?? 500) * 0.43);
    const elapsed = Math.max(1, event.timeStamp - current.lastTime);
    current.velocity =
      ((-(event.clientY - current.lastY) / elapsed) * 1000) / travel;
    current.lastY = event.clientY;
    current.lastTime = event.timeStamp;
    current.moved ||= Math.abs(event.clientY - current.y) > 6;
    if (!current.moved || reduced) return;
    const raw = current.start - (event.clientY - current.y) / travel;
    progress.set(raw < 0 ? raw * 0.2 : raw > 1 ? 1 + (raw - 1) * 0.2 : raw);
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    suppressClick.current = current.moved || cancelled;
    if (current.moved || cancelled) {
      const velocity =
        cancelled || event.timeStamp - current.lastTime > 90
          ? 0
          : current.velocity;
      settle(
        progress.get() + velocity * welcomeMotion.anticipation > 0.5 ? 1 : 0,
        velocity,
      );
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function toggleScene() {
    settle(isOpen.current ? 0 : 1);
  }

  return (
    <main className={`missa-welcome ${styles.page}`} data-density="spacious">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" aria-label="Missa home" className={styles.brand}>
            {/* Existing first-party wordmark; intrinsic dimensions avoid layout shift. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/missa-wordmark-120.svg"
              alt="Missa"
              width={120}
              height={40}
            />
          </Link>
          <Link href="/opportunities" className={styles.skip}>
            Explore Missa <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <section className={styles.hero} aria-labelledby="welcome-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>A little space for possibility</p>
            <h1 id="welcome-title" className={`font-heading ${styles.title}`}>
              Make room for <em>what’s next.</em>
            </h1>
            <p className={styles.description}>
              The residency that gives you space. The journal that gets your
              work. The opportunity you didn’t know was out there.
            </p>
            <div className={styles.actions}>
              <Link
                href="/onboarding"
                className={`${buttonVariants()} ${styles.primary}`}
              >
                Find my next step <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <p className={styles.note}>
                For wherever you are in your creative practice.
              </p>
            </div>
          </div>
          <div className={styles.sceneWrap}>
            <div
              ref={scene}
              className={styles.scene}
              data-open={open}
              data-renderer={graphics ? "webgl" : "fallback"}
            >
              {!graphics && (
                <div aria-hidden="true">
                  <div className={styles.fallbackOrb} />
                  {open && (
                    <div className={styles.fallbackCards}>
                      <span>A new chapter</span>
                      <span>Room to grow</span>
                      <span>Somewhere new</span>
                    </div>
                  )}
                </div>
              )}
              <canvas
                ref={canvas}
                className={styles.canvas}
                aria-hidden="true"
                style={{ visibility: graphics ? "visible" : "hidden" }}
              />
              <div className={styles.sceneLabel} aria-hidden="true">
                <span>A world of possibilities</span>
                <span>Missa</span>
              </div>
              <motion.div
                className={styles.gateCopy}
                style={{ opacity: gateOpacity }}
                aria-hidden="true"
              >
                <p className="font-heading">
                  Something good
                  <br />
                  is taking shape.
                </p>
                <span>Give it a little nudge.</span>
              </motion.div>
              <motion.div
                className={styles.openCopy}
                hidden={!open}
                style={{ opacity: revealOpacity }}
                aria-hidden="true"
              >
                <p className="font-heading">There’s space for you.</p>
                <span>And for the work only you can make.</span>
              </motion.div>
              <Button
                variant="ghost"
                className={styles.sceneButton}
                aria-label={
                  open ? "Close the possibilities" : "Open the possibilities"
                }
                aria-expanded={open}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={(event) => finish(event)}
                onPointerCancel={(event) => finish(event, true)}
                onLostPointerCapture={(event) => finish(event, true)}
                onClick={(event) => {
                  if (event.detail !== 0 && suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  toggleScene();
                }}
              />
              <div className={styles.hint} aria-hidden="true">
                {open ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                {reduced
                  ? "Tap to explore"
                  : open
                    ? "Pull down to begin again"
                    : "Drag up. See what unfolds."}
              </div>
            </div>
            <div className={styles.sceneFooter}>
              <span>Made for the way you create.</span>
              <Button
                variant="ghost"
                aria-expanded={open}
                onClick={toggleScene}
              >
                {open ? "Begin again" : "Or, tap to open"}{" "}
                {open ? (
                  <ArrowDown aria-hidden="true" />
                ) : (
                  <ArrowUp aria-hidden="true" />
                )}
              </Button>
            </div>
            <span className="sr-only" role="status">
              {open
                ? "Possibilities revealed. Continue with Find my next step, or explore Missa."
                : "Open the illustration by dragging upward or using the open button."}
            </span>
          </div>
        </section>
        <div className={styles.values}>
          <div className={styles.value}>
            <Compass size={20} aria-hidden="true" />
            <div>
              <strong>Find your openings</strong>
              <p>Residencies, grants, journals, and open calls.</p>
            </div>
          </div>
          <div className={styles.value}>
            <Bookmark size={20} aria-hidden="true" />
            <div>
              <strong>Keep the good ones close</strong>
              <p>Save opportunities. Come back when you’re ready.</p>
            </div>
          </div>
          <div className={styles.value}>
            <Sprout size={20} aria-hidden="true" />
            <div>
              <strong>Build at your own pace</strong>
              <p>A home for your work and what comes next.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
