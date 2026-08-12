'use client';

import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import styles from './waitlist.module.css';

export function WaitlistArtwork() {
  const artworkRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const revealTarget = useMotionValue(0);
  const reveal = useSpring(revealTarget, { stiffness: 72, damping: 24, mass: 0.82 });
  const doorScaleX = useTransform(reveal, [0, 1], [1, 0.18]);
  const doorSkewY = useTransform(reveal, [0, 1], [0, -5]);
  const doorX = useTransform(reveal, [0, 1], [0, -7]);
  const lightOpacity = useTransform(reveal, [0.08, 0.52], [0, 1]);
  const glowOpacity = useTransform(reveal, [0.18, 0.82], [0, 0.72]);
  const spillOpacity = useTransform(reveal, [0.24, 0.9], [0, 0.34]);
  const spillScaleY = useTransform(reveal, [0, 1], [0.2, 1]);

  useEffect(() => {
    const element = artworkRef.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const artworkElement = element;
    const touchFirst = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 560px)').matches;

    if (touchFirst) {
      const mobileReveal = animate(revealTarget, [0.12, 0.88, 0.26], {
        duration: 4.6,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.46, 1],
        repeat: Infinity,
        repeatDelay: 1.2,
      });

      return () => mobileReveal.stop();
    }

    function scrollReveal() {
      return Math.min(0.42, window.scrollY / 620);
    }

    function handlePointerMove(event: PointerEvent) {
      const bounds = artworkElement.getBoundingClientRect();
      const doorXPosition = bounds.left + bounds.width * 0.515;
      const doorYPosition = bounds.top + bounds.height * 0.535;
      const distance = Math.hypot(event.clientX - doorXPosition, event.clientY - doorYPosition);
      const radius = Math.max(180, Math.min(bounds.width, bounds.height) * 0.48);
      revealTarget.set(Math.max(scrollReveal(), Math.max(0, Math.min(1, 1 - distance / radius))));
    }

    function resetPointer() {
      revealTarget.set(scrollReveal());
    }

    function handleScroll() {
      revealTarget.set(Math.max(revealTarget.get(), scrollReveal()));
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointer, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [revealTarget]);

  return (
    <div ref={artworkRef} className={styles.artwork} aria-hidden="true">
      <svg className={styles.architecture} viewBox="0 0 720 680" role="presentation">
        <defs>
          <filter id="waitlist-door-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <motion.g
          className={styles.cloudFoam}
          initial={false}
          animate={reduceMotion ? undefined : { x: [0, 4, 0, -3, 0], y: [0, -2, 1, -1, 0], opacity: [0.72, 0.88, 0.78, 0.9, 0.72] }}
          transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
        >
          <circle cx="490" cy="82" r="26" />
          <circle cx="530" cy="58" r="39" />
          <circle cx="575" cy="76" r="33" />
          <circle cx="612" cy="66" r="22" />
          <circle cx="552" cy="96" r="38" />
          <circle cx="603" cy="100" r="27" />
          <circle cx="636" cy="93" r="14" />
          <circle cx="475" cy="106" r="13" />
          <path d="M462 108C492 116 618 118 650 104" />
        </motion.g>

        <g transform="translate(72 102)">
          <motion.g
            className={`${styles.flyingBird} ${styles.birdOne}`}
            initial={reduceMotion ? false : { x: 0, y: 0, opacity: 0, rotate: -4, scale: 0.94 }}
            animate={reduceMotion
              ? { x: 250, y: -10, opacity: 0.58, rotate: -1, scale: 0.98 }
              : { x: [0, 90, 205, 320, 420], y: [0, -4, -10, -15, -18], opacity: [0, 1, 1, 0.9, 0], rotate: [-4, 1, -2, 1, 0], scale: [0.94, 0.97, 1, 1, 1] }}
            transition={{ duration: 7.2, ease: [0.4, 0, 0.2, 1], times: [0, 0.16, 0.46, 0.76, 1], repeat: Infinity, repeatDelay: 2 }}
          >
            <motion.path
              className={styles.birdMark}
              initial={false}
              d="M-16 0Q-8-10 0 0Q8-10 16 0"
              animate={reduceMotion ? undefined : { d: ['M-16 0Q-8-10 0 0Q8-10 16 0', 'M-16 0Q-8 6 0 0Q8 6 16 0', 'M-16 0Q-8-10 0 0Q8-10 16 0'] }}
              transition={{ duration: 0.52, ease: 'easeInOut', repeat: Infinity }}
            />
          </motion.g>
        </g>

        <g transform="translate(118 72) scale(.84)">
          <motion.g
            className={`${styles.flyingBird} ${styles.birdTwo}`}
            initial={reduceMotion ? false : { x: 0, y: 0, opacity: 0, rotate: 3 }}
            animate={reduceMotion
              ? { x: 210, y: 4, opacity: 0.5, rotate: 1 }
              : { x: [0, 82, 190, 300, 390], y: [0, 3, -3, -10, -14], opacity: [0, 0.92, 1, 0.86, 0], rotate: [3, -2, 2, -1, 0] }}
            transition={{ duration: 7.8, delay: 0.8, ease: [0.4, 0, 0.2, 1], times: [0, 0.18, 0.48, 0.78, 1], repeat: Infinity, repeatDelay: 2.2 }}
          >
            <motion.path
              className={styles.birdMark}
              initial={false}
              d="M-16 0Q-8-10 0 0Q8-10 16 0"
              animate={reduceMotion ? undefined : { d: ['M-16 0Q-8-10 0 0Q8-10 16 0', 'M-16 0Q-8 6 0 0Q8 6 16 0', 'M-16 0Q-8-10 0 0Q8-10 16 0'] }}
              transition={{ duration: 0.61, delay: 0.1, ease: 'easeInOut', repeat: Infinity }}
            />
          </motion.g>
        </g>

        <g transform="translate(48 45) scale(.72)">
          <motion.g
            className={`${styles.flyingBird} ${styles.birdThree}`}
            initial={reduceMotion ? false : { x: 0, y: 0, opacity: 0, rotate: -2 }}
            animate={reduceMotion
              ? { x: 300, y: 5, opacity: 0.46, rotate: 0 }
              : { x: [0, 105, 220, 335, 430], y: [0, -2, 4, -4, -8], opacity: [0, 0.88, 1, 0.82, 0], rotate: [-2, 2, -1, 2, 0] }}
            transition={{ duration: 8.4, delay: 1.6, ease: [0.4, 0, 0.2, 1], times: [0, 0.16, 0.46, 0.78, 1], repeat: Infinity, repeatDelay: 2.4 }}
          >
            <motion.path
              className={styles.birdMark}
              initial={false}
              d="M-16 0Q-8-10 0 0Q8-10 16 0"
              animate={reduceMotion ? undefined : { d: ['M-16 0Q-8-10 0 0Q8-10 16 0', 'M-16 0Q-8 6 0 0Q8 6 16 0', 'M-16 0Q-8-10 0 0Q8-10 16 0'] }}
              transition={{ duration: 0.69, delay: 0.2, ease: 'easeInOut', repeat: Infinity }}
            />
          </motion.g>
        </g>

        <g className={styles.architectureLines}>
          <path d="M54 520H666" />
          <path d="M370 118V660" strokeDasharray="2 6" />
          <path d="M325 520L205 660" />
          <path d="M415 520L525 660" />
          <path d="M135 520V356H280V520" />
          <path d="M82 520V416H135" />
          <path d="M280 520V164H398V520" />
          <path d="M398 520V286H512V520" />
          <path d="M512 520V358H612V520" />
          <path d="M300 520V236H336" strokeDasharray="2 5" />
          <path d="M470 520V208" strokeDasharray="2 5" />
          <path d="M152 456C188 446 218 428 250 392" />
          <path d="M152 470C190 460 224 438 258 400" />
          <path d="M152 484C194 472 228 450 264 410" />
          <path d="M152 498C196 486 232 462 268 422" />
          <path d="M302 328C338 314 360 292 384 260" />
          <path d="M302 348C340 332 364 306 388 274" />
          <path d="M302 368C342 350 368 324 392 290" />
          <path d="M302 388C344 368 372 340 396 306" />
        </g>

        <motion.path
          className={styles.doorGlow}
          d="M322 520V334A48 48 0 0 1 418 334V520Z"
          fill="#fff5d8"
          filter="url(#waitlist-door-glow)"
          style={{ opacity: glowOpacity }}
        />
        <motion.path
          className={styles.doorLight}
          d="M322 520V334A48 48 0 0 1 418 334V520Z"
          fill="#fff9e9"
          style={{ opacity: lightOpacity }}
        />
        <motion.path
          className={styles.lightSpill}
          d="M322 516H418L520 660H210Z"
          fill="#f6d98c"
          style={{ opacity: spillOpacity, scaleY: spillScaleY }}
        />

        <path className={styles.doorFrame} d="M316 522V332A54 54 0 0 1 424 332V522" />
        <path className={styles.thresholdLine} d="M306 522H434M316 534H424" />
        <motion.path
          className={styles.svgDoor}
          d="M322 520V334A48 48 0 0 1 418 334V520Z"
          fill="#473050"
          style={{ scaleX: doorScaleX, skewY: doorSkewY, x: doorX }}
        />
        <path className={styles.hingeLine} d="M322 350V504" />
      </svg>
    </div>
  );
}
