import type { PortfolioBookingFile } from "./creator-portfolio-schema";

/**
 * Documents a creator may attach to the Booking kit. The server decides the
 * type by reading the file itself (`file-type`), never from a name or a
 * client-sent type; these helpers only describe what the server accepted.
 */
export type BookingFileType = NonNullable<PortfolioBookingFile["type"]>;

/** The biggest file the media route stores. */
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;

/** The six files a Booking kit holds. */
export const BOOKING_FILE_LIMIT = 6;

/** Sniffed content types the media route stores as documents. */
export const DOCUMENT_CONTENT_TYPES: Readonly<Record<string, BookingFileType>> =
  {
    "application/pdf": "pdf",
    "application/zip": "zip",
  };

export function bookingTypeFromContentType(
  contentType: string,
): BookingFileType | undefined {
  return Object.hasOwn(DOCUMENT_CONTENT_TYPES, contentType)
    ? DOCUMENT_CONTENT_TYPES[contentType]
    : undefined;
}

/** Browsers report a zip as either of these; a name alone is never enough. */
const BROWSER_DOCUMENT_TYPES: Readonly<Record<string, BookingFileType>> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

/**
 * What the browser believes a chosen file is. It only decides whether to try
 * the upload and what to show until the server has read the file; the server
 * sniffs the real type and replaces this.
 */
export function bookingTypeOfFile(file: {
  name: string;
  type: string;
}): BookingFileType | undefined {
  if (Object.hasOwn(BROWSER_DOCUMENT_TYPES, file.type))
    return BROWSER_DOCUMENT_TYPES[file.type];
  if (file.type && file.type !== "application/octet-stream") return undefined;
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return extension === "pdf" || extension === "zip" ? extension : undefined;
}

/**
 * What the server found in the documents uploaded in this studio session, by
 * address. The upload returns only the address; this lets the editor show the
 * type and size the server read, not the browser's guess. A reload drops it,
 * and the saved draft carries the server's values from then on.
 */
const uploadedDocuments = new Map<
  string,
  { type: BookingFileType; bytes: number }
>();

export function rememberUploadedDocument(
  url: string,
  facts: { type: BookingFileType; bytes: number },
) {
  uploadedDocuments.set(url, facts);
}

export function uploadedDocument(url: string) {
  return uploadedDocuments.get(url);
}

/** 240 KB, 1.4 MB, 18 MB. Sizes are binary, so a 20 MB limit reads as 20 MB. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = bytes / (1024 * 1024);
  const shown =
    megabytes < 10 ? Math.round(megabytes * 10) / 10 : Math.round(megabytes);
  return `${shown} MB`;
}

/** "PDF · 240 KB". Either half is left out when the server has not said it. */
export function fileFacts(file: {
  type?: BookingFileType;
  bytes?: number;
}): string {
  const parts = [
    file.type ? file.type.toUpperCase() : "",
    file.bytes !== undefined ? formatFileSize(file.bytes) : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

/**
 * The name a download is saved as: the label the creator gave the file with
 * the extension for what it really is. ASCII only, so it can sit in a header.
 */
export function downloadName(label: string, type: BookingFileType): string {
  const base = label
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^A-Za-z0-9 ._()-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 80)
    .replace(/[.-]+$/, "");
  return `${base || "missa-file"}.${type}`;
}

/** The address a visitor downloads a Booking kit file from. */
export function downloadHref(
  file: Pick<PortfolioBookingFile, "file" | "label">,
) {
  return `${file.file}?name=${encodeURIComponent(file.label.trim().slice(0, 80))}`;
}
