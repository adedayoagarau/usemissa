import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingTypeFromContentType,
  bookingTypeOfFile,
  downloadHref,
  downloadName,
  fileFacts,
  formatFileSize,
} from "./portfolio-booking-files";

test("sizes read the way the canvas draws them", () => {
  assert.equal(formatFileSize(245_760), "240 KB");
  assert.equal(formatFileSize(18 * 1024 * 1024), "18 MB");
  assert.equal(formatFileSize(20 * 1024 * 1024), "20 MB");
  assert.equal(formatFileSize(1_500_000), "1.4 MB");
  assert.equal(formatFileSize(5 * 1024 * 1024 + 300 * 1024), "5.3 MB");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(1), "1 B");
  assert.equal(formatFileSize(1024), "1 KB");
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(-4), "");
  assert.equal(formatFileSize(Number.NaN), "");
});

test("file facts show the type and size the server found, and never guess", () => {
  assert.equal(fileFacts({ type: "pdf", bytes: 245_760 }), "PDF · 240 KB");
  assert.equal(
    fileFacts({ type: "zip", bytes: 18 * 1024 * 1024 }),
    "ZIP · 18 MB",
  );
  assert.equal(fileFacts({ type: "pdf" }), "PDF");
  assert.equal(fileFacts({ bytes: 1024 }), "1 KB");
  assert.equal(fileFacts({}), "");
});

test("the browser’s idea of a file decides only whether to try the upload", () => {
  assert.equal(
    bookingTypeOfFile({ name: "rider.pdf", type: "application/pdf" }),
    "pdf",
  );
  assert.equal(
    bookingTypeOfFile({ name: "kit.zip", type: "application/zip" }),
    "zip",
  );
  assert.equal(
    bookingTypeOfFile({
      name: "kit.zip",
      type: "application/x-zip-compressed",
    }),
    "zip",
  );
  // Some systems send no type for a zip; the extension is only a hint.
  assert.equal(bookingTypeOfFile({ name: "KIT.ZIP", type: "" }), "zip");
  assert.equal(
    bookingTypeOfFile({ name: "rider.pdf", type: "application/octet-stream" }),
    "pdf",
  );
  assert.equal(
    bookingTypeOfFile({ name: "rider.pdf", type: "image/png" }),
    undefined,
  );
  assert.equal(bookingTypeOfFile({ name: "notes.docx", type: "" }), undefined);
  assert.equal(
    bookingTypeOfFile({ name: "photo.jpg", type: "image/jpeg" }),
    undefined,
  );
});

test("only the types the server stores as documents are documents", () => {
  assert.equal(bookingTypeFromContentType("application/pdf"), "pdf");
  assert.equal(bookingTypeFromContentType("application/zip"), "zip");
  assert.equal(bookingTypeFromContentType("image/png"), undefined);
  assert.equal(
    bookingTypeFromContentType("application/x-msdownload"),
    undefined,
  );
  assert.equal(bookingTypeFromContentType("constructor"), undefined);
});

test("a download is saved under its label with the right extension", () => {
  assert.equal(downloadName("Tech rider", "pdf"), "Tech-rider.pdf");
  assert.equal(downloadName("Press kit (2026)", "zip"), "Press-kit-(2026).zip");
  assert.equal(
    downloadName("Dossier de presse élégant", "pdf"),
    "Dossier-de-presse-elegant.pdf",
  );
  assert.equal(downloadName("   ", "pdf"), "missa-file.pdf");
  assert.equal(downloadName("../../etc/passwd", "zip"), "etcpasswd.zip");
  assert.equal(downloadName("日本語", "pdf"), "missa-file.pdf");
  assert.ok(downloadName("x".repeat(500), "pdf").length <= 84);
});

test("the download address carries the label so the saved file is named well", () => {
  const file = {
    file: "/api/creator/portfolio-media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    label: " Tech rider & stage plot ",
  };
  assert.equal(
    downloadHref(file),
    "/api/creator/portfolio-media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?name=Tech%20rider%20%26%20stage%20plot",
  );
});
