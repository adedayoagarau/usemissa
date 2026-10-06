import { createHash } from 'node:crypto';
import type {
  CommunicationBatchStatus,
  CommunicationKind,
  DecisionOutcome,
  SubmissionStage,
  SubmissionStatus,
} from './domain/types.js';

/**
 * The Communications Manager's catalogue: which letters an organization can
 * send, what each one says by default, who it goes to, and which stage the
 * recipient is told about. Templates are plain text with merge fields; the
 * email renderer turns paragraphs into the organization letter layout.
 */

export const COMMUNICATION_MERGE_FIELDS = [
  'submitterName',
  'opportunityTitle',
  'organizationName',
  'workTitles',
  'stageLabel',
  'outcome',
  'senderName',
] as const;

export type CommunicationMergeField = (typeof COMMUNICATION_MERGE_FIELDS)[number];

export interface CommunicationTemplate {
  kind: CommunicationKind;
  label: string;
  description: string;
  stage?: SubmissionStage;
  /** Who the template is for; drives the default recipient selection. */
  audience: 'declined' | 'in-progress' | 'decided' | 'any';
  headline: string;
  defaultSubject: string;
  defaultBody: string;
}

export const COMMUNICATION_TEMPLATES: readonly CommunicationTemplate[] = [
  {
    kind: 'rejection-with-dignity',
    label: 'Rejection with dignity',
    description: 'Tells a submitter their work was not selected, plainly and with respect, without false hope or filler.',
    audience: 'declined',
    headline: 'About your submission',
    defaultSubject: 'About {{workTitles}}, from {{organizationName}}',
    defaultBody:
      'Dear {{submitterName}},\n\nThank you for sending {{workTitles}} to {{opportunityTitle}}. We read it in full and gave it careful thought. We are not able to select it this time.\n\nThis is one decision about one piece of work in one cycle. It is not a verdict on your writing or on you. We hope you will send us work again when the next call opens.\n\nWith thanks,\n{{senderName}}',
  },
  {
    kind: 'longlist',
    label: 'Longlist',
    description: 'Tells a submitter their submission is on the longlist and what happens next.',
    stage: 'longlist',
    audience: 'in-progress',
    headline: 'You are on the longlist',
    defaultSubject: '{{opportunityTitle}}: {{workTitles}} is on the {{stageLabel}}',
    defaultBody:
      'Dear {{submitterName}},\n\nWe are glad to tell you that {{workTitles}} is on the {{stageLabel}} for {{opportunityTitle}}.\n\nOur readers are continuing to read. We will write again when the next stage is decided. There is nothing you need to do now.\n\nWith thanks,\n{{senderName}}',
  },
  {
    kind: 'shortlist',
    label: 'Shortlist',
    description: 'Tells a submitter their submission is on the shortlist.',
    stage: 'shortlist',
    audience: 'in-progress',
    headline: 'You are on the shortlist',
    defaultSubject: '{{opportunityTitle}}: {{workTitles}} is on the {{stageLabel}}',
    defaultBody:
      'Dear {{submitterName}},\n\n{{workTitles}} is on the {{stageLabel}} for {{opportunityTitle}}. Congratulations.\n\nWe will be in touch with the final result as soon as it is decided. Please keep this message for your records.\n\nWith thanks,\n{{senderName}}',
  },
  {
    kind: 'finalists',
    label: 'Finalists',
    description: 'Tells a submitter they are a finalist.',
    stage: 'finalist',
    audience: 'in-progress',
    headline: 'You are a finalist',
    defaultSubject: '{{opportunityTitle}}: {{workTitles}} is a {{stageLabel}}',
    defaultBody:
      'Dear {{submitterName}},\n\nWe are delighted to tell you that {{workTitles}} is a {{stageLabel}} for {{opportunityTitle}}.\n\nWe will contact you about what happens next. Until the result is announced publicly, please treat this as confidential.\n\nWith thanks,\n{{senderName}}',
  },
  {
    kind: 'decision',
    label: 'Decision letter',
    description: 'Tells a submitter the recorded decision for each Work in the submission.',
    audience: 'decided',
    headline: 'About your application',
    defaultSubject: 'About {{workTitles}}, from {{organizationName}}',
    defaultBody:
      'Dear {{submitterName}},\n\nWe have finished reviewing {{workTitles}} for {{opportunityTitle}}. The decision is: {{outcome}}.\n\nYour Tracker shows the decision for each Work and keeps your submission record.\n\nWith thanks,\n{{senderName}}',
  },
  {
    kind: 'custom',
    label: 'Custom update',
    description: 'A free-form update about the submission or the opportunity, for example a timeline change.',
    audience: 'any',
    headline: 'An update about your submission',
    defaultSubject: 'An update about {{opportunityTitle}} from {{organizationName}}',
    defaultBody: 'Dear {{submitterName}},\n\n\n\nWith thanks,\n{{senderName}}',
  },
];

export function communicationTemplate(kind: CommunicationKind): CommunicationTemplate {
  const template = COMMUNICATION_TEMPLATES.find((item) => item.kind === kind);
  if (!template) throw new Error(`Unknown communication kind: ${kind}`);
  return template;
}

export function stageForCommunicationKind(kind: CommunicationKind): SubmissionStage | undefined {
  return communicationTemplate(kind).stage;
}

/** Replaces {{field}} tokens; unknown or missing fields become empty strings. */
export function renderMergeFields(template: string, values: Partial<Record<CommunicationMergeField, string>>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key as CommunicationMergeField] ?? '');
}

/** Merge fields present in a template that this catalogue does not know. */
export function unknownMergeFields(template: string): string[] {
  const known = new Set<string>(COMMUNICATION_MERGE_FIELDS);
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) if (!known.has(match[1]!)) found.add(match[1]!);
  return [...found];
}

/** Stable hash of the approved wording; a later edit invalidates the approval. */
export function communicationContentHash(subject: string, body: string): string {
  return createHash('sha256').update(`${subject}\u0000${body}`).digest('hex').slice(0, 32);
}

const transitions: Record<CommunicationBatchStatus, readonly CommunicationBatchStatus[]> = {
  draft: ['awaiting-approval', 'cancelled'],
  'awaiting-approval': ['approved', 'draft', 'cancelled'],
  approved: ['sending', 'draft', 'cancelled'],
  sending: ['sent', 'partially-sent', 'failed'],
  sent: [],
  'partially-sent': ['sending'],
  failed: ['sending', 'cancelled'],
  cancelled: [],
};

export function canTransitionCommunication(from: CommunicationBatchStatus, to: CommunicationBatchStatus): boolean {
  return transitions[from].includes(to);
}

/** Statuses in which the wording may still change. */
export function communicationEditable(status: CommunicationBatchStatus): boolean {
  return status === 'draft' || status === 'awaiting-approval';
}

export interface RecipientCandidate {
  submissionId: string;
  submitterAccountId: string;
  status: SubmissionStatus | string;
  works: Array<{ id: string; title: string; outcome?: DecisionOutcome | string }>;
  /** Stages this submission has already been told about by a sent batch. */
  stagesTold: SubmissionStage[];
}

export interface RecipientSelection {
  submissionId: string;
  submitterAccountId: string;
  workIds: string[];
}

/**
 * The default recipient set for a kind. Admins can still add or remove
 * recipients before approval; this is the safe starting point.
 *
 * - Rejection with dignity: submissions with a declined Work, for those Works.
 * - Longlist / shortlist / finalists: undecided, not withdrawn, not already told this stage.
 * - Decision: submissions with at least one recorded decision.
 * - Custom: everything not withdrawn.
 */
export function defaultRecipientsFor(kind: CommunicationKind, candidates: RecipientCandidate[]): RecipientSelection[] {
  const template = communicationTemplate(kind);
  const selections: RecipientSelection[] = [];
  for (const candidate of candidates) {
    if (candidate.status === 'withdrawn') continue;
    const decided = candidate.works.filter((work) => work.outcome);
    if (template.audience === 'declined') {
      const declined = candidate.works.filter((work) => work.outcome === 'declined');
      if (declined.length === 0) continue;
      selections.push({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, workIds: declined.map((work) => work.id) });
      continue;
    }
    if (template.audience === 'in-progress') {
      if (decided.length > 0) continue;
      if (template.stage && candidate.stagesTold.includes(template.stage)) continue;
      selections.push({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, workIds: candidate.works.map((work) => work.id) });
      continue;
    }
    if (template.audience === 'decided') {
      if (decided.length === 0) continue;
      selections.push({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, workIds: decided.map((work) => work.id) });
      continue;
    }
    selections.push({ submissionId: candidate.submissionId, submitterAccountId: candidate.submitterAccountId, workIds: candidate.works.map((work) => work.id) });
  }
  return selections.sort((left, right) => left.submissionId.localeCompare(right.submissionId));
}

/** Human wording for a packet of outcomes, e.g. "accepted" or "1 accepted, 2 declined". */
export function describeOutcomes(outcomes: Array<DecisionOutcome | string>): string {
  if (outcomes.length === 0) return 'not yet decided';
  const counts = new Map<string, number>();
  for (const outcome of outcomes) counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  if (counts.size === 1) return outcomes[0]!;
  return [...counts.entries()].map(([outcome, count]) => `${count} ${outcome}`).join(', ');
}

/** "Saltwater" / "Saltwater and Night bus" / "Saltwater, Night bus and Notes". */
export function joinTitles(titles: string[]): string {
  const clean = titles.map((title) => title.trim()).filter(Boolean);
  if (clean.length === 0) return 'your submission';
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')} and ${clean.at(-1)}`;
}
