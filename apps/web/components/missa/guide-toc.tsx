"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import styles from "./guide-article.module.css";

export interface GuideTocHeading {
  id: string;
  text: string;
}

/** Marks the section the reader is in, so the rail shows their place. */
function useActiveHeading(headings: GuideTocHeading[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          visible.set(entry.target.id, entry.isIntersecting);
        const firstVisible = targets.find((target) => visible.get(target.id));
        if (firstVisible) {
          setActive(firstVisible.id);
          return;
        }
        // Between headings: the last one above the viewport is current.
        const above = targets.filter(
          (target) => target.getBoundingClientRect().top < 0,
        );
        setActive(above.at(-1)?.id ?? null);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [headings]);
  return active;
}

function TocList({
  headings,
  active,
}: {
  headings: GuideTocHeading[];
  active: string | null;
}) {
  return (
    <ol className={styles.tocList}>
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            aria-current={active === heading.id ? "location" : undefined}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** "On this page": a sticky rail on wide screens. */
export function GuideTocRail({ headings }: { headings: GuideTocHeading[] }) {
  const active = useActiveHeading(headings);
  return (
    <nav aria-labelledby="guide-toc-heading">
      <p id="guide-toc-heading" className={styles.tocHeading}>
        On this page
      </p>
      <TocList headings={headings} active={active} />
    </nav>
  );
}

/** "On this page": a closed disclosure above the article on narrow screens. */
export function GuideTocDisclosure({
  headings,
}: {
  headings: GuideTocHeading[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={styles.tocMobile}
    >
      <nav aria-label="On this page">
        <CollapsibleTrigger className={styles.tocMobileTrigger}>
          On this page
          <ChevronDown aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div onClick={() => setOpen(false)}>
            <TocList headings={headings} active={null} />
          </div>
        </CollapsibleContent>
      </nav>
    </Collapsible>
  );
}
