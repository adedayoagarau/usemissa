"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { ChapterMark } from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import cx from "./work-media.module.css";

/**
 * Chapters of a film or recording, each a button that jumps to its time. The
 * one playing now is marked with `aria-current`, not colour alone.
 */
export function ChaptersList({
  marks,
  activeIndex = -1,
  onSelect,
  title = "Chapters",
  className,
}: {
  marks: readonly ChapterMark[];
  activeIndex?: number;
  onSelect: (mark: ChapterMark) => void;
  title?: string;
  className?: string;
}) {
  const heading = useId();
  if (marks.length === 0) return null;
  return (
    <nav aria-labelledby={heading} className={cn(cx.chapters, className)}>
      <p id={heading} className={cx.chaptersTitle}>
        {title}
      </p>
      <ol>
        {marks.map((mark, index) => (
          <li key={mark.id ?? `${mark.at}-${mark.title}`}>
            <Button
              type="button"
              variant="ghost"
              className={cx.chapter}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => onSelect(mark)}
            >
              <span className={cn(cx.chapterTime, "font-mono")}>{mark.at}</span>
              <span>{mark.title}</span>
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
