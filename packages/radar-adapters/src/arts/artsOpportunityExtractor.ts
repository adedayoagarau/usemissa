import { parseDate } from "@missa/radar-engine";

export type ArtsOpportunityKind =
  | "residency"
  | "exhibition"
  | "public_art"
  | "grant"
  | "fellowship"
  | "other";

export interface ArtsExtractedOpportunity {
  isArtsOpportunity: boolean;
  opportunityKind: ArtsOpportunityKind;
  title?: string;
  disciplines: string[];
  stipendAmountUsd: number | null;
  stipendRaw: string | null;
  applicationFeeCents: number | null;
  feeDisclosed: boolean;
  feeRaw: string | null;
  duration: string | null;
  deadlineDate: string | null;
  deadlineRaw: string | null;
  studioProvided: boolean;
  housingProvided: boolean;
  confidence: number;
  markersFound: string[];
}

export const ARTS_MARKERS = [
  "residency",
  "artist-in-residence",
  "call for artists",
  "call for entry",
  "call for entries",
  "exhibition proposal",
  "juried exhibition",
  "solo exhibition",
  "group exhibition",
  "public art",
  "fellowship",
  "stipend",
  "studio space",
  "open call for artists",
  "artist grant",
  "project grant",
] as const;

export const RECOGNIZED_MEDIUMS: Record<string, string> = {
  painting: "Painting",
  sculpture: "Sculpture",
  photography: "Photography",
  "film/video": "Film/Video",
  film: "Film/Video",
  video: "Film/Video",
  printmaking: "Printmaking",
  "digital art": "Digital Art",
  multidisciplinary: "Multidisciplinary",
  interdisciplinary: "Multidisciplinary",
  "cross-disciplinary": "Multidisciplinary",
  "sound art": "Sound Art",
  performance: "Performance",
  "performance art": "Performance",
  ceramics: "Ceramics",
  installation: "Installation",
  drawing: "Drawing",
  textile: "Textiles",
  "fiber art": "Textiles",
  "mixed media": "Mixed Media",
  "public art": "Public Art",
};

const NO_FEE_PATTERNS = [
  /\b(no\s+(?:entry|submission|jury|application)?\s*fee)\b/i,
  /\b(free\s+to\s+(?:enter|submit|apply))\b/i,
  /\b(\$0\s*(?:\(free\)|fee)?)\b/i,
  /\bfee[- ]free\b/i,
  /\bno\s+fee\b/i,
];

const FEE_PATTERNS = [
  /\b(?:entry|submission|jury|application)\s*fee[^.\n]*?\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:entry|submission|jury|application)?\s*fee/i,
  /\bjuried\s*fee\s*:\s*\$\s?(\d+)/i,
];

const STIPEND_PATTERNS = [
  /\$\s?(\d{1,3}(?:,\d{3})*)\s*(?:USD)?\s*(?:stipend|honorarium|living allowance|fellowship grant|grant|award)/i,
  /(?:stipend|honorarium|award|grant|fellowship|living allowance)s?\s*(?:of|up to|of up to|:)?\s*\$\s?(\d{1,3}(?:,\d{3})*)/i,
  /\bup to\s+\$\s?(\d{1,3}(?:,\d{3})*)\s*(?:stipend|grant|fellowship|award|honorarium)?/i,
  /\$\s?(\d{1,3}(?:,\d{3})*)\s*(?:\/|\s*per\s*)(?:month|week)\s*stipend/i,
];

const DURATION_PATTERNS = [
  /\b(\d+(?:[–\-]\d+)?\s*(?:weeks?|months?))\b/i,
  /\b((?:two|three|four|five|six|eight|twelve)\s*(?:weeks?|months?))\b/i,
  /\b(\d+\s*to\s*\d+\s*(?:weeks?|months?))\b/i,
  /\b(1\s*year|one\s*year)\b/i,
  /\b(residency\s+length\s*:\s*[^.\n]+)/i,
];

const STUDIO_PATTERNS = [
  /\bprivate\s+studio\b/i,
  /\bstudio\s+space\b/i,
  /\bworkspace\s+provided\b/i,
  /\bshared\s+studio\b/i,
  /\bstudio\s+access\b/i,
  /\bindividual\s+studio\b/i,
];

const HOUSING_PATTERNS = [
  /\bhousing\s+provided\b/i,
  /\bprivate\s+(?:room|bedroom|cabin|apartment)\b/i,
  /\blodging\s+provided\b/i,
  /\baccommodations?\s+provided\b/i,
  /\bliving\s+quarters\b/i,
  /\bmeals\s+(?:and|&)\s+lodging\b/i,
];

export function extractArtsOpportunity(
  text: string,
  referenceDate: Date = new Date()
): ArtsExtractedOpportunity {
  const normalized = text.toLowerCase();

  // Find markers
  const markersFound: string[] = [];
  for (const marker of ARTS_MARKERS) {
    if (normalized.includes(marker)) {
      markersFound.push(marker);
    }
  }

  // Determine kind
  let opportunityKind: ArtsOpportunityKind = "other";
  if (/\bresidenc(y|ies)\b|artist-in-residence/i.test(text)) {
    opportunityKind = "residency";
  } else if (/\bexhibition\b|call for artists|juried show/i.test(text)) {
    opportunityKind = "exhibition";
  } else if (/\bpublic art\b|mural commission/i.test(text)) {
    opportunityKind = "public_art";
  } else if (/\bfellowship\b/i.test(text)) {
    opportunityKind = "fellowship";
  } else if (/\bgrant\b|artist grant/i.test(text)) {
    opportunityKind = "grant";
  }

  // Disciplines
  const disciplinesSet = new Set<string>();
  for (const [key, canonical] of Object.entries(RECOGNIZED_MEDIUMS)) {
    const re = new RegExp(`\\b${key.replace("/", "\\/")}\\b`, "i");
    if (re.test(text)) {
      disciplinesSet.add(canonical);
    }
  }
  // If no specific mediums matched but it's an arts call, default to Multidisciplinary if markers match
  if (disciplinesSet.size === 0 && (markersFound.length > 0 || opportunityKind !== "other")) {
    if (/all\s+(?:media|mediums|disciplines)|visual\s+arts?/i.test(text)) {
      disciplinesSet.add("Multidisciplinary");
    }
  }
  const disciplines = Array.from(disciplinesSet);

  // Financials: Stipend
  let stipendAmountUsd: number | null = null;
  let stipendRaw: string | null = null;
  for (const pat of STIPEND_PATTERNS) {
    const m = pat.exec(text);
    if (m) {
      const amountStr = m[1] ?? m[2];
      if (amountStr) {
        stipendAmountUsd = Number(amountStr.replace(/,/g, ""));
        stipendRaw = m[0].trim();
        break;
      }
    }
  }

  // Financials: Application / Jury Fee
  let applicationFeeCents: number | null = null;
  let feeDisclosed = false;
  let feeRaw: string | null = null;

  for (const noFeePat of NO_FEE_PATTERNS) {
    const m = noFeePat.exec(text);
    if (m) {
      applicationFeeCents = 0;
      feeDisclosed = true;
      feeRaw = m[0].trim();
      break;
    }
  }

  if (!feeDisclosed) {
    for (const feePat of FEE_PATTERNS) {
      const m = feePat.exec(text);
      if (m && m[1]) {
        const dollars = Number(m[1].replace(/,/g, ""));
        if (!Number.isNaN(dollars)) {
          applicationFeeCents = Math.round(dollars * 100);
          feeDisclosed = true;
          feeRaw = m[0].trim();
          break;
        }
      }
    }
  }

  // Facilities: Studio & Housing
  const studioProvided = STUDIO_PATTERNS.some((p) => p.test(text));
  const housingProvided = HOUSING_PATTERNS.some((p) => p.test(text));

  // Duration
  let duration: string | null = null;
  for (const dPat of DURATION_PATTERNS) {
    const m = dPat.exec(text);
    if (m && m[1]) {
      duration = m[1].trim();
      break;
    }
  }

  // Deadline date
  let deadlineDate: string | null = null;
  let deadlineRaw: string | null = null;

  const deadlinePhrases = [
    /(?:deadline|due date|applications? close|closes? on|submissions? due|apply by)\s*[:\-]?\s*([^.\n;]+)/i,
    /(?:deadline)\s*:\s*([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i,
  ];

  for (const dp of deadlinePhrases) {
    const m = dp.exec(text);
    if (m && m[1]) {
      const candidateRaw = m[1].trim();
      const parsed = parseDate(candidateRaw, referenceDate);
      if (parsed?.date) {
        deadlineDate = parsed.date;
        deadlineRaw = m[0].trim();
        break;
      }
    }
  }

  // Title extraction heuristic
  let title: string | undefined = undefined;
  const titleMatch = text.match(/(?:title|call for|open call|exhibition|residency)\s*:\s*([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim().slice(0, 120);
  } else {
    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 5 && l.length < 100);
    if (firstLine) {
      title = firstLine.replace(/^[#*\-– ]+/, "").trim();
    }
  }

  // Confidence calculation
  let confidence = 0;
  if (markersFound.length > 0) confidence += Math.min(markersFound.length * 20, 50);
  if (disciplines.length > 0) confidence += 20;
  if (stipendAmountUsd !== null || feeDisclosed) confidence += 15;
  if (deadlineDate) confidence += 15;
  confidence = Math.min(confidence, 100);

  const isArtsOpportunity = markersFound.length > 0 || disciplines.length > 0 || opportunityKind !== "other";

  return {
    isArtsOpportunity,
    opportunityKind,
    title,
    disciplines,
    stipendAmountUsd,
    stipendRaw,
    applicationFeeCents,
    feeDisclosed,
    feeRaw,
    duration,
    deadlineDate,
    deadlineRaw,
    studioProvided,
    housingProvided,
    confidence,
    markersFound,
  };
}
