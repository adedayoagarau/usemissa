"use client";

import {
  useEffect,
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
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { writingTypeface } from "@/components/missa/writing-typefaces";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PAGE_SIZES,
  emptyPage,
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
 */

const MM = 96 / 25.4;

export type PagesView = "page" | "draft";

export type PageEditors = Map<string, Editor>;

type PageCallbacks = {
  onContent: (pageId: string, content: JsonNode) => void;
  onFocus: (pageId: string, editor: Editor) => void;
  onExit: (pageId: string, direction: "up" | "down") => boolean;
  onRemoveEmpty: (pageId: string) => boolean;
};

/** Tab writes a tab. Escape, then Tab, leaves the page for the next control. */
const PageKeys = Extension.create<{
  pageId: string;
  callbacks: { current: PageCallbacks };
}>({
  name: "pageKeys",
  addOptions() {
    return {
      pageId: "",
      callbacks: { current: null as unknown as PageCallbacks },
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
        editor.view.dispatch(editor.state.tr.insertText("\t"));
        return true;
      },
      ArrowDown: ({ editor }) => {
        const { selection, doc } = editor.state;
        if (!selection.empty || selection.$head.after(1) !== doc.content.size)
          return false;
        if (!editor.view.endOfTextblock("down")) return false;
        return this.options.callbacks.current.onExit(
          this.options.pageId,
          "down",
        );
      },
      ArrowUp: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty || selection.$head.before(1) !== 0) return false;
        if (!editor.view.endOfTextblock("up")) return false;
        return this.options.callbacks.current.onExit(this.options.pageId, "up");
      },
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty || selection.from > 1 || !editor.isEmpty)
          return false;
        return this.options.callbacks.current.onRemoveEmpty(
          this.options.pageId,
        );
      },
    };
  },
});

function viewMounted(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false;
  try {
    return Boolean(editor.view.dom);
  } catch {
    return false;
  }
}

/** Whether the editor's view is in the page; nothing may touch the view before. */
function useViewMounted(editor: Editor | null): boolean {
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

function pageTextStyle(
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
  autofocus,
  callbacks,
  editors,
  onMoveOverflow,
}: {
  document: WritingDocument;
  page: FlowPage;
  index: number;
  view: PagesView;
  scale: number;
  spellcheck: boolean;
  readOnly: boolean;
  autofocus: boolean;
  callbacks: { current: PageCallbacks };
  editors: PageEditors;
  onMoveOverflow: (pageId: string, fromBlock: number) => void;
}) {
  const editor = useEditor(
    {
      immediatelyRender: true,
      editable: !readOnly,
      autofocus: autofocus ? "end" : false,
      content: page.content as JSONContent,
      parseOptions: { preserveWhitespace: "full" },
      extensions: [
        StarterKit.configure({
          code: false,
          codeBlock: false,
          link: false,
          heading: { levels: [1, 2] },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
        PageKeys.configure({ pageId: page.id, callbacks }),
      ],
      editorProps: {
        attributes: {
          "aria-label": `Page ${index + 1}`,
          "aria-describedby": "writing-page-keys",
          "data-slot": "writing-page-text",
          class:
            "outline-none [&_p]:m-0 [&_p]:min-h-[1lh] [&_h1]:m-0 [&_h1]:text-[1.6em] [&_h1]:font-medium [&_h2]:m-0 [&_h2]:text-[1.25em] [&_h2]:font-medium [&_blockquote]:ms-[2em] [&_blockquote]:italic [&_hr]:my-[1lh] [&_hr]:border-border [&_ul]:ps-[1.5em] [&_ul]:list-disc [&_ol]:ps-[1.5em] [&_ol]:list-decimal",
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
    if (editor && mounted && viewMounted(editor))
      editor.view.dom.setAttribute("spellcheck", String(spellcheck));
  }, [editor, mounted, spellcheck]);

  // In page view, find the first block that runs past the bottom margin.
  const marker = useRef<HTMLDivElement>(null);
  const [overflowFrom, setOverflowFrom] = useState<number | null>(null);
  useEffect(() => {
    if (!editor || !mounted || view !== "page" || !viewMounted(editor)) return;
    const measure = () => {
      const limit = marker.current?.getBoundingClientRect().top;
      if (limit === undefined) return;
      if (!viewMounted(editor)) return;
      const blocks = [...editor.view.dom.children];
      const index = blocks.findIndex(
        (block) => block.getBoundingClientRect().bottom > limit + 1,
      );
      setOverflowFrom(index === -1 ? null : index);
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
  const overflowing = paged && overflowFrom !== null;

  return (
    <section
      aria-label={`Page ${index + 1}`}
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
          <EditorContent editor={editor} />
        </div>
        {paged ? (
          <div
            ref={marker}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 border-t border-dashed print:hidden",
              overflowing ? "border-warning" : "border-transparent",
            )}
            style={{ top: `${size.height - margins.bottom}mm` }}
          />
        ) : null}
      </div>
      {overflowing ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground print:hidden">
          <span>Page {index + 1} runs past its bottom margin.</span>
          {overflowFrom ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMoveOverflow(page.id, overflowFrom)}
            >
              Move the rest to a new page
            </Button>
          ) : null}
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
  before,
}: {
  before?: ReactNode;
  document: WritingDocument;
  onChange: (document: WritingDocument) => void;
  view: PagesView;
  spellcheck: boolean;
  readOnly: boolean;
  editors: PageEditors;
  onActiveEditor: (pageId: string, editor: Editor) => void;
}) {
  const latest = useRef(document);
  const desk = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [focusPage, setFocusPage] = useState<string | null>(null);

  useEffect(() => {
    latest.current = document;
  }, [document]);

  const callbacks = useRef<PageCallbacks>({
    onContent: () => undefined,
    onFocus: () => undefined,
    onExit: () => false,
    onRemoveEmpty: () => false,
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
    };
  }, [editors, onActiveEditor, onChange]);

  useEffect(() => {
    const element = desk.current;
    if (!element || view !== "page") return;
    const size = PAGE_SIZES[document.pageSize];
    const resize = () => {
      const available = element.clientWidth - 32;
      setScale(Math.max(0.3, Math.min(1.25, available / (size.width * MM))));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [document.pageSize, view]);

  function moveOverflow(pageId: string, fromBlock: number) {
    const editor = editors.get(pageId);
    const current = latest.current;
    const index = current.pages.findIndex((page) => page.id === pageId);
    if (!editor || index === -1) return;
    const blocks = (editor.getJSON().content ?? []) as JsonNode[];
    const kept = blocks.slice(0, fromBlock);
    const moved = blocks.slice(fromBlock);
    if (!kept.length || !moved.length) return;
    const page = current.pages[index]!;
    const nextPage = current.pages[index + 1];
    const pages = [...current.pages];
    pages[index] = { ...page, content: { type: "doc", content: kept } };
    if (nextPage && editors.get(nextPage.id)) {
      // Moved text goes to the top of the next page.
      const nextEditor = editors.get(nextPage.id)!;
      nextEditor.commands.insertContentAt(0, moved as JSONContent[]);
      pages[index + 1] = {
        ...nextPage,
        content: nextEditor.getJSON() as JsonNode,
      };
    } else {
      const created = emptyPage(page.format);
      created.content = { type: "doc", content: moved };
      pages.splice(index + 1, 0, created);
      setFocusPage(created.id);
    }
    editor.commands.setContent({ type: "doc", content: kept } as JSONContent, {
      emitUpdate: false,
    });
    const next = { ...current, pages };
    latest.current = next;
    onChange(next);
  }

  return (
    <div
      ref={desk}
      className={cn(
        "flex min-h-full flex-col items-center gap-8 px-4 py-8 print:gap-0 print:p-0",
        view === "page" ? "bg-muted/40 print:bg-transparent" : "",
      )}
    >
      {before}
      <p id="writing-page-keys" className="sr-only">
        Tab writes a tab. To leave the page, press Escape, then Tab.
      </p>
      {document.pages.map((page, index) => (
        <PageSheet
          key={page.id}
          document={document}
          page={page}
          index={index}
          view={view}
          scale={scale}
          spellcheck={spellcheck}
          readOnly={readOnly}
          autofocus={page.id === focusPage}
          callbacks={callbacks}
          editors={editors}
          onMoveOverflow={moveOverflow}
        />
      ))}
    </div>
  );
}
