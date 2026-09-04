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

/**
 * Normalizes crawled text: decodes entities, repairs unnatural letter spacing
 * (e.g., "O U R  T A S T E B U D S :", "F O R M A T T I N G :"), restores
 * proper paragraph breaks on major delimiters, and trims redundant spaces.
 */
export function cleanCrawledNarrative(raw: string | null | undefined): string {
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

export interface InferredChecklistItem {
  label: string;
  detail: string;
}

/**
 * Derives concrete, call-specific preparation checklist items from the opportunity's
 * narrative text and context, rather than presenting boilerplate text.
 */
export function inferSubmissionChecklist(options: {
  isLiterary: boolean;
  isGrant: boolean;
  isResidency: boolean;
  isExhibition: boolean;
  text: string;
  limitsBadge?: string | null;
  acceptedFormats?: string[];
}): InferredChecklistItem[] {
  const {
    isLiterary,
    isGrant,
    isResidency,
    isExhibition,
    text,
    limitsBadge,
    acceptedFormats,
  } = options;
  const items: InferredChecklistItem[] = [];
  const lower = text.toLowerCase();

  if (isLiterary) {
    // 1. Specific work piece extraction
    const poemMatch = text.match(/submit\s+up\s+to\s+(\d+)\s+poems?/i) || text.match(/(\d+)\s+poems?/i);
    const storyMatch = text.match(/(\d+)\s+(?:short\s+)?stories/i);
    const wordRangeMatch =
      text.match(/(\d+(?:,\d+)?)\s*(?:-|to)\s*(\d+(?:,\d+)?)\s*words/i) ||
      text.match(/up\s+to\s+(\d+(?:,\d+)?)\s*words/i);

    if (poemMatch) {
      items.push({
        label: `Poetry Selection (${poemMatch[1]} poems max)`,
        detail: `Submit up to ${poemMatch[1]} poems in a single document.`,
      });
    } else if (storyMatch) {
      items.push({
        label: `Fiction Submission (${storyMatch[1]} stories)`,
        detail: limitsBadge || "Original prose or short story adhering to guidelines.",
      });
    } else if (wordRangeMatch) {
      items.push({
        label: "Manuscript Submission",
        detail: `Stated word count: ${wordRangeMatch[0]}.`,
      });
    } else if (limitsBadge) {
      items.push({
        label: "Manuscript Submission",
        detail: limitsBadge,
      });
    } else {
      items.push({
        label: "Written Work / Manuscript",
        detail: "Original writing adhering to the publication's guidelines.",
      });
    }

    // 2. File formatting detection
    const formats: string[] = [];
    if (lower.includes(".doc") || lower.includes(".docx")) formats.push(".doc / .docx");
    if (lower.includes("pdf")) formats.push("PDF");
    const activeFormats = formats.length ? formats : acceptedFormats ?? [];

    if (activeFormats.length > 0) {
      let formatDetail = `Accepted formats: ${activeFormats.join(", ")}.`;
      if (lower.includes("sans serif") || lower.includes("serif font")) {
        formatDetail += " Clean standard font (serif or sans-serif).";
      }
      if (lower.includes("double space")) {
        formatDetail += " Double-spaced.";
      }
      items.push({
        label: "Document Formatting",
        detail: formatDetail,
      });
    }
  } else if (isGrant) {
    items.push({
      label: "Grant Proposal & Narrative",
      detail: "Complete the online grant application narrative and project summary.",
    });
    if (lower.includes("budget") || lower.includes("financial") || lower.includes("cost")) {
      items.push({
        label: "Budget & Financial Documentation",
        detail: "Itemized project budget, expenses, or proof of financial need.",
      });
    }
    if (lower.includes("resume") || lower.includes("cv") || lower.includes("curriculum vitae")) {
      items.push({
        label: "Artist CV / Resume",
        detail: "Current curriculum vitae highlighting professional background and achievements.",
      });
    }
  } else if (isResidency) {
    items.push({
      label: "Residency Proposal",
      detail: "Description of your intended project and goals during the residency.",
    });
    items.push({
      label: "Work Samples & Portfolio",
      detail: "Recent documentation of your artistic practice and creative work.",
    });
  } else if (isExhibition) {
    items.push({
      label: "Exhibition Proposal & Artworks",
      detail: "High-resolution artwork documentation, titles, dimensions, and mediums.",
    });
    items.push({
      label: "Artist Statement",
      detail: "Short contextual statement describing the exhibited body of work.",
    });
  } else {
    items.push({
      label: "Application Materials",
      detail: "Complete the application form on the official host portal.",
    });
  }

  // Cover note / Bio check
  if (
    lower.includes("cover letter") ||
    lower.includes("brief bio") ||
    lower.includes("short bio") ||
    lower.includes("author bio")
  ) {
    items.push({
      label: "Cover Note & Author Bio",
      detail: "Brief biographical note and contact details in the submission form.",
    });
  }

  return items;
}
