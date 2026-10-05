/** Content types a browser may render inline from a private submission file.
 * Everything else (HTML, SVG, scripts, text, unknown) downloads, so an
 * uploaded file can never run as a page on the Missa origin. */
const INLINE_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function normalizedContentType(contentType: string | undefined): string {
  return (contentType ?? '').split(';')[0]!.trim().toLowerCase();
}

/** The filename from an existing Content-Disposition value, reduced to safe characters. */
function dispositionFilename(disposition: string | undefined): string | undefined {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return undefined;
  let name = match[1]!;
  try { name = decodeURIComponent(name); } catch { /* keep the raw value */ }
  const safe = name.replace(/[^\w.\- ]+/g, '_').trim().slice(0, 180);
  return safe || undefined;
}

export function privateFileHeaders(input: { contentType?: string; contentDisposition?: string; contentLength?: number }): Record<string, string> {
  const type = normalizedContentType(input.contentType);
  const inline = INLINE_CONTENT_TYPES.has(type);
  const filename = dispositionFilename(input.contentDisposition);
  const headers: Record<string, string> = {
    'content-type': inline ? type : type || 'application/octet-stream',
    'content-disposition': `${inline ? 'inline' : 'attachment'}${filename ? `; filename="${filename}"` : ''}`,
    'x-content-type-options': 'nosniff',
    'cache-control': 'private, no-store',
  };
  if (input.contentLength !== undefined) headers['content-length'] = String(input.contentLength);
  return headers;
}
