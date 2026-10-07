import { Extension } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Find and replace in the writing room. Each page and text box is its own
 * editor; this extension marks the matches in one editor, and the room walks
 * the editors in reading order. A match never reaches across paragraphs.
 */

export type SearchRange = { from: number; to: number };

export type SearchState = {
  query: string;
  caseSensitive: boolean;
  /** The match the writer is on, in this editor; null when it is elsewhere. */
  current: SearchRange | null;
};

/** Every match of `query` in a document, in order. */
export function findInDoc(
  doc: ProseMirrorNode,
  query: string,
  caseSensitive: boolean,
): SearchRange[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const found: SearchRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // The paragraph's text with the document position of each character.
    let text = "";
    const positions: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText && child.text) {
        for (let index = 0; index < child.text.length; index += 1)
          positions.push(start + index);
        text += child.text;
      } else {
        positions.push(start);
        text += "￼";
      }
    });
    const haystack = caseSensitive ? text : text.toLocaleLowerCase();
    let at = haystack.indexOf(needle);
    while (at !== -1) {
      found.push({
        from: positions[at]!,
        to: positions[at + needle.length - 1]! + 1,
      });
      at = haystack.indexOf(needle, at + Math.max(1, needle.length));
    }
    return false;
  });
  return found;
}

const searchKey = new PluginKey<DecorationSet>("writingSearch");

export const SearchHighlight = Extension.create<
  Record<string, never>,
  SearchState
>({
  name: "writingSearch",
  addStorage() {
    return { query: "", caseSensitive: false, current: null };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: searchKey,
        props: {
          decorations(state) {
            if (!storage.query) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              findInDoc(state.doc, storage.query, storage.caseSensitive).map(
                (range) =>
                  Decoration.inline(range.from, range.to, {
                    class:
                      storage.current?.from === range.from &&
                      storage.current.to === range.to
                        ? "rounded-xs bg-warning text-foreground print:bg-transparent"
                        : "rounded-xs bg-warning-subtle print:bg-transparent",
                  }),
              ),
            );
          },
        },
      }),
    ];
  },
});
