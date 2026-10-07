import { fileTypeFromBuffer } from "file-type";
import {
  bookingTypeFromContentType,
  downloadName,
} from "@/lib/portfolio-booking-files";

/**
 * How a stored portfolio file is served. Pictures and sound play inline, as
 * they always have. Anything else, and every document, is a download: it is
 * never rendered by the browser, so a PDF's scripts or a ZIP's contents cannot
 * run in Missa's origin. The type always comes from the sniffed type stored at
 * upload, never from the request.
 */

/** Sniffed types the media route accepts, with the kind the studio asked for. */
export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const AUDIO_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
] as const;

export const DOCUMENT_CONTENT_TYPE_LIST = [
  "application/pdf",
  "application/zip",
] as const;

export const ACCEPTED_MEDIA_TYPES: readonly string[] = [
  ...IMAGE_CONTENT_TYPES,
  ...AUDIO_CONTENT_TYPES,
  ...DOCUMENT_CONTENT_TYPE_LIST,
];

/**
 * The type of an upload, read from its own bytes. The file's name and the type
 * the browser sent are never consulted, so renaming a program to `.pdf` buys
 * nothing. Returns undefined for anything that is not an accepted type; that
 * includes Office files, which are zip containers but sniff as their own type.
 */
export async function sniffUpload(bytes: Uint8Array) {
  const found = await fileTypeFromBuffer(bytes);
  return found && ACCEPTED_MEDIA_TYPES.includes(found.mime)
    ? found.mime
    : undefined;
}

const INLINE_TYPES: ReadonlySet<string> = new Set([
  ...IMAGE_CONTENT_TYPES,
  ...AUDIO_CONTENT_TYPES,
]);

export const UNSUPPORTED_MEDIA_MESSAGE =
  "Choose a JPG, PNG, WebP, GIF, MP3, WAV, Ogg, FLAC, M4A, PDF or ZIP file.";

export function mediaResponseHeaders(
  contentType: string,
  size: number,
  requestedName?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": String(size),
  };
  if (INLINE_TYPES.has(contentType)) {
    headers["Content-Type"] = contentType;
    return headers;
  }
  const document = bookingTypeFromContentType(contentType);
  headers["Content-Type"] = document ? contentType : "application/octet-stream";
  headers["Content-Disposition"] = `attachment; filename="${
    document ? downloadName(requestedName ?? "", document) : "missa-file"
  }"`;
  // Belt and braces for a browser that is told to open it anyway.
  headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
  return headers;
}
