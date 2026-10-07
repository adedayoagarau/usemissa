"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PageEditors } from "@/components/missa/writing-pages";
import { readingOrder, type WritingDocument } from "@/lib/writing-document";
import {
  findInDoc,
  type SearchRange,
  type SearchState,
} from "@/lib/writing-search";
import type { Editor } from "@tiptap/react";

/**
 * Find and replace across every page and text box of the open piece, in
 * reading order. Matches are marked on the page; the one in hand is marked
 * more strongly. Enter finds the next, Shift+Enter the one before, Escape
 * closes the bar.
 */

type Match = { editor: Editor; range: SearchRange };

function searchStorage(editor: Editor): SearchState | undefined {
  return (editor.storage as unknown as Record<string, SearchState>)
    .writingSearch;
}

/** The editors of a document in reading order: pages in turn, a canvas's boxes top to bottom. */
function editorsInOrder(document: WritingDocument, editors: PageEditors) {
  return document.pages.flatMap((page) => {
    const keys =
      page.kind === "canvas"
        ? readingOrder(page.blocks ?? []).map(
            (block) => `${page.id}/${block.id}`,
          )
        : [page.id];
    return keys.flatMap((key) => {
      const editor = editors.get(key);
      return editor && !editor.isDestroyed ? [editor] : [];
    });
  });
}

function redraw(editor: Editor) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta("writingSearch", true));
}

export function WritingFind({
  document,
  editors,
  readOnly,
  onClose,
}: {
  document: WritingDocument;
  editors: PageEditors;
  readOnly: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  // The document changes with every replacement; matches are read afresh.
  const matches = useMemo<Match[]>(
    () =>
      editorsInOrder(document, editors).flatMap((editor) =>
        findInDoc(editor.state.doc, query, caseSensitive).map((range) => ({
          editor,
          range,
        })),
      ),
    // editors is a stable map; the document is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [document, query, caseSensitive],
  );
  const position = matches.length ? Math.min(index, matches.length - 1) : -1;
  const match = position >= 0 ? matches[position] : undefined;

  // Mark the matches on every page, and the one in hand more strongly.
  useEffect(() => {
    const all = editorsInOrder(document, editors);
    for (const editor of all) {
      const storage = searchStorage(editor);
      if (!storage) continue;
      storage.query = query;
      storage.caseSensitive = caseSensitive;
      storage.current = match?.editor === editor ? match.range : null;
      redraw(editor);
    }
  }, [document, editors, query, caseSensitive, match]);

  // Closing the bar clears the marks.
  useEffect(
    () => () => {
      for (const editor of editors.values()) {
        const storage = searchStorage(editor);
        if (!storage || !storage.query) continue;
        storage.query = "";
        storage.current = null;
        redraw(editor);
      }
    },
    [editors],
  );

  useEffect(() => {
    if (!match) return;
    try {
      const { node } = match.editor.view.domAtPos(match.range.from);
      const element = node instanceof Element ? node : node.parentElement;
      element?.scrollIntoView({ block: "center", behavior: "auto" });
    } catch {
      // A page still appearing is scrolled to next time.
    }
  }, [match]);

  function step(direction: 1 | -1) {
    if (!matches.length) return;
    setIndex((position + direction + matches.length) % matches.length);
  }

  function replaceOne() {
    if (!match || readOnly) return;
    const { editor, range } = match;
    editor.view.dispatch(
      editor.state.tr.insertText(replacement, range.from, range.to),
    );
  }

  function replaceAll() {
    if (!matches.length || readOnly) return;
    const count = matches.length;
    for (const editor of editorsInOrder(document, editors)) {
      const ranges = findInDoc(editor.state.doc, query, caseSensitive);
      if (!ranges.length) continue;
      let tr = editor.state.tr;
      // From the end, so earlier positions stay where they were.
      for (const range of [...ranges].reverse())
        tr = tr.insertText(replacement, range.from, range.to);
      editor.view.dispatch(tr);
    }
    // The button turns off once nothing is left to replace; focus stays in the bar.
    input.current?.focus();
    toast.success(
      `Replaced ${count.toLocaleString()} ${count === 1 ? "match" : "matches"}`,
    );
  }

  const status = !query
    ? ""
    : matches.length
      ? `${position + 1} of ${matches.length.toLocaleString()}`
      : "No matches";

  return (
    <search
      aria-label="Find and replace"
      className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-4 py-2 print:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex min-w-48 flex-1 items-center gap-1">
        <Label htmlFor={`${id}-find`} className="sr-only">
          Find
        </Label>
        <Input
          ref={input}
          id={`${id}-find`}
          placeholder="Find"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              step(event.shiftKey ? -1 : 1);
            }
          }}
        />
        <span
          role="status"
          className="min-w-20 text-center font-mono text-xs text-muted-foreground tabular-nums"
        >
          {status}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous match"
          disabled={!matches.length}
          onClick={() => step(-1)}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next match"
          disabled={!matches.length}
          onClick={() => step(1)}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </div>
      <div className="flex min-w-48 flex-1 items-center gap-1">
        <Label htmlFor={`${id}-replace`} className="sr-only">
          Replace with
        </Label>
        <Input
          id={`${id}-replace`}
          placeholder="Replace with"
          value={replacement}
          disabled={readOnly}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              replaceOne();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!match || readOnly}
          onClick={replaceOne}
        >
          Replace
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!matches.length || readOnly}
          onClick={replaceAll}
        >
          Replace all
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-case`}
          checked={caseSensitive}
          onCheckedChange={(checked) => {
            setCaseSensitive(checked === true);
            setIndex(0);
          }}
        />
        <Label htmlFor={`${id}-case`}>Match case</Label>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close find and replace"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </search>
  );
}
