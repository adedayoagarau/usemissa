/**
 * Obligation templates: the dated steps before a deadline and the
 * commitments after an acceptance. They are suggestions the creator adds and
 * edits, not AI output. Offsets are signed days from the anchor (negative is
 * before the deadline, positive is after acceptance). Effort hours are a
 * starting point the creator corrects in planning preferences.
 */
import type { OpportunityType } from "@missa/radar-engine";

export type ObligationTemplate = {
  /** Stable key; unique per tracked call so a template is never added twice. */
  key: string;
  label: string;
  kind: "start-by" | "sub-deadline" | "obligation";
  anchor: "deadline" | "accepted";
  offsetDays: number;
  /** Starting estimate in hours, used by start-by and capacity planning. */
  effortHours?: number;
  /** Material type for creator effort corrections. */
  material?: string;
};

type TemplateFamily = "grant" | "residency" | "fellowship" | "magazine" | "contest" | "festival" | "exhibition" | "general";

function familyFor(type: OpportunityType | string | undefined): TemplateFamily {
  switch (type) {
    case "grant":
    case "rfp":
    case "commission":
      return "grant";
    case "residency":
      return "residency";
    case "fellowship":
    case "scholarship":
      return "fellowship";
    case "magazine":
    case "pitch":
      return "magazine";
    case "contest":
    case "award":
      return "contest";
    case "festival":
      return "festival";
    case "exhibition":
    case "open-call":
      return "exhibition";
    default:
      return "general";
  }
}

const BEFORE: Record<TemplateFamily, ObligationTemplate[]> = {
  grant: [
    { key: "references", label: "Ask for letters of support", kind: "sub-deadline", anchor: "deadline", offsetDays: -30, effortHours: 1, material: "references" },
    { key: "budget", label: "Draft the budget", kind: "sub-deadline", anchor: "deadline", offsetDays: -21, effortHours: 4, material: "budget" },
    { key: "narrative", label: "Finish the project narrative", kind: "sub-deadline", anchor: "deadline", offsetDays: -10, effortHours: 10, material: "statement" },
    { key: "final-draft", label: "Final read-through", kind: "sub-deadline", anchor: "deadline", offsetDays: -4, effortHours: 2 },
    { key: "upload", label: "Upload and submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
  ],
  residency: [
    { key: "references", label: "Ask referees", kind: "sub-deadline", anchor: "deadline", offsetDays: -28, effortHours: 1, material: "references" },
    { key: "work-samples", label: "Choose work samples", kind: "sub-deadline", anchor: "deadline", offsetDays: -14, effortHours: 3, material: "portfolio" },
    { key: "statement", label: "Write the project statement", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 5, material: "statement" },
    { key: "upload", label: "Upload and submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
  ],
  fellowship: [
    { key: "references", label: "Ask for recommendation letters", kind: "sub-deadline", anchor: "deadline", offsetDays: -30, effortHours: 1, material: "references" },
    { key: "transcripts", label: "Request transcripts", kind: "sub-deadline", anchor: "deadline", offsetDays: -21, effortHours: 1, material: "transcripts" },
    { key: "statement", label: "Finish the personal statement", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 8, material: "statement" },
    { key: "upload", label: "Upload and submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
  ],
  magazine: [
    { key: "choose-piece", label: "Choose the piece", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 1 },
    { key: "cover-letter", label: "Write the cover letter", kind: "sub-deadline", anchor: "deadline", offsetDays: -3, effortHours: 1, material: "cover-letter" },
    { key: "upload", label: "Submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -1, effortHours: 0.5 },
  ],
  contest: [
    { key: "final-draft", label: "Final draft", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 4 },
    { key: "upload", label: "Submit and pay the entry fee", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 0.5 },
  ],
  festival: [
    { key: "screener", label: "Prepare the screener and stills", kind: "sub-deadline", anchor: "deadline", offsetDays: -14, effortHours: 3, material: "portfolio" },
    { key: "upload", label: "Submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -3, effortHours: 1 },
  ],
  exhibition: [
    { key: "images", label: "Photograph and caption the work", kind: "sub-deadline", anchor: "deadline", offsetDays: -14, effortHours: 4, material: "portfolio" },
    { key: "statement", label: "Write the artist statement", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 2, material: "statement" },
    { key: "upload", label: "Upload and submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
  ],
  general: [
    { key: "final-draft", label: "Final draft", kind: "sub-deadline", anchor: "deadline", offsetDays: -7, effortHours: 4 },
    { key: "upload", label: "Submit", kind: "sub-deadline", anchor: "deadline", offsetDays: -2, effortHours: 1 },
  ],
};

const AFTER: Record<TemplateFamily, ObligationTemplate[]> = {
  grant: [
    { key: "accept-terms", label: "Sign and return the agreement", kind: "obligation", anchor: "accepted", offsetDays: 14 },
    { key: "interim-report", label: "Interim report due", kind: "obligation", anchor: "accepted", offsetDays: 180 },
    { key: "final-report", label: "Final report due", kind: "obligation", anchor: "accepted", offsetDays: 365 },
  ],
  residency: [
    { key: "confirm-dates", label: "Confirm residency dates", kind: "obligation", anchor: "accepted", offsetDays: 14 },
    { key: "travel", label: "Book travel", kind: "obligation", anchor: "accepted", offsetDays: 30 },
    { key: "arrival", label: "Arrival", kind: "obligation", anchor: "accepted", offsetDays: 90 },
  ],
  fellowship: [
    { key: "accept-terms", label: "Accept the offer", kind: "obligation", anchor: "accepted", offsetDays: 14 },
    { key: "start", label: "Fellowship begins", kind: "obligation", anchor: "accepted", offsetDays: 90 },
  ],
  magazine: [
    { key: "contract", label: "Return the contract", kind: "obligation", anchor: "accepted", offsetDays: 7 },
    { key: "withdraw-elsewhere", label: "Withdraw the piece from other magazines", kind: "obligation", anchor: "accepted", offsetDays: 1 },
    { key: "proofs", label: "Review proofs", kind: "obligation", anchor: "accepted", offsetDays: 45 },
  ],
  contest: [
    { key: "confirm", label: "Confirm acceptance of the prize", kind: "obligation", anchor: "accepted", offsetDays: 7 },
    { key: "withdraw-elsewhere", label: "Withdraw the piece from other calls", kind: "obligation", anchor: "accepted", offsetDays: 1 },
  ],
  festival: [
    { key: "screening-copy", label: "Send the screening copy", kind: "obligation", anchor: "accepted", offsetDays: 21 },
    { key: "press-kit", label: "Send the press kit", kind: "obligation", anchor: "accepted", offsetDays: 21 },
  ],
  exhibition: [
    { key: "drop-off", label: "Drop off the work", kind: "obligation", anchor: "accepted", offsetDays: 30 },
    { key: "pick-up", label: "Pick up the work", kind: "obligation", anchor: "accepted", offsetDays: 75 },
  ],
  general: [{ key: "confirm", label: "Confirm acceptance", kind: "obligation", anchor: "accepted", offsetDays: 7 }],
};

/** Steps before the deadline for a call of this type. */
export function preparationTemplates(type: OpportunityType | string | undefined): ObligationTemplate[] {
  return BEFORE[familyFor(type)];
}

/** Commitments after an acceptance for a call of this type. */
export function acceptanceTemplates(type: OpportunityType | string | undefined): ObligationTemplate[] {
  return AFTER[familyFor(type)];
}

/** Template effort, corrected by the creator's own estimate for that material type. */
export function templateEffort(template: ObligationTemplate, materialEffort: Record<string, number> = {}): number | undefined {
  if (template.material && typeof materialEffort[template.material] === "number") return materialEffort[template.material];
  return template.effortHours;
}
