export interface ParsedResponseTime {
  raw: string | null;
  minDays: number | null;
  maxDays: number | null;
  label: string;
  queryAllowedAfterDays: number | null;
}

export interface ExtractedPrestige {
  prestigeTier: "Tier 1 (Flagship)" | "Tier 2 (Established Contemporary)" | "Tier 3 (Emerging & Community)";
  foundingYear: number | null;
  honors: string[];
  reasons: string[];
}

export interface EditorialDemeanor {
  archetype:
    | "Warm & Debut-Friendly"
    | "Craft-Focused & Rigorous"
    | "Edgy & Experimental"
    | "Rules-Strict"
    | "Community & Identity-Led"
    | "Eclectic & Open";
  sentimentTags: string[];
  toneSummary: string;
}

export interface ProfileIntelligenceResult {
  responseTime: ParsedResponseTime;
  prestige: ExtractedPrestige;
  demeanor: EditorialDemeanor;
}

/**
 * Normalizes free-form editorial response time strings (e.g. "3 to 6 months", "within 8 weeks")
 * into structured day ranges and human-readable badges.
 */
export function parseResponseTime(raw: string | null | undefined): ParsedResponseTime {
  if (!raw || !raw.trim()) {
    return {
      raw: null,
      minDays: null,
      maxDays: null,
      label: "Unknown turnaround",
      queryAllowedAfterDays: null,
    };
  }

  const clean = raw.trim();
  const lower = clean.toLowerCase();

  // Query threshold detection: e.g. "do not query before 6 months", "query after 90 days"
  let queryAllowedAfterDays: number | null = null;
  const queryMatch = lower.match(/(?:query|inquire|status)\s*(?:after|before|under)?\s*(\d+)\s*(month|months|mo|week|weeks|wk|day|days)/i);
  if (queryMatch) {
    const qVal = parseInt(queryMatch[1], 10);
    const qUnit = queryMatch[2].toLowerCase();
    if (qUnit.startsWith("month") || qUnit === "mo") queryAllowedAfterDays = qVal * 30;
    else if (qUnit.startsWith("week") || qUnit === "wk") queryAllowedAfterDays = qVal * 7;
    else if (qUnit.startsWith("day")) queryAllowedAfterDays = qVal;
  }

  // Check months range: e.g. "3 to 6 months", "3-6 months", "1 - 3 months"
  const monthRange = lower.match(/(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:months|month|mo\b)/i);
  if (monthRange) {
    const minM = parseInt(monthRange[1], 10);
    const maxM = parseInt(monthRange[2], 10);
    return {
      raw: clean,
      minDays: minM * 30,
      maxDays: maxM * 30,
      label: `${minM}–${maxM} months`,
      queryAllowedAfterDays: queryAllowedAfterDays ?? maxM * 30,
    };
  }

  // Single month: e.g. "within 3 months", "up to 6 months", "4 months"
  const singleMonth = lower.match(/(?:within|under|up to|approx|around|within about)?\s*(\d+)\s*(?:months|month|mo\b)/i);
  if (singleMonth) {
    const m = parseInt(singleMonth[1], 10);
    const minDays = Math.max(15, Math.round(m * 20));
    const maxDays = m * 30;
    return {
      raw: clean,
      minDays,
      maxDays,
      label: `Up to ${m} ${m === 1 ? "month" : "months"}`,
      queryAllowedAfterDays: queryAllowedAfterDays ?? maxDays,
    };
  }

  // Weeks range: e.g. "4 to 8 weeks", "2-4 weeks"
  const weekRange = lower.match(/(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:weeks|week|wk\b)/i);
  if (weekRange) {
    const minW = parseInt(weekRange[1], 10);
    const maxW = parseInt(weekRange[2], 10);
    return {
      raw: clean,
      minDays: minW * 7,
      maxDays: maxW * 7,
      label: `${minW}–${maxW} weeks`,
      queryAllowedAfterDays: queryAllowedAfterDays ?? maxW * 7,
    };
  }

  // Single week: e.g. "within 6 weeks", "2 weeks"
  const singleWeek = lower.match(/(?:within|under|up to)?\s*(\d+)\s*(?:weeks|week|wk\b)/i);
  if (singleWeek) {
    const w = parseInt(singleWeek[1], 10);
    return {
      raw: clean,
      minDays: Math.max(7, Math.round(w * 5)),
      maxDays: w * 7,
      label: `Up to ${w} ${w === 1 ? "week" : "weeks"}`,
      queryAllowedAfterDays: queryAllowedAfterDays ?? w * 7,
    };
  }

  // Days range: e.g. "30 to 60 days", "30-90 days"
  const dayRange = lower.match(/(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:days|day\b)/i);
  if (dayRange) {
    const minD = parseInt(dayRange[1], 10);
    const maxD = parseInt(dayRange[2], 10);
    return {
      raw: clean,
      minDays: minD,
      maxDays: maxD,
      label: `${minD}–${maxD} days`,
      queryAllowedAfterDays: queryAllowedAfterDays ?? maxD,
    };
  }

  // Annual notification
  if (lower.includes("annual") || lower.includes("year") || lower.includes("december") || lower.includes("january")) {
    return {
      raw: clean,
      minDays: 180,
      maxDays: 365,
      label: "Annual review",
      queryAllowedAfterDays: 365,
    };
  }

  // Fallback retaining clean raw text
  return {
    raw: clean,
    minDays: null,
    maxDays: null,
    label: clean,
    queryAllowedAfterDays,
  };
}

/**
 * Extracts founding years, literary prizes, and objective prestige indicators from editorial copy.
 */
export function extractPrestigeSignals(input: {
  editorialFocus?: string | null;
  editorialTips?: string | null;
  fullText?: string | null;
  circulation?: string | null;
  representativeAuthors?: string | null;
}): ExtractedPrestige {
  const combined = [
    input.editorialFocus ?? "",
    input.editorialTips ?? "",
    input.fullText ?? "",
    input.representativeAuthors ?? "",
  ].join(" ");

  const honors: string[] = [];
  const reasons: string[] = [];

  const honorPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: "Pushcart Prize", regex: /\bpushcart\s*(?:prize)?/i },
    { name: "Best American Short Stories", regex: /best\s+american\s+short\s+stories/i },
    { name: "Best American Essays", regex: /best\s+american\s+essays/i },
    { name: "Best American Poetry", regex: /best\s+american\s+poetry/i },
    { name: "Best American Nonrequired Reading", regex: /best\s+american\s+nonrequired/i },
    { name: "Best of the Net", regex: /best\s+of\s+the\s+net/i },
    { name: "O. Henry Prize", regex: /o\.?\s*henry\s*(?:prize|award)?/i },
    { name: "Whiting Award", regex: /whiting\s*(?:award|writers)?/i },
    { name: "National Book Award", regex: /national\s+book\s+award/i },
    { name: "Pulitzer Prize", regex: /pulitzer/i },
    { name: "NEA Fellowships", regex: /\bnea\b|\bnational\s+endowment\s+for\s+the\s+arts/i },
  ];

  for (const { name, regex } of honorPatterns) {
    if (regex.test(combined)) {
      honors.push(name);
    }
  }

  // Founding year detection
  let foundingYear: number | null = null;
  const yearMatch = combined.match(
    /(?:founded|established|est\.?|publishing since|in print since|published continuously since|began|started|launched|created)\s*(?:in\s*)?([12]\d{3})/i,
  );
  if (yearMatch) {

    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 1800 && yr <= 2026) {
      foundingYear = yr;
    }
  }

  // Tier classification logic:
  // Tier 1: Founded before 1990 OR >= 2 major honors OR high circulation (>= 5,000)
  // Tier 2: Founded between 1990-2018 OR >= 1 major honor OR notable authors mentioned
  // Tier 3: Emerging / newer publication
  let prestigeTier: ExtractedPrestige["prestigeTier"] = "Tier 3 (Emerging & Community)";

  const circ = parseInt((input.circulation ?? "").replace(/\D/g, ""), 10);
  const isHighCirc = !isNaN(circ) && circ >= 5000;

  if ((foundingYear !== null && foundingYear < 1990) || honors.length >= 2 || isHighCirc) {
    prestigeTier = "Tier 1 (Flagship)";
    if (foundingYear && foundingYear < 1990) reasons.push(`Long-running publication (Est. ${foundingYear})`);
    if (honors.length >= 2) reasons.push(`Multiple national anthology honors (${honors.slice(0, 2).join(", ")})`);
    if (isHighCirc) reasons.push(`Significant circulation (${input.circulation})`);
  } else if ((foundingYear !== null && foundingYear <= 2018) || honors.length >= 1 || (input.representativeAuthors && input.representativeAuthors.length > 20)) {
    prestigeTier = "Tier 2 (Established Contemporary)";
    if (foundingYear) reasons.push(`Established in ${foundingYear}`);
    if (honors.length > 0) reasons.push(`Honors include ${honors[0]}`);
    if (input.representativeAuthors) reasons.push("Recognized contributor roster");
  } else {
    prestigeTier = "Tier 3 (Emerging & Community)";
    if (foundingYear) reasons.push(`Independent platform (Est. ${foundingYear})`);
    else reasons.push("Contemporary independent press / zine");
  }

  return {
    prestigeTier,
    foundingYear,
    honors,
    reasons,
  };
}

/**
 * Classifies the editorial voice and demeanour to help creatives understand the emotional
 * and stylistic expectations of the editorial team.
 */
export function classifyEditorialDemeanor(input: {
  editorialFocus?: string | null;
  editorialTips?: string | null;
  fullText?: string | null;
}): EditorialDemeanor {
  const combined = [
    input.editorialFocus ?? "",
    input.editorialTips ?? "",
    input.fullText ?? "",
  ].join(" ").toLowerCase();

  const scores = {
    warm: 0,
    craft: 0,
    edgy: 0,
    rules: 0,
    community: 0,
  };

  const tags: string[] = [];

  // Warm & Debut-Friendly
  const warmWords = ["emerging", "first-time", "debut", "welcoming", "encourage", "unpublished", "new voices", "love to publish", "supportive", "first publication"];
  for (const w of warmWords) {
    if (combined.includes(w)) scores.warm += 2;
  }
  if (scores.warm >= 2) tags.push("Debut-Friendly", "Welcoming to New Voices");

  // Craft-Focused & Rigorous
  const craftWords = ["rigorous", "technique", "precision", "craft", "formal", "high standard", "excellence", "mastery", "polished", "flawless", "meticulous"];
  for (const w of craftWords) {
    if (combined.includes(w)) scores.craft += 2;
  }
  if (scores.craft >= 2) tags.push("Craft-Focused", "Formal Rigor");

  // Edgy & Experimental
  const edgyWords = ["experimental", "risk", "unconventional", "visceral", "rule-breaking", "weird", "provocative", "transgressive", "raw", "hybrid", "daring", "genre-bending"];
  for (const w of edgyWords) {
    if (combined.includes(w)) scores.edgy += 2;
  }
  if (scores.edgy >= 2) tags.push("Experimental", "Risk-Taking");

  // Rules-Strict
  const rulesWords = ["disqualified", "strict", "must adhere", "will be deleted", "do not query", "automatic rejection", "zero tolerance", "no exceptions", "strictly adhere"];
  for (const w of rulesWords) {
    if (combined.includes(w)) scores.rules += 2;
  }
  if (scores.rules >= 2) tags.push("Strict Guidelines", "Precise Formatting");

  // Community & Identity-Led
  const commWords = ["underrepresented", "marginalized", "bipoc", "lgbtq", "queer", "solidarity", "accessible", "community-driven", "collective", "justice"];
  for (const w of commWords) {
    if (combined.includes(w)) scores.community += 2;
  }
  if (scores.community >= 2) tags.push("Community-Led", "Inclusive");

  // Determine top archetype
  let topKey: keyof typeof scores = "warm";
  let maxScore = scores.warm;

  for (const [k, v] of Object.entries(scores) as Array<[keyof typeof scores, number]>) {
    if (v > maxScore) {
      maxScore = v;
      topKey = k;
    }
  }

  if (maxScore === 0) {
    return {
      archetype: "Eclectic & Open",
      sentimentTags: ["Open Call", "Eclectic"],
      toneSummary: "Open to wide-ranging styles, voices, and creative aesthetics.",
    };
  }

  switch (topKey) {
    case "warm":
      return {
        archetype: "Warm & Debut-Friendly",
        sentimentTags: Array.from(new Set(tags)),
        toneSummary: "Warm, encouraging editorial team actively seeking emerging and first-time writers.",
      };
    case "craft":
      return {
        archetype: "Craft-Focused & Rigorous",
        sentimentTags: Array.from(new Set(tags)),
        toneSummary: "Emphasizes technical mastery, formal precision, and tight literary craft.",
      };
    case "edgy":
      return {
        archetype: "Edgy & Experimental",
        sentimentTags: Array.from(new Set(tags)),
        toneSummary: "Hungry for bold, provocative, rule-breaking, and boundary-pushing submissions.",
      };
    case "rules":
      return {
        archetype: "Rules-Strict",
        sentimentTags: Array.from(new Set(tags)),
        toneSummary: "Demands strict adherence to submission limits, anonymous reading, and formatting rules.",
      };
    case "community":
      return {
        archetype: "Community & Identity-Led",
        sentimentTags: Array.from(new Set(tags)),
        toneSummary: "Centered on underrepresented perspectives, community dialogue, and cultural resonance.",
      };
  }
}

/**
 * Convenience orchestrator extracting all local intelligence without network requests.
 */
export function extractProfileIntelligence(data: {
  responseTime?: string | null;
  editorialFocus?: string | null;
  editorialTips?: string | null;
  fullText?: string | null;
  circulation?: string | null;
  representativeAuthors?: string | null;
}): ProfileIntelligenceResult {
  return {
    responseTime: parseResponseTime(data.responseTime),
    prestige: extractPrestigeSignals({
      editorialFocus: data.editorialFocus,
      editorialTips: data.editorialTips,
      fullText: data.fullText,
      circulation: data.circulation,
      representativeAuthors: data.representativeAuthors,
    }),
    demeanor: classifyEditorialDemeanor({
      editorialFocus: data.editorialFocus,
      editorialTips: data.editorialTips,
      fullText: data.fullText,
    }),
  };
}
