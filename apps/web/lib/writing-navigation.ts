import type { JsonNode, WritingDocument } from "./writing-document";

export type WritingLocation = {
  editorId: string;
  position: number;
  label: string;
  text: string;
  occurrence: number;
  headingLevel?: number;
};
export type WritingBookmark = WritingLocation & { id: string };
function nodeText(node: JsonNode): string {
  return node.text ?? (node.content ?? []).map(nodeText).join("");
}
function size(node: JsonNode): number {
  return node.type === "text"
    ? (node.text?.length ?? 0)
    : node.content
      ? 2 + node.content.reduce((n, child) => n + size(child), 0)
      : 1;
}
/** ProseMirror positions are local to each mounted page or canvas block. */
export function writingLocations(doc: WritingDocument): WritingLocation[] {
  const result: WritingLocation[] = [];
  const occurrences = new Map<string, number>();
  for (const page of doc.pages) {
    const sources =
      page.kind === "canvas"
        ? (page.blocks ?? []).map((block) => ({
            id: `${page.id}/${block.id}`,
            content: block.content,
          }))
        : [{ id: page.id, content: page.content }];
    for (const source of sources) {
      const walk = (nodes: JsonNode[], start: number) => {
        let position = start;
        for (const node of nodes) {
          const text = nodeText(node);
          if (
            (node.type === "heading" || node.type === "paragraph") &&
            text.trim()
          ) {
            const occurrence = occurrences.get(text) ?? 0;
            occurrences.set(text, occurrence + 1);
            result.push({
              editorId: source.id,
              position: position + 1,
              text,
              label: text.slice(0, 100),
              occurrence,
              ...(node.type === "heading"
                ? { headingLevel: Number(node.attrs?.level) || 1 }
                : {}),
            });
          } else if (node.content) walk(node.content, position + 1);
          position += size(node);
        }
      };
      walk(source.content.content ?? [], 0);
    }
  }
  return result;
}
/** Text anchors survive repagination; changed or removed text is unavailable. */
export function resolveWritingLocation(
  saved: WritingLocation,
  locations: WritingLocation[],
): WritingLocation | null {
  const matches = locations.filter((location) => location.text === saved.text);
  return (
    matches.find(
      (location) =>
        location.editorId === saved.editorId &&
        location.position === saved.position,
    ) ?? (matches.length === 1 ? matches[0] : null)
  );
}
export function writingNavigationKey(
  accountId: string,
  entryId: string,
): string {
  return `missa:writing-navigation:${encodeURIComponent(accountId)}:${encodeURIComponent(entryId)}`;
}
export function readWritingBookmarks(raw: string | null): WritingBookmark[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is WritingBookmark =>
          item !== null &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.editorId === "string" &&
          typeof item.position === "number" &&
          Number.isInteger(item.position) &&
          item.position >= 0 &&
          typeof item.text === "string" &&
          typeof item.label === "string" &&
          typeof item.occurrence === "number" &&
          Number.isInteger(item.occurrence) &&
          item.occurrence >= 0,
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}
