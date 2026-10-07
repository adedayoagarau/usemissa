import { Extension } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Focus, as in iA Writer and Scrivener: everything but the paragraph or the
 * sentence in hand is dimmed. Sentences are found by the Unicode rules the
 * browser already has (Intl.Segmenter); nothing reads what the words mean.
 * Dimmed text keeps the muted text color, which stays readable (WCAG AA),
 * and the mode is one click to turn off.
 */

export type FocusMode = "off" | "paragraph" | "sentence";

let mode: FocusMode = "off";

/** Sets the focus mode for every page; editors redraw on their next change. */
export function setFocusMode(next: FocusMode) {
  mode = next;
}

// 5.55:1 on paper and 7.34:1 in the dark room; never printed.
export const FOCUS_DIM_CLASS = "text-muted-foreground print:text-foreground";

const focusKey = new PluginKey<boolean>("writingFocus");

let segmenter: Intl.Segmenter | null | undefined;

/** The sentence around `offset` in a paragraph's text, as [start, end). */
export function sentenceAt(text: string, offset: number): [number, number] {
  if (segmenter === undefined)
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "sentence" })
        : null;
  if (!segmenter) return [0, text.length];
  let found: [number, number] = [0, text.length];
  for (const part of segmenter.segment(text)) {
    const end = part.index + part.segment.length;
    found = [part.index, end];
    // A caret at the very end of a sentence still belongs to it.
    if (offset < end || (offset === end && end === text.length)) break;
  }
  return found;
}

function decorations(doc: ProseMirrorNode, head: number): DecorationSet {
  const found: Decoration[] = [];
  doc.forEach((node, offset) => {
    const from = offset;
    const to = offset + node.nodeSize;
    if (head < from || head > to) {
      found.push(Decoration.node(from, to, { class: FOCUS_DIM_CLASS }));
      return;
    }
    if (mode !== "sentence" || !node.isTextblock) return;
    // Within the paragraph in hand, dim what lies outside the sentence.
    const text = node.textContent;
    const [start, end] = sentenceAt(text, head - from - 1);
    const textStart = from + 1;
    if (start > 0)
      found.push(
        Decoration.inline(textStart, textStart + start, {
          class: FOCUS_DIM_CLASS,
        }),
      );
    if (end < text.length)
      found.push(
        Decoration.inline(textStart + end, to - 1, { class: FOCUS_DIM_CLASS }),
      );
  });
  return DecorationSet.create(doc, found);
}

export const FocusDim = Extension.create({
  name: "writingFocus",
  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key: focusKey,
        state: {
          init: () => false,
          apply: (tr, focused) => {
            const meta = tr.getMeta(focusKey) as boolean | undefined;
            return meta ?? focused;
          },
        },
        props: {
          decorations(state) {
            if (mode === "off" || !focusKey.getState(state))
              return DecorationSet.empty;
            return decorations(state.doc, state.selection.head);
          },
          handleDOMEvents: {
            focus: (view) => {
              view.dispatch(view.state.tr.setMeta(focusKey, true));
              return false;
            },
            blur: (view) => {
              view.dispatch(view.state.tr.setMeta(focusKey, false));
              return false;
            },
          },
        },
      }),
    ];
  },
});

/** Redraws the focus marks on an editor after the mode changes. */
export function redrawFocus(view: EditorView) {
  const focused = focusKey.getState(view.state) ?? false;
  view.dispatch(view.state.tr.setMeta(focusKey, focused));
}
