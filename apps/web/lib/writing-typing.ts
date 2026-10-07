import { Extension, InputRule, Mark, mergeAttributes } from "@tiptap/react";

/**
 * Typing in the writing room, as writers know it from Google Docs and Word:
 * superscript and subscript, clear formatting, the other strikethrough keys,
 * and smart quotes and dashes when the writer turns them on. Nothing here
 * reads the writing; each rule only reacts to the key just typed.
 */

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    superscript: { toggleSuperscript: () => ReturnType };
    subscript: { toggleSubscript: () => ReturnType };
  }
}

/** Raised text, as in footnote numbers and ordinals. Ctrl or ⌘ + . */
export const Superscript = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML() {
    return [{ tag: "sup" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSuperscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-.": () => this.editor.commands.toggleSuperscript() };
  },
});

/** Lowered text, as in chemical formulas. Ctrl or ⌘ + , */
export const Subscript = Mark.create({
  name: "subscript",
  excludes: "superscript",
  parseHTML() {
    return [{ tag: "sub" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSubscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-,": () => this.editor.commands.toggleSubscript() };
  },
});

/**
 * Ctrl or ⌘ + \ clears bold, italic and the rest from the selection, as in
 * Google Docs. Alt + Shift + 5 (Docs on Windows) and ⌘ + Shift + X (Docs on
 * a Mac) strike through, besides Ctrl or ⌘ + Shift + S.
 */
export const WriterKeys = Extension.create({
  name: "writerKeys",
  addKeyboardShortcuts() {
    return {
      "Mod-\\": () => this.editor.chain().unsetAllMarks().run(),
      "Alt-Shift-5": () => this.editor.commands.toggleStrike(),
      "Mod-Shift-x": () => this.editor.commands.toggleStrike(),
    };
  },
});

let smartPunctuation = false;

/** Turns smart quotes and dashes on or off for every page at once. */
export function setSmartPunctuation(on: boolean) {
  smartPunctuation = on;
}

/** Whether a quote typed after `before` opens a quotation. */
export function opensQuote(before: string): boolean {
  return before === "" || /[\s([{—–-]$/u.test(before);
}

function rule(
  find: RegExp,
  replace: (match: RegExpMatchArray, before: string) => string,
) {
  return new InputRule({
    find,
    handler: ({ state, range, match }) => {
      if (!smartPunctuation) return null;
      const $from = state.doc.resolve(range.from);
      const before = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 1),
        $from.parentOffset,
      );
      state.tr.insertText(replace(match, before), range.from, range.to);
    },
  });
}

/**
 * Smart quotes, an em dash for two hyphens and an ellipsis for three dots.
 * Off unless the writer turns them on, so a poem's straight quotes stay as
 * typed. Backspace straight after a change undoes it.
 */
export const SmartPunctuation = Extension.create({
  name: "smartPunctuation",
  addInputRules() {
    return [
      rule(/--$/u, () => "—"),
      rule(/\.\.\.$/u, () => "…"),
      rule(/"$/u, (_match, before) => (opensQuote(before) ? "“" : "”")),
      rule(/'$/u, (_match, before) => (opensQuote(before) ? "‘" : "’")),
    ];
  },
});
