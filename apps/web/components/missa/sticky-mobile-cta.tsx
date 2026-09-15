"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import styles from "./sticky-mobile-cta.module.css";

/**
 * Keeps a marketing page's primary action reachable on phones once the in-page
 * call to action has scrolled away.
 *
 * The action renders only on small viewports and only while it is genuinely
 * useful, so it never duplicates an action that is already visible and never
 * leaves a hidden focusable link in the tab order.
 */
export function StickyMobileCta({
  anchorId,
  href,
  children,
}: {
  /** id of the in-page primary action this bar mirrors. */
  anchorId: string;
  href: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  if (!visible) return null;

  const label = (
    <>
      {children}
      <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
    </>
  );
  const isExternal = /^(?:[a-z]+:|https?:)/i.test(href);

  return (
    <div className={styles.bar}>
      {isExternal ? (
        <a className={styles.action} href={href}>
          {label}
        </a>
      ) : (
        <Link className={styles.action} href={href}>
          {label}
        </Link>
      )}
    </div>
  );
}
