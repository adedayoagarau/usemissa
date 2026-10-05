import { calendarDate, capitalise, dayMonth, numberWord, trackerStatusLabel } from './components/call-facts';
import { deadlineMomentText, renderDeadlineMoment, type DeadlineMomentProps } from './components/deadline-moment';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export type GoalCheckInEmailProps = {
  accountId: string;
  email: string;
  goal: {
    id: string;
    /** Submissions counted towards the goal so far. */
    progress: number;
    target: number;
    /** "YYYY-MM-DD" */
    endsOn: string;
    nextStep?: string | null;
  };
  givenName?: string | null;
  /** Calls in the Tracker, not yet submitted, closing before the goal date, soonest first. */
  closing: Array<{ opportunityId: string; title: string; status: string; deadline: string }>;
  /** How many such calls there are in all; closing may hold only the first few. */
  closingCount: number;
  /** Render time; defaults to now. */
  now?: Date;
};

export const GOAL_CHECK_IN_TEMPLATE_VERSION = 'goal-check-in.v1';

/**
 * The monthly goal check-in: how many submissions count so far, how many are
 * left before the goal date, and which saved calls close before then. Only
 * submissions count; saving or preparing a call never does.
 */
export function renderGoalCheckInEmail(props: GoalCheckInEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const { goal } = props;
  const name = props.givenName?.trim() || null;
  const left = Math.max(0, goal.target - goal.progress);
  const ends = calendarDate(goal.endsOn);
  const by = ends ? dayMonth(ends, now) : goal.endsOn;
  const url = (path: string) => new URL(path, `${siteUrl()}/`).toString();
  const closingSentence =
    props.closingCount === 0
      ? 'Nothing in your Tracker closes before then.'
      : `${capitalise(numberWord(props.closingCount))} ${props.closingCount === 1 ? 'call' : 'calls'} in your Tracker ${props.closingCount === 1 ? 'closes' : 'close'} before then.`;
  const nextStep = goal.nextStep?.trim() ? ` Your next step: ${goal.nextStep.trim().replace(/[.\s]+$/u, '')}.` : '';
  const lede = `${capitalise(numberWord(left))} more to reach your goal by ${by}. ${closingSentence}${nextStep}`;
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(now);
  const letter: DeadlineMomentProps = {
    subject: `${goal.progress} of ${goal.target} submissions towards your goal`,
    preheader: lede,
    context: `Your goal, ${month}`,
    hero: {
      kind: 'count',
      figure: String(goal.progress),
      words: `of ${goal.target} ${goal.target === 1 ? 'submission' : 'submissions'}${name ? `, ${name}.` : '.'}`,
    },
    progress: { done: Math.min(goal.progress, goal.target), target: goal.target },
    lede,
    panel: {
      tone: 'ochre',
      heading: 'Closing before your goal date',
      facts: props.closing.length
        ? props.closing.map((call) => {
            const date = calendarDate(call.deadline);
            const status = trackerStatusLabel(call.status);
            return { label: status ? `${call.title} · ${status}` : call.title, value: date ? dayMonth(date, now) : call.deadline };
          })
        : [{ label: 'Calls in your Tracker', value: `None before ${by}` }],
    },
    action: { label: 'Open your goal', url: url(`/goals?goal=${encodeURIComponent(goal.id)}`) },
    secondary: { label: 'Change the goal', url: url(`/goals?goal=${encodeURIComponent(goal.id)}`) },
    note: 'Only submissions count towards a goal. Saving and preparing a call never does.',
    footer: {
      reason: 'You get this because you set a submission goal with check-ins.',
      preferencesUrl: url('/inbox'),
      preferencesLabel: 'Change goal emails',
      unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'deadline_reminder' }),
    },
  };
  return { subject: letter.subject, html: renderDeadlineMoment(letter), text: deadlineMomentText(letter) };
}
