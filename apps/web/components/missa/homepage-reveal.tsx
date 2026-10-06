"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * One scroll-reveal for the homepage's lower sections: a short rise on the
 * enter curve, once, when the block is a fifth of the way into view. Reduced
 * motion renders the block in place.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Anything already above the viewport counts as seen, so a jump past a
      // block (an anchor, scroll restoration) never leaves it hidden.
      viewport={{ once: true, amount: 0.2, margin: "10000px 0px 0px 0px" }}
      transition={{
        duration: reduced ? 0 : 0.55,
        delay: reduced ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
