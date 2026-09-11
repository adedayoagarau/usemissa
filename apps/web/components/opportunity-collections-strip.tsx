"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import styles from "./opportunity-collections-strip.module.css";

export function OpportunityCollectionsStrip({ items, initialCount = 6 }: { items: readonly { href: string; label: string }[]; initialCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  return (
    <nav className={styles.strip} aria-label="Opportunity collections">
      <div className={styles.track} ref={track} id={id}>
        {(expanded ? items : items.slice(0, initialCount)).map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </div>
      {items.length > initialCount ? <Button variant="ghost" className={styles.reveal} aria-expanded={expanded} aria-controls={id} onClick={() => {
        setExpanded(!expanded);
        requestAnimationFrame(() => {
          const node = track.current;
          if (!node) return;
          node.scrollTo({ left: expanded ? 0 : node.scrollWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        });
      }}>
        {expanded ? <ChevronLeft aria-hidden="true" /> : null}
        {expanded ? "See less" : "See more"}
        {!expanded ? <ChevronRight aria-hidden="true" /> : null}
      </Button> : null}
    </nav>
  );
}
