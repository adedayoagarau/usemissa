"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./opportunity-detail-sticky-actions.module.css";

export function OpportunityDetailStickyActions({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById("opportunity-summary-actions");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(
          !entry.isIntersecting && entry.boundingClientRect.bottom < 72,
        );
      },
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={styles.bar}
      hidden={!visible}
      role="region"
      aria-label="Opportunity actions"
    >
      <span className={styles.title}>{title}</span>
      <div className={styles.actions}>{children}</div>
    </div>
  );
}
