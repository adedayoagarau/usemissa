"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { blobatar } from "blobatar";
import { pickNotFoundPoem } from "@/lib/not-found-poetry";
import styles from "@/app/not-found.module.css";

/** A literary epigraph, picked deterministically from the broken path. */
export function NotFoundEpigraph() {
  const pathname = usePathname() ?? "/";
  const poem = pickNotFoundPoem(pathname);

  return (
    <blockquote className={styles.epigraph}>
      {poem.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <cite>{poem.attribution}</cite>
    </blockquote>
  );
}

const REACT_RADIUS = 380;
const MAX_EYE = 9;
const SPRING = 0.14;
const DAMPING = 0.72;

/**
 * A blobatar for the broken path, still except for its eyes: they track the
 * cursor within range on desktop, or follow a finger directly on touch, and
 * spring back to center on release. The body never moves — only the eyes.
 *
 * blobatar's React component renders as a plain <img> in its default (non-
 * animated) mode, which has no addressable internal DOM for us to animate.
 * We call the underlying blobatar() function instead, which returns raw SVG
 * markup, and drive the eyes (the last <g> in that markup) ourselves.
 */
export function NotFoundBlob() {
  const pathname = usePathname() ?? "/";
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgMarkup = blobatar(pathname, { size: 132 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = wrap?.querySelector("svg");
    const groups = svg?.querySelectorAll(":scope > g");
    const eyes = groups && groups.length > 0 ? groups[groups.length - 1] : null;
    if (!wrap || !eyes) return;

    const eyePos = { x: 0, y: 0 };
    const eyeVel = { x: 0, y: 0 };
    const eyeTarget = { x: 0, y: 0 };
    let dragging = false;
    let raf = 0;

    function updateEyeTargetFromPoint(clientX: number, clientY: number) {
      const rect = wrap!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > REACT_RADIUS) {
        eyeTarget.x = 0;
        eyeTarget.y = 0;
        return;
      }
      const pull = 1 - dist / REACT_RADIUS;
      const nx = dist === 0 ? 0 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      eyeTarget.x = nx * MAX_EYE * pull;
      eyeTarget.y = ny * MAX_EYE * pull;
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse" || dragging) return;
      updateEyeTargetFromPoint(event.clientX, event.clientY);
    }

    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      dragging = true;
      updateEyeTargetFromPoint(touch.clientX, touch.clientY);
    }

    function onTouchMove(event: TouchEvent) {
      if (!dragging) return;
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;
      updateEyeTargetFromPoint(touch.clientX, touch.clientY);
    }

    function onTouchEnd() {
      dragging = false;
      eyeTarget.x = 0;
      eyeTarget.y = 0;
    }

    function tick() {
      eyeVel.x += (eyeTarget.x - eyePos.x) * SPRING;
      eyeVel.y += (eyeTarget.y - eyePos.y) * SPRING;
      eyeVel.x *= DAMPING;
      eyeVel.y *= DAMPING;
      eyePos.x += eyeVel.x;
      eyePos.y += eyeVel.y;
      eyes!.setAttribute("transform", `translate(${eyePos.x.toFixed(2)} ${eyePos.y.toFixed(2)})`);
      raf = requestAnimationFrame(tick);
    }

    document.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });
    wrap.addEventListener("touchcancel", onTouchEnd, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("touchend", onTouchEnd);
      wrap.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(raf);
    };
  }, [pathname, svgMarkup]);

  return (
    <div
      ref={wrapRef}
      className={styles.blob}
      aria-hidden="true"
      style={{ touchAction: "none" }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
