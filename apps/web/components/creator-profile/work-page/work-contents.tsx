"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import styles from "./work-page.module.css";

export type ContentsItem = { anchor: string; number: number; title: string };

/**
 * The last part whose top has reached the upper quarter of the screen, so the
 * list can mark where you are. Parts side by side count as one place: the first
 * of them is marked.
 */
function useCurrentPart(anchors: string[]) {
  const [current, setCurrent] = useState(anchors[0]);
  const key = anchors.join("|");
  useEffect(() => {
    const nodes = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.25;
      let best = nodes[0];
      let bestTop = Number.NEGATIVE_INFINITY;
      for (const node of nodes) {
        const top = node.getBoundingClientRect().top;
        if (top > line) break;
        if (Math.abs(top - bestTop) >= 4) best = node;
        bestTop = top;
      }
      setCurrent(best.id);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [key]);
  return current;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Every part in order, as links to its place on the page. Beside the parts on a
 * wide screen it stays in view; on a narrow one it folds into a single
 * disclosure so a sixty-part work doesn't push the work down the page.
 */
export function WorkContents({ items }: { items: ContentsItem[] }) {
  const current = useCurrentPart(items.map((item) => item.anchor));
  const [open, setOpen] = useState(false);
  const list = (onNavigate?: () => void) => (
    <ol className={styles.contentsList}>
      {items.map((item) => (
        <li key={item.anchor}>
          <a
            href={`#${item.anchor}`}
            aria-current={current === item.anchor ? "location" : undefined}
            onClick={onNavigate}
          >
            <span className={`${styles.contentsNumber} font-mono`}>
              {pad(item.number)}
            </span>
            <span>{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <nav aria-label="Contents" className={styles.contentsWide}>
        <h2 className={styles.contentsTitle}>Contents</h2>
        {list()}
      </nav>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={styles.contentsNarrow}
      >
        <CollapsibleTrigger
          render={
            <Button
              variant="outline"
              className={`${styles.contentsTrigger} w-full`}
            />
          }
        >
          <span>
            Contents <span className="font-mono">{items.length}</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <nav aria-label="Contents">{list(() => setOpen(false))}</nav>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
