import type { ChatAssistantPayload, ChatEvidence, ChatResult } from '@missa/contracts';
import type { OpportunityBrowsePage, OpportunityRepositoryQuery, OpportunityType } from '@missa/radar-engine';
import { MISSA_TAXONOMY, normalizeTaxonomyPhrase, resolveTaxonomyPhrase, taxonomyFacetForTerm, taxonomyLabelFor, type TaxonomyFacetKey } from '@missa/taxonomy';

const STOP_WORDS = new Set(['a', 'about', 'and', 'any', 'are', 'can', 'calls', 'call', 'for', 'find', 'help', 'i', 'in', 'is', 'list', 'looking', 'me', 'my', 'of', 'on', 'open', 'opportunities', 'opportunity', 'please', 'show', 'submissions', 'submission', 'that', 'the', 'there', 'what', 'with', 'you', 'your']);

const TYPE_ALIASES: Array<[string, OpportunityType]> = [
  ['grant', 'grant'],
  ['grants', 'grant'],
  ['award', 'award'],
  ['awards', 'award'],
  ['fellowship', 'fellowship'],
  ['fellowships', 'fellowship'],
  ['residency', 'residency'],
  ['residencies', 'residency'],
  ['contest', 'contest'],
  ['contests', 'contest'],
  ['magazine', 'magazine'],
  ['magazines', 'magazine'],
  ['journal', 'magazine'],
  ['journals', 'magazine'],
  ['festival', 'festival'],
  ['festivals', 'festival'],
  ['scholarship', 'scholarship'],
  ['scholarships', 'scholarship'],
];

export interface OpportunitySearchPlan {
  query?: string;
  types: OpportunityType[];
  feeStatus?: 'no-fee' | 'paid' | 'unknown';
  sort: 'recommended' | 'soonest-deadline';
  taxonomy: Array<{ termId: string; facet: TaxonomyFacetKey; label: string; sourcePhrase: string }>;
  clarifications: Array<{ phrase: string; options: Array<{ termId: string; facet: TaxonomyFacetKey; label: string }> }>;
  repositoryQuery: OpportunityRepositoryQuery;
}

const taxonomyLabels = (() => {
  const labels = new Map<string, typeof MISSA_TAXONOMY.terms>();
  for (const term of MISSA_TAXONOMY.terms.filter((candidate) => candidate.selectable)) {
    for (const source of [term.preferredLabel, term.slug, ...term.aliases]) {
      const normalized = normalizeTaxonomyPhrase(source);
      if (!normalized || normalized.length < 3) continue;
      const entries = labels.get(normalized) ?? [];
      if (!entries.some((entry) => entry.id === term.id)) entries.push(term);
      labels.set(normalized, entries);
    }
  }
  return [...labels.entries()].sort(([left], [right]) => right.length - left.length || left.localeCompare(right));
})();

function taxonomyFromMessage(message: string): Pick<OpportunitySearchPlan, 'taxonomy' | 'clarifications'> {
  const normalized = normalizeTaxonomyPhrase(message);
  const padded = ` ${normalized} `;
  const occupied: Array<{ start: number; end: number }> = [];
  const taxonomy: OpportunitySearchPlan['taxonomy'] = [];
  const clarifications: OpportunitySearchPlan['clarifications'] = [];

  for (const [phrase, terms] of taxonomyLabels) {
    const index = padded.indexOf(` ${phrase} `);
    if (index < 0) continue;
    const range = { start: index + 1, end: index + 1 + phrase.length };
    if (occupied.some((entry) => range.start < entry.end && range.end > entry.start)) continue;
    const resolution = resolveTaxonomyPhrase(phrase);
    const options = resolution.status === 'ambiguous'
      ? resolution.candidates.map((candidate) => ({ termId: candidate.termId, facet: candidate.facet, label: candidate.preferredLabel }))
      : terms.map((term) => ({ termId: term.id, facet: term.facet, label: term.preferredLabel }));
    if (resolution.status === 'ambiguous' || options.length > 1) clarifications.push({ phrase, options: options.slice(0, 8) });
    else if (options[0]) taxonomy.push({ ...options[0], sourcePhrase: phrase });
    occupied.push(range);
    if (taxonomy.length >= 12 || clarifications.length >= 4) break;
  }

  return { taxonomy, clarifications };
}

function normalizedTokens(message: string): string[] {
  return message
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
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
  const taxonomyState = taxonomyFromMessage(message);
  const types = new Set<OpportunityType>();
  const queryTokens: string[] = [];
  let feeStatus: OpportunitySearchPlan['feeStatus'];
  let sort: OpportunitySearchPlan['sort'] = 'soonest-deadline';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === 'free' || (token === 'no' && tokens[index + 1] === 'fee')) {
      feeStatus = 'no-fee';
      if (token === 'no') index += 1;
      continue;
    }
    if (token === 'paid' || token === 'fee') {
      if (token === 'paid') feeStatus = 'paid';
      continue;
    }
    if (token === 'best' || token === 'recommended') {
      sort = 'recommended';
      continue;
    }
    const alias = TYPE_ALIASES.find(([word]) => word === token);
    if (alias) {
      types.add(alias[1]);
      continue;
    }
    if (!STOP_WORDS.has(token)) queryTokens.push(token);
  }

  let queryPhrase = queryTokens.join(' ');
  for (const selection of taxonomyState.taxonomy) {
    queryPhrase = ` ${queryPhrase} `.replace(` ${selection.sourcePhrase} `, ' ').trim().replace(/\s+/g, ' ');
  }
  const query = queryPhrase.slice(0, 200) || undefined;
  const repositoryQuery: OpportunityRepositoryQuery = {
    query,
    category: 'all',
    types: [...types],
    disciplines: [],
    genres: [],
    taxonomyTermIds: taxonomyState.taxonomy.map((selection) => selection.termId),
    taxonomyIncludeDescendants: true,
    locations: [],
    feeStatus,
    openNow: true,
    verifiedOnly: false,
    sort,
    limit: 8,
  };
  return { query, types: [...types], feeStatus, sort, ...taxonomyState, repositoryQuery };
}

function evidenceFor(item: OpportunityBrowsePage['items'][number]): ChatEvidence {
  return {
    opportunityId: item.id,
    title: item.title,
    url: item.source.url,
  };
}

function resultFor(item: OpportunityBrowsePage['items'][number]): ChatResult {
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
    taxonomy: (item.taxonomy?.termIds ?? []).slice(0, 12).map((termId) => ({
      facet: taxonomyFacetForTerm(termId, MISSA_TAXONOMY) ?? 'practice-family',
      label: taxonomyLabelFor(termId, MISSA_TAXONOMY),
    })),
    source: evidenceFor(item),
  };
}

function resultSummary(result: ChatResult): string {
  const deadline = result.deadline.date ?? result.deadline.raw ?? 'deadline needs confirmation';
  const organization = result.organizationName ? ` from ${result.organizationName}` : '';
  return `${result.title}${organization} — ${deadline}.`;
}

export function buildOpportunityAssistantPayload(plan: OpportunitySearchPlan, page: OpportunityBrowsePage): ChatAssistantPayload {
  const publicTaxonomy = plan.taxonomy.map(({ facet, label }) => ({ facet, label }));
  const publicClarifications = plan.clarifications.map(({ phrase, options }) => ({ phrase, options: options.map(({ facet, label }) => ({ facet, label })) }));
  if (publicClarifications.length) {
    const clarification = publicClarifications[0]!;
    const options = clarification.options.map((option) => `${option.label} (${option.facet.replaceAll('-', ' ')})`).join(' or ');
    return {
      intent: 'opportunity-search',
      answer: `“${clarification.phrase}” can mean more than one field category in Missa. Do you mean ${options}?`,
      search: {
        ...(plan.query ? { query: plan.query } : {}),
        types: plan.types,
        ...(plan.feeStatus ? { feeStatus: plan.feeStatus } : {}),
        sort: plan.sort,
        taxonomy: publicTaxonomy,
        clarifications: publicClarifications,
      },
      results: [],
      evidence: [],
    };
  }
  const results = page.items.map(resultFor);
  const evidence = results.map((result) => result.source);
  const searchLabel = plan.query || (plan.types.length ? plan.types.join(', ') : 'published opportunities');
  const answer = results.length > 0 ? `I found ${page.total} published ${searchLabel} record${page.total === 1 ? '' : 's'}. The first ${results.length} are below with their official-source links. Review consequential details on the source before acting. ${results.slice(0, 3).map(resultSummary).join(' ')}` : `I could not find a published Opportunity matching “${searchLabel}” in Missa’s current collection. Try a broader field, Opportunity type, or fee description.`;

  return {
    intent: 'opportunity-search',
    answer,
    search: {
      ...(plan.query ? { query: plan.query } : {}),
      types: plan.types,
      ...(plan.feeStatus ? { feeStatus: plan.feeStatus } : {}),
      sort: plan.sort,
      taxonomy: publicTaxonomy,
      clarifications: [],
    },
    results,
    evidence,
  };
}
