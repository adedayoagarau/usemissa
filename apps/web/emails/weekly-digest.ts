import {
  renderBaseEmailLayout,
  renderRecordRow,
  renderSectionHeading,
  escapeHtml,
} from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export interface WeeklyDigestCall {
  id: string;
  title: string;
  organizationName: string;
  deadlineFormatted?: string;
  categoryLabel?: string;
  url?: string;
}

export interface WeeklyDigestClosingCall {
  id: string;
  title: string;
  organizationName: string;
  deadlineFormatted: string;
  daysRemaining: number;
  url?: string;
}

export interface WeeklyDigestEmailProps {
  accountId: string;
  email: string;
  displayName?: string;
  /** Human date for the Monday this digest covers, e.g. "13 September". */
  weekOfFormatted: string;
  newCalls: WeeklyDigestCall[];
  closingSoon: WeeklyDigestClosingCall[];
}

/**
 * The weekly roundup: what opened, and what is about to shut.
 *
 * `alert-digest.ts` fires when something happens. This one arrives on a
 * schedule whether or not anything did, so it has a real empty state — and the
 * sender should skip a week where both lists are empty rather than send it.
 * `isWorthSending()` answers that.
 */
export function isWorthSending(props: Pick<WeeklyDigestEmailProps, 'newCalls' | 'closingSoon'>): boolean {
  return props.newCalls.length > 0 || props.closingSoon.length > 0;
}

export function renderWeeklyDigestEmail(props: WeeklyDigestEmailProps): { subject: string; html: string; text: string } {
  const name = props.displayName?.trim() || '';
  const newCount = props.newCalls.length;
  const closingCount = props.closingSoon.length;
  const quiet = !isWorthSending(props);

  const countPhrase = `${newCount} new call${newCount === 1 ? '' : 's'}`;

  const subject = quiet
    ? 'Nothing new this week'
    : newCount > 0
      ? `${countPhrase} this week`
      : `${closingCount} deadline${closingCount === 1 ? '' : 's'} coming up`;

  const title = quiet
    ? 'Nothing new this week.'
    : newCount > 0
      ? `${countPhrase} this week.`
      : `${closingCount} deadline${closingCount === 1 ? '' : 's'} coming up.`;

  const titleHighlight = quiet
    ? undefined
    : newCount > 0
      ? countPhrase
      : `${closingCount} deadline${closingCount === 1 ? '' : 's'}`;

  const preheader = quiet
    ? 'No new calls came in. Here is where to look instead.'
    : `Your week of ${props.weekOfFormatted}.`;

  const greeting = name ? `<p style="margin:0 0 18px;">Hi ${escapeHtml(name)},</p>` : '';

  let bodyHtml: string;

  if (quiet) {
    bodyHtml = `
      ${greeting}
      <p style="margin:0 0 18px;">
        No calls opened this week that match what you follow, and nothing you saved is closing yet. That happens — most magazines open in waves, and the autumn wave is usually late September.
      </p>
      <p style="margin:0;">
        If you want more in here each week, widen what you follow. You can pick more genres, more countries, or drop the entry-fee filter.
      </p>
    `;
  } else {
    const newCallsHtml = newCount
      ? renderSectionHeading('New this week', { first: true }) +
        props.newCalls
          .map((call, index) =>
            renderRecordRow({
              kicker: call.organizationName,
              title: call.title,
              url: call.url,
              flag: call.categoryLabel,
              meta: call.deadlineFormatted
                ? `Closes ${escapeHtml(call.deadlineFormatted)}`
                : 'No deadline listed',
              last: index === newCount - 1,
            }),
          )
          .join('')
      : '';

    const closingHtml = closingCount
      ? renderSectionHeading('Closing soon', { first: newCount === 0 }) +
        props.closingSoon
          .map((call, index) =>
            renderRecordRow({
              kicker: call.organizationName,
              title: call.title,
              url: call.url,
              flag: call.daysRemaining <= 1 ? '24 hours left' : `${call.daysRemaining} days left`,
              flagUrgent: call.daysRemaining <= 2,
              meta: `Closes ${escapeHtml(call.deadlineFormatted)}`,
              last: index === closingCount - 1,
            }),
          )
          .join('')
      : '';

    const intro =
      newCount > 0 && closingCount > 0
        ? `Here is what opened this week, and what you saved that is about to close.`
        : newCount > 0
          ? 'Here is what opened this week.'
          : 'Nothing new opened this week, but you have deadlines coming up.';

    bodyHtml = `
      ${greeting}
      <p style="margin:0 0 24px;">${intro}</p>
      ${newCallsHtml}
      ${closingHtml}
    `;
  }

  const html = renderBaseEmailLayout({
    subject,
    register: 'operational',
    preheader,
    title,
    titleHighlight,
    bodyHtml,
    callToAction: quiet
      ? { label: 'Change what you follow', url: new URL('/profile', `${siteUrl()}/`).toString() }
      : { label: 'Open Missa', url: new URL('/opportunities', `${siteUrl()}/`).toString() },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'notification_digest',
    }),
  });

  const textSections: string[] = [title, ''];

  if (quiet) {
    textSections.push(
      'No calls opened this week that match what you follow, and nothing you saved is closing yet.',
      '',
      `Change what you follow: ${siteUrl()}/profile`,
    );
  } else {
    if (newCount) {
      textSections.push('New this week:');
      for (const call of props.newCalls) {
        textSections.push(
          `- ${call.title} (${call.organizationName})${call.deadlineFormatted ? ` - closes ${call.deadlineFormatted}` : ''}`,
        );
      }
      textSections.push('');
    }
    if (closingCount) {
      textSections.push('Closing soon:');
      for (const call of props.closingSoon) {
        textSections.push(
          `- ${call.title} (${call.organizationName}) - closes ${call.deadlineFormatted}, ${call.daysRemaining} days left`,
        );
      }
      textSections.push('');
    }
    textSections.push(`Open Missa: ${siteUrl()}/opportunities`);
  }

  textSections.push(`Manage these emails: ${siteUrl()}/profile`);

  return { subject, html, text: textSections.join('\n') };
}
