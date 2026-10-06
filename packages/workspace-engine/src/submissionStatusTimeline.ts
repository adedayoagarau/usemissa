import type { DecisionOutcome, SubmissionStage, SubmissionStatus } from './domain/types.js';

/**
 * What a submitter is told about where their submission stands. The
 * organization chooses how much to show; the timeline never names readers,
 * scores or internal notes, only stages the organization itself announced.
 */

export type StatusTransparency = 'minimal' | 'stages' | 'full';

export type TimelineStepId = 'received' | 'in-review' | SubmissionStage | 'decision' | 'withdrawn';

export type TimelineStepState = 'complete' | 'current' | 'upcoming';

export interface TimelineStep {
  id: TimelineStepId;
  label: string;
  state: TimelineStepState;
  at?: string;
  detail?: string;
}

export interface SubmissionStatusTimelineInput {
  status: SubmissionStatus | string;
  submittedAt: string;
  /** True when at least one active review assignment exists. */
  hasActiveReview: boolean;
  /** Stage announcements sent to this submitter, oldest first or not. */
  stageEvents: Array<{ stage: SubmissionStage; at: string }>;
  decisions: Array<{ workId: string; outcome: DecisionOutcome | string; decidedAt: string }>;
  works: Array<{ id: string; title: string }>;
  transparency: StatusTransparency;
  /** Stages the organization runs for this opportunity, shown as upcoming before they are reached. */
  declaredStages?: SubmissionStage[];
  stageLabels?: Partial<Record<SubmissionStage, string>>;
  organizationName?: string;
  /** The date the organization said it expects to decide by (YYYY-MM-DD or ISO). */
  expectedDecisionBy?: string;
  now?: string;
}

export interface SubmissionStatusTimeline {
  steps: TimelineStep[];
  /** The step the submitter is at right now. */
  current: TimelineStep;
  /** One line for the card: "On the shortlist since 4 Mar". */
  summary: string;
}

export const DEFAULT_STAGE_LABELS: Record<SubmissionStage, string> = { longlist: 'Longlist', shortlist: 'Shortlist', finalist: 'Finalist' };

const STAGE_ORDER: SubmissionStage[] = ['longlist', 'shortlist', 'finalist'];

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function describeDecisions(input: SubmissionStatusTimelineInput): string {
  const outcomes = input.decisions.map((decision) => decision.outcome);
  const unique = new Set(outcomes);
  if (input.decisions.length === input.works.length && unique.size === 1) return `${outcomes[0]!.charAt(0).toUpperCase()}${outcomes[0]!.slice(1)}`;
  if (input.decisions.length < input.works.length) return `${input.decisions.length} of ${input.works.length} Works decided`;
  return 'Decided for each Work';
}

export function submissionStatusTimeline(input: SubmissionStatusTimelineInput): SubmissionStatusTimeline {
  const labels = { ...DEFAULT_STAGE_LABELS, ...(input.stageLabels ?? {}) };
  const steps: TimelineStep[] = [];
  const decided = input.decisions.length > 0;
  const withdrawn = input.status === 'withdrawn';
  const showStages = input.transparency !== 'minimal';
  const showReview = input.transparency === 'full';

  steps.push({ id: 'received', label: 'Received', state: 'complete', at: input.submittedAt, detail: `Submission received by Missa${input.organizationName ? ` for ${input.organizationName}` : ''}.` });

  if (withdrawn) {
    steps.push({ id: 'withdrawn', label: 'Withdrawn', state: 'current', detail: 'You withdrew this submission.' });
    const current = steps.at(-1)!;
    return { steps, current, summary: 'Withdrawn' };
  }

  const reachedStages = showStages
    ? [...input.stageEvents].sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage))
    : [];
  const latestStage = reachedStages.at(-1);
  const inReview = input.hasActiveReview && !decided;
  if (showReview && (inReview || latestStage || decided)) {
    steps.push({ id: 'in-review', label: 'In review', state: latestStage || decided ? 'complete' : 'current', detail: latestStage || decided ? 'Reading is complete for this stage.' : 'Readers are working through submissions. No action is needed from you.' });
  }

  for (const event of reachedStages) {
    steps.push({ id: event.stage, label: labels[event.stage], state: 'complete', at: event.at, detail: `${input.organizationName ?? 'The organization'} told you on ${shortDate(event.at)}.` });
  }
  if (latestStage && !decided) steps.at(-1)!.state = 'current';

  if (showStages && !decided) {
    const reached = new Set(reachedStages.map((event) => event.stage));
    const latestIndex = latestStage ? STAGE_ORDER.indexOf(latestStage.stage) : -1;
    for (const stage of input.declaredStages ?? []) {
      if (reached.has(stage) || STAGE_ORDER.indexOf(stage) <= latestIndex) continue;
      steps.push({ id: stage, label: labels[stage], state: 'upcoming', detail: 'Announced only if your submission reaches this stage.' });
    }
  }

  if (decided) {
    const latest = [...input.decisions].sort((left, right) => left.decidedAt.localeCompare(right.decidedAt)).at(-1)!;
    steps.push({ id: 'decision', label: 'Decision', state: 'current', at: latest.decidedAt, detail: describeDecisions(input) });
  } else {
    const expected = input.expectedDecisionBy ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(input.expectedDecisionBy) ? `${input.expectedDecisionBy}T23:59:59.000Z` : input.expectedDecisionBy) : Number.NaN;
    const late = !Number.isNaN(expected) && expected < Date.parse(input.now ?? new Date().toISOString());
    const detail = Number.isNaN(expected)
      ? 'Decisions stay attached to each Work you submitted.'
      : late
        ? `${input.organizationName ?? 'The organization'} expected to decide by ${shortDate(input.expectedDecisionBy!)} and is running later than planned.`
        : `Expected by ${shortDate(input.expectedDecisionBy!)}. Decisions stay attached to each Work you submitted.`;
    steps.push({ id: 'decision', label: 'Decision', state: 'upcoming', detail });
  }

  if (!steps.some((step) => step.state === 'current')) steps[0]!.state = 'current';
  const current = steps.find((step) => step.state === 'current')!;
  const summary =
    current.id === 'received'
      ? `Received ${shortDate(input.submittedAt)}`
      : current.id === 'in-review'
        ? 'In review'
        : current.id === 'decision'
          ? describeDecisions(input)
          : `${current.label} since ${shortDate(current.at ?? input.submittedAt)}`;
  return { steps, current, summary };
}
