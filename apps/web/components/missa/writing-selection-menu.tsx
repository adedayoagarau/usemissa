"use client";

import { useEffect, useId, useState, useCallback, useRef } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import type { Selection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import {
  Volume2,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Link2,
  ImageIcon,
  ListChecks,
  FileText,
  Trash2,
  Ellipsis,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  nodeText,
  WRITING_DOCUMENT_MAX,
  documentFootnotes,
  type WritingDocument,
} from "@/lib/writing-document";
import {
  localWritingImage,
  writingImageWidth,
  writingImageSource,
  writingImageAlt,
  writingImageCaption,
  writingLinkHref,
  WRITING_CAPTION_MAX,
  WRITING_IMAGE_ALT_MAX,
  WRITING_FOOTNOTE_MAX,
} from "@/lib/writing-rich";

import { WritingSectionActions } from "./writing-context-menu";

/** Strict-mode teardown can unmount a view before its editor is destroyed. */
function mountedView(editor: Editor | null): Editor["view"] | null {
  if (!editor || editor.isDestroyed) return null;
  try {
    const view = editor.view;
    return view.dom.isConnected ? view : null;
  } catch {
    return null;
  }
}

const selectionMenuContainer = () => window.document.body;

const SELECTION_MENU_OPTIONS: BubbleMenuProps["options"] = {
  placement: "top",
  offset: 8,
  flip: true,
  shift: { padding: 8 },
  strategy: "fixed",
};

/** Contextual selection actions; browser spelling/copy menus remain available. */
export type WritingSelectionAction = "check" | "research" | "revision" | "listen";

export function WritingSelectionMenu({
  editor,
  onSelectionAction,
  sectionLinkBase,
  writingDocument,
  sectionFolding = false,
}: {
  editor: Editor | null;
  sectionLinkBase?: string;
  writingDocument?: WritingDocument;
  sectionFolding?: boolean;
  onSelectionAction?: (action: WritingSelectionAction, editor: Editor) => void;
}) {
  const id = useId();
  const [panel, setPanel] = useState<"link" | "image" | "note" | null>(null);
  const [value, setValue] = useState("");
  const [caption, setCaption] = useState("");
  const [width, setWidth] = useState(100);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const imageRequest = useRef(0);
  const panelSelection = useRef<{
    selection: Selection;
    doc: ProseMirrorNode;
  } | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const dismissedSelection = useRef<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            selectedText: current.state.selection.empty ? "" : nodeText(current.state.doc.cut(current.state.selection.from, current.state.selection.to).toJSON()),
            image: current.isActive("image"),
            link: current.isActive("link"),
            note: current.isActive("footnote"),
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            highlight: current.isActive("highlight"),
            task: current.isActive("taskList"),
            heading: current.isActive("heading", { level: 1 })
              ? "1"
              : current.isActive("heading", { level: 2 })
                ? "2"
                : "0",
          }
        : null,
  });
  useEffect(() => {
    if (!editor) return;
    const reset = () => {
      if (
        dismissedSelection.current !==
        `${editor.state.selection.from}:${editor.state.selection.to}`
      )
        dismissedSelection.current = null;
    };
    editor.on("selectionUpdate", reset);
    return () => {
      editor.off("selectionUpdate", reset);
    };
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const hideOutside = ({ event }: { event: FocusEvent }) => {
      const target = event.relatedTarget;
      if (
        target instanceof Element &&
        target.closest(
          '[aria-label="Selection formatting"], [data-slot="popover-content"]',
        )
      )
        return;
      const view = mountedView(editor);
      if (view && panel === null && !moreOpen)
        view.dispatch(
          editor.state.tr.setMeta(`writing-selection-${id}`, "hide"),
        );
    };
    editor.on("blur", hideOutside);
    return () => {
      editor.off("blur", hideOutside);
    };
  }, [editor, id, panel, moreOpen]);
  useEffect(() => {
    if (!editor) return;
    const selectAgain = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "a" || (!event.metaKey && !event.ctrlKey))
        return;
      const view = mountedView(editor);
      if (
        !view ||
        !editor.isEditable ||
        !(event.target instanceof window.Node) ||
        !view.dom.contains(event.target)
      )
        return;
      // Use the editor's own command, including when its selection is unchanged.
      // Native select-all can otherwise race an editor focus restoration.
      event.preventDefault();
      event.stopPropagation();
      dismissedSelection.current = null;
      editor.commands.selectAll();
      view.dispatch(editor.state.tr.setMeta(`writing-selection-${id}`, "show"));
    };
    // Resolve the current mounted view for each key, rather than binding to a
    // DOM node that Strict Mode may replace before this effect runs.
    window.document.addEventListener("keydown", selectAgain, true);
    return () =>
      window.document.removeEventListener("keydown", selectAgain, true);
  }, [editor, id]);
  const shouldShow = useCallback<NonNullable<BubbleMenuProps["shouldShow"]>>(
    ({ editor: current, view, state: currentState }) =>
      dismissedSelection.current !==
        `${currentState.selection.from}:${currentState.selection.to}` &&
      current.isEditable &&
      (view.hasFocus() || panel !== null || moreOpen) &&
      (!currentState.selection.empty ||
        current.isActive("image") ||
        current.isActive("link") ||
        current.isActive("footnote") ||
        current.isActive("heading")),
    [panel, moreOpen],
  );
  const open = useCallback(
    (next: typeof panel) => {
      if (!editor) return;
      panelSelection.current = {
        selection: editor.state.selection,
        doc: editor.state.doc,
      };
      imageRequest.current += 1;
      setImageLoading(false);
      setImageError("");
      setImageSource(null);
      setWidth(writingImageWidth(editor.getAttributes("image").widthPercent));
      setValue(
        next === "link"
          ? (editor.getAttributes("link").href ?? "")
          : next === "image"
            ? (editor.getAttributes("image").alt ?? "")
            : (editor.getAttributes("footnote").note ?? ""),
      );
      setCaption(
        next === "image" ? (editor.getAttributes("image").caption ?? "") : "",
      );
      setPanel(next);
    },
    [editor],
  );
  useEffect(() => {
    const view = mountedView(editor);
    if (!view || !editor) return;
    const show = (event: Event) => {
      const action = (event as CustomEvent).detail;
      if (action !== "image" && action !== "link") return;
      dismissedSelection.current = null;
      open(action);
      view.dispatch(editor.state.tr.setMeta(`writing-selection-${id}`, "show"));
    };
    view.dom.addEventListener("writing-context-action", show);
    return () => view.dom.removeEventListener("writing-context-action", show);
  }, [editor, id, open]);
  if (!editor || !mountedView(editor)) return null;
  const chain = () =>
    mountedView(editor)?.hasFocus() ? editor.chain() : editor.chain().focus();
  const off = !editor.isEditable;
  const icon = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    pressed?: boolean,
  ) => (
    <Button
      variant={pressed ? "writingActive" : "ghost"}
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={off}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
  const safeHref = writingLinkHref(value);
  const safeAlt = writingImageAlt(value);
  const save = () => {
    if (off) return;
    const preserved = panelSelection.current;
    if (!preserved || !preserved.doc.eq(editor.state.doc)) {
      setImageError(
        "The writing changed. Close this panel and choose the passage again.",
      );
      return;
    }
    editor.view.dispatch(editor.state.tr.setSelection(preserved.selection));
    if (panel === "link" && safeHref)
      editor.chain().extendMarkRange("link").setLink({ href: safeHref }).run();
    else if (panel === "image" && safeAlt)
      editor
        .chain()
        .updateAttributes("image", {
          alt: safeAlt,
          ...(imageSource ? { src: imageSource } : {}),
          widthPercent: width,
          caption: writingImageCaption(caption),
        })
        .run();
    else if (panel === "note" && value.trim()) {
      if (state?.note)
        editor
          .chain()
          .updateAttributes("footnote", { note: value.trim() })
          .run();
      else
        editor
          .chain()
          .setTextSelection(editor.state.selection.to)
          .insertContent({
            type: "footnote",
            attrs: { id: crypto.randomUUID(), note: value.trim() },
          })
          .run();
    }
    setPanel(null);
  };
  return (
    <BubbleMenu
      editor={editor}
      appendTo={selectionMenuContainer}
      pluginKey={`writing-selection-${id}`}
      updateDelay={0}
      options={SELECTION_MENU_OPTIONS}
      shouldShow={shouldShow}
      className="z-40 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-menu print:hidden"
    >
      <div
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setPanel(null);
            setMoreOpen(false);
            dismissedSelection.current = `${editor.state.selection.from}:${editor.state.selection.to}`;
            mountedView(editor)?.dispatch(
              editor.state.tr.setMeta(`writing-selection-${id}`, "hide"),
            );
            editor.commands.focus();
          }
        }}
        role="toolbar"
        aria-label="Selection formatting"
        className="flex max-w-full flex-wrap items-center gap-1"
      >
        {!state?.image && !state?.note ? (
          <>
            <NativeSelect
              aria-label="Selection text style"
              value={state?.heading ?? "0"}
              disabled={off}
              onChange={(event) => {
                const level = Number(event.target.value);
                if (level === 0) chain().setParagraph().run();
                else
                  chain()
                    .setHeading({ level: level as 1 | 2 })
                    .run();
              }}
            >
              <NativeSelectOption value="0">Body</NativeSelectOption>
              <NativeSelectOption value="1">Heading</NativeSelectOption>
              <NativeSelectOption value="2">Subheading</NativeSelectOption>
            </NativeSelect>
            {onSelectionAction && state?.selectedText.trim()
              ? icon("Read selection aloud", Volume2, () => onSelectionAction("listen", editor))
              : null}
            {icon(
              "Bold selection",
              Bold,
              () => chain().toggleBold().run(),
              state?.bold,
            )}
            {icon(
              "Italic selection",
              Italic,
              () => chain().toggleItalic().run(),
              state?.italic,
            )}
            {icon(
              "Underline selection",
              Underline,
              () => chain().toggleUnderline().run(),
              state?.underline,
            )}
            {icon(
              "Highlight selection",
              Highlighter,
              () => chain().toggleMark("highlight").run(),
              state?.highlight,
            )}
            {icon(
              "Checklist",
              ListChecks,
              () => chain().toggleTaskList().run(),
              state?.task,
            )}
          </>
        ) : null}
        <Popover
          onOpenChangeComplete={(open) => {
            if (
              !open &&
              mountedView(editor) &&
              !mountedView(editor)?.hasFocus()
            )
              editor.commands.focus();
          }}
          open={panel !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setPanel(null);
          }}
        >
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  state?.image
                    ? "Edit image"
                    : state?.note
                      ? "Edit footnote"
                      : state?.link
                        ? "Edit link"
                        : "Add link"
                }
                title={
                  state?.image
                    ? "Edit image"
                    : state?.note
                      ? "Edit footnote"
                      : "Link"
                }
                disabled={off}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  open(state?.image ? "image" : state?.note ? "note" : "link")
                }
              />
            }
          >
            {state?.image ? (
              <ImageIcon aria-hidden="true" />
            ) : state?.note ? (
              <FileText aria-hidden="true" />
            ) : (
              <Link2 aria-hidden="true" />
            )}
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            finalFocus={() => mountedView(editor)?.dom ?? false}
          >
            <Field>
              <FieldLabel htmlFor={`${id}-value`}>
                {panel === "image"
                  ? "Image description"
                  : panel === "note"
                    ? "Footnote"
                    : "Web address or email link"}
              </FieldLabel>
              {panel === "note" ? (
                <Textarea
                  id={`${id}-value`}
                  value={value}
                  maxLength={WRITING_FOOTNOTE_MAX}
                  onChange={(event) => setValue(event.target.value)}
                />
              ) : (
                <Input
                  id={`${id}-value`}
                  value={value}
                  maxLength={panel === "image" ? WRITING_IMAGE_ALT_MAX : 2000}
                  onChange={(event) => setValue(event.target.value)}
                />
              )}
            </Field>
            {panel === "image" ? (
              <Field>
                <FieldLabel htmlFor={`${id}-caption`}>Caption</FieldLabel>
                <Input
                  id={`${id}-caption`}
                  value={caption}
                  maxLength={WRITING_CAPTION_MAX}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </Field>
            ) : null}
            {panel === "image" ? (
              <>
                <Field>
                  <FieldLabel htmlFor={`${id}-replace`}>
                    Replace image file
                  </FieldLabel>
                  <Input
                    id={`${id}-replace`}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      const request = ++imageRequest.current;
                      setImageSource(null);
                      setImageError("");
                      setImageLoading(Boolean(file));
                      if (!file) return;
                      try {
                        const src = await localWritingImage(file);
                        if (request !== imageRequest.current) return;
                        // Count the replacement against this editor's existing rich content.
                        const json = writingDocument ?? editor.getJSON();
                        const existing = editor.getAttributes("image").src;
                        const size =
                          JSON.stringify(json).length -
                          String(existing ?? "").length +
                          src.length +
                          256;
                        if (
                          size > WRITING_DOCUMENT_MAX ||
                          !writingImageSource(src)
                        )
                          throw new Error(
                            "This image would exceed the document limit.",
                          );
                        setImageSource(src);
                      } catch (error) {
                        if (request === imageRequest.current)
                          setImageError(
                            error instanceof Error
                              ? error.message
                              : "Could not read the image.",
                          );
                      } finally {
                        if (request === imageRequest.current)
                          setImageLoading(false);
                      }
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-width`}>Image width</FieldLabel>
                  <NativeSelect
                    id={`${id}-width`}
                    value={String(width)}
                    onChange={(event) =>
                      setWidth(writingImageWidth(event.target.value))
                    }
                  >
                    {[25, 50, 75, 100].map((percent) => (
                      <NativeSelectOption key={percent} value={String(percent)}>
                        {percent}%
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                {imageSource ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    Replacement ready. Save to apply.
                  </p>
                ) : null}
                {imageError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {imageError}
                  </p>
                ) : null}
              </>
            ) : null}
            {imageLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Reading image…
              </p>
            ) : null}
            {panel === "link" && value && !safeHref ? (
              <p role="status" className="text-sm text-muted-foreground">
                Use a full http, https or mailto address.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  off ||
                  imageLoading ||
                  (panel === "link"
                    ? !safeHref
                    : panel === "image"
                      ? !safeAlt || Boolean(imageError)
                      : !value.trim())
                }
                onClick={save}
              >
                Save
              </Button>
              {panel === "link" && state?.link ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    chain().extendMarkRange("link").unsetLink().run();
                    setPanel(null);
                  }}
                >
                  Remove link
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
        {!state?.image && !state?.note ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add footnote"
            title="Add footnote"
            disabled={off}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => open("note")}
          >
            <FileText aria-hidden="true" />
          </Button>
        ) : null}
        {!state?.image && !state?.note ? (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Selection actions"
                  title="Selection actions"
                />
              }
            >
              <Ellipsis aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              finalFocus={() => mountedView(editor)?.dom ?? false}
            >
              <p className="text-sm text-muted-foreground">
                {
                  editor.state.doc
                    .textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to,
                      " ",
                    )
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean).length
                }{" "}
                selected words
              </p>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      editor.state.doc.textBetween(
                        editor.state.selection.from,
                        editor.state.selection.to,
                        "\n",
                      ),
                    );
                    setCopyStatus("Copied");
                  } catch {
                    setCopyStatus(
                      "Could not copy. Use your browser’s Copy command.",
                    );
                  }
                }}
              >
                Copy plain text
              </Button>
              <WritingSectionActions
                editor={editor}
                sectionLinkBase={sectionLinkBase}
                sectionFolding={sectionFolding}
              />
              {onSelectionAction ? (
                <>
                  {(
                    [
                      ["check", "Check selection"],
                      ["research", "Keep research note"],
                      ["revision", "Comment"],
                    ] as const
                  ).map(([action, label]) => (
                    <Button
                      key={action}
                      variant="ghost"
                      onClick={() => {
                        setMoreOpen(false);
                        onSelectionAction(action, editor);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </>
              ) : null}
              {copyStatus ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {copyStatus}
                </p>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
        {state?.image || state?.note
          ? icon(
              state?.image ? "Delete image" : "Delete footnote",
              Trash2,
              () => chain().deleteSelection().run(),
            )
          : null}
      </div>
    </BubbleMenu>
  );
}

/** Numbered notes stay attached to their page in print and draft views. */
export function WritingFootnotes({
  editor,
  document,
  pageId,
  showNotes = true,
}: {
  editor: Editor | null;
  document: WritingDocument;
  pageId: string;
  showNotes?: boolean;
}) {
  const notes = documentFootnotes(document);
  useEffect(() => {
    const currentView = mountedView(editor);
    if (!currentView) return;
    const view = currentView.dom;
    for (const reference of view.querySelectorAll<HTMLElement>(
      "sup[data-note-id]",
    )) {
      const note = notes.find((item) => item.id === reference.dataset.noteId);
      reference.textContent = note ? String(note.number) : "†";
      reference.setAttribute(
        "aria-label",
        note ? `Footnote ${note.number}: ${note.note}` : "Footnote",
      );
    }
  }, [editor, document, notes]);
  const pageNotes = notes.filter((note) => note.pageId === pageId);
  if (!showNotes || !pageNotes.length) return null;
  return (
    <section
      data-slot="writing-footnotes"
      aria-label="Footnotes"
      className="mt-4 border-t border-border pt-2 text-sm"
    >
      <ol className="list-none space-y-1">
        {pageNotes.map((note) => (
          <li key={note.id} className="flex gap-2">
            <span>{note.number}.</span>
            <span className="break-words whitespace-pre-wrap">{note.note}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
