"use client";

import { useState, useRef, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuGroup,
} from "@/components/ui/context-menu";
import {
  ensureWritingSectionId,
  moveWritingSection,
  toggleWritingSection,
  writingFoldKey,
  writingLinkHref,
  writingSectionRange,
} from "@/lib/writing-rich";

function mountedContextView(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return null;
  try {
    return editor.view.dom.isConnected ? editor.view : null;
  } catch {
    return null;
  }
}

export type WritingContextAction = "link" | "image";
export function openWritingContextPanel(
  editor: Editor,
  action: WritingContextAction,
) {
  mountedContextView(editor)?.dom.dispatchEvent(
    new CustomEvent("writing-context-action", { detail: action }),
  );
}

export function WritingSectionActions({
  editor,
  sectionLinkBase,
  sectionFolding = false,
  context = false,
}: {
  editor: Editor;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  context?: boolean;
}) {
  const [status, setStatus] = useState("");
  const range = writingSectionRange(
    editor.state.doc,
    editor.state.selection.from,
  );
  if (!range) return null;
  const folded = Boolean(
    range.id && writingFoldKey.getState(editor.state)?.has(range.id),
  );
  const action = (label: string, callback: () => void, disabled = false) =>
    context ? (
      <ContextMenuItem disabled={disabled} onClick={callback}>
        {label}
      </ContextMenuItem>
    ) : (
      <Button variant="ghost" disabled={disabled} onClick={callback}>
        {label}
      </Button>
    );
  return (
    <>
      {action(
        "Copy section link",
        async () => {
          const id = ensureWritingSectionId(editor);
          const href =
            id &&
            sectionLinkBase &&
            writingLinkHref(`${sectionLinkBase}#${id}`);
          if (!href) return;
          try {
            await navigator.clipboard.writeText(
              new URL(href, window.location.origin).href,
            );
            setStatus("Section link copied");
          } catch {
            setStatus("Could not copy the section link.");
          }
        },
        !sectionLinkBase,
      )}
      {sectionFolding
        ? action(folded ? "Unfold section" : "Fold section", () => {
            toggleWritingSection(editor);
          })
        : null}
      {action(
        "Move section up on this page",
        () => {
          moveWritingSection(editor, -1);
        },
        !moveWritingSection(editor, -1, false),
      )}
      {action(
        "Move section down on this page",
        () => {
          moveWritingSection(editor, 1);
        },
        !moveWritingSection(editor, 1, false),
      )}
      {status ? (
        <p role="status" className="px-2 text-sm text-muted-foreground">
          {status}
        </p>
      ) : null}
    </>
  );
}

/** Shift-right-click bypasses both the primitive and its document listener. */
export function WritingContextMenu({
  editor,
  children,
  sectionLinkBase,
  sectionFolding = false,
  enabled = true,
}: {
  editor: Editor | null;
  children: ReactNode;
  sectionLinkBase?: string;
  sectionFolding?: boolean;
  enabled?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [availableHeight, setAvailableHeight] = useState<number>();
  const popup = useRef<HTMLDivElement>(null);
  const nativeTouch = useRef(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            image: current.isActive("image"),
            link: current.isActive("link"),
            heading: current.isActive("heading"),
            selected: !current.state.selection.empty,
          }
        : null,
  });
  if (!editor) return children;
  const inactive = !enabled || !editor.isEditable || !mountedContextView(editor);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy. Use Shift-right-click for the browser menu.");
    }
  };
  return (
    <ContextMenu
      disabled={inactive}
      onOpenChange={(isOpen) => {
        if (!isOpen) return;
        setOffset({ x: 0, y: 0 });
        const zoom =
          Number.parseFloat(
            window.getComputedStyle(window.document.documentElement).zoom,
          ) || 1;
        setAvailableWidth(Math.max(144, window.innerWidth / zoom - 16));
        setAvailableHeight(Math.max(96, window.innerHeight / zoom - 16));
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) return;
        requestAnimationFrame(() => {
          const rect = popup.current?.getBoundingClientRect();
          if (!rect) return;
          const zoom =
            Number.parseFloat(
              window.getComputedStyle(window.document.documentElement).zoom,
            ) || 1;
          const shift =
            rect.right > window.innerWidth - 8
              ? window.innerWidth - 8 - rect.right
              : rect.left < 8
                ? 8 - rect.left
                : 0;
          const shiftY =
            rect.bottom > window.innerHeight - 8
              ? window.innerHeight - 8 - rect.bottom
              : rect.top < 8
                ? 8 - rect.top
                : 0;
          setOffset({ x: shift / zoom, y: shiftY / zoom });
        });
      }}
    >
      <ContextMenuTrigger
        className="select-text"
        style={{ WebkitTouchCallout: "default" }}
        onPointerDownCapture={(event) => {
          nativeTouch.current = event.pointerType === "touch";
        }}
        onTouchStartCapture={(event) => {
          nativeTouch.current = true;
          event.stopPropagation();
        }}
        onContextMenuCapture={(event) => {
          if (inactive) return;
          if (event.shiftKey || nativeTouch.current) {
            event.stopPropagation();
            return;
          }
          const target = event.target instanceof Element ? event.target : null;
          if (!target || !editor.view.dom.contains(target)) return;
          const node = target.closest("img, h1, h2, a");
          if (node) {
            const position = editor.view.posAtDOM(node, 0);
            if (node.tagName === "IMG")
              editor.view.dispatch(
                editor.state.tr.setSelection(
                  NodeSelection.create(editor.state.doc, position),
                ),
              );
            else
              editor.commands.setTextSelection(
                position + (node.tagName === "A" ? 0 : 1),
              );
            if (node.tagName === "A") editor.commands.extendMarkRange("link");
          }
          setStatus("");
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        aria-label="Writing actions"
        ref={popup}
        style={{
          maxWidth: availableWidth,
          maxHeight: availableHeight,
          translate: `${offset.x}px ${offset.y}px`,
        }}
        finalFocus={() => mountedContextView(editor)?.dom ?? false}
      >
        <ContextMenuGroup>
          {state?.image ? (
            <>
              <ContextMenuItem
                onClick={() => openWritingContextPanel(editor, "image")}
              >
                Edit or replace image
              </ContextMenuItem>
              <ContextMenuItem
                variant="destructive"
                onClick={() => editor.commands.deleteSelection()}
              >
                Delete image
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem
                disabled={!state?.selected}
                onClick={() =>
                  copy(
                    editor.state.doc.textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to,
                      "\n",
                    ),
                  )
                }
              >
                Copy plain text
              </ContextMenuItem>
              <ContextMenuItem onClick={() => editor.commands.toggleBold()}>
                Bold
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => editor.commands.toggleMark("highlight")}
              >
                Highlight
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => openWritingContextPanel(editor, "link")}
              >
                {state?.link ? "Edit link" : "Add link"}
              </ContextMenuItem>
              {state?.link ? (
                <>
                  <ContextMenuItem
                    onClick={() =>
                      copy(editor.getAttributes("link").href ?? "")
                    }
                  >
                    Copy link address
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      const href = writingLinkHref(
                        editor.getAttributes("link").href,
                      );
                      if (href)
                        window.open(href, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open link
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      editor.chain().extendMarkRange("link").unsetLink().run()
                    }
                  >
                    Remove link
                  </ContextMenuItem>
                </>
              ) : null}
            </>
          )}
          {state?.heading ? (
            <>
              <ContextMenuSeparator />
              <WritingSectionActions
                context
                editor={editor}
                sectionLinkBase={sectionLinkBase}
                sectionFolding={sectionFolding}
              />
            </>
          ) : null}
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <p className="px-2 py-1 text-xs text-foreground">
          Shift-right-click opens the browser menu.
        </p>
        {status ? (
          <p role="status" className="px-2 text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
