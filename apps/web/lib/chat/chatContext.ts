import type { ChatAssistantPayload, ChatEvidence, ChatResult } from "@missa/contracts";
import type {
  OpportunityBrowsePage,
  OpportunityRepositoryQuery,
  OpportunityType,
} from "@missa/radar-engine";

const STOP_WORDS = new Set([
  "a", "about", "and", "any", "are", "can", "calls", "call", "for", "find",
  "help", "i", "in", "is", "list", "looking", "me", "my", "of", "on", "open",
  "opportunities", "opportunity", "please", "show", "submissions", "submission",
  "that", "the", "there", "what", "with", "you", "your",
]);

const TYPE_ALIASES: Array<[string, OpportunityType]> = [
  ["grant", "grant"],
  ["grants", "grant"],
  ["award", "award"],
  ["awards", "award"],
  ["fellowship", "fellowship"],
  ["fellowships", "fellowship"],
  ["residency", "residency"],
  ["residencies", "residency"],
  ["contest", "contest"],
  ["contests", "contest"],
  ["magazine", "magazine"],
  ["magazines", "magazine"],
  ["journal", "magazine"],
  ["journals", "magazine"],
  ["festival", "festival"],
  ["festivals", "festival"],
  ["scholarship", "scholarship"],
  ["scholarships", "scholarship"],
];

export interface OpportunitySearchPlan {
  query?: string;
  types: OpportunityType[];
  feeStatus?: "no-fee" | "paid" | "unknown";
  sort: "recommended" | "soonest-deadline";
  repositoryQuery: OpportunityRepositoryQuery;
}

function normalizedTokens(message: string): string[] {
  return message
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Phase 1 intentionally uses a transparent parser instead of a model. This
 * gives us a stable baseline for later routing/LLM experiments and prevents a
 * user message from becoming an unbounded tool-selection prompt.
 */
export function buildOpportunitySearchPlan(message: string): OpportunitySearchPlan {
  const tokens = normalizedTokens(message);
  const types = new Set<OpportunityType>();
  const queryTokens: string[] = [];
  let feeStatus: OpportunitySearchPlan["feeStatus"];
  let sort: OpportunitySearchPlan["sort"] = "soonest-deadline";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "free" || (token === "no" && tokens[index + 1] === "fee")) {
      feeStatus = "no-fee";
      if (token === "no") index += 1;
      continue;
    }
    if (token === "paid" || token === "fee") {
      if (token === "paid") feeStatus = "paid";
      continue;
    }
    if (token === "best" || token === "recommended") {
      sort = "recommended";
      continue;
    }
    const alias = TYPE_ALIASES.find(([word]) => word === token);
    if (alias) {
      types.add(alias[1]);
      continue;
    }
    if (!STOP_WORDS.has(token)) queryTokens.push(token);
  }

  const query = queryTokens.join(" ").slice(0, 200) || undefined;
  const repositoryQuery: OpportunityRepositoryQuery = {
    query,
    category: "all",
    types: [...types],
    disciplines: [],
    genres: [],
    locations: [],
    feeStatus,
    openNow: true,
    verifiedOnly: false,
    sort,
    limit: 8,
  };
  return { query, types: [...types], feeStatus, sort, repositoryQuery };
}

function evidenceFor(item: OpportunityBrowsePage["items"][number]): ChatEvidence {
  return {
    opportunityId: item.id,
    title: item.title,
    url: item.source.url,
    checkedAt: item.source.checkedAt,
    organizationConfirmed: item.source.organizationConfirmed,
  };
}

function resultFor(item: OpportunityBrowsePage["items"][number]): ChatResult {
  return {
    id: item.id,
    title: item.title,
    ...(item.organizationName ? { organizationName: item.organizationName } : {}),
    status: item.status,
    type: item.type,
    deadline: {
      kind: item.deadline.kind,
      ...(item.deadline.date ? { date: item.deadline.date } : {}),
      ...(item.deadline.raw ? { raw: item.deadline.raw } : {}),
    },
    fee: {
      status: item.fee.status,
      ...(item.fee.amountCents !== undefined ? { amountCents: item.fee.amountCents } : {}),
      ...(item.fee.currency ? { currency: item.fee.currency } : {}),
    },
    source: evidenceFor(item),
  };
}

function resultSummary(result: ChatResult): string {
  const deadline = result.deadline.date ?? result.deadline.raw ?? "deadline not confirmed";
  const organization = result.organizationName ? ` from ${result.organizationName}` : "";
  return `${result.title}${organization} — ${deadline}.`;
}

export function buildOpportunityAssistantPayload(
  plan: OpportunitySearchPlan,
  page: OpportunityBrowsePage,
): ChatAssistantPayload {
  const results = page.items.map(resultFor);
  const evidence = results.map((result) => result.source);
  const searchLabel = plan.query || (plan.types.length ? plan.types.join(", ") : "published opportunities");
  const answer = results.length > 0
    ? `I found ${page.total} published ${searchLabel} record${page.total === 1 ? "" : "s"}. The first ${results.length} are below, with the source and last checked time kept visible. ${results.slice(0, 3).map(resultSummary).join(" ")}`
    : `I could not find a published opportunity matching “${searchLabel}”. This baseline searches Missa’s published opportunity records only; try a broader practice, opportunity type, or fee description.`;

  return {
    intent: "opportunity-search",
    engine: "deterministic-baseline",
    answer,
    search: {
      ...(plan.query ? { query: plan.query } : {}),
      types: plan.types,
      ...(plan.feeStatus ? { feeStatus: plan.feeStatus } : {}),
      sort: plan.sort,
    },
    results,
    evidence,
  };
}
