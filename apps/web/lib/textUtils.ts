export {
  cleanCrawledText,
  cleanCrawledNarrative,
  cleanTitleOrLabel,
  decodeHtmlEntities,
  fixTitleCasing,
  stripHtmlTags,
  // Import the text helpers from their own module rather than the package
  // barrel: the barrel also re-exports Node workers (OpenAI, Playwright, pg)
  // that cannot be bundled for the Edge runtime or the browser.
} from "@missa/radar-adapters/dist/src/cleanText.js";

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
