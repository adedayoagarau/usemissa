"use client";

import { WritingContextMenu } from "./writing-context-menu";

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  EditorContent,
  Extension,
  useEditor,
  wrappingInputRule,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { BulletList } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  WritingSelectionMenu,
  WritingFootnotes,
  type WritingSelectionAction,
} from "@/components/missa/writing-selection-menu";
import { writingTypeface } from "@/components/missa/writing-typefaces";
import { cn } from "@/lib/utils";
import { FocusDim } from "@/lib/writing-focus";
import { SearchHighlight } from "@/lib/writing-search";
import { WritingInsertion, WritingDeletion, WritingTrackedChanges } from "@/lib/writing-tracked-changes";
import { writingRichExtensions } from "@/lib/writing-rich";
import {
  SmartPunctuation,
  Subscript,
  Superscript,
  WriterKeys,
} from "@/lib/writing-typing";
import {
  CanvasSheet,
  type CanvasCallbacks,
} from "@/components/missa/writing-canvas";
import {
  PAGE_SIZES,
  emptyPage,
  pageStart,
  sectionPages,
  type FlowPage,
  type JsonNode,
  type WritingDocument,
} from "@/lib/writing-document";

/**
 * The pages a creator writes on in the writing room. Each page is its own
 * editor with its own format (alignment, spacing, margins, typeface), so a
 * poem can set every page differently. Every space, tab and line break is kept
 * as typed.
 *
 * Page view draws real printed pages at their paper size; draft view drops
 * the paper and keeps the format, for small screens.
 *
 * In page view, text flows between pages as it is written: paragraphs that
 * run past a page's bottom margin move to the top of a page that continues
 * it, and come back when there is room again. A page the writer adds is never
 * merged into another, so a page set apart for a poem stays apart.
 *
 * As in Google Docs and Word, Ctrl or ⌘ + Enter breaks the page: the text after
 * the caret starts a new page in the same section, with the same format. A
 * section break starts a page with a format of its own. Backspace at the start
 * of a page removes the break before it.
 */

const MM = 96 / 25.4;

export type PagesView = "page" | "draft";

export type PageEditors = Map<string, Editor>;

export type PageBreakKind = "page" | "section";

/** Commands the room gives its menus: breaks and joins at the page in hand. */
export type PageCommands = {
  /** Breaks the page at the caret, or adds a page after `pageId` when it has none. */
  breakPage: (pageId: string | null, kind: PageBreakKind) => void;
  /**
   * Removes the break before a page, so its text flows on from the page
   * before. A section break joins only when `adoptFormat` is set or the
   * formats already match. Returns whether it joined.
   */
  joinPage: (pageId: string, adoptFormat: boolean) => boolean;
};

type PageCallbacks = {
  onContent: (pageId: string, content: JsonNode) => void;
  onFocus: (pageId: string, editor: Editor) => void;
  onExit: (pageId: string, direction: "up" | "down") => boolean;
  onRemoveEmpty: (pageId: string) => boolean;
  onBreak: (pageId: string) => boolean;
  onJoin: (pageId: string) => boolean;
};

/**
 * Tab writes a tab, or nests a list item. Escape, then Tab, leaves the page
 * for the next control. Ctrl or ⌘ + Enter breaks the page.
 */
const PageKeys = Extension.create<{
  pageId: string;
  callbacks: { current: PageCallbacks };
}>({
  name: "pageKeys",
  addOptions() {
    return {
      pageId: "",
      // Not a plain object: Tiptap copies plain-object options deeply, which
      // would freeze the room's callbacks at the moment the page was made.
      callbacks: null as unknown as { current: PageCallbacks },
    };
  },
  addStorage() {
    return { leaving: false };
  },
  onUpdate() {
    this.storage.leaving = false;
  },
  addKeyboardShortcuts() {
    return {
      Escape: () => {
        this.storage.leaving = true;
        return false;
      },
      Tab: ({ editor }) => {
        if (this.storage.leaving) {
          this.storage.leaving = false;
          return false;
        }
        if (editor.isActive("table")) return editor.commands.goToNextCell();
        if (editor.can().sinkListItem("listItem"))
          return editor.commands.sinkListItem("listItem");
        editor.view.dispatch(editor.state.tr.insertText("\t"));
        return true;
      },
      "Mod-Enter": () =>
        this.options.callbacks.current.onBreak(this.options.pageId),
      "Shift-Tab": ({ editor }) =>
        editor.isActive("table") ? editor.commands.goToPreviousCell() : false,
      ArrowDown: ({ editor }) => {
        const { selection, doc } = editor.state;
        if (
          !selection.empty ||
          selection.$head.depth < 1 ||
          selection.$head.after(1) !== doc.content.size
        )
          return false;
        if (!editor.view.endOfTextblock("down")) return false;
        return this.options.callbacks.current.onExit(
          this.options.pageId,
          "down",
        );
      },
      ArrowUp: ({ editor }) => {
        const { selection } = editor.state;
        if (
          !selection.empty ||
          selection.$head.depth < 1 ||
          selection.$head.before(1) !== 0
        )
          return false;
        if (!editor.view.endOfTextblock("up")) return false;
        return this.options.callbacks.current.onExit(this.options.pageId, "up");
      },
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty || selection.from > 1) return false;
        if (editor.isEmpty)
          return this.options.callbacks.current.onRemoveEmpty(
            this.options.pageId,
          );
        // At the very start of the page's first paragraph: remove the break.
        if (selection.$from.depth !== 1 || selection.$from.parentOffset !== 0)
          return false;
        return this.options.callbacks.current.onJoin(this.options.pageId);
      },
    };
  },
});

/** The editor setup every page and text box shares. */
/**
 * "- ", "+ " or "* " starts a list only at the start of a line, so a dash
 * after a tab or spaces in a poem stays as typed.
 */
const LineStartBulletList = BulletList.extend({
  addInputRules() {
    return [wrappingInputRule({ find: /^([-+*])\s$/, type: this.type })];
  },
});

export function writingExtensions() {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      link: false,
      bulletList: false,
      heading: { levels: [1, 2] },
    }),
    LineStartBulletList,
    ...writingRichExtensions(),
    WritingInsertion, WritingDeletion, WritingTrackedChanges,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    SearchHighlight,
    Superscript,
    Subscript,
    WriterKeys,
    SmartPunctuation,
    FocusDim,
  ];
}

function noteSpace(editor: Editor): number {
  const notes = editor.view.dom
    .closest("[data-slot=writing-page]")
    ?.querySelector<HTMLElement>("[data-slot=writing-footnotes]");
  return notes ? notes.getBoundingClientRect().height + 16 : 0;
}

export const WRITING_TEXT_CLASS =
  "outline-none [&_p]:m-0 [&_p]:min-h-[1lh] [&_h1]:m-0 [&_h1]:text-[1.6em] [&_h1]:font-medium [&_h2]:m-0 [&_h2]:text-[1.25em] [&_h2]:font-medium [&_blockquote]:ms-[2em] [&_blockquote]:italic [&_hr]:my-[1lh] [&_hr]:border-border [&_ul]:ps-[1.5em] [&_ul]:list-disc [&_ol]:ps-[1.5em] [&_ol]:list-decimal [&_a]:text-primary [&_a]:underline [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-start [&_img]:max-w-full [&_img]:h-auto [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figure]:my-4 [&_mark]:bg-warning-subtle [&_mark]:text-foreground [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ps-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]>label]:shrink-0 [&_li[data-type=taskItem]>div]:min-w-0 [&_.selectedCell]:bg-accent [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-ring";

/** Tab writes a tab in a text box too; Escape, then Tab, leaves it. */
export const TabKeys = Extension.create({
  name: "tabKeys",
  addStorage() {
    return { leaving: false };
  },
  onUpdate() {
    this.storage.leaving = false;
  },
  addKeyboardShortcuts() {
    return {
      Escape: () => {
        this.storage.leaving = true;
        return false;
      },
      Tab: ({ editor }) => {
        if (this.storage.leaving) {
          this.storage.leaving = false;
          return false;
        }
        if (editor.isActive("table")) return editor.commands.goToNextCell();
        editor.view.dispatch(editor.state.tr.insertText("\t"));
        return true;
      },
      "Shift-Tab": ({ editor }) =>
        editor.isActive("table") ? editor.commands.goToPreviousCell() : false,
    };
  },
});

export function viewMounted(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false;
  try {
    return Boolean(editor.view.dom);
  } catch {
    return false;
  }
}

/** Whether the editor's view is in the page; nothing may touch the view before. */
export function useViewMounted(editor: Editor | null): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (!editor) return () => undefined;
      editor.on("mount", notify);
      editor.on("unmount", notify);
      editor.on("destroy", notify);
      return () => {
        editor.off("mount", notify);
        editor.off("unmount", notify);
        editor.off("destroy", notify);
      };
    },
    () => viewMounted(editor),
    () => false,
  );
}

export function pageTextStyle(
  document: WritingDocument,
  page: FlowPage,
): CSSProperties {
  const format = page.format;
  return {
    fontSize: `${format.textSize ?? document.textSize}pt`,
    lineHeight: format.lineHeight,
    letterSpacing: `${format.letterSpacing}em`,
    textAlign: format.align,
    tabSize: 4,
  };
}

function PageSheet({
  document,
  page,
  index,
  view,
  scale,
  spellcheck,
  readOnly,
  callbacks,
  editors,
  markers,
  instructionsId,
  accessibleLabelPrefix,
  onSelectionAction,
  selectionTools = true,
  sectionLinkBase,
  sectionFolding = false,
}: {
  document: WritingDocument;
  page: FlowPage;
  index: number;
  view: PagesView;
  scale: number;
  spellcheck: boolean;
  readOnly: boolean;
  callbacks: { current: PageCallbacks };
  editors: PageEditors;
  markers: Map<string, HTMLDivElement>;
  instructionsId: string;
  accessibleLabelPrefix?: string;
  selectionTools?: boolean;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  onSelectionAction?: (action: WritingSelectionAction, editor: Editor) => void;
}) {
  const editor = useEditor(
    {
      immediatelyRender: true,
      editable: !readOnly,
      content: page.content as JSONContent,
      parseOptions: { preserveWhitespace: "full" },
      extensions: [
        ...writingExtensions(),
        PageKeys.configure({ pageId: page.id, callbacks }),
      ],
      editorProps: {
        attributes: {
          "aria-label": `${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Page ${index + 1}`,
          "aria-describedby": instructionsId,
          "data-slot": "writing-page-text",
          class: WRITING_TEXT_CLASS,
        },
      },
      onUpdate: ({ editor: current }) =>
        callbacks.current.onContent(page.id, current.getJSON() as JsonNode),
      onFocus: ({ editor: current }) =>
        callbacks.current.onFocus(page.id, current),
    },
    [page.id],
  );
  const mounted = useViewMounted(editor);

  useEffect(() => {
    if (!editor || !mounted || !viewMounted(editor)) return;
    editors.set(page.id, editor);
    return () => {
      if (editors.get(page.id) === editor) editors.delete(page.id);
    };
  }, [editor, editors, mounted, page.id]);

  useEffect(() => {
    if (editor && mounted && viewMounted(editor)) editor.setEditable(!readOnly);
  }, [editor, mounted, readOnly]);

  useEffect(() => {
    if (editor && mounted && viewMounted(editor)) {
      editor.view.dom.setAttribute("spellcheck", String(spellcheck));
      editor.view.dom.setAttribute(
        "aria-label",
        `${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Page ${index + 1}`,
      );
    }
  }, [editor, mounted, spellcheck, accessibleLabelPrefix, index]);

  // Text flows on to the next page by itself. Only a first paragraph taller
  // than the whole page can't flow, and is marked so the writer can break it.
  const marker = useRef<HTMLDivElement>(null);
  const [tooTall, setTooTall] = useState(false);
  useEffect(() => {
    if (!editor || !mounted || view !== "page" || !viewMounted(editor)) return;
    const measure = () => {
      const bottom = marker.current?.getBoundingClientRect().top;
      const limit =
        bottom === undefined ? undefined : bottom - noteSpace(editor);
      if (limit === undefined || !viewMounted(editor)) return;
      const first = editor.view.dom.firstElementChild;
      setTooTall(
        Boolean(first && first.getBoundingClientRect().bottom > limit + 1),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(editor.view.dom);
    return () => observer.disconnect();
  }, [editor, mounted, view, document.pageSize, page.format]);

  const size = PAGE_SIZES[document.pageSize];
  const { margins } = page.format;
  const face = writingTypeface(page.format.typeface ?? document.typeface);
  const paged = view === "page";
  const overflowing = paged && tooTall;

  return (
    <section
      aria-label={`${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Page ${index + 1}`}
      className="flex w-full flex-col items-center gap-2"
    >
      <div
        data-slot="writing-page"
        className={cn(
          "relative bg-background text-foreground",
          paged
            ? "shadow-sm ring-1 ring-border print:shadow-none print:ring-0"
            : "w-full max-w-2xl",
        )}
        style={
          paged
            ? {
                width: `${size.width}mm`,
                minHeight: `${size.height}mm`,
                padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                zoom: scale,
              }
            : { padding: "2rem 1rem" }
        }
      >
        <div className={face.className} style={pageTextStyle(document, page)}>
          <WritingContextMenu
            editor={mounted ? editor : null}
            enabled={!readOnly && selectionTools}
            sectionLinkBase={sectionLinkBase}
            sectionFolding={sectionFolding}
          >
            <EditorContent editor={editor} />
          </WritingContextMenu>
          {mounted && !readOnly && selectionTools ? (
            <WritingSelectionMenu
              editor={editor}
              onSelectionAction={onSelectionAction}
              sectionLinkBase={sectionLinkBase}
              sectionFolding={sectionFolding}
              writingDocument={document}
            />
          ) : null}
          {mounted ? (
            <WritingFootnotes
              editor={editor}
              document={document}
              pageId={page.id}
            />
          ) : null}
        </div>
        {paged ? (
          <div
            ref={(element) => {
              if (element) markers.set(page.id, element);
              else if (markers.get(page.id) === marker.current)
                markers.delete(page.id);
              marker.current = element;
            }}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 border-t border-dashed print:hidden",
              overflowing ? "border-warning" : "border-transparent",
            )}
            style={{ top: `${size.height - margins.bottom}mm` }}
          />
        ) : null}
      </div>
      {overflowing && !readOnly ? (
        <p className="max-w-prose text-center text-sm text-muted-foreground print:hidden">
          The first paragraph on page {index + 1} is longer than the page. Press
          Enter where you’d like it to break, and the rest moves to the next
          page.
        </p>
      ) : null}
    </section>
  );
}

export function WritingPages({
  document,
  onChange,
  view,
  spellcheck,
  readOnly,
  editors,
  onActiveEditor,
  commandsRef,
  onJoinRefused,
  before,
  accessibleLabelPrefix,
  onSelectionAction,
  selectionTools = true,
  sectionLinkBase,
  sectionFolding = false,
}: {
  before?: ReactNode;
  /** Distinguishes regions when several pieces appear in one manuscript. */
  accessibleLabelPrefix?: string;
  selectionTools?: boolean;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  onSelectionAction?: (action: WritingSelectionAction, editor: Editor) => void;
  document: WritingDocument;
  onChange: (document: WritingDocument) => void;
  view: PagesView;
  spellcheck: boolean;
  readOnly: boolean;
  editors: PageEditors;
  onActiveEditor: (pageId: string, editor: Editor) => void;
  /** Filled with the break and join commands for the room's menus. */
  commandsRef?: { current: PageCommands | null };
  /** Backspace met a section break whose page has a format of its own. */
  onJoinRefused?: () => void;
}) {
  const instructionsId = useId();
  const latest = useRef(document);
  const desk = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    latest.current = document;
  }, [document]);

  const canvasCallbacks = useRef<CanvasCallbacks>({
    onBlocks: () => undefined,
    onFocus: () => undefined,
  });
  useEffect(() => {
    canvasCallbacks.current = {
      onBlocks: (pageId, blocks) => {
        const current = latest.current;
        const next = {
          ...current,
          pages: current.pages.map((page) =>
            page.id === pageId ? { ...page, blocks } : page,
          ),
        };
        latest.current = next;
        onChange(next);
      },
      onFocus: onActiveEditor,
    };
  }, [onActiveEditor, onChange]);

  const callbacks = useRef<PageCallbacks>({
    onContent: () => undefined,
    onFocus: () => undefined,
    onExit: () => false,
    onRemoveEmpty: () => false,
    onBreak: () => false,
    onJoin: () => false,
  });

  function update(pages: FlowPage[]) {
    const next = { ...latest.current, pages };
    latest.current = next;
    onChange(next);
  }

  /** Focuses a page once it is on screen. */
  function focusWhenReady(pageId: string, where: "start" | "end") {
    let tries = 0;
    const attempt = () => {
      const editor = editors.get(pageId);
      if (editor && viewMounted(editor)) editor.commands.focus(where);
      else if (tries++ < 30) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  }

  function breakPage(pageId: string | null, kind: PageBreakKind) {
    const pages = latest.current.pages;
    const found = pageId ? pages.findIndex((page) => page.id === pageId) : -1;
    const index = found === -1 ? pages.length - 1 : found;
    const page = pages[index]!;
    const editor = page.kind === "flow" ? editors.get(page.id) : undefined;
    let tail: JsonNode[] = [];
    let at = index + 1;
    if (editor && viewMounted(editor) && found !== -1) {
      // The text after the caret moves to the new page. The move stays out of
      // undo: undoing half of it would leave the text on both pages.
      const tr = editor.state.tr.setMeta("addToHistory", false);
      if (!tr.selection.empty) tr.deleteSelection();
      const pos = tr.selection.from;
      tail = (tr.doc.cut(pos).content.toJSON() ?? []) as JsonNode[];
      tr.delete(pos, tr.doc.content.size);
      editor.view.dispatch(tr);
    } else {
      // No caret on the page: the new page goes after the text flowing from it.
      while (pages[at]?.continues) at += 1;
    }
    const current = latest.current.pages;
    const created: FlowPage = {
      ...emptyPage(page.format),
      ...(tail.length ? { content: { type: "doc", content: tail } } : {}),
      ...(kind === "page" && page.kind === "flow" ? { pageBreak: true } : {}),
    };
    const after = [...current];
    after.splice(at, 0, created);
    update(after);
    focusWhenReady(created.id, "start");
  }

  function joinPage(pageId: string, adoptFormat: boolean): boolean {
    const pages = latest.current.pages;
    const index = pages.findIndex((page) => page.id === pageId);
    const start = pageStart(pages, index);
    const page = pages[index];
    const previous = pages[index - 1];
    if (
      !page ||
      !previous ||
      page.kind !== "flow" ||
      previous.kind !== "flow" ||
      start === "first" ||
      start === "flow"
    )
      return false;
    const sameFormat =
      JSON.stringify(page.format) === JSON.stringify(previous.format);
    if (start === "section-break" && !sameFormat && !adoptFormat) return false;
    // The joined pages take the format of the section they join.
    const section = new Set(
      sectionPages(pages, index).map((at) => pages[at]!.id),
    );
    update(
      pages.map((item) =>
        item.id === pageId
          ? {
              ...item,
              continues: true,
              pageBreak: false,
              format: previous.format,
            }
          : section.has(item.id)
            ? { ...item, format: previous.format }
            : item,
      ),
    );
    return true;
  }

  useEffect(() => {
    if (!commandsRef) return;
    commandsRef.current = { breakPage, joinPage };
    return () => {
      commandsRef.current = null;
    };
  });
  useEffect(() => {
    callbacks.current = {
      onContent: (pageId, content) => {
        const current = latest.current;
        const next = {
          ...current,
          pages: current.pages.map((page) =>
            page.id === pageId ? { ...page, content } : page,
          ),
        };
        latest.current = next;
        onChange(next);
      },
      onFocus: onActiveEditor,
      onExit: (pageId, direction) => {
        const pages = latest.current.pages;
        const index = pages.findIndex((page) => page.id === pageId);
        const target = pages[direction === "down" ? index + 1 : index - 1];
        const editor = target ? editors.get(target.id) : undefined;
        if (!editor) return false;
        editor.commands.focus(direction === "down" ? "start" : "end");
        return true;
      },
      onRemoveEmpty: (pageId) => {
        const pages = latest.current.pages;
        const index = pages.findIndex((page) => page.id === pageId);
        if (index < 1) return false;
        const previous = pages[index - 1]!;
        const next = {
          ...latest.current,
          pages: pages.filter((page) => page.id !== pageId),
        };
        latest.current = next;
        onChange(next);
        editors.get(previous.id)?.commands.focus("end");
        return true;
      },
      onBreak: (pageId) => {
        breakPage(pageId, "page");
        return true;
      },
      onJoin: (pageId) => {
        if (joinPage(pageId, false)) return true;
        const pages = latest.current.pages;
        const index = pages.findIndex((page) => page.id === pageId);
        if (pageStart(pages, index) === "section-break") onJoinRefused?.();
        return false;
      },
    };
  });

  useEffect(() => {
    const element = desk.current;
    // Canvas pages keep their paper in both views, so the scale is kept in both.
    if (!element) return;
    const size = PAGE_SIZES[document.pageSize];
    const resize = () => {
      const available = element.clientWidth - 32;
      // Fit the saved paper even when enlarged browser text leaves a narrow desk.
      // A scale floor could make the paper wider than its own scroll container.
      setScale(Math.min(1.25, Math.max(1, available) / (size.width * MM)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [document.pageSize, view]);

  const [markers] = useState(() => new Map<string, HTMLDivElement>());
  // A page that just sent text on is not refilled at once, so a paragraph
  // on the edge never bounces between two pages.
  const pushedAt = useRef(new Map<string, number>());
  const frame = useRef(0);

  /**
   * Moves the paragraphs from `fromBlock` on to the top of the page that
   * continues this one. When there is no such page yet, it adds an empty one
   * first and leaves the text in place; the move happens once that page is on
   * screen, in one step with the caret, so no keystroke lands on the wrong page.
   */
  function push(index: number, fromBlock: number): "moved" | "waiting" {
    const pages = latest.current.pages;
    const page = pages[index]!;
    const next = pages[index + 1];
    const nextEditor = next?.continues ? editors.get(next.id) : undefined;
    if (!next?.continues) {
      const created: FlowPage = { ...emptyPage(page.format), continues: true };
      const after = [...pages];
      after.splice(index + 1, 0, created);
      pushedAt.current.set(created.id, performance.now());
      const updated = { ...latest.current, pages: after };
      latest.current = updated;
      onChange(updated);
      return "waiting";
    }
    if (!nextEditor || !viewMounted(nextEditor)) return "waiting";
    const editor = editors.get(page.id)!;
    const state = editor.state;
    let pos = 0;
    state.doc.forEach((_node, offset, child) => {
      if (child === fromBlock) pos = offset;
    });
    const moved = (state.doc.content.cut(pos).toJSON() ?? []) as JsonNode[];
    const caret =
      editor.isFocused && state.selection.from >= pos
        ? state.selection.from - pos
        : null;
    pushedAt.current.set(page.id, performance.now());
    // A page made for this move holds one empty paragraph; the text replaces it.
    const replaceEmpty = nextEditor.isEmpty;
    editor.view.dispatch(
      state.tr
        .delete(pos, state.doc.content.size)
        .setMeta("addToHistory", false),
    );
    nextEditor
      .chain()
      .setMeta("addToHistory", false)
      .insertContentAt(
        replaceEmpty ? { from: 0, to: nextEditor.state.doc.content.size } : 0,
        moved as JSONContent[],
        { updateSelection: false },
      )
      .run();
    if (caret !== null) nextEditor.commands.focus(caret);
    return "moved";
  }

  /** Brings the first paragraph of the continuing page back to the end of this page. */
  function pull(index: number) {
    const pages = latest.current.pages;
    const page = pages[index]!;
    const next = pages[index + 1]!;
    const editor = editors.get(page.id)!;
    const nextEditor = editors.get(next.id)!;
    const nextState = nextEditor.state;
    const node = nextState.doc.child(0);
    const end = editor.state.doc.content.size;
    const caret =
      nextEditor.isFocused && nextState.selection.from <= node.nodeSize
        ? nextState.selection.from
        : null;
    const emptyPageLeft = nextState.doc.childCount === 1;
    if (!(emptyPageLeft && nextEditor.isEmpty)) {
      editor
        .chain()
        .setMeta("addToHistory", false)
        .insertContentAt(end, node.toJSON() as JSONContent, {
          updateSelection: false,
        })
        .run();
    }
    if (emptyPageLeft) {
      const current = latest.current;
      const updated = {
        ...current,
        pages: current.pages.filter((item) => item.id !== next.id),
      };
      latest.current = updated;
      onChange(updated);
    } else {
      nextEditor.view.dispatch(
        nextState.tr.delete(0, node.nodeSize).setMeta("addToHistory", false),
      );
    }
    if (caret !== null) editor.commands.focus(end + caret);
    else if (emptyPageLeft && nextEditor.isFocused)
      editor.commands.focus("end");
  }

  /**
   * One step of flowing text between pages: "moved" when it moved text, so the
   * caller can look again; "waiting" when a page is still appearing; "done".
   */
  function flowStep(): "moved" | "waiting" | "done" {
    const pages = latest.current.pages;
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]!;
      // Text never flows into or out of a canvas page.
      if (page.kind === "canvas") continue;
      const editor = editors.get(page.id);
      const marker = markers.get(page.id);
      // A page still appearing is measured on the next frame.
      if (!editor || !marker || !viewMounted(editor)) return "waiting";
      const limit = marker.getBoundingClientRect().top - noteSpace(editor);
      const blocks = [...editor.view.dom.children];
      const over = blocks.findIndex(
        (block) => block.getBoundingClientRect().bottom > limit + 1,
      );
      if (over > 0) return push(index, over);
      const next = pages[index + 1];
      if (over !== -1 || !next?.continues) continue;
      const nextEditor = editors.get(next.id);
      if (!nextEditor || !viewMounted(nextEditor)) return "waiting";
      // An empty page the text flowed onto goes, unless the writer is on it.
      const fresh =
        performance.now() - (pushedAt.current.get(next.id) ?? 0) < 1000;
      if (nextEditor.isEmpty && !nextEditor.isFocused && !fresh) {
        pull(index);
        return "moved";
      }
      if (performance.now() - (pushedAt.current.get(page.id) ?? 0) < 400)
        continue;
      const first = nextEditor.view.dom.firstElementChild;
      const last = blocks.at(-1);
      if (!first || !last) continue;
      const style = getComputedStyle(first);
      const need =
        first.getBoundingClientRect().height +
        (parseFloat(style.marginTop) + parseFloat(style.marginBottom)) * scale;
      const room = limit - last.getBoundingClientRect().bottom;
      if (need + 4 <= room) {
        pull(index);
        return "moved";
      }
    }
    return "done";
  }

  // Text flows after every change, and when the paper, format or zoom change.
  useEffect(() => {
    if (view !== "page" || readOnly) return;
    cancelAnimationFrame(frame.current);
    let frames = 0;
    const run = () => {
      // Each step changes the page at once, so the next one measures afresh.
      for (let moves = 0; moves < 100; moves += 1) {
        const step = flowStep();
        if (step === "done") return;
        if (step === "waiting") {
          if (frames++ < 30) frame.current = requestAnimationFrame(run);
          return;
        }
      }
    };
    frame.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame.current);
    // flowStep reads the latest pages through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document, view, readOnly, scale]);

  return (
    <div
      ref={desk}
      className={cn(
        "flex min-h-full w-full min-w-0 flex-col items-center gap-8 px-4 py-8 print:gap-0 print:p-0",
        view === "page" ? "bg-muted/40 print:bg-transparent" : "",
      )}
    >
      {before}
      <p id={instructionsId} className="sr-only">
        Tab writes a tab. To leave the page, press Escape, then Tab.
      </p>
      {document.pages.map((page, index) => {
        const start = pageStart(document.pages, index);
        const label =
          start === "page-break"
            ? "Page break"
            : start === "section-break"
              ? "Section break"
              : null;
        const sheet =
          page.kind === "canvas" ? (
            <CanvasSheet
              key={page.id}
              document={document}
              page={page}
              index={index}
              scale={scale}
              spellcheck={spellcheck}
              readOnly={readOnly}
              editors={editors}
              callbacks={canvasCallbacks}
              instructionsId={instructionsId}
              accessibleLabelPrefix={accessibleLabelPrefix}
              onSelectionAction={onSelectionAction}
              selectionTools={selectionTools}
              sectionLinkBase={sectionLinkBase}
              sectionFolding={sectionFolding}
            />
          ) : (
            <PageSheet
              key={page.id}
              document={document}
              page={page}
              index={index}
              view={view}
              scale={scale}
              spellcheck={spellcheck}
              readOnly={readOnly}
              callbacks={callbacks}
              editors={editors}
              markers={markers}
              instructionsId={instructionsId}
              accessibleLabelPrefix={accessibleLabelPrefix}
              onSelectionAction={onSelectionAction}
              selectionTools={selectionTools}
              sectionLinkBase={sectionLinkBase}
              sectionFolding={sectionFolding}
            />
          );
        // One wrapper per page, so a label coming or going never remakes the page.
        return (
          <Fragment key={page.id}>
            {label ? (
              <p
                data-slot="writing-break"
                className="-my-5 text-xs text-muted-foreground print:hidden"
              >
                {label}
              </p>
            ) : null}
            {sheet}
          </Fragment>
        );
      })}
    </div>
  );
}
