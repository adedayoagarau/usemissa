import assert from "node:assert/strict";
import { test } from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  documentText,
  plainTextToDocument,
  toCanvasPage,
} from "./writing-document.ts";
import {
  EXPORT_IMAGE_MAX,
  inspectWritingExport,
  exportDocx,
  exportEpub,
  exportNodes,
  exportPlainText,
  importPlainText,
  importWritingFile,
  nodeXhtml,
  validateDocxArchive,
  xmlEscape,
  type ExportMetadata,
} from "./writing-export.ts";

const metadata: ExportMetadata = {
  title: "A <title> & a poem",
  author: "Adédáyọ̀ & friends",
  language: "yo",
  preset: "manuscript",
  flattenCanvas: false,
};
const words = "  Adédáyọ̀   日本語 😀\tthin  ";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXlEAAAAASUVORK5CYII=";
function sample() {
  const document = plainTextToDocument("", "literata");
  document.pages[0]!.content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Heading" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: words,
            marks: [
              { type: "bold" },
              { type: "italic" },
              { type: "underline" },
            ],
          },
          { type: "hardBreak" },
          { type: "text", text: "next" },
        ],
      },
      { type: "paragraph" },
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Three" }] },
            ],
          },
        ],
      },
    ],
  };
  return document;
}

test("DOCX contains real OPC parts, metadata, rich paragraphs, tabs and Unicode whitespace", async () => {
  const bytes = await exportDocx(sample(), metadata);
  validateDocxArchive(bytes);
  const files = unzipSync(bytes);
  assert.ok(files["[Content_Types].xml"]);
  assert.ok(files["_rels/.rels"]);
  const xml = strFromU8(files["word/document.xml"]!);
  assert.match(xml, /w:pStyle w:val="Heading2"/);
  assert.match(xml, /xml:space="preserve">  Adédáyọ̀   日本語 😀/);
  assert.match(xml, /<w:tab\/>/);
  assert.match(xml, /<w:br\/>/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /<w:u/);
  assert.match(xml, /<w:numPr>/);
  assert.match(strFromU8(files["word/numbering.xml"]!), /w:start w:val="3"/);
  assert.match(strFromU8(files["word/styles.xml"]!), /w:lang w:val="yo"/);
  const core = strFromU8(files["docProps/core.xml"]!);
  assert.match(core, /A &lt;title&gt; &amp; a poem/);
  assert.match(core, /Adédáyọ̀ &amp; friends/);
});

test("EPUB stores mimetype first without extras or compression and packages valid XML references", async () => {
  const bytes = await exportEpub(sample(), metadata);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(8, true), 0, "mimetype stored");
  assert.equal(view.getUint16(28, true), 0, "mimetype has no ZIP extra fields");
  assert.equal(
    strFromU8(bytes.subarray(30, 30 + view.getUint16(26, true))),
    "mimetype",
  );
  const files = unzipSync(bytes);
  assert.equal(strFromU8(files.mimetype!), "application/epub+zip");
  assert.match(
    strFromU8(files["META-INF/container.xml"]!),
    /EPUB\/package.opf/,
  );
  const opf = strFromU8(files["EPUB/package.opf"]!);
  assert.match(opf, /version="3.0"/);
  assert.match(opf, /properties="nav"/);
  assert.match(opf, /<dc:language>yo<\/dc:language>/);
  assert.match(opf, /<dc:title>A &lt;title&gt; &amp; a poem<\/dc:title>/);
  assert.match(opf, /<meta property="dcterms:modified">\d{4}-.*Z<\/meta>/);
  assert.match(opf, /<itemref idref="text"/);
  const text = strFromU8(files["EPUB/text.xhtml"]!);
  assert.ok(text.includes(words));
  assert.match(text, /<h2>Heading<\/h2>/);
  assert.match(text, /<u><em><strong>/);
  assert.match(text, /<br\/>/);
  assert.match(text, /<ol start="3">/);
  assert.match(strFromU8(files["EPUB/style.css"]!), /white-space:pre-wrap/);
  assert.match(strFromU8(files["EPUB/nav.xhtml"]!), /epub:type="toc"/);
});

function illustratedTable() {
  const document = sample();
  document.pages[0]!.content.content!.push(
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 2, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Poem & author" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "paragraph", content: [{ type: "text", text: words }] },
              ],
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Níkẹ́" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        src: `data:image/png;base64,${png}`,
        alt: 'A <local> image & "description"',
      },
    },
  );
  return document;
}

test("DOCX embeds table spans, header rows, PNG bytes and image descriptions", async () => {
  const files = unzipSync(await exportDocx(illustratedTable(), metadata));
  const xml = strFromU8(files["word/document.xml"]!);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.match(xml, /<w:gridSpan w:val="2"/);
  assert.match(xml, /Poem &amp; author/);
  assert.match(xml, /Níkẹ́/);
  assert.match(
    xml,
    /descr="A &lt;local&gt; image &amp; &quot;description&quot;"/,
  );
  const imagePath = Object.keys(files).find((path) =>
    /^word\/media\/.*\.png$/.test(path),
  );
  assert.ok(imagePath);
  assert.equal(Buffer.from(files[imagePath]!).toString("base64"), png);
  assert.match(
    strFromU8(files["word/_rels/document.xml.rels"]!),
    /relationships\/image/,
  );
  assert.match(
    strFromU8(files["[Content_Types].xml"]!),
    /ContentType="image\/png"/,
  );
});

test("EPUB embeds local images in manifest and keeps semantic table headers and spans", async () => {
  const files = unzipSync(await exportEpub(illustratedTable(), metadata));
  const xml = strFromU8(files["EPUB/text.xhtml"]!);
  assert.match(
    xml,
    /<table><tbody><tr><th scope="col" colspan="2" rowspan="1">/,
  );
  assert.match(xml, /Poem &amp; author/);
  assert.ok(xml.includes(words));
  assert.match(
    xml,
    /<img src="images\/image-1.png" alt="A &lt;local&gt; image &amp; &quot;description&quot;" style="width:100%;height:auto"\/>/,
  );
  assert.equal(
    Buffer.from(files["EPUB/images/image-1.png"]!).toString("base64"),
    png,
  );
  assert.match(
    strFromU8(files["EPUB/package.opf"]!),
    /href="images\/image-1.png" media-type="image\/png"/,
  );
});

test("export rejects remote, unsupported and oversized images instead of fetching or losing them", async () => {
  for (const src of [
    "https://example.com/remote.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    `data:image/png;base64,${Buffer.alloc(EXPORT_IMAGE_MAX + 1).toString("base64")}`,
  ]) {
    const document = sample();
    document.pages[0]!.content.content!.push({
      type: "image",
      attrs: { src, alt: "image" },
    });
    await assert.rejects(
      exportDocx(document, metadata),
      /local PNG|PNG and JPEG/,
    );
    await assert.rejects(
      exportEpub(document, metadata),
      /local PNG|PNG and JPEG/,
    );
  }
});

test("canvas exports require an explicit choice and flatten only in reading order", async () => {
  const document = sample();
  document.pages[0] = toCanvasPage(document.pages[0]!, document.pageSize);
  assert.throws(() => exportNodes(document, false), /Choose to turn canvas/);
  await assert.rejects(exportDocx(document, metadata), /Choose to turn canvas/);
  await assert.rejects(exportEpub(document, metadata), /Choose to turn canvas/);
  assert.deepEqual(
    exportNodes(document, true)[0],
    sample().pages[0]!.content.content,
  );
});

test("plain text imports preserve whitespace and Unicode and reject oversize pieces", async () => {
  const text = `${words}\r\n\r\nlast\n`;
  const imported = importPlainText(text, "literata");
  assert.equal(documentText(imported), text.replaceAll("\r\n", "\n"));
  assert.throws(
    () => importPlainText("x".repeat(2_000_000), "literata"),
    /too long/,
  );
  const file = new File([text], "Poem.txt");
  assert.equal(
    documentText(await importWritingFile(file, "literata")),
    text.replaceAll("\r\n", "\n"),
  );
  await assert.rejects(
    importWritingFile(
      new File([new Uint8Array([0xff])], "bad.txt"),
      "literata",
    ),
    /UTF-8/,
  );
});

test("DOCX import does not insert foreign HTML and archive bounds reject compressed expansion", async () => {
  const document = plainTextToDocument(
    words + "\n<script>alert(1)</script>",
    "literata",
  );
  const docx = await exportDocx(document, metadata);
  const imported = await importWritingFile(
    new File([new Uint8Array(docx)], "poem.docx"),
    "literata",
  );
  assert.ok(documentText(imported).includes(words));
  assert.ok(
    documentText(imported).includes("<script>alert(1)</script>"),
    "foreign markup remains literal text",
  );
  assert.equal(imported.pages[0]!.content.content?.[0]?.type, "paragraph");
  const bad = zipSync({
    "word/document.xml": strToU8("x".repeat(21 * 1024 * 1024)),
  });
  assert.throws(() => validateDocxArchive(bad), /20 MB/);
  assert.throws(
    () => validateDocxArchive(new Uint8Array([1, 2, 3])),
    /readable DOCX/,
  );
  assert.throws(
    () => validateDocxArchive(zipSync({ "other.xml": strToU8("x") })),
    /does not contain/,
  );
});

test("DOCX import bounds actual expanded bytes even when ZIP size declarations are forged", async () => {
  const bad = zipSync({
    "word/document.xml": strToU8("x".repeat(21 * 1024 * 1024)),
  });
  const view = new DataView(bad.buffer, bad.byteOffset, bad.byteLength);
  view.setUint32(22, 1, true);
  for (let i = 0; i < bad.length - 46; i++) {
    if (view.getUint32(i, true) === 0x02014b50) {
      view.setUint32(i + 24, 1, true);
      break;
    }
  }
  validateDocxArchive(bad);
  await assert.rejects(
    importWritingFile(
      new File([new Uint8Array(bad)], "forged.docx"),
      "literata",
    ),
    /20 MB/,
  );
});

test("XHTML safely escapes text and strips unsafe link URLs; XML-invalid text fails visibly", () => {
  assert.equal(xmlEscape('<script> & "'), "&lt;script&gt; &amp; &quot;");
  assert.throws(() => xmlEscape("bad\u0000character"), /character/);
  assert.throws(() => xmlEscape("bad\ud800"), /character/);
  assert.equal(
    nodeXhtml({
      type: "text",
      text: "<img>",
      marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    }),
    "&lt;img&gt;",
  );
  assert.equal(
    nodeXhtml({
      type: "text",
      text: "safe",
      marks: [
        { type: "link", attrs: { href: "https://example.com/?x=1&y=2" } },
      ],
    }),
    '<a href="https://example.com/?x=1&amp;y=2">safe</a>',
  );
});

test("export report describes unsupported styles and rejects unsupported nodes before download", () => {
  const document = sample();
  document.pages[0]!.content.content!.push({
    type: "paragraph",
    content: [
      { type: "text", text: "highlight", marks: [{ type: "unknownStyle" }] },
    ],
  });
  assert.ok(
    inspectWritingExport(document, "docx", false).warnings.some((item) =>
      item.includes("unknownStyle"),
    ),
  );
  document.pages[0]!.content.content!.push({ type: "unknownWidget" });
  assert.ok(
    inspectWritingExport(document, "epub", false).errors.some((item) =>
      item.includes("unknownWidget"),
    ),
  );
});

test("tasks, captions and stable-ID footnotes export as readable numbered notes", async () => {
  const document = plainTextToDocument("", "literata");
  document.pages[0]!.content.content = [
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Finished" }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Claim" },
        { type: "footnote", attrs: { id: "note_stable", note: "Source note" } },
      ],
    },
    {
      type: "image",
      attrs: {
        src: `data:image/png;base64,${png}`,
        alt: "One pixel",
        caption: "Caption here",
      },
    },
  ];
  const docx = unzipSync(await exportDocx(document, metadata));
  assert.match(
    strFromU8(docx["word/document.xml"]!),
    /footnoteReference[^>]*w:id="1"/,
  );
  assert.match(strFromU8(docx["word/footnotes.xml"]!), /Source note/);
  assert.match(strFromU8(docx["word/document.xml"]!), /Caption here/);
  const epub = unzipSync(await exportEpub(document, metadata));
  assert.match(strFromU8(epub["EPUB/text.xhtml"]!), /id="note-1"/);
  assert.match(
    strFromU8(epub["EPUB/text.xhtml"]!),
    /<figcaption>Caption here<\/figcaption>/,
  );
  assert.match(strFromU8(epub["EPUB/text.xhtml"]!), /☑/);
});

test("proposed-reading exports omit tracked deletions, remove insertion marks and keep image width", async () => {
  const document = sample();
  document.pages[0]!.content.content = [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Old",
          marks: [{ type: "writingDeletion", attrs: { id: "deleted" } }],
        },
        {
          type: "text",
          text: "New",
          marks: [
            { type: "writingInsertion", attrs: { id: "inserted" } },
            { type: "bold" },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        src: `data:image/png;base64,${png}`,
        alt: "Small image",
        widthPercent: 25,
      },
    },
  ];
  const pages = exportNodes(document, false);
  assert.equal(pages[0]![0]!.content!.length, 1);
  assert.deepEqual(pages[0]![0]!.content![0]!.marks, [{ type: "bold" }]);
  assert.equal(inspectWritingExport(document, "txt", false).preview, "New\n");
  const epub = unzipSync(await exportEpub(document, metadata));
  const text = strFromU8(epub["EPUB/text.xhtml"]!);
  assert.ok(!text.includes("Old"));
  assert.match(text, /width:25%;height:auto/);
  const docx = unzipSync(await exportDocx(document, metadata));
  assert.ok(!strFromU8(docx["word/document.xml"]!).includes("Old"));
  assert.ok(
    document.pages[0]!.content.content![0]!.content![0]!.marks!.some(
      (mark) => mark.type === "writingDeletion",
    ),
  );
});

test("plain text copies preserve numbered footnote text",()=>{
 const document=sample();document.pages[0]!.content.content=[{type:"paragraph",content:[{type:"text",text:"Words"},{type:"footnote",attrs:{id:"stable",note:"Source context"}}]}];
 assert.equal(exportPlainText(document,false),"Words[1]\n\nNotes\n[1] Source context");
});
