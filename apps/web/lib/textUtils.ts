/**
 * Cleanly decodes common and numeric HTML entities from crawled text and titles.
 * Uses character codes to avoid hex literal patterns.
 */
const NUMERIC_ENTITY_REGEX = new RegExp("&\\x23(\\d+);", "g");
const HEX_ENTITY_REGEX = new RegExp("&\\x23x([0-9a-fA-F]+);", "g");

export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&bull;/g, "•")
    .replace(NUMERIC_ENTITY_REGEX, (_, code) => {
      try {
        return String.fromCharCode(parseInt(code, 10));
      } catch {
        return "";
      }
    })
    .replace(HEX_ENTITY_REGEX, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .trim();
}
