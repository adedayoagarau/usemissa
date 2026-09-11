import type { Opportunity, OpportunityStatus, OpportunityType } from "../domain/types.js";
import type { RadarStore } from "../store/store.js";

export type OpportunitySearchDomain = "visual_arts" | "multidisciplinary" | "residencies" | "literature";

export const VISUAL_ARTS_MEDIUMS = [
  "painting",
  "sculpture",
  "photography",
  "film",
  "video",
  "film/video",
  "printmaking",
  "digital art",
  "sound art",
  "performance",
  "performance art",
  "visual art",
  "visual arts",
  "installation",
  "ceramics",
  "drawing",
  "illustration",
  "textile",
  "fiber art",
  "mixed media",
  "public art",
] as const;

export const MULTIDISCIPLINARY_TERMS = [
  "multidisciplinary",
  "interdisciplinary",
  "cross-disciplinary",
  "hybrid",
  "all mediums",
  "all disciplines",
  "any discipline",
] as const;

export const LITERATURE_TERMS = [
  "poetry",
  "fiction",
  "nonfiction",
  "creative nonfiction",
  "essay",
  "short story",
  "flash fiction",
  "memoir",
  "translation",
  "playwriting",
  "screenwriting",
  "literature",
  "literary",
  "literary magazine",
  "small press",
] as const;

export interface OpportunitySearchOptions {
  domain?: OpportunitySearchDomain | string;
  genres?: string[];
  types?: OpportunityType[];
  category?: string;
  query?: string;
  feeStatus?: "no-fee" | "paid" | "unknown";
  maxFeeCents?: number;
  deadlineWithinDays?: number;
  openNow?: boolean;
  minStipendCents?: number;
  studioRequired?: boolean;
  housingRequired?: boolean;
  sort?: "soonest-deadline" | "recently-added" | "recommended" | "stipend-amount";
  cursor?: string;
  limit?: number;
}

export interface OpportunitySearchHit {
  opportunity: Opportunity;
  score: number;
  domain: OpportunitySearchDomain | "general";
  matchedMediums: string[];
  hasStipend: boolean;
  stipendAmountCents?: number;
  studioProvided: boolean;
  housingProvided: boolean;
}

export interface OpportunitySearchResult {
  items: OpportunitySearchHit[];
  total: number;
  nextCursor?: string | null;
  query: OpportunitySearchOptions;
}

function normalize(text: string | undefined | null): string {
  return (text ?? "").trim().toLowerCase();
}

export function detectOpportunityDomain(opp: Opportunity): OpportunitySearchDomain | "general" {
  const haystack = [
    opp.fields.title,
    opp.fields.type,
    ...(opp.fields.genres ?? []),
    opp.fields.prize ?? "",
    ...(opp.fields.requiredMaterials ?? []),
    opp.fields.guidelinesUrl ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Check residency first if type is residency or title explicitly denotes residency
  if (opp.fields.type === "residency" || /\bresidenc(y|ies)\b/i.test(opp.fields.title)) {
    return "residencies";
  }

  // Check visual arts
  const isVisualArt = VISUAL_ARTS_MEDIUMS.some((medium) => {
    return (
      opp.fields.genres.some((g) => normalize(g).includes(medium)) ||
      haystack.includes(medium)
    );
  }) || opp.fields.type === "exhibition" || opp.fields.type === "commission";

  if (isVisualArt) {
    return "visual_arts";
  }

  // Check multidisciplinary
  const isMulti = MULTIDISCIPLINARY_TERMS.some((term) => haystack.includes(term));
  if (isMulti) {
    return "multidisciplinary";
  }

  // Check literature
  const isLit = LITERATURE_TERMS.some((term) => haystack.includes(term)) ||
    opp.fields.type === "magazine";
  if (isLit) {
    return "literature";
  }

  return "general";
}

export function matchesDomain(opp: Opportunity, domain: OpportunitySearchDomain | string | undefined): boolean {
  if (!domain || domain === "all") return true;
  const normDomain = normalize(domain);

  const oppGenres = (opp.fields.genres ?? []).map(normalize);
  const oppType = normalize(opp.fields.type);
  const textBody = `${normalize(opp.fields.title)} ${oppGenres.join(" ")} ${normalize(opp.fields.prize)}`;

  if (normDomain === "visual_arts" || normDomain === "visual-arts") {
    if (oppType === "exhibition" || oppType === "commission") return true;
    return (
      oppGenres.some((g) => VISUAL_ARTS_MEDIUMS.some((m) => g.includes(m))) ||
      VISUAL_ARTS_MEDIUMS.some((m) => textBody.includes(m))
    );
  }

  if (normDomain === "residencies" || normDomain === "residency") {
    return (
      oppType === "residency" ||
      textBody.includes("residency") ||
      textBody.includes("resident artist") ||
      textBody.includes("fellow-in-residence")
    );
  }

  if (normDomain === "multidisciplinary") {
    return (
      MULTIDISCIPLINARY_TERMS.some((t) => textBody.includes(t)) ||
      oppGenres.some((g) => MULTIDISCIPLINARY_TERMS.some((t) => g.includes(t)))
    );
  }

  if (normDomain === "literature") {
    if (oppType === "magazine") return true;
    return (
      oppGenres.some((g) => LITERATURE_TERMS.some((l) => g.includes(l))) ||
      LITERATURE_TERMS.some((l) => textBody.includes(l))
    );
  }

  return textBody.includes(normDomain) || oppGenres.some((g) => g.includes(normDomain));
}

function parseFinancialsAndFacilities(opp: Opportunity): {
  hasStipend: boolean;
  stipendAmountCents?: number;
  studioProvided: boolean;
  housingProvided: boolean;
} {
  const combinedText = [
    opp.fields.title,
    opp.fields.prize ?? "",
    opp.fields.guidelinesUrl ?? "",
    opp.fields.eligibility.map((e) => `${e.key} ${e.description} ${e.value}`).join(" "),
  ].join(" ").toLowerCase();

  let hasStipend = false;
  let stipendAmountCents: number | undefined = undefined;

  const stipendMatch = combinedText.match(/\$\s?(\d{1,3}(?:,\d{3})*)\s*(?:stipend|honorarium|grant|award|fellowship)?/i);
  if (stipendMatch && (combinedText.includes("stipend") || combinedText.includes("honorarium") || combinedText.includes("cash") || opp.fields.prize)) {
    hasStipend = true;
    const num = Number(stipendMatch[1]!.replace(/,/g, ""));
    if (!Number.isNaN(num) && num > 0) {
      stipendAmountCents = Math.round(num * 100);
    }
  }

  const studioProvided = /\b(private studio|studio space|workspace provided|shared studio|studio access)\b/i.test(combinedText);
  const housingProvided = /\b(housing provided|private room|lodging provided|accommodations? provided|cabin|living quarters)\b/i.test(combinedText);

  return {
    hasStipend,
    stipendAmountCents,
    studioProvided,
    housingProvided,
  };
}

export class OpportunitySearchEngine {
  constructor(private opportunities: Opportunity[] = []) {}

  static fromStore(store: RadarStore): OpportunitySearchEngine {
    return new OpportunitySearchEngine(Array.from(store.opportunities.values()));
  }

  search(options: OpportunitySearchOptions): OpportunitySearchResult {
    const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
    const now = new Date();
    const activeStatuses: OpportunityStatus[] = ["open", "closing-soon", "deadline-extended"];

    let pool = this.opportunities.filter((opp) => {
      // Exclude archived/duplicate records
      if (opp.duplicateOfId) return false;
      if (opp.status === "archived" || opp.status === "closed" || opp.status === "duplicate") {
        if (options.openNow !== false) return false;
      }
      if (options.openNow && !activeStatuses.includes(opp.status)) {
        return false;
      }
      return true;
    });

    // Domain filter
    if (options.domain) {
      pool = pool.filter((opp) => matchesDomain(opp, options.domain));
    }

    // Genres filter (e.g. Painting, Sculpture)
    if (options.genres && options.genres.length > 0) {
      const requested = options.genres.map((g) => normalize(g));
      pool = pool.filter((opp) => {
        const oppGenres = (opp.fields.genres ?? []).map(normalize);
        const titleNorm = normalize(opp.fields.title);
        return requested.some((req) => 
          oppGenres.some((g) => g.includes(req) || req.includes(g)) ||
          titleNorm.includes(req)
        );
      });
    }

    // Types filter
    if (options.types && options.types.length > 0) {
      const requestedTypes = new Set(options.types.map((t) => normalize(t)));
      pool = pool.filter((opp) => requestedTypes.has(normalize(opp.fields.type)));
    }

    // Free-text query
    if (options.query) {
      const q = normalize(options.query);
      pool = pool.filter((opp) => {
        const haystack = [
          opp.fields.title,
          opp.fields.organizationName ?? "",
          opp.fields.type,
          ...(opp.fields.genres ?? []),
          opp.fields.location ?? "",
          opp.fields.prize ?? "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Fee status filter
    if (options.feeStatus) {
      pool = pool.filter((opp) => {
        if (options.feeStatus === "no-fee") {
          return opp.fields.fee.disclosed && opp.fields.fee.amountCents === 0;
        }
        if (options.feeStatus === "paid") {
          return opp.fields.fee.disclosed && (opp.fields.fee.amountCents ?? 0) > 0;
        }
        if (options.feeStatus === "unknown") {
          return !opp.fields.fee.disclosed;
        }
        return true;
      });
    }

    // Max fee filter
    if (options.maxFeeCents !== undefined) {
      pool = pool.filter((opp) => {
        if (!opp.fields.fee.disclosed) return true;
        return (opp.fields.fee.amountCents ?? 0) <= options.maxFeeCents!;
      });
    }

    // Deadline within days
    if (options.deadlineWithinDays !== undefined) {
      const maxDate = new Date(now.getTime() + options.deadlineWithinDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const today = now.toISOString().slice(0, 10);
      pool = pool.filter((opp) => {
        const d = opp.fields.deadline.date;
        if (!d) return false;
        return d >= today && d <= maxDate;
      });
    }

    // Score and enrich each candidate
    const scoredHits: OpportunitySearchHit[] = pool.map((opp) => {
      const financials = parseFinancialsAndFacilities(opp);
      const detectedDomain = detectOpportunityDomain(opp);

      const matchedMediums: string[] = [];
      for (const m of VISUAL_ARTS_MEDIUMS) {
        if (
          opp.fields.genres.some((g) => normalize(g).includes(m)) ||
          normalize(opp.fields.title).includes(m)
        ) {
          matchedMediums.push(m);
        }
      }

      // Base scoring algorithm
      let score = 100;

      // Status urgency: closing soon gets higher urgency
      if (opp.status === "closing-soon") score += 30;
      if (opp.status === "open") score += 20;
      if (opp.status === "deadline-extended") score += 25;

      // Verified / claimed boost
      if (opp.claimedByOrganizationId) score += 20;
      if ((opp.scores?.trust ?? 0) >= 70 || opp.trustSignals.some((s) => s.weight > 0 && s.present)) score += 15;

      // Domain relevance boost
      if (options.domain && matchesDomain(opp, options.domain)) {
        score += 40;
      }

      // Financials boost
      if (financials.hasStipend) score += 15;
      if (financials.studioProvided) score += 10;
      if (financials.housingProvided) score += 10;

      // Fee-free boost
      if (opp.fields.fee.disclosed && opp.fields.fee.amountCents === 0) {
        score += 10;
      }

      return {
        opportunity: opp,
        score,
        domain: detectedDomain,
        matchedMediums: Array.from(new Set(matchedMediums)),
        ...financials,
      };
    });

    // Studio / Housing required filters
    let filteredHits = scoredHits;
    if (options.studioRequired) {
      filteredHits = filteredHits.filter((h) => h.studioProvided);
    }
    if (options.housingRequired) {
      filteredHits = filteredHits.filter((h) => h.housingProvided);
    }
    if (options.minStipendCents !== undefined) {
      filteredHits = filteredHits.filter(
        (h) => (h.stipendAmountCents ?? 0) >= options.minStipendCents!
      );
    }

    // Sorting
    filteredHits.sort((a, b) => {
      if (options.sort === "stipend-amount") {
        const stipendDiff = (b.stipendAmountCents ?? 0) - (a.stipendAmountCents ?? 0);
        if (stipendDiff !== 0) return stipendDiff;
      }
      if (options.sort === "recently-added") {
        return (b.opportunity.createdAt ?? "").localeCompare(a.opportunity.createdAt ?? "");
      }
      if (options.sort === "soonest-deadline") {
        const dateA = a.opportunity.fields.deadline.date ?? "9999-12-31";
        const dateB = b.opportunity.fields.deadline.date ?? "9999-12-31";
        const diff = dateA.localeCompare(dateB);
        if (diff !== 0) return diff;
      }
      // Default: recommended / score-based
      return b.score - a.score || (a.opportunity.fields.deadline.date ?? "9999").localeCompare(b.opportunity.fields.deadline.date ?? "9999");
    });

    const offset = options.cursor
      ? Number(Buffer.from(options.cursor, "base64url").toString("utf8")) || 0
      : 0;

    const page = filteredHits.slice(offset, offset + limit);
    const nextCursor =
      offset + limit < filteredHits.length
        ? Buffer.from(String(offset + limit)).toString("base64url")
        : null;

    return {
      items: page,
      total: filteredHits.length,
      nextCursor,
      query: options,
    };
  }
}

export function searchOpportunities(
  opportunities: Opportunity[],
  options: OpportunitySearchOptions
): OpportunitySearchResult {
  const engine = new OpportunitySearchEngine(opportunities);
  return engine.search(options);
}
