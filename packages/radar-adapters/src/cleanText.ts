/**
 * Canonical text cleaner and entity decoder for @missa/radar-adapters.
 *
 * Removes HTML entities, decodes decimal/hex character codes, repairs
 * spaced-out crawler headings (e.g. "O U R  T A S T E B U D S :"),
 * collapses irregular whitespace, and restores paragraph breaks.
 */

const NUMERIC_ENTITY_REGEX = new RegExp("&\\x23(\\d+);", "g");
const HEX_ENTITY_REGEX = new RegExp("&\\x23x([0-9a-fA-F]+);", "g");

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&middot;": "·",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&bull;": "•",
  "&deg;": "°",
  "&raquo;": "»",
  "&laquo;": "«",
  "&rsaquo;": "›",
  "&lsaquo;": "‹",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&sect;": "§",
  "&para;": "¶",
  "&dagger;": "†",
  "&Dagger;": "‡",
  "&times;": "×",
  "&divide;": "÷",
  "&plusmn;": "±",
  "&euro;": "€",
  "&pound;": "£",
  "&yen;": "¥",
  "&cent;": "¢",
  "&shy;": "",
};

function decodeSinglePass(text: string): string {
  let s = text;
  for (const [ent, val] of Object.entries(ENTITY_MAP)) {
    if (s.includes(ent)) {
      s = s.replaceAll(ent, val);
    }
  }
  s = s.replace(NUMERIC_ENTITY_REGEX, (_, code) => {
    try {
      const num = parseInt(code, 10);
      return Number.isFinite(num) && num > 0 ? String.fromCodePoint(num) : "";
    } catch {
      return "";
    }
  });
  s = s.replace(HEX_ENTITY_REGEX, (_, hex) => {
    try {
      const num = parseInt(hex, 16);
      return Number.isFinite(num) && num > 0 ? String.fromCodePoint(num) : "";
    } catch {
      return "";
    }
  });
  return s;
}

/**
 * Cleanly decodes HTML entities without external heavy DOM dependencies.
 * Handles single and multi-pass encoded entities.
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return "";
  let current = text;
  // Decode up to 2 passes to resolve double-encoded entities (e.g. &amp;quot;)
  for (let i = 0; i < 2; i++) {
    const next = decodeSinglePass(current);
    if (next === current) break;
    current = next;
  }
  return current.trim();
}

/**
 * Normalizes crawled text: decodes entities, repairs unnatural crawler letter spacing
 * (e.g., "O U R  T A S T E B U D S :", "F O R M A T T I N G :"), restores
 * proper paragraph breaks on major delimiters, and trims redundant spaces.
 */
export function cleanCrawledText(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = decodeHtmlEntities(raw);

  // Normalize unusual and non-breaking spaces to standard space
  text = text.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ");

  // Fix spaced uppercase section headers like "O U R   T A S T E B U D S :" or "F O R M A T T I N G :"
  text = text.replace(/(?:^|\s)((?:[A-Z]\s+){2,}[A-Z])\s*:/g, (_, spaced: string) => {
    const words = spaced.split(/\s{2,}/).map((w) => w.replace(/\s+/g, ""));
    const title = words.join(" ");
    return `\n\n${title}: `;
  });

  // Break paragraphs on common section headers if squashed together
  text = text.replace(
    /([.!?])\s+(ABOUT\s+(?:THE\s+)?(?:PROGRAM|AWARD|FELLOWSHIP|RESIDENCY|CALL)|SUBMISSION\s+GUIDELINES|HOW\s+TO\s+APPLY|ELIGIBILITY|SELECTION\s+PROCESS|TIMELINE|TERMS\s+&\s+CONDITIONS|FORMATTING|OUR\s+TASTEBUDS):/gi,
    "$1\n\n$2:",
  );

  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Sanitizes single-line titles or labels (e.g. opportunity title, org name, location)
 * by decoding entities and collapsing internal whitespace to single spaces.
 */
export function cleanTitleOrLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const decoded = decodeHtmlEntities(raw);
  return decoded.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+/g, " ").trim();
}
