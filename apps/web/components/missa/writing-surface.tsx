import type * as React from "react";
import {
  writingTypeface,
  type WritingTypefaceId,
} from "@/components/missa/writing-typefaces";
import { cn } from "@/lib/utils";

/** Text sizes a writer can choose, in CSS pixels at 100% zoom. */
export const WRITING_TEXT_SIZES = [16, 18, 20, 22, 24, 28] as const;
export type WritingTextSize = (typeof WRITING_TEXT_SIZES)[number];

/**
 * The page a creator writes on in the writing room: a borderless, full-height
 * plain-text surface in the writer's chosen typeface (writing-typefaces.ts)
 * and size.
 *
 * Textarea is the form control for long text inside a form. This surface is
 * the document itself, so it has no border, box or ring; the caret marks
 * focus. It stays a native textarea so typing, input methods, undo, selection
 * and assistive technology behave exactly as the platform does.
 */
export function WritingSurface({
  typeface,
  size,
  className,
  style,
  ...props
}: React.ComponentProps<"textarea"> & {
  typeface: WritingTypefaceId;
  size: WritingTextSize;
}) {
  return (
    <textarea
      data-slot="writing-surface"
      data-typeface={typeface}
      className={cn(
        // Fills its container and scrolls; the text keeps a readable measure (42rem) centred on the page.
        "block h-full w-full resize-none [scrollbar-gutter:stable] overflow-y-auto bg-transparent px-[max(1rem,calc((100%-42rem)/2))] py-10 leading-relaxed text-foreground caret-primary outline-none placeholder:text-muted-foreground read-only:cursor-default sm:py-16",
        writingTypeface(typeface).className,
        className,
      )}
      // rem keeps the writer's size proportional to browser text settings and zoom.
      style={{ ...style, fontSize: `${size / 16}rem` }}
      {...props}
    />
  );
}
