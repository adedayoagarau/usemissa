"use client";

import { WritingContextMenu } from "./writing-context-menu";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  WritingSelectionMenu,
  WritingFootnotes,
  type WritingSelectionAction,
} from "@/components/missa/writing-selection-menu";
import { writingTypeface } from "@/components/missa/writing-typefaces";
import {
  pageTextStyle,
  TabKeys,
  useViewMounted,
  viewMounted,
  WRITING_TEXT_CLASS,
  writingExtensions,
  type PageEditors,
} from "@/components/missa/writing-pages";
import { cn } from "@/lib/utils";
import {
  newCanvasBlock,
  PAGE_SIZES,
  readingOrder,
  type CanvasBlock,
  type FlowPage,
  type JsonNode,
  type WritingDocument,
} from "@/lib/writing-document";

/**
 * A canvas page: text boxes placed anywhere on the paper, each with its own
 * width and turn, for concrete and visual poetry. Boxes are placed in
 * millimetres, so the page prints exactly as it is set.
 *
 * A box moves by dragging its handle, or from the keyboard: with the handle
 * focused, arrow keys move it a millimetre (ten with Shift), Alt with left or
 * right arrow narrows or widens it, and [ and ] turn it. Double-clicking empty
 * paper adds a box there.
 */

const MM = 96 / 25.4;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type CanvasCallbacks = {
  onBlocks: (pageId: string, blocks: CanvasBlock[]) => void;
  onFocus: (pageId: string, editor: Editor) => void;
};

function CanvasBox({
  document,
  page,
  block,
  number,
  scale,
  spellcheck,
  readOnly,
  editors,
  callbacks,
  onChange,
  onRemove,
  onOrder,
  instructionsId,
  accessibleLabelPrefix,
  onSelectionAction,
  selectionTools = true,
  sectionLinkBase,
  sectionFolding = false,
}: {
  document: WritingDocument;
  page: FlowPage;
  block: CanvasBlock;
  number: number;
  scale: number;
  spellcheck: boolean;
  readOnly: boolean;
  editors: PageEditors;
  callbacks: { current: CanvasCallbacks };
  onChange: (change: Partial<CanvasBlock>) => void;
  onRemove: () => void;
  onOrder: (to: "front" | "back") => void;
  instructionsId?: string;
  accessibleLabelPrefix?: string;
  selectionTools?: boolean;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  onSelectionAction?: (action: WritingSelectionAction, editor: Editor) => void;
}) {
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor(
    {
      immediatelyRender: true,
      editable: !readOnly,
      content: block.content as JSONContent,
      parseOptions: { preserveWhitespace: "full" },
      extensions: [...writingExtensions(), TabKeys],
      editorProps: {
        attributes: {
          "aria-label": `${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Text box ${number} on page`,
          ...(instructionsId ? { "aria-describedby": instructionsId } : {}),
          "data-slot": "writing-box-text",
          class: WRITING_TEXT_CLASS,
        },
      },
      onUpdate: ({ editor: current }) =>
        changeRef.current({ content: current.getJSON() as JsonNode }),
      onFocus: ({ editor: current }) =>
        callbacks.current.onFocus(page.id, current),
    },
    [block.id],
  );
  const mounted = useViewMounted(editor);

  useEffect(() => {
    if (!editor || !mounted || !viewMounted(editor)) return;
    const key = `${page.id}/${block.id}`;
    editors.set(key, editor);
    // The first box also answers for the page, so the room can focus it.
    if (number === 1) editors.set(page.id, editor);
    return () => {
      if (editors.get(key) === editor) editors.delete(key);
      if (editors.get(page.id) === editor) editors.delete(page.id);
    };
  }, [editor, editors, mounted, page.id, block.id, number]);

  useEffect(() => {
    if (editor && mounted && viewMounted(editor)) editor.setEditable(!readOnly);
  }, [editor, mounted, readOnly]);

  useEffect(() => {
    if (editor && mounted && viewMounted(editor)) {
      editor.view.dom.setAttribute("spellcheck", String(spellcheck));
      editor.view.dom.setAttribute(
        "aria-label",
        `${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Text box ${number} on page`,
      );
    }
  }, [editor, mounted, spellcheck, accessibleLabelPrefix, number]);

  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (readOnly || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: block.x,
      top: block.y,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const start = drag.current;
    if (!start) return;
    const size = PAGE_SIZES[document.pageSize];
    onChange({
      x: clamp(
        Math.round(start.left + (event.clientX - start.x) / (MM * scale)),
        -block.width + 5,
        size.width - 5,
      ),
      y: clamp(
        Math.round(start.top + (event.clientY - start.y) / (MM * scale)),
        0,
        size.height - 5,
      ),
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (readOnly) return;
    const size = PAGE_SIZES[document.pageSize];
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, Partial<CanvasBlock>> = event.altKey
      ? {
          ArrowLeft: { width: clamp(block.width - 5, 10, size.width) },
          ArrowRight: { width: clamp(block.width + 5, 10, size.width) },
        }
      : {
          ArrowLeft: {
            x: clamp(block.x - step, -block.width + 5, size.width - 5),
          },
          ArrowRight: {
            x: clamp(block.x + step, -block.width + 5, size.width - 5),
          },
          ArrowUp: { y: clamp(block.y - step, 0, size.height - 5) },
          ArrowDown: { y: clamp(block.y + step, 0, size.height - 5) },
          "[": { rotation: (block.rotation - 15) % 360 },
          "]": { rotation: (block.rotation + 15) % 360 },
        };
    const change = moves[event.key];
    if (!change) return;
    event.preventDefault();
    onChange(change);
  }

  return (
    <div
      data-slot="writing-box"
      className="group/box absolute"
      style={{
        left: `${block.x}mm`,
        top: `${block.y}mm`,
        width: `${block.width}mm`,
        transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
        transformOrigin: "center",
      }}
    >
      {readOnly ? null : (
        <div className="absolute -top-9 left-0 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within/box:opacity-100 group-hover/box:opacity-100 motion-reduce:transition-none print:hidden">
          <Button
            variant="outline"
            size="icon-xs"
            aria-label={`Move text box ${number}. Arrow keys move it, Shift for 10 mm; Alt with left or right changes its width; [ and ] turn it.`}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift Alt [ ]"
            className="cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKeyDown}
          >
            <GripVertical aria-hidden="true" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="xs"
                  aria-label={`Options for text box ${number}`}
                />
              }
            >
              Box {number}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() =>
                    onChange({ rotation: (block.rotation - 15) % 360 })
                  }
                >
                  Turn left 15°
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onChange({ rotation: (block.rotation + 15) % 360 })
                  }
                >
                  Turn right 15°
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!block.rotation}
                  onClick={() => onChange({ rotation: 0 })}
                >
                  Straighten
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() =>
                    onChange({
                      width: clamp(
                        block.width + 10,
                        10,
                        PAGE_SIZES[document.pageSize].width,
                      ),
                    })
                  }
                >
                  Wider
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={block.width <= 10}
                  onClick={() =>
                    onChange({ width: clamp(block.width - 10, 10, 500) })
                  }
                >
                  Narrower
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOrder("front")}>
                  Bring to front
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOrder("back")}>
                  Send to back
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                Delete text box
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div
        className={cn(
          "rounded-sm ring-ring/40 group-focus-within/box:ring-1 group-hover/box:ring-1 print:ring-0",
          writingTypeface(page.format.typeface ?? document.typeface).className,
        )}
        style={pageTextStyle(document, page)}
      >
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
            showNotes={number === 1}
          />
        ) : null}
      </div>
    </div>
  );
}

export function CanvasSheet({
  document,
  page,
  index,
  scale,
  spellcheck,
  readOnly,
  editors,
  callbacks,
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
  scale: number;
  spellcheck: boolean;
  readOnly: boolean;
  editors: PageEditors;
  callbacks: { current: CanvasCallbacks };
  instructionsId?: string;
  accessibleLabelPrefix?: string;
  selectionTools?: boolean;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  onSelectionAction?: (action: WritingSelectionAction, editor: Editor) => void;
}) {
  const size = PAGE_SIZES[document.pageSize];
  const blocks = page.blocks;
  const latest = useRef(blocks ?? []);
  useEffect(() => {
    latest.current = blocks ?? [];
  }, [blocks]);

  function update(next: CanvasBlock[]) {
    latest.current = next;
    callbacks.current.onBlocks(page.id, next);
  }

  function addAt(event: MouseEvent<HTMLDivElement>) {
    if (readOnly || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) / (MM * scale));
    const y = Math.round((event.clientY - rect.top) / (MM * scale));
    const block = newCanvasBlock(x, y, Math.min(80, size.width - x - 5));
    update([...latest.current, block]);
    requestAnimationFrame(() =>
      editors.get(`${page.id}/${block.id}`)?.commands.focus("start"),
    );
  }

  // Boxes are numbered in reading order, top to bottom, left to right.
  const numbers = new Map(
    readingOrder(blocks ?? []).map((block, position) => [
      block.id,
      position + 1,
    ]),
  );

  return (
    <section
      aria-label={`${accessibleLabelPrefix ? `${accessibleLabelPrefix}, ` : ""}Page ${index + 1}, free canvas`}
      className="flex w-full flex-col items-center gap-2"
    >
      <div
        data-slot="writing-page"
        data-canvas="true"
        className="relative overflow-visible bg-background text-foreground shadow-sm ring-1 ring-border print:overflow-hidden print:shadow-none print:ring-0"
        style={{
          width: `${size.width}mm`,
          height: `${size.height}mm`,
          zoom: scale,
        }}
        onDoubleClick={addAt}
      >
        {(blocks ?? []).map((block) => (
          <CanvasBox
            key={block.id}
            document={document}
            page={page}
            block={block}
            number={numbers.get(block.id) ?? 1}
            scale={scale}
            spellcheck={spellcheck}
            readOnly={readOnly}
            editors={editors}
            callbacks={callbacks}
            instructionsId={instructionsId}
            accessibleLabelPrefix={accessibleLabelPrefix}
            onSelectionAction={onSelectionAction}
            selectionTools={selectionTools}
            sectionLinkBase={sectionLinkBase}
            sectionFolding={sectionFolding}
            onChange={(change) => {
              // Positions are kept to a tenth of a millimetre.
              const tenth = (value: number | undefined) =>
                value === undefined ? undefined : Math.round(value * 10) / 10;
              const rounded = {
                ...change,
                ...(change.x !== undefined ? { x: tenth(change.x) } : {}),
                ...(change.y !== undefined ? { y: tenth(change.y) } : {}),
                ...(change.width !== undefined
                  ? { width: tenth(change.width) }
                  : {}),
              };
              update(
                latest.current.map((item) =>
                  item.id === block.id ? { ...item, ...rounded } : item,
                ),
              );
            }}
            onRemove={() =>
              update(latest.current.filter((item) => item.id !== block.id))
            }
            onOrder={(to) => {
              const rest = latest.current.filter(
                (item) => item.id !== block.id,
              );
              const moved = latest.current.find(
                (item) => item.id === block.id,
              )!;
              update(to === "front" ? [...rest, moved] : [moved, ...rest]);
            }}
          />
        ))}
      </div>
      {!readOnly ? (
        <p className="text-sm text-muted-foreground print:hidden">
          {blocks?.length
            ? "Double-click or double-tap the paper to add a text box. Drag a box by its handle, or focus the handle and use the arrow keys."
            : "Double-click or double-tap the paper to add a text box, or use Add a text box in More."}
        </p>
      ) : null}
    </section>
  );
}
