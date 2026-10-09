import Image from "@tiptap/extension-image";
import { Extension, Mark, Node, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import {
  WRITING_DOCUMENT_MAX,
  type WritingDocument,
} from "./writing-document.ts";

export const WRITING_IMAGE_MAX = 128 * 1024;
export const WRITING_IMAGE_ALT_MAX = 500;
export const WRITING_CAPTION_MAX = 1_000;
export const WRITING_FOOTNOTE_MAX = 2_000;

export function writingImageCaption(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, WRITING_CAPTION_MAX)
    : "";
}

/** Manual links only, with explicit schemes and no credentials or control characters. */
export function writingLinkHref(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 2_000 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return null;
  const trimmed = value.trim();
  if (
    /^\/doc\?entry=writing_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:#[A-Za-z0-9_-]{1,100})?$/i.test(
      trimmed,
    )
  )
    return trimmed;
  if (!/^(https?:\/\/|mailto:)/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    if (url.protocol === "mailto:")
      return url.pathname.includes("@") ? url.href : null;
    return url.hostname && ["http:", "https:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function imageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    )
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  return null;
}

export function writingImageAlt(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= WRITING_IMAGE_ALT_MAX
    ? value.trim()
    : null;
}

/** Safe for HTML rendering: never returns remote, SVG, blob, or file sources. */
export function writingImageSource(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(WRITING_IMAGE_MAX / 3) * 4 + 32
  )
    return null;
  const match =
    /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2]!.length % 4 !== 0) return null;
  try {
    const raw = atob(match[2]!);
    if (raw.length > WRITING_IMAGE_MAX) return null;
    const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
    return imageMime(bytes) === match[1] ? value : null;
  } catch {
    return null;
  }
}

/** Checks real file bytes instead of trusting a filename or reported MIME type. */
export async function localWritingImage(
  file: Pick<File, "size" | "arrayBuffer">,
): Promise<string> {
  if (file.size > WRITING_IMAGE_MAX)
    throw new Error("Choose an image up to 128 KB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime || bytes.length > WRITING_IMAGE_MAX)
    throw new Error("Choose a PNG or JPEG image up to 128 KB.");
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(raw)}`;
}

/** Conservative allowance before inserting; saved JSON must remain within 2 MB. */
export function writingImageFits(
  document: WritingDocument,
  src: string,
  alt: string,
  caption = "",
): boolean {
  const node = {
    type: "image",
    attrs: {
      src,
      alt,
      caption: writingImageCaption(caption),
      title: null,
      width: null,
      height: null,
    },
  };
  return (
    Boolean(writingImageSource(src) && writingImageAlt(alt)) &&
    JSON.stringify(document).length + JSON.stringify(node).length + 64 <=
      WRITING_DOCUMENT_MAX
  );
}

export const WritingLink = Link.configure({
  openOnClick: false,
  autolink: false,
  linkOnPaste: false,
  isAllowedUri: (href) => writingLinkHref(href) !== null,
  HTMLAttributes: { target: null, rel: "noopener noreferrer" },
});

/** Reject remote images on paste and on JSON rendering, including copied markup. */
export const WritingLocalImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: 100,
        parseHTML: (element) =>
          writingImageWidth(element.getAttribute("data-width-percent")),
        renderHTML: () => ({}),
      },
      caption: {
        default: "",
        parseHTML: (element) =>
          writingImageCaption(
            element.closest("figure")?.querySelector("figcaption")?.textContent,
          ),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) =>
          writingImageSource(element.getAttribute("src")) &&
          writingImageAlt(element.getAttribute("alt"))
            ? null
            : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const src = writingImageSource(HTMLAttributes.src);
    const alt = writingImageAlt(HTMLAttributes.alt);
    const image = [
      "img",
      {
        src: src && alt ? src : undefined,
        alt: alt ?? "Image unavailable",
        "data-width-percent": writingImageWidth(node.attrs.widthPercent),
        style: `width: ${writingImageWidth(node.attrs.widthPercent)}%; height: auto;`,
      },
    ] as const;
    const caption = writingImageCaption(node.attrs.caption);
    return caption ? ["figure", {}, image, ["figcaption", {}, caption]] : image;
  },
}).configure({ allowBase64: true, resize: false });

/** One approved highlight tone; pasted inline colors are never retained. */
export const WritingHighlight = Mark.create({
  name: "highlight",
  parseHTML: () => [{ tag: "mark" }],
  renderHTML: () => ["mark", { class: "bg-warning-subtle text-foreground" }, 0],
});

/** Note text is plain data. Visible numbers are derived from document order. */
export const WritingFootnote = Node.create({
  name: "footnote",
  inline: true,
  group: "inline",
  atom: true,
  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-note-id") ?? "",
      },
      note: {
        default: "",
        parseHTML: (element) =>
          (element.getAttribute("data-note") ?? "").slice(
            0,
            WRITING_FOOTNOTE_MAX,
          ),
      },
    };
  },
  parseHTML: () => [{ tag: "sup[data-note-id][data-note]" }],
  renderHTML: ({ node }) => [
    "sup",
    {
      "data-note-id": String(node.attrs.id),
      "data-note": String(node.attrs.note).slice(0, WRITING_FOOTNOTE_MAX),
      "aria-label": "Footnote",
      class: "text-primary",
    },
    "†",
  ],
});

export function writingRichExtensions() {
  return [
    WritingSections,
    WritingLink,
    WritingLocalImage,
    WritingHighlight,
    WritingFootnote,
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
    }),
    TableKit.configure({ table: { resizable: false } }),
  ];
}

/** A bounded percentage retains proportions without trusting pasted CSS. */
export function writingImageWidth(value: unknown): number {
  const width =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{1,3}$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(width) && width >= 25 && width <= 100 ? width : 100;
}

export function writingSectionId(value: unknown): string | null {
  return typeof value === "string" &&
    /^section_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

export type WritingSectionRange = {
  from: number;
  to: number;
  level: number;
  id: string | null;
};
/** Heading and its following blocks up to the next peer or parent heading. */
export function writingSectionRange(
  doc: ProseMirrorNode,
  position: number,
): WritingSectionRange | null {
  const blocks: { node: ProseMirrorNode; position: number }[] = [];
  doc.forEach((node, at) => blocks.push({ node, position: at }));
  const index = blocks.findIndex(
    ({ node, position: at }) =>
      node.type.name === "heading" &&
      position >= at &&
      position <= at + node.nodeSize,
  );
  if (index < 0) return null;
  const current = blocks[index]!;
  const level = Number(current.node.attrs.level);
  const next = blocks
    .slice(index + 1)
    .find(
      ({ node }) =>
        node.type.name === "heading" && Number(node.attrs.level) <= level,
    );
  return {
    from: current.position,
    to: next?.position ?? doc.content.size,
    level,
    id: writingSectionId(current.node.attrs.sectionId),
  };
}

/** One transaction swaps adjacent sibling sections; it never crosses an editor. */
export function moveWritingSection(
  editor: Editor,
  direction: -1 | 1,
  apply = true,
): boolean {
  if (editor.isDestroyed || editor.isEditable === false) return false;
  const { doc, selection } = editor.state;
  const range = writingSectionRange(doc, selection.from);
  if (!range) return false;
  const siblings: WritingSectionRange[] = [];
  doc.forEach((node, position) => {
    if (
      node.type.name === "heading" &&
      Number(node.attrs.level) === range.level
    ) {
      const section = writingSectionRange(doc, position + 1);
      if (section) siblings.push(section);
    }
  });
  const index = siblings.findIndex((item) => item.from === range.from);
  const neighbor = siblings[index + direction];
  if (
    !neighbor ||
    (direction === -1 ? neighbor.to !== range.from : range.to !== neighbor.from)
  )
    return false;
  if (!apply) return true;
  const start = Math.min(range.from, neighbor.from);
  const end = Math.max(range.to, neighbor.to);
  const current = doc.slice(range.from, range.to).content;
  const other = doc.slice(neighbor.from, neighbor.to).content;
  const tr = editor.state.tr.replaceWith(
    start,
    end,
    direction === -1 ? current.append(other) : other.append(current),
  );
  tr.setSelection(
    TextSelection.create(
      tr.doc,
      start + (direction === -1 ? 0 : other.size) + 1,
    ),
  );
  tr.setMeta("writingTrackedChangesHandled", true);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export const writingFoldKey = new PluginKey<Set<string>>(
  "writing-section-folds",
);
/** Fold state is local to this view. Saved JSON and printed/exported prose stay complete. */
export const WritingSections = Extension.create({
  name: "writingSections",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          sectionId: {
            default: null,
            parseHTML: (element) =>
              writingSectionId(element.getAttribute("data-section-id")),
            renderHTML: (attrs) => {
              const id = writingSectionId(attrs.sectionId);
              return id ? { id, "data-section-id": id } : {};
            },
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: writingFoldKey,
        state: {
          init: () => new Set<string>(),
          apply: (tr, previous) => {
            const id = tr.getMeta(writingFoldKey) as unknown;
            if (!writingSectionId(id)) return previous;
            const next = new Set(previous);
            if (next.has(id as string)) next.delete(id as string);
            else next.add(id as string);
            return next;
          },
        },
        props: {
          decorations(state) {
            const folded = writingFoldKey.getState(state) ?? new Set<string>();
            const hidden: Decoration[] = [];
            state.doc.forEach((node, position) => {
              if (
                node.type.name !== "heading" ||
                !folded.has(node.attrs.sectionId)
              )
                return;
              const range = writingSectionRange(state.doc, position + 1);
              if (!range) return;
              hidden.push(
                Decoration.node(position, position + node.nodeSize, {
                  "data-section-folded": "true",
                  "aria-label": `${node.textContent}, folded section`,
                }),
              );
              state.doc.forEach((child, at) => {
                if (at > position && at < range.to)
                  hidden.push(
                    Decoration.node(at, at + child.nodeSize, {
                      class: "hidden print:block",
                    }),
                  );
              });
            });
            return DecorationSet.create(state.doc, hidden);
          },
        },
      }),
    ];
  },
});

export function ensureWritingSectionId(editor: Editor): string | null {
  if (editor.isDestroyed || editor.isEditable === false) return null;
  const range = writingSectionRange(
    editor.state.doc,
    editor.state.selection.from,
  );
  if (!range) return null;
  if (range.id) {
    let occurrences = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "heading" && node.attrs.sectionId === range.id)
        occurrences += 1;
    });
    if (occurrences === 1) return range.id;
  }
  const id = `section_${crypto.randomUUID()}`;
  const node = editor.state.doc.nodeAt(range.from)!;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(range.from, undefined, {
      ...node.attrs,
      sectionId: id,
    }),
  );
  return id;
}

export function toggleWritingSection(editor: Editor): boolean {
  const id = ensureWritingSectionId(editor);
  if (!id) return false;
  editor.view.dispatch(
    editor.state.tr.setMeta(writingFoldKey, id).setMeta("addToHistory", false),
  );
  return true;
}
