"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailFields } from "@/components/missa/detail-fields";
import { readingTime, textCounts } from "@/lib/writing";

/**
 * Word count, as in Google Docs (Ctrl or ⌘ + Shift + C): pages, words,
 * characters with and without spaces, and reading time. With text selected,
 * each count shows the selection's share of the whole.
 */

export function WritingWordCount({
  open,
  onOpenChange,
  text,
  pages,
  selection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The whole piece, every page in order. */
  text: string;
  pages: number;
  /** The selected text, when there is a selection. */
  selection: string | null;
}) {
  const whole = textCounts(text);
  const part = selection ? textCounts(selection) : null;
  const value = (key: keyof typeof whole) =>
    part
      ? `${part[key].toLocaleString()} of ${whole[key].toLocaleString()}`
      : whole[key].toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Word count</DialogTitle>
          <DialogDescription>
            {part
              ? "The selected text, then the whole piece."
              : "The whole piece, every page."}
          </DialogDescription>
        </DialogHeader>
        <DetailFields
          fields={[
            ["Pages", pages.toLocaleString()],
            ["Words", value("words")],
            ["Characters", value("characters")],
            ["Without spaces", value("charactersWithoutSpaces")],
            ["Reading time", readingTime(whole.words)],
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
