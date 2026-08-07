export type OpportunityContentReviewStatus =
  | 'pending'
  | 'approved'
  | 'needs-human'
  | 'blocked';

export interface OpportunityContentFact {
  label: string;
  value: string;
  sourceUrl: string;
  certainty: 'confirmed' | 'unknown';
}

export interface OpportunityContentReview {
  status: OpportunityContentReviewStatus;
  score: number;
  reasons: string[];
  checks: Record<string, unknown>;
  reviewedAt?: string;
}

export interface OpportunityContent {
  builderVersion: string;
  summary: string;
  highlights: OpportunityContentFact[];
  preparation: string[];
  unknowns: string[];
  nextAction: string;
  sourceUrl: string;
  generatedAt: string;
  review: OpportunityContentReview;
}

export interface OpportunityContentBuildInput {
  title: string;
  type: string;
  status: string;
  organizationName?: string;
  discipline?: string;
  genres: string[];
  deadline: {
    kind: string;
    date?: string;
    raw?: string;
  };
  fee: {
    status: string;
    amountCents?: number;
    currency?: string;
  };
  prize?: string;
  location?: string;
  submissionUrl?: string;
  guidelinesUrl?: string;
  submissionState?: string;
  requiredMaterials: Array<{ label: string; limit?: string }>;
  acceptedFormats?: string[];
  sourceUrl: string;
  sourceProcessedAt?: string;
  organizationConfirmed: boolean;
  generatedAt?: string;
}

export interface OpportunityContentReviewContext {
  sourceUrl: string;
  sourceProcessedAt?: string;
  organizationConfirmed: boolean;
  submissionState?: string;
}

export type OpportunityContentDecision =
  | 'approved'
  | 'needs-human'
  | 'blocked'
  | 'error';

const BUILDER_VERSION = 'opportunity-brief.v1';

function typeLabel(value: string): string {
  return value === 'open-call' ? 'open call' : value.replaceAll('-', ' ');
}

function trimTo(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function deadlineText(deadline: OpportunityContentBuildInput['deadline']): { value: string; certainty: 'confirmed' | 'unknown' } {
  if (deadline.date) return { value: deadline.date, certainty: deadline.kind === 'exact' ? 'confirmed' : 'unknown' };
  if (deadline.raw) return { value: deadline.raw, certainty: 'unknown' };
  if (deadline.kind === 'rolling') return { value: 'Rolling deadline', certainty: 'confirmed' };
  if (deadline.kind === 'until-filled') return { value: 'Until filled', certainty: 'confirmed' };
  return { value: 'Deadline not confirmed', certainty: 'unknown' };
}

function feeText(fee: OpportunityContentBuildInput['fee']): { value: string; certainty: 'confirmed' | 'unknown' } {
  if (fee.status === 'no-fee') return { value: 'No fee disclosed', certainty: 'confirmed' };
  if (fee.status === 'paid' && fee.amountCents !== undefined) {
    const currency = fee.currency ? `${fee.currency} ` : '';
    return { value: `${currency}${(fee.amountCents / 100).toFixed(2)} submission fee`, certainty: 'confirmed' };
  }
  if (fee.status === 'paid') return { value: 'Paid submission; amount not confirmed', certainty: 'unknown' };
  return { value: 'Fee not confirmed', certainty: 'unknown' };
}

function sourceFact(label: string, value: string, sourceUrl: string, certainty: 'confirmed' | 'unknown'): OpportunityContentFact {
  return { label, value: trimTo(value, 320), sourceUrl, certainty };
}

export function buildOpportunityContent(input: OpportunityContentBuildInput): OpportunityContent {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const organization = input.organizationName ?? 'This organization';
  const focus = [...new Set([input.discipline, ...input.genres].filter(Boolean))].slice(0, 3);
  const deadline = deadlineText(input.deadline);
  const fee = feeText(input.fee);
  const focusText = focus.length ? ` for ${focus.join(', ')}` : '';
  const closingText = input.status === 'closing-soon' ? ' It is closing soon.' : '';
  const title = trimTo(input.title, 180);
  const summary = trimTo(
    title
      ? `${organization} lists “${title}”${focusText}. The current source lists ${deadline.value.toLowerCase()} as the deadline.${closingText}`
      : `${organization} is offering a ${typeLabel(input.type)}${focusText}. The current source lists ${deadline.value.toLowerCase()} as the deadline.${closingText}`,
    600,
  );

  const highlights: OpportunityContentFact[] = [
    sourceFact('Deadline', deadline.value, input.sourceUrl, deadline.certainty),
    sourceFact('Fee', fee.value, input.sourceUrl, fee.certainty),
  ];
  if (input.location) highlights.push(sourceFact('Location', input.location, input.sourceUrl, 'confirmed'));
  if (input.prize) highlights.push(sourceFact('Prize or support', input.prize, input.sourceUrl, 'unknown'));
  if (input.acceptedFormats?.length) highlights.push(sourceFact('Accepted formats', input.acceptedFormats.join(', '), input.sourceUrl, 'unknown'));
  if (input.submissionUrl || input.guidelinesUrl) {
    highlights.push(sourceFact('Application path', input.submissionUrl ? 'Submission link available' : 'Official guidelines available', input.sourceUrl, 'confirmed'));
  } else {
    highlights.push(sourceFact('Application path', 'Submission path not confirmed', input.sourceUrl, 'unknown'));
  }

  const preparation = input.requiredMaterials.length
    ? input.requiredMaterials.map((material) => material.limit ? `${material.label} — ${material.limit}` : material.label).map((value) => trimTo(value, 240))
    : ['Required materials are not confirmed; read the official source before preparing files.'];
  const unknowns: string[] = [];
  if (deadline.certainty === 'unknown') unknowns.push('The deadline needs confirmation from the official source.');
  if (fee.certainty === 'unknown') unknowns.push('The fee details need confirmation from the official source.');
  if (!input.organizationConfirmed) unknowns.push('The organization is not yet confirmed by source evidence.');
  if (!input.submissionUrl && !input.guidelinesUrl) unknowns.push('A direct submission or guidelines link is not yet available.');
  if (!input.requiredMaterials.length) unknowns.push('Required materials have not been extracted.');

  return {
    builderVersion: BUILDER_VERSION,
    summary,
    highlights,
    preparation,
    unknowns,
    nextAction: input.submissionUrl || input.guidelinesUrl
      ? 'Read the official guidelines, then prepare only the materials listed above.'
      : 'Open the official source to confirm how to apply before preparing a submission.',
    sourceUrl: input.sourceUrl,
    generatedAt,
    review: { status: 'pending', score: 0, reasons: [], checks: {} },
  };
}

export function reviewOpportunityContent(
  content: OpportunityContent,
  context: OpportunityContentReviewContext,
): { decision: OpportunityContentDecision; score: number; reasons: string[]; checks: Record<string, unknown> } {
  const reasons: string[] = [];
  const checks: Record<string, unknown> = {};
  const sourcePresent = /^https?:\/\//i.test(context.sourceUrl) && content.sourceUrl === context.sourceUrl;
  const sourceProcessed = Boolean(context.sourceProcessedAt);
  const organizationConfirmed = context.organizationConfirmed;
  const summary = typeof content.summary === 'string' ? content.summary : '';
  const highlights = Array.isArray(content.highlights) ? content.highlights : [];
  const preparation = Array.isArray(content.preparation) ? content.preparation : [];
  const unknowns = Array.isArray(content.unknowns) ? content.unknowns : [];
  const nextAction = typeof content.nextAction === 'string' ? content.nextAction : '';
  const summaryPresent = summary.trim().length >= 40 && summary.length <= 600;
  const highlightsPresent = highlights.length >= 2 && highlights.every((fact) =>
    typeof fact?.label === 'string' && fact.label.trim().length > 0 &&
    typeof fact?.value === 'string' && fact.value.trim().length > 0 &&
    fact?.sourceUrl === context.sourceUrl,
  );
  const preparationPresent = preparation.length > 0 && preparation.every((item) => typeof item === 'string' && item.trim().length > 0);
  const nextActionPresent = nextAction.trim().length > 0 && nextAction.length <= 300;
  const unsupportedClaim = /\b(guaranteed|perfect for|will win|best opportunity|certainly accepted)\b/i.test([
    summary,
    nextAction,
    ...highlights.flatMap((fact) => [fact?.label, fact?.value]),
    ...preparation,
    ...unknowns,
  ].filter((value): value is string => typeof value === 'string').join(' '));
  const unsafe = context.submissionState === 'unsafe';

  checks.sourcePresent = sourcePresent;
  checks.sourceProcessed = sourceProcessed;
  checks.organizationConfirmed = organizationConfirmed;
  checks.summaryPresent = summaryPresent;
  checks.highlightsPresent = highlightsPresent;
  checks.preparationPresent = preparationPresent;
  checks.nextActionPresent = nextActionPresent;
  checks.unsupportedClaim = unsupportedClaim;
  checks.unsafe = unsafe;

  let score = 0;
  if (sourcePresent) { score += 20; reasons.push('Content points to the canonical source URL.'); } else reasons.push('Content does not match a valid canonical source URL.');
  if (sourceProcessed) { score += 25; reasons.push('The source has a successful processing pass.'); } else reasons.push('The source has not completed a successful processing pass.');
  if (organizationConfirmed) { score += 20; reasons.push('The organization is confirmed by source evidence.'); } else reasons.push('The organization still needs source confirmation.');
  if (summaryPresent) { score += 15; reasons.push('The brief has a bounded human-readable summary.'); } else reasons.push('The brief summary is missing or outside its bounds.');
  if (highlightsPresent) { score += 10; reasons.push('Highlights are source-linked and non-empty.'); } else reasons.push('Highlights are incomplete or missing source links.');
  if (preparationPresent) score += 10; else reasons.push('Preparation guidance is empty.');
  if (!nextActionPresent) reasons.push('The next action is missing or outside its bounds.');
  if (unsupportedClaim) reasons.push('The brief contains an unsupported promotional claim.');

  if (unsafe || !sourcePresent || !summaryPresent || !highlightsPresent || !nextActionPresent || unsupportedClaim) {
    return { decision: 'blocked', score: Math.max(0, score - 30), reasons: unsafe ? ['Submission destination was marked unsafe.', ...reasons] : reasons, checks };
  }
  if (!sourceProcessed || !organizationConfirmed || score < 85) return { decision: 'needs-human', score, reasons, checks };
  return { decision: 'approved', score, reasons, checks };
}

export { BUILDER_VERSION };
