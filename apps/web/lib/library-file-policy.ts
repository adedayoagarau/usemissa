import { fileTypeFromBuffer } from 'file-type';
import {
  LIBRARY_FILE_EXTENSIONS,
  LIBRARY_FILE_TYPES_LABEL,
  LIBRARY_MAX_FILE_BYTES,
  LIBRARY_MAX_FILE_LABEL,
} from './library-file-limits';

export * from './library-file-limits';

/**
 * Library files are served from the app origin, so only formats creators send
 * with applications are accepted, and the stored content type comes from this
 * list, never from the browser. HTML, SVG, XML and scripts are excluded because
 * a browser could run them on Missa's origin.
 */
type LibraryFormat = {
  contentType: string;
  /** Extensions that file-type may report for real files of this format.
   * Empty means a text format, which must not look like a binary file. */
  detected: readonly string[];
  /** Safe to show in the browser instead of downloading. */
  inline: boolean;
};

const FORMATS: Record<(typeof LIBRARY_FILE_EXTENSIONS)[number], LibraryFormat> = {
  pdf: { contentType: 'application/pdf', detected: ['pdf'], inline: true },
  doc: { contentType: 'application/msword', detected: ['cfb'], inline: false },
  docx: {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    detected: ['docx', 'zip'],
    inline: false,
  },
  odt: { contentType: 'application/vnd.oasis.opendocument.text', detected: ['odt', 'zip'], inline: false },
  rtf: { contentType: 'application/rtf', detected: ['rtf'], inline: false },
  txt: { contentType: 'text/plain; charset=utf-8', detected: [], inline: false },
  md: { contentType: 'text/markdown; charset=utf-8', detected: [], inline: false },
  jpg: { contentType: 'image/jpeg', detected: ['jpg'], inline: true },
  jpeg: { contentType: 'image/jpeg', detected: ['jpg'], inline: true },
  png: { contentType: 'image/png', detected: ['png'], inline: true },
  webp: { contentType: 'image/webp', detected: ['webp'], inline: true },
  gif: { contentType: 'image/gif', detected: ['gif'], inline: true },
  mp3: { contentType: 'audio/mpeg', detected: ['mp3'], inline: false },
  m4a: { contentType: 'audio/mp4', detected: ['m4a', 'mp4', 'm4b'], inline: false },
  wav: { contentType: 'audio/wav', detected: ['wav'], inline: false },
  mp4: { contentType: 'video/mp4', detected: ['mp4', 'm4v', 'mov'], inline: false },
  mov: { contentType: 'video/quicktime', detected: ['mov', 'mp4', 'm4v'], inline: false },
};

function formatFor(extension: string | undefined): LibraryFormat | undefined {
  return extension && Object.hasOwn(FORMATS, extension) ? FORMATS[extension as keyof typeof FORMATS] : undefined;
}

export function libraryFileExtension(filename: string): string | undefined {
  return /\.([a-z0-9]+)$/i.exec(filename.trim())?.[1]?.toLowerCase();
}

export type LibraryFileCheck =
  | { ok: true; contentType: string }
  | { ok: false; status: 400 | 413 | 415; error: string };

/** Size check that runs before the bytes are read. */
export function checkLibraryFileSize(size: number): LibraryFileCheck | undefined {
  if (!size) return { ok: false, status: 400, error: 'This file is empty.' };
  if (size > LIBRARY_MAX_FILE_BYTES) {
    return { ok: false, status: 413, error: `Files can be up to ${LIBRARY_MAX_FILE_LABEL}. Choose a smaller file.` };
  }
  return undefined;
}

/**
 * Accepts a file only when its extension is on the list and its bytes match
 * that format. Returns the content type Missa stores and serves.
 */
export async function checkLibraryFile(filename: string, bytes: Uint8Array): Promise<LibraryFileCheck> {
  const size = checkLibraryFileSize(bytes.byteLength);
  if (size) return size;
  const extension = libraryFileExtension(filename);
  const format = formatFor(extension);
  const unsupported: LibraryFileCheck = {
    ok: false,
    status: 415,
    error: `This file type is not accepted. Upload ${LIBRARY_FILE_TYPES_LABEL}.`,
  };
  if (!format) return unsupported;
  const detected = (await fileTypeFromBuffer(bytes).catch(() => undefined))?.ext;
  if (format.detected.length === 0) {
    // Text formats: anything file-type recognises is a binary in disguise.
    if (detected) return unsupported;
    if (looksLikeMarkup(bytes)) return unsupported;
    return { ok: true, contentType: format.contentType };
  }
  if (!detected || !format.detected.includes(detected)) {
    return { ok: false, status: 415, error: `This file does not match its .${extension} extension.` };
  }
  return { ok: true, contentType: format.contentType };
}

function looksLikeMarkup(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 512)).toString('utf8').trimStart().toLowerCase();
  return /^<(?:!doctype\s+html|html|\?xml|svg|script)\b/.test(head);
}

/**
 * Headers for serving a stored Library file. Only PDFs and raster images
 * whose stored type and extension agree open in the browser; everything
 * else, including files stored before this list existed, downloads.
 */
export function libraryFileResponseHeaders(file: { filename: string; contentType: string }): Record<string, string> {
  const extension = libraryFileExtension(file.filename);
  const format = formatFor(extension);
  const stored = file.contentType.split(';')[0]!.trim().toLowerCase();
  const known = format && format.contentType.split(';')[0] === stored;
  const inline = Boolean(known && format!.inline);
  const name = encodeURIComponent(file.filename);
  return {
    'content-type': known ? format!.contentType : 'application/octet-stream',
    'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
    'x-content-type-options': 'nosniff',
  };
}
