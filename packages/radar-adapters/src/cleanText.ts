/**
 * Canonical text cleaner and entity decoder for @missa/radar-adapters.
 *
 * Removes HTML entities (single and multi-pass), decodes decimal/hex character codes,
 * strips HTML tags, repairs ALL-CAPS titles and spaced-out crawler headings,
 * removes scraper prefix/suffix noise and trailing symbols, collapses irregular whitespace,
 * and restores paragraph breaks for clear standard English.
 */

const NUMERIC_ENTITY_REGEX = /&#(\d+);?/g;
const HEX_ENTITY_REGEX = /&#x([0-9a-fA-F]+);?/g;

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
  "&tilde;": "~",
  "&thinsp;": " ",
  "&ensp;": " ",
  "&emsp;": " ",
  "&zwnj;": "",
  "&zwj;": "",
  "&sup1;": "¹",
  "&sup2;": "²",
  "&sup3;": "³",
  "&frac14;": "¼",
  "&frac12;": "½",
  "&frac34;": "¾",
  "&dollar;": "$",
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
 * Handles single and multi-pass encoded entities (e.g. &amp;quot;, &amp;#39;).
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return "";
  let current = text;
  // Decode up to 3 passes to resolve multi-encoded entities
  for (let i = 0; i < 3; i++) {
    const next = decodeSinglePass(current);
    if (next === current) break;
    current = next;
  }
  return current.trim();
}

/**
 * Strips HTML tags from text while retaining content inside tags.
 * Converts block tags and linebreaks into appropriate space or linebreaks.
 */
export function stripHtmlTags(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw;
  // Remove script and style elements completely
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Replace <br> variants with newline
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Replace block tags ending with double newline
  s = s.replace(/<\/(?:p|div|h[1-6]|li|blockquote|section)>/gi, "\n\n");
  // Strip any remaining tags
  s = s.replace(/<[^>]*>/g, " ");
  return s;
}

const KNOWN_ACRONYMS = new Set([
  "MFA",
  "BFA",
  "MA",
  "BA",
  "PHD",
  "US",
  "USA",
  "UK",
  "EU",
  "NYC",
  "LA",
  "SF",
  "AI",
  "VR",
  "AR",
  "2D",
  "3D",
  "4D",
  "II",
  "III",
  "IV",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "NPR",
  "BBC",
  "FAQ",
  "ISBN",
  "ISSN",
  "PDF",
  "CAD",
  "USD",
  "EUR",
  "GBP",
  "AUD",
]);

/**
 * Repairs ALL-CAPS titles by converting to Title Case while preserving acronyms.
 */
export function fixTitleCasing(text: string): string {
  if (!text) return "";
  const lettersOnly = text.replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length >= 4 && lettersOnly === lettersOnly.toUpperCase()) {
    return text.replace(/\b[a-zA-Z]+\b/g, (word) => {
      const upper = word.toUpperCase();
      if (KNOWN_ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }
  return text;
}

const UNINFORMATIVE_TITLES = new Set([
  "home",
  "untitled",
  "index",
  "page",
  "default",
  "blank",
  "n/a",
  "none",
  "null",
  "undefined",
]);

/**
 * Sanitizes single-line titles or labels (e.g. opportunity title, org name, location)
 * by decoding entities, stripping HTML tags, repairing ALL-CAPS noise, stripping
 * scraper prefix/suffix noise, and removing trailing/leading symbols.
 */
export function cleanTitleOrLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = stripHtmlTags(raw);
  s = decodeHtmlEntities(s);

  // Normalize unusual and non-breaking spaces
  s = s.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+/g, " ");

  // Repair spaced single-letter header noise (e.g. "O U R  F E L L O W S H I P")
  s = s.replace(/(?:^|\s)((?:[A-Za-z]\s+){3,}[A-Za-z])(?:\s|$)/g, (_, spaced: string) => {
    return ` ${spaced.replace(/\s+/g, "")} `;
  });

  // Strip common scraper prefix boilerplate ("Home - ", "Apply | ", "Submittable - ")
  s = s.replace(/^(?:Home|Welcome|Apply|Submission|Submittable|Page \d+)\s*[-|–—:\s]+\s*/i, "");

  // Strip common scraper suffix boilerplate (" | Submittable", " - Official Site", " - Apply Now")
  s = s.replace(/\s*[-|–—:\s]+\s*(?:Submittable|Official Site|Apply Now|Home|Page \d+|Official Listing)$/i, "");

  // Strip leading and trailing symbols & dangling punctuation
  s = s.replace(/^[\s\-_:=|•·,/;~]+|[\s\-_:=|•·,/;~]+$/g, "").trim();

  // Repair ALL-CAPS text
  s = fixTitleCasing(s);

  // Fallback for uninformative titles or raw URLs
  if (!s || UNINFORMATIVE_TITLES.has(s.toLowerCase()) || /^https?:\/\//i.test(s)) {
    return "Untitled Opportunity";
  }

  return s;
}

/**
 * Normalizes crawled text: decodes entities, strips HTML markup, repairs unnatural crawler letter spacing,
 * restores proper paragraph breaks on major delimiters, removes web scraper fragments, and trims redundant spaces.
 */
export function cleanCrawledText(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = stripHtmlTags(raw);
  text = decodeHtmlEntities(text);

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
    /([.!?])\s+(ABOUT\s+(?:THE\s+)?(?:PROGRAM|AWARD|FELLOWSHIP|RESIDENCY|CALL)|SUBMISSION\s+GUIDELINES|HOW\s+TO\s+APPLY|ELIGIBILITY|SELECTION\s+PROCESS|TIMELINE|TERMS\s+&\s+CONDITIONS|FORMATTING|OUR\s+TASTEBUDS|REQUIREMENTS|APPLICATION\s+PROCESS|DEADLINE\s+&\s+FEES|AWARDS\s+&\s+PRIZES|WHAT\s+TO\s+SUBMIT):/gi,
    "$1\n\n$2:",
  );

  // Remove common web crawler noise lines
  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.includes("javascript must be enabled")) return false;
    if (trimmed.includes("accept all cookies")) return false;
    if (trimmed.includes("skip to main content")) return false;
    if (trimmed === "cookie policy" || trimmed === "privacy policy") return false;
    return true;
  });

  text = lines.join("\n");

  // Fix double dashes to em-dashes
  text = text.replace(/ -- /g, " — ");

  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // Trim trailing spaces on lines
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  return text.trim();
}

/** Alias for cleanCrawledText for backward compatibility */
export const cleanCrawledNarrative = cleanCrawledText;
