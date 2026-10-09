"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  ListChecks,
  Italic,
  Minus,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WRITING_TYPEFACES } from "@/components/missa/writing-typefaces";
import {
  localWritingImage,
  writingImageAlt,
  writingImageFits,
  writingLinkHref,
  WRITING_IMAGE_ALT_MAX,
  WRITING_CAPTION_MAX,
  writingImageCaption,
} from "@/lib/writing-rich";
import {
  sectionPages,
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  MARGIN_PRESETS,
  PAGE_SIZES,
  TEXT_SIZES,
  type PageAlign,
  type PageFormat,
  type PageSizeId,
  type WritingDocument,
} from "@/lib/writing-document";

const LETTER_SPACING_LABELS: Record<string, string> = {
  "-0.02": "Tight",
  "0": "Normal",
  "0.05": "Open",
  "0.1": "Wide",
  "0.2": "Wider",
  "0.35": "Very wide",
  "0.5": "Widest",
};

type BlockStyle = "paragraph" | "heading1" | "heading2" | "blockquote";

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Formatting for the selected text and line on the page being written. */
export function WritingFormatBar({
  editor,
  onOpenFormat,
  document,
}: {
  editor: Editor | null;
  onOpenFormat: () => void;
  document?: WritingDocument;
}) {
  const [insertOpen, setInsertOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            highlight: current.isActive("highlight"),
            checklist: current.isActive("taskList"),
            underline: current.isActive("underline"),
            strike: current.isActive("strike"),
            superscript: current.isActive("superscript"),
            subscript: current.isActive("subscript"),
            block: (current.isActive("heading", { level: 1 })
              ? "heading1"
              : current.isActive("heading", { level: 2 })
                ? "heading2"
                : current.isActive("blockquote")
                  ? "blockquote"
                  : "paragraph") as BlockStyle,
            align: (["center", "right", "justify"].find((align) =>
              current.isActive({ textAlign: align }),
            ) ?? "left") as PageAlign,
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });
  const off = !editor || !state || !editor.isEditable;
  const chain = () => editor!.chain().focus();

  function setBlock(block: BlockStyle) {
    if (!editor) return;
    const command = chain();
    if (block !== "blockquote" && state?.block === "blockquote")
      command.lift("blockquote");
    if (block === "paragraph") command.setParagraph();
    else if (block === "heading1") command.setHeading({ level: 1 });
    else if (block === "heading2") command.setHeading({ level: 2 });
    else command.setParagraph().setBlockquote();
    command.run();
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto"
      >
        <NativeSelect
          aria-label="Text style"
          value={state?.block ?? "paragraph"}
          disabled={off}
          onChange={(event) => setBlock(event.target.value as BlockStyle)}
        >
          <NativeSelectOption value="paragraph">Body text</NativeSelectOption>
          <NativeSelectOption value="heading1">Heading</NativeSelectOption>
          <NativeSelectOption value="heading2">Subheading</NativeSelectOption>
          <NativeSelectOption value="blockquote">Quotation</NativeSelectOption>
        </NativeSelect>
        <ToolButton
          label="Bold"
          pressed={state?.bold}
          disabled={off}
          onClick={() => chain().toggleBold().run()}
        >
          <Bold aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Italic"
          pressed={state?.italic}
          disabled={off}
          onClick={() => chain().toggleItalic().run()}
        >
          <Italic aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Underline"
          pressed={state?.underline}
          disabled={off}
          onClick={() => chain().toggleUnderline().run()}
        >
          <Underline aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          pressed={state?.strike}
          disabled={off}
          onClick={() => chain().toggleStrike().run()}
        >
          <Strikethrough aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Superscript"
          pressed={state?.superscript}
          disabled={off}
          onClick={() => chain().toggleSuperscript().run()}
        >
          <Superscript aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Subscript"
          pressed={state?.subscript}
          disabled={off}
          onClick={() => chain().toggleSubscript().run()}
        >
          <Subscript aria-hidden="true" />
        </ToolButton>
        {(
          [
            ["left", "Align line left", AlignLeft],
            ["center", "Center line", AlignCenter],
            ["right", "Align line right", AlignRight],
            ["justify", "Justify line", AlignJustify],
          ] as const
        ).map(([align, label, Icon]) => (
          <ToolButton
            key={align}
            label={label}
            pressed={state?.align === align}
            disabled={off}
            onClick={() => chain().setTextAlign(align).run()}
          >
            <Icon aria-hidden="true" />
          </ToolButton>
        ))}
        <ToolButton
          label="Highlight"
          pressed={state?.highlight}
          disabled={off}
          onClick={() => chain().toggleMark("highlight").run()}
        >
          <Highlighter aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Checklist"
          pressed={state?.checklist}
          disabled={off}
          onClick={() => chain().toggleTaskList().run()}
        >
          <ListChecks aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Scene break"
          disabled={off}
          onClick={() => chain().setHorizontalRule().run()}
        >
          <Minus aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Undo"
          disabled={off || !state?.canUndo}
          onClick={() => chain().undo().run()}
        >
          <Undo2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={off || !state?.canRedo}
          onClick={() => chain().redo().run()}
        >
          <Redo2 aria-hidden="true" />
        </ToolButton>
        <Button variant="ghost" onClick={onOpenFormat}>
          Page format
        </Button>
        <Button
          variant="ghost"
          disabled={off}
          onClick={() => setInsertOpen(true)}
        >
          Insert
        </Button>
      </div>
      {insertOpen && editor ? (
        <WritingInsertSheet
          editor={editor}
          document={document}
          onClose={() => setInsertOpen(false)}
        />
      ) : null}
    </>
  );
}

/** Links and tables use the editor selection; images come only from a local file. */
function WritingInsertSheet({
  editor,
  document,
  onClose,
}: {
  editor: Editor;
  document?: WritingDocument;
  onClose: () => void;
}) {
  const id = useId();
  const [href, setHref] = useState<string>(
    () => editor.getAttributes("link").href ?? "",
  );
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileVersion = useRef(0);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      linked: current.isActive("link"),
      selection: !current.state.selection.empty,
      table: current.isActive("table"),
      canAddRow: current.can().addRowAfter(),
      canAddColumn: current.can().addColumnAfter(),
      canDeleteRow: current.can().deleteRow(),
      canDeleteColumn: current.can().deleteColumn(),
      canDeleteTable: current.can().deleteTable(),
    }),
  });
  const off = !editor.isEditable || editor.isDestroyed;
  const safeHref = writingLinkHref(href);
  const safeAlt = writingImageAlt(alt);
  const fits =
    document && safeAlt && src
      ? writingImageFits(document, src, safeAlt, caption)
      : false;
  async function loadImage(file: File | undefined) {
    const version = ++fileVersion.current;
    setSrc("");
    setImageError(null);
    if (!file) {
      setImageBusy(false);
      return;
    }
    setImageBusy(true);
    try {
      const result = await localWritingImage(file);
      if (version === fileVersion.current) setSrc(result);
    } catch (error) {
      if (version === fileVersion.current)
        setImageError(
          error instanceof Error
            ? error.message
            : "This image could not be read.",
        );
    } finally {
      if (version === fileVersion.current) setImageBusy(false);
    }
  }
  function insertImage() {
    if (off || !document || !safeAlt || !src) return;
    if (!writingImageFits(document, src, safeAlt, caption)) {
      setImageError(
        "This image would exceed the piece’s 2 MB limit. Choose a smaller image.",
      );
      return;
    }
    if (
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src, alt: safeAlt, caption: writingImageCaption(caption) },
        })
        .run()
    )
      onClose();
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          fileVersion.current += 1;
          onClose();
        }
      }}
    >
      <SheetContent side="right">
        <SheetHeader variant="section">
          <SheetTitle>Insert</SheetTitle>
          <SheetDescription>
            Add a link, table or image at the selection.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-4">
          <FieldSet>
            <FieldLegend>Link</FieldLegend>
            <Field>
              <FieldLabel htmlFor={`${id}-link`}>
                Web address or email link
              </FieldLabel>
              <Input
                id={`${id}-link`}
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="https://example.com"
                disabled={off}
              />
              <FieldDescription>
                Select text to add a link, or place the cursor in an existing
                link to edit it. Links open only through an explicit browser
                action.
              </FieldDescription>
              {href && !safeHref ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Use a full http, https or mailto address.
                </p>
              ) : null}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={
                  off || !safeHref || (!state?.selection && !state?.linked)
                }
                onClick={() => {
                  if (
                    safeHref &&
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: safeHref })
                      .run()
                  )
                    onClose();
                }}
              >
                {state?.linked ? "Update link" : "Add link"}
              </Button>
              <Button
                variant="ghost"
                disabled={off || !state?.linked}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run();
                  onClose();
                }}
              >
                Remove link
              </Button>
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Table</FieldLegend>
            <p className="text-sm text-muted-foreground">
              Insert a table with three rows, three columns and a header row.
              Place the cursor in a cell to change its table.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={off || state?.table}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                  onClose();
                }}
              >
                Insert table
              </Button>
              <Button
                variant="outline"
                disabled={off || !state?.canAddRow}
                onClick={() => {
                  editor.chain().focus().addRowAfter().run();
                  onClose();
                }}
              >
                Add row below
              </Button>
              <Button
                variant="outline"
                disabled={off || !state?.canAddColumn}
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run();
                  onClose();
                }}
              >
                Add column after
              </Button>
              <Button
                variant="ghost"
                disabled={off || !state?.canDeleteRow}
                onClick={() => {
                  editor.chain().focus().deleteRow().run();
                  onClose();
                }}
              >
                Delete row
              </Button>
              <Button
                variant="ghost"
                disabled={off || !state?.canDeleteColumn}
                onClick={() => {
                  editor.chain().focus().deleteColumn().run();
                  onClose();
                }}
              >
                Delete column
              </Button>
              <Button
                variant="ghost"
                disabled={off || !state?.canDeleteTable}
                onClick={() => {
                  editor.chain().focus().deleteTable().run();
                  onClose();
                }}
              >
                Delete table
              </Button>
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Local image</FieldLegend>
            <Field>
              <FieldLabel htmlFor={`${id}-image`}>Image file</FieldLabel>
              <Input
                id={`${id}-image`}
                type="file"
                accept="image/png,image/jpeg"
                disabled={off || !document}
                onChange={(event) => {
                  void loadImage(event.target.files?.[0]);
                }}
              />
              <FieldDescription>
                PNG or JPEG, up to 128 KB. The image saves inside this piece.
                Remote images are not loaded.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-alt`}>Image description</FieldLabel>
              <Input
                id={`${id}-alt`}
                value={alt}
                maxLength={WRITING_IMAGE_ALT_MAX}
                disabled={off || !document}
                onChange={(event) => setAlt(event.target.value)}
              />
              <FieldDescription>
                Describe what the image shows. A description is required.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-caption`}>Caption</FieldLabel>
              <Input
                id={`${id}-caption`}
                value={caption}
                maxLength={WRITING_CAPTION_MAX}
                disabled={off || !document}
                onChange={(event) => setCaption(event.target.value)}
              />
            </Field>
            {imageBusy ? (
              <p role="status" className="text-sm text-muted-foreground">
                Reading image…
              </p>
            ) : null}
            {imageError ? (
              <p role="alert" className="text-sm text-destructive">
                {imageError}
              </p>
            ) : null}
            {src && safeAlt && !fits ? (
              <p role="status" className="text-sm text-muted-foreground">
                Choose a smaller image to keep this piece within 2 MB.
              </p>
            ) : null}
            <Button
              variant="outline"
              disabled={off || imageBusy || !fits}
              onClick={insertImage}
            >
              Insert image
            </Button>
          </FieldSet>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function marginPreset(format: PageFormat): string {
  const { top, right, bottom, left } = format.margins;
  if (top !== right || top !== bottom || top !== left) return "custom";
  const preset = Object.entries(MARGIN_PRESETS).find(
    ([, value]) => value.value === top,
  );
  return preset ? preset[0] : "custom";
}

/**
 * Settings for the whole piece (paper, typeface, size) and for one page
 * (alignment, spacing, margins, its own typeface and size).
 */
export function WritingFormatSheet({
  open,
  onOpenChange,
  document,
  pageIndex,
  onDocumentChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: WritingDocument;
  pageIndex: number;
  onDocumentChange: (document: WritingDocument) => void;
}) {
  const page = document.pages[pageIndex] ?? document.pages[0]!;
  const format = page.format;

  // A section's pages share one format: the pages its text flows across and
  // the pages after a page break. A change reaches them all.
  const chain = new Set(
    sectionPages(document.pages, Math.max(0, document.pages.indexOf(page))).map(
      (index) => document.pages[index]!.id,
    ),
  );

  function setPage(change: Partial<PageFormat>) {
    onDocumentChange({
      ...document,
      pages: document.pages.map((item) =>
        chain.has(item.id)
          ? { ...item, format: { ...item.format, ...change } }
          : item,
      ),
    });
  }

  function applyToAll() {
    onDocumentChange({
      ...document,
      pages: document.pages.map((item) => ({
        ...item,
        format: { ...format, margins: { ...format.margins } },
      })),
    });
  }

  function setMargin(side: keyof PageFormat["margins"], value: number) {
    if (!Number.isFinite(value)) return;
    setPage({
      margins: { ...format.margins, [side]: Math.max(0, Math.min(80, value)) },
    });
  }

  const preset = marginPreset(format);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader variant="section">
          <SheetTitle>Format</SheetTitle>
          <SheetDescription>
            Page {pageIndex + 1} of {document.pages.length}. Each page keeps its
            own format.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4">
          <FieldSet>
            <FieldLegend>Whole piece</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="writing-paper">Paper size</FieldLabel>
                <NativeSelect
                  id="writing-paper"
                  value={document.pageSize}
                  onChange={(event) =>
                    onDocumentChange({
                      ...document,
                      pageSize: event.target.value as PageSizeId,
                    })
                  }
                >
                  {Object.entries(PAGE_SIZES).map(([id, size]) => (
                    <NativeSelectOption key={id} value={id}>
                      {size.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="writing-size">Text size</FieldLabel>
                <NativeSelect
                  id="writing-size"
                  value={String(document.textSize)}
                  onChange={(event) =>
                    onDocumentChange({
                      ...document,
                      textSize: Number(event.target.value),
                    })
                  }
                >
                  {TEXT_SIZES.map((size) => (
                    <NativeSelectOption key={size} value={String(size)}>
                      {size} pt
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>
              {chain.size > 1
                ? `This section, ${chain.size} pages`
                : "This page"}
            </FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel id="writing-align-label">Alignment</FieldLabel>
                <RadioGroup
                  aria-labelledby="writing-align-label"
                  value={format.align}
                  onValueChange={(value) =>
                    setPage({ align: value as PageAlign })
                  }
                >
                  {(
                    [
                      ["left", "Left"],
                      ["center", "Center"],
                      ["right", "Right"],
                      ["justify", "Justified"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      htmlFor={`writing-align-${value}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <RadioGroupItem
                        id={`writing-align-${value}`}
                        value={value}
                      />
                      {label}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="writing-line-height">
                  Line spacing
                </FieldLabel>
                <NativeSelect
                  id="writing-line-height"
                  value={String(format.lineHeight)}
                  onChange={(event) =>
                    setPage({ lineHeight: Number(event.target.value) })
                  }
                >
                  {LINE_HEIGHTS.map((value) => (
                    <NativeSelectOption key={value} value={String(value)}>
                      {value === 1
                        ? "Single"
                        : value === 2
                          ? "Double"
                          : `${value}`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="writing-letter-spacing">
                  Letter spacing
                </FieldLabel>
                <NativeSelect
                  id="writing-letter-spacing"
                  value={String(format.letterSpacing)}
                  onChange={(event) =>
                    setPage({ letterSpacing: Number(event.target.value) })
                  }
                >
                  {LETTER_SPACINGS.map((value) => (
                    <NativeSelectOption key={value} value={String(value)}>
                      {LETTER_SPACING_LABELS[String(value)]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="writing-margins">Margins</FieldLabel>
                <NativeSelect
                  id="writing-margins"
                  value={preset}
                  onChange={(event) => {
                    const choice =
                      MARGIN_PRESETS[
                        event.target.value as keyof typeof MARGIN_PRESETS
                      ];
                    if (!choice) return;
                    const value = choice.value;
                    setPage({
                      margins: {
                        top: value,
                        right: value,
                        bottom: value,
                        left: value,
                      },
                    });
                  }}
                >
                  {Object.entries(MARGIN_PRESETS).map(([id, item]) => (
                    <NativeSelectOption key={id} value={id}>
                      {item.label}, {Math.round(item.value)} mm
                    </NativeSelectOption>
                  ))}
                  <NativeSelectOption value="custom">Custom</NativeSelectOption>
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {(["top", "bottom", "left", "right"] as const).map((side) => (
                  <Field key={side}>
                    <FieldLabel htmlFor={`writing-margin-${side}`}>
                      {side[0]!.toUpperCase() + side.slice(1)}, mm
                    </FieldLabel>
                    <Input
                      id={`writing-margin-${side}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={80}
                      step={1}
                      value={Math.round(format.margins[side] * 10) / 10}
                      onChange={(event) =>
                        setMargin(side, Number(event.target.value))
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field>
                <FieldLabel htmlFor="writing-page-typeface">
                  Typeface
                </FieldLabel>
                <NativeSelect
                  id="writing-page-typeface"
                  value={format.typeface ?? ""}
                  onChange={(event) =>
                    setPage({ typeface: event.target.value || undefined })
                  }
                >
                  <NativeSelectOption value="">
                    Same as the piece
                  </NativeSelectOption>
                  {WRITING_TYPEFACES.map((face) => (
                    <NativeSelectOption key={face.id} value={face.id}>
                      {face.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="writing-page-size">
                  Text size on this page
                </FieldLabel>
                <NativeSelect
                  id="writing-page-size"
                  value={format.textSize ? String(format.textSize) : ""}
                  onChange={(event) =>
                    setPage({
                      textSize: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                >
                  <NativeSelectOption value="">
                    Same as the piece
                  </NativeSelectOption>
                  {TEXT_SIZES.map((size) => (
                    <NativeSelectOption key={size} value={String(size)}>
                      {size} pt
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={applyToAll}
            disabled={document.pages.length < 2}
          >
            Use this format on every page
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
