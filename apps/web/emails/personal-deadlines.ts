import {
  renderBaseEmailLayout,
  renderRecordRow,
  renderSectionHeading,
  escapeHtml,
} from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export interface PersonalDeadlineItem {
  id: string;
  title: string;
  organizationName: string;
  deadlineFormatted: string;
  daysRemaining: number;
  /** True once a draft is attached in the Tracker. */
  draftStarted?: boolean;
  /** How long this has been sitting in the saved list. */
  savedDaysAgo?: number;
  entryFeeFormatted?: string;
  url?: string;
}

export interface PersonalDeadlinesEmailProps {
  accountId: string;
  email: string;
  displayName?: string;
  items: PersonalDeadlineItem[];
}

const THIS_WEEK_DAYS = 7;

/**
 * A standing view of where someone actually is on the calls they saved.
 *
 * `deadline-reminder.ts` says a date is close. This one says a date is close
 * and you have not written anything yet, which is the part that changes what
 * a person does next. Grouped by urgency, because a list of nine dates with no
 * grouping is a list nobody reads.
 */
export function renderPersonalDeadlinesEmail(
  props: PersonalDeadlinesEmailProps,
): { subject: string; html: string; text: string } {
  const name = props.displayName?.trim() || '';
  const items = [...props.items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  const thisWeek = items.filter((item) => item.daysRemaining <= THIS_WEEK_DAYS);
  const later = items.filter((item) => item.daysRemaining > THIS_WEEK_DAYS);
  const notStarted = items.filter((item) => !item.draftStarted);

  const count = items.length;
  const countPhrase = `${count} deadline${count === 1 ? '' : 's'}`;

  const subject =
    thisWeek.length > 0
      ? `${thisWeek.length} of your deadlines land this week`
      : `Your ${countPhrase} coming up`;

  const title = `You have ${countPhrase} coming up.`;

  const preheader = notStarted.length
    ? `${notStarted.length} of them have no draft yet.`
    : 'You have a draft going on all of them.';

  const describe = (item: PersonalDeadlineItem): string => {
    const parts = [`Closes ${escapeHtml(item.deadlineFormatted)}`];

    if (item.entryFeeFormatted) {
      parts.push(escapeHtml(item.entryFeeFormatted));
    }

    parts.push(item.draftStarted ? 'You have a draft going' : 'No draft yet');

    if (!item.draftStarted && typeof item.savedDaysAgo === 'number' && item.savedDaysAgo >= 14) {
      parts.push(`saved ${item.savedDaysAgo} days ago`);
    }

    return parts.join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  };

  const renderGroup = (group: PersonalDeadlineItem[], heading: string, first: boolean): string => {
    if (!group.length) return '';

    return (
      renderSectionHeading(heading, { first }) +
      group
        .map((item, index) =>
          renderRecordRow({
            kicker: item.organizationName,
            title: item.title,
            url: item.url,
            flag: item.daysRemaining <= 1 ? '24 hours left' : `${item.daysRemaining} days left`,
            flagUrgent: item.daysRemaining <= 2,
            meta: describe(item),
            last: index === group.length - 1,
          }),
        )
        .join('')
    );
  };

  const intro =
    notStarted.length === 0
      ? 'You have a draft going on all of these. Good place to be.'
      : notStarted.length === count
        ? 'None of these have a draft yet. Pick the one closing first and give it an hour.'
        : `${notStarted.length} of these have no draft yet.`;

  const bodyHtml = `
    ${name ? `<p style="margin:0 0 18px;">Hi ${escapeHtml(name)},</p>` : ''}
    <p style="margin:0 0 24px;">${intro}</p>
    ${renderGroup(thisWeek, 'This week', true)}
    ${renderGroup(later, 'Later this month', thisWeek.length === 0)}
  `;

  const noteHtml = thisWeek.length
    ? '<strong>One thing worth knowing.</strong> Most submission portals get slow on the closing day, and a few go down. If something here closes this week, send it a day early.'
    : undefined;

  const html = renderBaseEmailLayout({
    subject,
    register: 'operational',
    preheader,
    title,
    titleHighlight: countPhrase,
    bodyHtml,
    noteHtml,
    callToAction: {
      label: 'Open your Tracker',
      url: new URL('/tracker', `${siteUrl()}/`).toString(),
    },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'deadline_reminder',
    }),
  });

  const textLines: string[] = [title, '', intro.replace(/&nbsp;/g, ' '), ''];

  const appendGroup = (group: PersonalDeadlineItem[], heading: string) => {
    if (!group.length) return;
    textLines.push(`${heading}:`);
    for (const item of group) {
      const state = item.draftStarted ? 'draft going' : 'no draft yet';
      textLines.push(
        `- ${item.title} (${item.organizationName}) - closes ${item.deadlineFormatted}, ${item.daysRemaining} days left, ${state}`,
      );
    }
    textLines.push('');
  };

  appendGroup(thisWeek, 'This week');
  appendGroup(later, 'Later this month');

  textLines.push(`Open your Tracker: ${siteUrl()}/tracker`);
  textLines.push(`Manage these emails: ${siteUrl()}/profile`);

  return { subject, html, text: textLines.join('\n') };
}
