/**
 * Library upload limits shared by the upload route and the upload form. Kept
 * free of server-only imports so client components can use it.
 */
export const LIBRARY_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'odt',
  'rtf',
  'txt',
  'md',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp3',
  'm4a',
  'wav',
  'mp4',
  'mov',
] as const;

/** Vercel functions reject request bodies over 4.5 MB, so the server-side
 * upload stops below that with a clear message. */
export const LIBRARY_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const LIBRARY_MAX_FILE_LABEL = '4 MB';

/** For the file input's accept attribute. */
export const LIBRARY_FILE_ACCEPT = LIBRARY_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export const LIBRARY_FILE_TYPES_LABEL =
  'PDF, Word, ODT, RTF, text, Markdown, JPEG, PNG, WebP, GIF, MP3, M4A, WAV, MP4 or MOV';
