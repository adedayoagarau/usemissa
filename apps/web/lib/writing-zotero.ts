import {
  researchSourceSchema,
  safeResearchUrl,
  type ResearchSource,
} from "./writing-research-notes";
const text = (value: unknown, max = 500) =>
  typeof value === "string" ? value.slice(0, max) : "";
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function zoteroCredential(
  value: unknown,
): { userId: string; apiKey: string } | null {
  const data = object(value);
  return typeof data.userId === "string" &&
    /^\d{1,15}$/.test(data.userId) &&
    typeof data.apiKey === "string" &&
    /^[A-Za-z0-9]{16,128}$/.test(data.apiKey)
    ? { userId: data.userId, apiKey: data.apiKey }
    : null;
}
/** Import actual bibliographic fields only; unsupported item kinds stay in Zotero. */
export function zoteroSource(
  value: unknown,
  userId: string,
): ResearchSource | null {
  const item = object(value),
    data = object(item.data);
  const key = text(item.key, 8);
  if (!/^[A-Z0-9]{8}$/.test(key) || !/^\d{1,15}$/.test(userId)) return null;
  const types: Record<string, ResearchSource["sourceType"]> = {
    journalArticle: "article-journal",
    book: "book",
    report: "report",
    webpage: "webpage",
  };
  const sourceType = types[text(data.itemType)];
  if (!sourceType || !text(data.title).trim()) return null;
  const creators = Array.isArray(data.creators)
    ? data.creators.map(object).filter((c) => c.creatorType === "author")
    : [];
  const first = creators.length === 1 ? creators[0] : undefined;
  const url = text(data.url, 2000);
  const notes =
    creators.length > 1
      ? "Multiple authors imported as recorded names. Review author details before formatting a citation."
      : "";
  const result = researchSourceSchema.safeParse({
    id: `zotero_${userId}_${key}`,
    title: text(data.title),
    sourceType,
    url: safeResearchUrl(url) ? url : "",
    author: creators
      .map(
        (c) =>
          text(c.name) ||
          [text(c.firstName), text(c.lastName)].filter(Boolean).join(" "),
      )
      .join("; ")
      .slice(0, 500),
    authorFamily: first && !first.name ? text(first.lastName) : "",
    authorGiven: first && !first.name ? text(first.firstName) : "",
    publicationName: text(data.publicationTitle),
    publisher: text(data.publisher),
    publicationDate: text(data.date, 100),
    volume: text(data.volume, 100),
    issue: text(data.issue, 100),
    page: text(data.pages, 100),
    notes,
    excerpt: "",
    citation: "",
    footnote: "",
  });
  return result.success ? result.data : null;
}
export function zoteroPage(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return 0;
  return typeof value === "string" &&
    /^\d{1,6}$/.test(value) &&
    Number(value) <= 100000
    ? Number(value)
    : null;
}
