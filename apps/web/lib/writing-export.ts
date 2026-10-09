import {
  documentText,
  plainTextToDocument,
  readingOrder,
  WRITING_DOCUMENT_MAX,
  type JsonNode,
  type WritingDocument,
} from "./writing-document";

/** Export presets format a copy; they never change the writing document. */
export const EXPORT_PRESETS = {
  article: {
    label: "Article",
    description: "A4, Georgia 11 pt, single spaced",
    font: "Georgia",
    size: 11,
    line: 1,
    width: 210,
    height: 297,
    margin: 25.4,
  },
  report: {
    label: "Report",
    description: "A4, Arial 11 pt, 1.15 spacing",
    font: "Arial",
    size: 11,
    line: 1.15,
    width: 210,
    height: 297,
    margin: 25.4,
  },
  manuscript: {
    label: "Manuscript",
    description: "US Letter, Times New Roman 12 pt, double spaced",
    font: "Times New Roman",
    size: 12,
    line: 2,
    width: 215.9,
    height: 279.4,
    margin: 25.4,
  },
  book: {
    label: "Book",
    description: "A5, Georgia 11 pt, 1.3 spacing",
    font: "Georgia",
    size: 11,
    line: 1.3,
    width: 148,
    height: 210,
    margin: 19.05,
  },
} as const;
export type ExportPreset = keyof typeof EXPORT_PRESETS;
export type ExportMetadata = {
  title: string;
  author: string;
  language: string;
  preset: ExportPreset;
  flattenCanvas: boolean;
};
export const IMPORT_FILE_MAX = 10 * 1024 * 1024;
export const IMPORT_EXPANDED_MAX = 20 * 1024 * 1024;
export const EXPORT_IMAGE_MAX = 128 * 1024;

export type ExportReport = {
  preview: string;
  warnings: string[];
  errors: string[];
};
/** Inspect every node before generating a copy; report omissions rather than hiding them. */
export function inspectWritingExport(
  document: WritingDocument,
  format: "docx" | "epub" | "txt",
  flattenCanvas: boolean,
): ExportReport {
  const warnings = new Set<string>();
  const errors = new Set<string>();
  const supportedNodes = new Set([
    "doc",
    "text",
    "hardBreak",
    "horizontalRule",
    "image",
    "table",
    "tableRow",
    "tableCell",
    "tableHeader",
    "heading",
    "paragraph",
    "blockquote",
    "bulletList",
    "orderedList",
    "listItem",
    "codeBlock",
    "taskList",
    "taskItem",
    "footnote",
  ]);
  const supportedMarks = new Set([
    "bold",
    "italic",
    "underline",
    "strike",
    "superscript",
    "subscript",
    "code",
    "link",
    "highlight",
  ]);
  function visit(node: JsonNode) {
    if (!supportedNodes.has(node.type))
      errors.add(`The ${node.type} element cannot be exported.`);
    for (const mark of node.marks ?? []) {
      if (!supportedMarks.has(mark.type))
        warnings.add(`The ${mark.type} style is omitted.`);
      if (mark.type === "link" && !safeLink(mark.attrs?.href))
        warnings.add(
          "Internal or unsupported links become plain text in the exported copy.",
        );
      if (mark.type === "highlight" && format !== "txt")
        warnings.add("Highlight colour can change in the exported copy.");
    }
    if (node.type === "image" && format !== "txt") {
      try {
        localImage(node);
      } catch (error) {
        errors.add(
          error instanceof Error
            ? error.message
            : "This image cannot be exported.",
        );
      }
    }

    if (node.type === "taskList")
      warnings.add("Task lists become checked or unchecked text items.");
    for (const child of node.content ?? []) visit(child);
  }
  try {
    exportNodes(document, flattenCanvas).flat().forEach(visit);
  } catch (error) {
    errors.add(
      error instanceof Error
        ? error.message
        : "This layout cannot be exported.",
    );
  }
  if (document.pages.some((page) => page.kind === "canvas"))
    warnings.add(
      "Canvas positions and rotations are replaced by reading-order text.",
    );
  if (format === "txt")
    warnings.add("Plain text omits formatting, tables, images and links.");
  else
    warnings.add(
      format === "epub"
        ? "EPUB reflows; page positions, writer fonts and page spacing can change."
        : "DOCX uses the chosen preset; writer fonts, margins and page spacing are replaced.",
    );
  warnings.add(
    "Exports use the proposed reading: tracked deletions are omitted and insertion markers are removed.",
  );
  return {
    preview: exportPlainText(document, true),
    warnings: [...warnings],
    errors: [...errors],
  };
}

/** Only local PNG/JPEG image bytes are supported; exports never fetch a URL. */
function localImage(node: JsonNode): {
  bytes: Uint8Array;
  type: "png" | "jpg";
  mime: string;
  width: number;
  height: number;
  alt: string;
} {
  const src = node.attrs?.src;
  if (
    typeof src !== "string" ||
    src.length > Math.ceil((EXPORT_IMAGE_MAX * 4) / 3) + 100
  )
    throw new Error(
      "Use a local PNG or JPEG image smaller than 128 KB, or use Print / PDF.",
    );
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(src);
  if (!match)
    throw new Error(
      "Only local PNG and JPEG images can be exported. Use Print / PDF for this image.",
    );
  let binary: string;
  try {
    binary = atob(match[2]!);
  } catch {
    throw new Error(
      "This image is not readable. Insert it again before exporting.",
    );
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length > EXPORT_IMAGE_MAX)
    throw new Error("Use a local PNG or JPEG image smaller than 128 KB.");
  let width = 320;
  let height = 240;
  if (match[1] === "png") {
    if (
      bytes.length < 24 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
    )
      throw new Error("This PNG image is not readable.");
    const view = new DataView(bytes.buffer);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    if (bytes[0] !== 255 || bytes[1] !== 216)
      throw new Error("This JPEG image is not readable.");
    for (let i = 2; i + 8 < bytes.length;) {
      if (bytes[i] !== 255) break;
      const marker = bytes[i + 1]!;
      if (marker === 0xda || marker === 0xd9) break;
      if (
        marker === 0xff ||
        marker === 0xd8 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        i += marker === 0xff ? 1 : 2;
        continue;
      }
      const length = bytes[i + 2]! * 256 + bytes[i + 3]!;
      if (length < 2 || i + 2 + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = bytes[i + 5]! * 256 + bytes[i + 6]!;
        width = bytes[i + 7]! * 256 + bytes[i + 8]!;
        break;
      }
      i += 2 + length;
    }
  }
  if (!width || !height || width > 10000 || height > 10000)
    throw new Error("This image's dimensions are unsupported.");
  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
  xmlEscape(alt);
  return {
    bytes,
    type: match[1] === "png" ? "png" : "jpg",
    mime: match[1] === "png" ? "image/png" : "image/jpeg",
    width,
    height,
    alt,
  };
}

function imageWidth(node: JsonNode): number {
  const value = node.attrs?.widthPercent;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.max(25, Math.min(100, value)))
    : 100;
}

function cellSpan(value: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 50
    ? value
    : 1;
}

export function exportFilename(title: string): string {
  return (
    title
      .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_")
      .replace(/[. ]+$/, "")
      .slice(0, 120) || "Untitled"
  );
}

function metadataValues(metadata: ExportMetadata): ExportMetadata {
  const title = metadata.title.trim();
  if (!title || title.length > 300)
    throw new Error("Enter a title with up to 300 characters.");
  if (metadata.author.length > 200)
    throw new Error("Use an author name with up to 200 characters.");
  let language: string;
  try {
    language = Intl.getCanonicalLocales(metadata.language.trim())[0]!;
  } catch {
    throw new Error("Enter a language code such as en, fr or en-GB.");
  }
  if (!language)
    throw new Error("Enter a language code such as en, fr or en-GB.");
  if (!(metadata.preset in EXPORT_PRESETS))
    throw new Error("Choose an export preset.");
  xmlEscape(title);
  xmlEscape(metadata.author);
  return { ...metadata, title, author: metadata.author.trim(), language };
}

export function exportNodes(
  document: WritingDocument,
  flattenCanvas: boolean,
): JsonNode[][] {
  if (!flattenCanvas && document.pages.some((page) => page.kind === "canvas"))
    throw new Error(
      "Choose to turn canvas boxes into reading-order text, or use Print / PDF to keep their positions.",
    );
  let footnote = 0;
  const clean = (node: JsonNode): JsonNode[] =>
    node.marks?.some((mark) => mark.type === "writingDeletion")
      ? []
      : [
          {
            ...node,
            ...(node.marks
              ? {
                  marks: node.marks.filter(
                    (mark) => mark.type !== "writingInsertion",
                  ),
                }
              : {}),
            ...(node.content ? { content: node.content.flatMap(clean) } : {}),
          },
        ];
  const numberNotes = (node: JsonNode): JsonNode => ({
    ...node,
    ...(node.type === "footnote"
      ? { attrs: { ...node.attrs, id: String(++footnote) } }
      : {}),
    ...(node.content ? { content: node.content.map(numberNotes) } : {}),
  });
  return document.pages
    .map((page) =>
      page.kind === "canvas"
        ? readingOrder(page.blocks ?? []).flatMap(
            (block) => block.content.content ?? [],
          )
        : (page.content.content ?? []),
    )
    .map((nodes) => nodes.flatMap(clean).map(numberNotes));
}

/** XML 1.0 rejects these controls; fail instead of silently changing the writer's text. */
export function xmlEscape(text: string): string {
  if (
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(
      text,
    )
  )
    throw new Error(
      "This text contains a character that XML documents cannot keep. Remove that character before exporting.",
    );
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeLink(value: unknown): string | null {
  return typeof value === "string" && /^(https?:|mailto:)/i.test(value)
    ? value
    : null;
}

export function nodeXhtml(
  node: JsonNode,
  imagePath?: (node: JsonNode) => string,
): string {
  if (node.type === "text") {
    let text = xmlEscape(node.text ?? "");
    for (const mark of node.marks ?? []) {
      const tag = (
        {
          highlight: "mark",
          bold: "strong",
          italic: "em",
          underline: "u",
          strike: "s",
          superscript: "sup",
          subscript: "sub",
          code: "code",
        } as Record<string, string>
      )[mark.type];
      if (tag) text = `<${tag}>${text}</${tag}>`;
      if (mark.type === "link") {
        const href = safeLink(mark.attrs?.href);
        if (href) text = `<a href="${xmlEscape(href)}">${text}</a>`;
      }
    }
    return text;
  }
  if (node.type === "footnote")
    return `<a href="#note-${xmlEscape(String(node.attrs?.id ?? ""))}" epub:type="noteref"><sup>${xmlEscape(String(node.attrs?.id ?? ""))}</sup></a>`;
  if (node.type === "taskList")
    return `<ul>${(node.content ?? []).map((child) => nodeXhtml(child, imagePath)).join("")}</ul>`;
  if (node.type === "taskItem")
    return `<li>${node.attrs?.checked ? "☑" : "☐"} ${(node.content ?? []).map((child) => nodeXhtml(child, imagePath)).join("")}</li>`;
  if (node.type === "hardBreak") return "<br/>";
  if (node.type === "horizontalRule") return "<hr/>";
  if (node.type === "image") {
    const image = localImage(node);
    if (!imagePath)
      throw new Error("An image file must be included in this export.");
    return `<figure><img src="${xmlEscape(imagePath(node))}" alt="${xmlEscape(image.alt)}" style="width:${imageWidth(node)}%;height:auto"/>${typeof node.attrs?.caption === "string" && node.attrs.caption ? `<figcaption>${xmlEscape(node.attrs.caption)}</figcaption>` : ""}</figure>`;
  }
  const content = (node.content ?? [])
    .map((child) => nodeXhtml(child, imagePath))
    .join("");
  if (node.type === "doc") return content;
  if (node.type === "table") return `<table><tbody>${content}</tbody></table>`;
  if (node.type === "tableRow") return `<tr>${content}</tr>`;
  if (node.type === "tableCell" || node.type === "tableHeader") {
    const tag = node.type === "tableHeader" ? "th" : "td";
    return `<${tag}${tag === "th" ? ' scope="col"' : ""} colspan="${cellSpan(node.attrs?.colspan)}" rowspan="${cellSpan(node.attrs?.rowspan)}">${content}</${tag}>`;
  }
  const tag =
    node.type === "heading"
      ? `h${Math.max(1, Math.min(6, Number(node.attrs?.level) || 1))}`
      : (
          {
            paragraph: "p",
            blockquote: "blockquote",
            bulletList: "ul",
            orderedList: "ol",
            listItem: "li",
            codeBlock: "pre",
          } as Record<string, string>
        )[node.type];
  if (!tag)
    throw new Error(
      `The ${node.type} text element is not supported by this export.`,
    );
  const align = ["left", "right", "center", "justify"].includes(
    String(node.attrs?.textAlign),
  )
    ? ` class="align-${node.attrs?.textAlign}"`
    : "";
  const sectionId =
    node.type === "heading" &&
    typeof node.attrs?.sectionId === "string" &&
    /^section_[A-Za-z0-9_-]+$/.test(node.attrs.sectionId)
      ? ` id="${xmlEscape(node.attrs.sectionId)}"`
      : "";
  const start =
    node.type === "orderedList" && Number.isInteger(node.attrs?.start)
      ? ` start="${Number(node.attrs?.start)}"`
      : "";
  return `<${tag}${sectionId}${align}${start}>${content || (tag === "p" ? "<br/>" : "")}</${tag}>`;
}

/** A reflowable EPUB 3 package; pages become reading-order sections, not fixed layouts. */
export async function exportEpub(
  document: WritingDocument,
  input: ExportMetadata,
): Promise<Uint8Array> {
  const metadata = metadataValues(input);
  const pages = exportNodes(document, metadata.flattenCanvas);
  const { zipSync, strToU8 } = await import("fflate");
  const esc = xmlEscape;
  const preset = EXPORT_PRESETS[metadata.preset];
  const identifier = `urn:uuid:${crypto.randomUUID()}`;
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const xhtml = (title: string, body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(metadata.language)}" lang="${esc(metadata.language)}"><head><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`;
  const images = new Map<
    JsonNode,
    ReturnType<typeof localImage> & { path: string }
  >();
  const collectImages = (node: JsonNode) => {
    if (node.type === "image" && !images.has(node)) {
      const image = localImage(node);
      images.set(node, {
        ...image,
        path: `images/image-${images.size + 1}.${image.type}`,
      });
    }
    for (const child of node.content ?? []) collectImages(child);
  };
  pages.flat().forEach(collectImages);
  const notes: JsonNode[] = [];
  const collectNotes = (node: JsonNode) => {
    if (node.type === "footnote") notes.push(node);
    (node.content ?? []).forEach(collectNotes);
  };
  pages.flat().forEach(collectNotes);
  const content = pages
    .map(
      (nodes, i) =>
        `<section id="section-${i + 1}" aria-label="Section ${i + 1}">${nodes.map((node) => nodeXhtml(node, (image) => images.get(image)!.path)).join("")}</section>`,
    )
    .join("");
  const endnotes = notes.length
    ? `<section aria-label="Notes"><h2>Notes</h2>${notes.map((node) => `<aside epub:type="footnote" id="note-${xmlEscape(String(node.attrs?.id))}"><p>${xmlEscape(String(node.attrs?.id))}. ${xmlEscape(String(node.attrs?.note ?? ""))}</p></aside>`).join("")}</section>`
    : "";
  const nav = `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol><li><a href="text.xhtml">${esc(metadata.title)}</a><ol>${pages.map((_, i) => `<li><a href="text.xhtml#section-${i + 1}">Section ${i + 1}</a></li>`).join("")}</ol></li></ol></nav>`;
  const imageManifest = [...images.values()]
    .map(
      (image, i) =>
        `<item id="image-${i + 1}" href="${image.path}" media-type="${image.mime}"/>`,
    )
    .join("");
  const opf = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${esc(metadata.language)}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${identifier}</dc:identifier><dc:title>${esc(metadata.title)}</dc:title><dc:language>${esc(metadata.language)}</dc:language>${metadata.author ? `<dc:creator>${esc(metadata.author)}</dc:creator>` : ""}<meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="text" href="text.xhtml" media-type="application/xhtml+xml"/><item id="style" href="style.css" media-type="text/css"/>${imageManifest}</manifest><spine><itemref idref="text"/></spine></package>`;
  // Object insertion order + per-entry level zero keep mimetype first and stored, with no extra field.
  return zipSync(
    {
      mimetype: [strToU8("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      ),
      "EPUB/package.opf": strToU8(opf),
      "EPUB/nav.xhtml": strToU8(xhtml("Contents", nav)),
      "EPUB/text.xhtml": strToU8(xhtml(metadata.title, content + endnotes)),
      "EPUB/style.css": strToU8(
        `body{line-height:${preset.line}}p,h1,h2,h3,h4,h5,h6,li,pre{white-space:pre-wrap;tab-size:4}p{min-height:1em}section+section{break-before:page}table{border-collapse:collapse}td,th{border:1px solid;padding:.5em}img{max-width:100%;height:auto}.align-left{text-align:left}.align-center{text-align:center}.align-right{text-align:right}.align-justify{text-align:justify}`,
      ),
      ...Object.fromEntries(
        [...images.values()].map((image) => [
          `EPUB/${image.path}`,
          image.bytes,
        ]),
      ),
    },
    { level: 6 },
  );
}

/** DOCX runs preserve literal spaces, real tab elements, inline marks and hard breaks. */
export async function exportDocx(
  document: WritingDocument,
  input: ExportMetadata,
): Promise<Uint8Array> {
  const metadata = metadataValues(input);
  const pages = exportNodes(document, metadata.flattenCanvas);
  const d = await import("docx");
  const preset = EXPORT_PRESETS[metadata.preset];
  const footnotes: Record<string, { children: import("docx").Paragraph[] }> =
    {};
  const numbering: {
    reference: string;
    levels: import("docx").ILevelsOptions[];
  }[] = [];
  const runs = (node: JsonNode): import("docx").ParagraphChild[] => {
    if (node.type === "footnote") {
      const id = String(node.attrs?.id);
      const note = String(node.attrs?.note ?? "");
      xmlEscape(note);
      footnotes[id] = {
        children: [new d.Paragraph({ children: [new d.TextRun(note)] })],
      };
      return [new d.FootnoteReferenceRun(Number(id))];
    }
    if (node.type === "hardBreak") return [new d.TextRun({ break: 1 })];
    if (node.type === "image") {
      const image = localImage(node);
      const maxWidth = ((preset.width - preset.margin * 2) * 96) / 25.4;
      const maxHeight = ((preset.height - preset.margin * 2) * 96) / 25.4;
      const scale = Math.min(
        (maxWidth * imageWidth(node)) / 100 / image.width,
        maxHeight / image.height,
      );
      return [
        new d.ImageRun({
          type: image.type,
          data: image.bytes,
          transformation: {
            width: Math.max(1, Math.round(image.width * scale)),
            height: Math.max(1, Math.round(image.height * scale)),
          },
          altText: {
            name: image.alt || "Image",
            title: image.alt,
            description: image.alt,
          },
        }),
      ];
    }
    if (node.type !== "text") return (node.content ?? []).flatMap(runs);
    const text = node.text ?? "";
    xmlEscape(text);
    const marks = new Set((node.marks ?? []).map((mark) => mark.type));
    const children = text
      .split(/(\t|\n)/)
      .map((part) =>
        part === "\t"
          ? new d.Tab()
          : part === "\n"
            ? new d.CarriageReturn()
            : part,
      );
    const run = new d.TextRun({
      children,
      highlight: marks.has("highlight") ? "yellow" : undefined,
      bold: marks.has("bold"),
      boldComplexScript: marks.has("bold"),
      italics: marks.has("italic"),
      italicsComplexScript: marks.has("italic"),
      underline: marks.has("underline") ? {} : undefined,
      strike: marks.has("strike"),
      superScript: marks.has("superscript"),
      subScript: marks.has("subscript"),
      font: marks.has("code") ? "Courier New" : undefined,
    });
    const href = safeLink(
      node.marks?.find((mark) => mark.type === "link")?.attrs?.href,
    );
    return href
      ? [new d.ExternalHyperlink({ link: href, children: [run] })]
      : [run];
  };
  const headerText = (node: JsonNode): JsonNode => ({
    ...node,
    marks:
      node.type === "text"
        ? [...(node.marks ?? []), { type: "bold" }]
        : node.marks,
    content: node.content?.map(headerText),
  });
  const paragraphs = (
    nodes: JsonNode[],
    depth = 0,
    list?: { reference: string; level: number },
    quote = false,
  ): (import("docx").Paragraph | import("docx").Table)[] =>
    nodes.flatMap(
      (node): (import("docx").Paragraph | import("docx").Table)[] => {
        if (node.type === "doc")
          return paragraphs(node.content ?? [], depth, list, quote);
        if (node.type === "taskList")
          return paragraphs(node.content ?? [], depth);
        if (node.type === "taskItem")
          return paragraphs(
            [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: node.attrs?.checked ? "☑ " : "☐ " },
                  ...(node.content?.[0]?.content ?? []),
                ],
              },
              ...(node.content ?? []).slice(1),
            ],
            depth,
          );
        if (node.type === "listItem")
          return (node.content ?? []).flatMap((child, i) =>
            paragraphs([child], depth, i === 0 ? list : undefined, quote),
          );
        if (node.type === "blockquote")
          return paragraphs(node.content ?? [], depth, list, true);
        if (node.type === "image")
          return [
            new d.Paragraph({ children: runs(node) }),
            ...(typeof node.attrs?.caption === "string" && node.attrs.caption
              ? [
                  new d.Paragraph({
                    children: [
                      new d.TextRun({
                        text: node.attrs.caption,
                        italics: true,
                      }),
                    ],
                  }),
                ]
              : []),
          ];
        if (node.type === "table") {
          return [
            new d.Table({
              width: { size: 100, type: d.WidthType.PERCENTAGE },
              rows: (node.content ?? []).map(
                (row) =>
                  new d.TableRow({
                    tableHeader: row.content?.every(
                      (cell) => cell.type === "tableHeader",
                    ),
                    children: (row.content ?? []).map((cell) => {
                      const children = paragraphs(
                        cell.type === "tableHeader"
                          ? (cell.content ?? []).map(headerText)
                          : (cell.content ?? []),
                      );
                      if (!(children.at(-1) instanceof d.Paragraph))
                        children.push(new d.Paragraph({}));
                      return new d.TableCell({
                        children,
                        columnSpan: cellSpan(cell.attrs?.colspan),
                        rowSpan: cellSpan(cell.attrs?.rowspan),
                      });
                    }),
                  }),
              ),
            }),
          ];
        }
        if (node.type === "bulletList" || node.type === "orderedList") {
          const reference = `list-${numbering.length}`;
          const level = Math.min(depth, 8);
          numbering.push({
            reference,
            levels: Array.from({ length: 9 }, (_, i) => ({
              level: i,
              format:
                node.type === "bulletList"
                  ? d.LevelFormat.BULLET
                  : d.LevelFormat.DECIMAL,
              text: node.type === "bulletList" ? "•" : `%${i + 1}.`,
              start: Math.max(1, Number(node.attrs?.start) || 1),
              style: {
                paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } },
              },
            })),
          });
          return paragraphs(
            node.content ?? [],
            depth + 1,
            { reference, level },
            quote,
          );
        }
        if (
          !["paragraph", "heading", "codeBlock", "horizontalRule"].includes(
            node.type,
          )
        )
          throw new Error(
            `The ${node.type} text element is not supported by this export.`,
          );
        const align = (
          {
            left: d.AlignmentType.LEFT,
            center: d.AlignmentType.CENTER,
            right: d.AlignmentType.RIGHT,
            justify: d.AlignmentType.JUSTIFIED,
          } as const
        )[
          String(node.attrs?.textAlign) as
            "left" | "center" | "right" | "justify"
        ];
        return [
          new d.Paragraph({
            children: (node.content ?? []).flatMap(runs),
            border:
              node.type === "horizontalRule"
                ? {
                    bottom: {
                      style: d.BorderStyle.SINGLE,
                      size: 6,
                      color: "auto",
                    },
                  }
                : undefined,
            heading:
              node.type === "heading"
                ? [
                    d.HeadingLevel.HEADING_1,
                    d.HeadingLevel.HEADING_2,
                    d.HeadingLevel.HEADING_3,
                    d.HeadingLevel.HEADING_4,
                    d.HeadingLevel.HEADING_5,
                    d.HeadingLevel.HEADING_6,
                  ][
                    Math.max(
                      0,
                      Math.min(5, (Number(node.attrs?.level) || 1) - 1),
                    )
                  ]
                : undefined,
            alignment: align,
            numbering: list,
            indent: quote ? { left: 720, right: 720 } : undefined,
            spacing: { line: Math.round(preset.line * 240), after: 0 },
          }),
        ];
      },
    );
  const children = pages.flatMap((nodes, i) => [
    ...(i && !document.pages[i]?.continues
      ? [new d.Paragraph({ children: [new d.PageBreak()] })]
      : []),
    ...paragraphs(nodes),
  ]);
  const twips = (mm: number) => Math.round((mm * 1440) / 25.4);
  const file = new d.Document({
    title: metadata.title,
    creator: metadata.author,
    description: `Missa ${metadata.preset} export`,
    footnotes,
    numbering: { config: numbering },
    styles: {
      default: {
        document: {
          run: {
            font: preset.font,
            size: preset.size * 2,
            language: { value: metadata.language },
          },
          paragraph: {
            spacing: { line: Math.round(preset.line * 240), after: 0 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twips(preset.width), height: twips(preset.height) },
            margin: {
              top: twips(preset.margin),
              right: twips(preset.margin),
              bottom: twips(preset.margin),
              left: twips(preset.margin),
            },
          },
        },
        children,
      },
    ],
  });
  return new Uint8Array(await d.Packer.toArrayBuffer(file));
}

/** Check the ZIP directory before a DOCX parser expands anything. ZIP64/encrypted imports are unsupported. */
export function validateDocxArchive(bytes: Uint8Array): void {
  if (bytes.length > IMPORT_FILE_MAX)
    throw new Error("Choose a file smaller than 10 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("This file is not a readable DOCX archive.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  if (
    count > 2000 ||
    offset === 0xffffffff ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true)
  )
    throw new Error(
      "This DOCX archive is too large or uses an unsupported ZIP format.",
    );
  let expanded = 0;
  let hasDocument = false;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error("This DOCX archive is damaged.");
    const size = view.getUint32(offset + 24, true);
    expanded += size;
    if (expanded > IMPORT_EXPANDED_MAX || view.getUint16(offset + 8, true) & 1)
      throw new Error("This DOCX is encrypted or expands beyond 20 MB.");
    const nameLength = view.getUint16(offset + 28, true);
    if (offset + 46 + nameLength > end)
      throw new Error("This DOCX archive is damaged.");
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    hasDocument ||= name === "word/document.xml";
    offset +=
      46 +
      nameLength +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
  if (!hasDocument)
    throw new Error("This archive does not contain a DOCX document.");
}

export function importPlainText(
  text: string,
  typeface: string,
): WritingDocument {
  let lines = 1;
  for (const char of text) if (char === "\n") lines++;
  if (text.length + lines * 21 > WRITING_DOCUMENT_MAX)
    throw new Error(
      "This text is too long for one piece. Split it into smaller files.",
    );
  const document = plainTextToDocument(
    text.replaceAll("\r\n", "\n").replaceAll("\r", "\n"),
    typeface,
  );
  if (JSON.stringify(document).length > WRITING_DOCUMENT_MAX)
    throw new Error(
      "This text is too long for one piece. Split it into smaller files.",
    );
  return document;
}

/** Bound actual inflated bytes too: ZIP directory sizes can be forged. Skip media entirely. */
async function boundedDocx(bytes: Uint8Array): Promise<Uint8Array> {
  const { Unzip, UnzipInflate, zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  let expanded = 0;
  let failure: Error | null = null;
  const archive = new Unzip((file) => {
    if (!/\.(xml|rels)$/i.test(file.name)) return;
    const chunks: Uint8Array[] = [];
    let length = 0;
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        failure = error;
        return;
      }
      expanded += chunk.length;
      if (expanded > IMPORT_EXPANDED_MAX) {
        failure = new Error("This DOCX expands beyond 20 MB.");
        return;
      }
      chunks.push(chunk);
      length += chunk.length;
      if (final) {
        const content = new Uint8Array(length);
        let offset = 0;
        for (const part of chunks) {
          content.set(part, offset);
          offset += part.length;
        }
        files[file.name] = content;
      }
    };
    file.start();
  });
  archive.register(UnzipInflate);
  // Small compressed chunks bound the work done before the output limit is checked.
  for (let offset = 0; offset < bytes.length; offset += 4096) {
    archive.push(
      bytes.subarray(offset, offset + 4096),
      offset + 4096 >= bytes.length,
    );
    if (failure) throw failure;
  }
  if (!files["word/document.xml"])
    throw new Error("This archive does not contain readable DOCX text.");
  return zipSync(files, { level: 0 });
}

/** Convert detached HTML into a bounded allowlist of document nodes; never insert foreign HTML. */
export function importDocxHtml(
  html: string,
  typeface: string,
): WritingDocument {
  const parsed = new DOMParser().parseFromString(
    html.replace(/<(?:img|iframe|object|embed)\b[^>]*>/gi, ""),
    "text/html",
  );
  function convert(
    node: Node,
    marks: NonNullable<JsonNode["marks"]> = [],
  ): JsonNode[] {
    if (node.nodeType === Node.TEXT_NODE)
      return node.textContent
        ? [
            {
              type: "text",
              text: node.textContent,
              ...(marks.length ? { marks } : {}),
            },
          ]
        : [];
    if (!(node instanceof Element)) return [];
    const tag = node.tagName.toLowerCase();
    if (
      ["script", "style", "iframe", "object", "embed", "img", "svg"].includes(
        tag,
      )
    )
      return [];
    if (tag === "br") return [{ type: "hardBreak" }];
    const mark = (
      {
        strong: "bold",
        b: "bold",
        em: "italic",
        i: "italic",
        u: "underline",
        s: "strike",
        sup: "superscript",
        sub: "subscript",
      } as Record<string, string>
    )[tag];
    const href = tag === "a" ? safeLink(node.getAttribute("href")) : null;
    const next = mark
      ? [...marks, { type: mark }]
      : href
        ? [...marks, { type: "link", attrs: { href } }]
        : marks;
    const content = Array.from(node.childNodes).flatMap((child) =>
      convert(child, next),
    );
    const type = (
      {
        p: "paragraph",
        blockquote: "blockquote",
        ul: "bulletList",
        ol: "orderedList",
        li: "listItem",
        table: "table",
        tr: "tableRow",
        td: "tableCell",
        th: "tableHeader",
      } as Record<string, string>
    )[tag];
    if (/^h[1-6]$/.test(tag))
      return [{ type: "heading", attrs: { level: Number(tag[1]) }, content }];
    if (type) {
      if (
        ["tableCell", "tableHeader", "listItem", "blockquote"].includes(type)
      ) {
        const blocks: JsonNode[] = [];
        let inline: JsonNode[] = [];
        const flush = () => {
          if (inline.length) {
            blocks.push({ type: "paragraph", content: inline });
            inline = [];
          }
        };
        for (const child of content) {
          if (["text", "hardBreak"].includes(child.type)) inline.push(child);
          else {
            flush();
            blocks.push(child);
          }
        }
        flush();
        if (!blocks.length) blocks.push({ type: "paragraph" });
        return [
          {
            type,
            content: blocks,
            ...(["tableCell", "tableHeader"].includes(type)
              ? {
                  attrs: {
                    colspan: cellSpan(Number(node.getAttribute("colspan"))),
                    rowspan: cellSpan(Number(node.getAttribute("rowspan"))),
                  },
                }
              : {}),
          },
        ];
      }
      return [{ type, content }];
    }
    return content;
  }
  const document = plainTextToDocument("", typeface);
  document.pages[0]!.content = {
    type: "doc",
    content: Array.from(parsed.body.childNodes)
      .flatMap((node) => convert(node))
      .filter((node) => node.type !== "text" || node.text?.trim()),
  };
  if (!document.pages[0]!.content.content?.length)
    document.pages[0]!.content.content = [{ type: "paragraph" }];
  if (JSON.stringify(document).length > WRITING_DOCUMENT_MAX)
    throw new Error(
      "This file is too long for one piece. Split it into smaller files.",
    );
  return document;
}

/** Bounded extraction never renders images, scripts or remote links. */
export async function importWritingFile(
  file: File,
  typeface: string,
): Promise<WritingDocument> {
  if (file.size > IMPORT_FILE_MAX)
    throw new Error("Choose a file smaller than 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.txt$/i.test(file.name)) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Save the text file as UTF-8 and try again.");
    }
    return importPlainText(text, typeface);
  }
  if (!/\.docx$/i.test(file.name))
    throw new Error("Choose a .txt or .docx file.");
  validateDocxArchive(bytes);
  const bounded = await boundedDocx(bytes);
  const { default: mammoth } = await import("mammoth/mammoth.browser.js");
  // Node consumers retain the safe text fallback; the writing-room browser uses rich allowlist conversion.
  if (typeof DOMParser === "undefined") {
    const result = await mammoth.extractRawText({
      arrayBuffer: new Uint8Array(bounded).buffer,
    });
    return importPlainText(result.value, typeface);
  }
  const result = await mammoth.convertToHtml(
    { arrayBuffer: new Uint8Array(bounded).buffer },
    { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
  );
  return importDocxHtml(result.value, typeface);
}

export function exportPlainText(
  document: WritingDocument,
  flattenCanvas: boolean,
): string {
  const notes: string[] = [];
  const plainNotes = (node: JsonNode): JsonNode => {
    if (node.type === "footnote") {
      const id = String(node.attrs?.id ?? "");
      notes.push(`[${id}] ${String(node.attrs?.note ?? "")}`);
      return { type: "text", text: `[${id}]` };
    }
    return {
      ...node,
      ...(node.content ? { content: node.content.map(plainNotes) } : {}),
    };
  };
  const pages = exportNodes(document, flattenCanvas).map((nodes) =>
    nodes.map(plainNotes),
  );
  const clean: WritingDocument = {
    ...document,
    pages: pages.map((content, i) => ({
      ...document.pages[i]!,
      kind: "flow" as const,
      blocks: undefined,
      content: { type: "doc", content },
    })),
  };
  const text = documentText(clean);
  return notes.length ? `${text}\n\nNotes\n${notes.join("\n")}` : text;
}
