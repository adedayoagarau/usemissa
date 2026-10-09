/** Reject oversized streams before allocating the full body. */
export async function boundedZoteroText(
  body: ReadableStream<Uint8Array> | null,
  max: number,
): Promise<string> {
  if (!body) throw new Error("Empty response");
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(merged);
}
export function zoteroSameOrigin(request: Request) {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const given = new URL(origin),
      local = new URL(request.url);
    return (
      given.host === host &&
      given.protocol === local.protocol &&
      given.origin === origin
    );
  } catch {
    return false;
  }
}
