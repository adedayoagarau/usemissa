/** Keep each request bounded, preferring paragraph and sentence boundaries. */
export function readAloudChunks(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const sample = rest.slice(0, limit);
    let end = Math.max(sample.lastIndexOf("\n"), sample.lastIndexOf(". ") + 1);
    if (end < limit / 2) end = sample.lastIndexOf(" ");
    if (end < limit / 2) end = limit;
    // Never cut a UTF-16 surrogate pair in half.
    if (end === limit && /[\uD800-\uDBFF]/.test(rest[end - 1])) end--;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
