import assert from "node:assert/strict";
import test from "node:test";
import { crc32 } from "node:zlib";
import {
  ACCEPTED_MEDIA_TYPES,
  mediaResponseHeaders,
  sniffUpload,
} from "./portfolio-media-delivery";

/** A real zip with stored (uncompressed) entries, so `file-type` reads it as one. */
function zip(entries: Record<string, string>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(content);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
const png = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082",
  "hex",
);

test("the upload type is read from the bytes, so PDF and ZIP are accepted and names mean nothing", async () => {
  assert.equal(await sniffUpload(pdf), "application/pdf");
  assert.equal(
    await sniffUpload(zip({ "press/readme.txt": "Press kit" })),
    "application/zip",
  );
  assert.equal(await sniffUpload(png), "image/png");
  assert.ok(ACCEPTED_MEDIA_TYPES.includes("application/pdf"));
  assert.ok(ACCEPTED_MEDIA_TYPES.includes("application/zip"));
});

test("anything else is refused, however it is named", async () => {
  const refused: [string, Uint8Array][] = [
    ["plain text", Buffer.from("Tech rider\n\nStage: 6m x 4m")],
    ["html", Buffer.from("<!doctype html><script>alert(1)</script>")],
    ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    [
      "a Windows program called rider.pdf",
      Buffer.from("4d5a90000300000004000000ffff0000b8000000", "hex"),
    ],
    ["an empty file", new Uint8Array()],
    [
      "a Word file, which is a zip with its own type",
      zip({
        "[Content_Types].xml":
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
        "_rels/.rels": "<Relationships/>",
        "word/document.xml": "<w:document/>",
      }),
    ],
    [
      "an Excel file",
      zip({
        "[Content_Types].xml":
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        "_rels/.rels": "<Relationships/>",
        "xl/workbook.xml": "<workbook/>",
      }),
    ],
    [
      "a Java archive",
      zip({ "META-INF/MANIFEST.MF": "Main-Class: Evil", "Evil.class": "x" }),
    ],
  ];
  for (const [label, bytes] of refused)
    assert.equal(await sniffUpload(bytes), undefined, label);
});

test("documents are always a download, named from the label and typed by what they are", () => {
  const headers = mediaResponseHeaders(
    "application/pdf",
    245_760,
    "Tech rider",
  );
  assert.equal(headers["Content-Type"], "application/pdf");
  assert.equal(
    headers["Content-Disposition"],
    'attachment; filename="Tech-rider.pdf"',
  );
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Content-Length"], "245760");
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.match(headers["Content-Security-Policy"]!, /sandbox/);

  const archive = mediaResponseHeaders("application/zip", 10, "Press kit 2026");
  assert.equal(archive["Content-Type"], "application/zip");
  assert.equal(
    archive["Content-Disposition"],
    'attachment; filename="Press-kit-2026.zip"',
  );
});

test("a hostile or missing name cannot change the headers or the file type", () => {
  const hostile = mediaResponseHeaders(
    "application/pdf",
    1,
    'x.html"\r\nSet-Cookie: a=b; ../../etc/passwd',
  );
  const disposition = hostile["Content-Disposition"]!;
  assert.match(disposition, /^attachment; filename="[A-Za-z0-9 ._()-]+\.pdf"$/);
  assert.doesNotMatch(disposition, /[\r\n/\\]/);
  assert.equal(
    Object.keys(hostile).some((name) => /set-cookie/i.test(name)),
    false,
  );
  assert.equal(
    mediaResponseHeaders("application/pdf", 1)["Content-Disposition"],
    'attachment; filename="missa-file.pdf"',
  );
  assert.equal(
    mediaResponseHeaders("application/zip", 1, "../../")["Content-Disposition"],
    'attachment; filename="missa-file.zip"',
  );
});

test("pictures and sound still play inline; anything unexpected is never rendered", () => {
  for (const type of ["image/png", "image/jpeg", "audio/mpeg"]) {
    const headers = mediaResponseHeaders(type, 5, "ignored");
    assert.equal(headers["Content-Type"], type);
    assert.equal(headers["Content-Disposition"], undefined, type);
    assert.equal(headers["X-Content-Type-Options"], "nosniff", type);
  }
  for (const type of [
    "text/html",
    "image/svg+xml",
    "application/javascript",
    "",
  ]) {
    const headers = mediaResponseHeaders(type, 5, "evil");
    assert.equal(headers["Content-Type"], "application/octet-stream", type);
    assert.match(headers["Content-Disposition"]!, /^attachment/, type);
    assert.equal(headers["X-Content-Type-Options"], "nosniff", type);
  }
});
