import type { WeeklyDigest, WeeklyDigestItem } from '@missa/radar-adapters';
import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS } from './components/base-layout';
import { calendarDate, daysLeftLabel, daysUntil, longDate, renderOpportunitySection } from './components/opportunity-row';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export interface WeeklyDigestEmailProps {
  accountId: string;
  email: string;
  digest: WeeklyDigest;
  /** Render time; defaults to now. */
  now?: Date;
}

const SECTIONS: { key: keyof WeeklyDigest; heading: string }[] = [
  { key: 'yourDeadlines', heading: 'Your deadlines' },
  { key: 'newForYou', heading: 'New for you' },
  { key: 'closingSoon', heading: 'Closing soon' },
];

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n: number, one: string, many: string) => `${NUMBER_WORDS[n] ?? String(n)} ${n === 1 ? one : many}`;

/** One plain sentence that says what is in this week's email. */
function lede(digest: WeeklyDigest): string {
  const parts = [
    digest.yourDeadlines.length ? `${count(digest.yourDeadlines.length, 'saved deadline', 'saved deadlines')} in the next three weeks` : '',
    digest.newForYou.length ? `${count(digest.newForYou.length, 'new call', 'new calls')} in your practice` : '',
    digest.closingSoon.length ? `${count(digest.closingSoon.length, 'call', 'calls')} you may want to catch before ${digest.closingSoon.length === 1 ? 'it closes' : 'they close'}` : '',
  ].filter(Boolean);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? '';
  return `This week: ${list}.`;
}

/** ISO 8601 week number, matching the digest's once-a-week ledger key. */
function isoWeek(now: Date): number {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

const opportunityUrl = (item: WeeklyDigestItem) =>
  new URL(`/opportunities/${encodeURIComponent(item.opportunityId)}`, `${siteUrl()}/`).toString();

/**
 * Weekly personalised digest, laid out like a short weekly letter. Sections
 * without items are omitted; callers skip sending when every section is empty.
 */
export function renderWeeklyDigestEmail(props: WeeklyDigestEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const sections = SECTIONS.filter((section) => props.digest[section.key].length);
  const subject = 'Your week in calls';
  const summary = lede(props.digest);

  const bodyHtml = sections
    .map((section) =>
      renderOpportunitySection(
        section.heading,
        props.digest[section.key].map((item) => ({
          url: opportunityUrl(item),
          title: item.title,
          organizationName: item.organizationName,
          deadline: item.deadline,
          reason: item.reason,
        })),
        { now },
      ),
    )
    .join('');

  const preferencesUrl = new URL('/inbox', `${siteUrl()}/`).toString();
  const html = renderBaseEmailLayout({
    subject,
    preheader: summary,
    dateline: `Week ${isoWeek(now)} \u00b7 ${now.getUTCDate()} ${now.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`,
    title: 'Your week in calls',
    lede: summary,
    bodyHtml,
    noteHtml: `Everything here matches the disciplines and genres you chose, and leaves out anything you excluded. <a href="${escapeHtml(new URL('/profile', `${siteUrl()}/`).toString())}" style="color:${EMAIL_COLORS.forest600};text-decoration:underline;text-underline-offset:3px;">Change what you follow</a>`,
    callToAction: { label: 'See all your matches', url: new URL('/opportunities/for-you', `${siteUrl()}/`).toString() },
    footerReason: 'You get this every Sunday evening because the weekly digest is on.',
    preferencesUrl,
    unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'notification_digest' }),
  });

  const text = [
    'Your week in calls',
    '',
    summary,
    ...sections.flatMap((section) => [
      '',
      section.heading.toUpperCase(),
      ...props.digest[section.key].map((item) => {
        const date = calendarDate(item.deadline);
        const when = date ? `${longDate(date, now)} (${daysLeftLabel(daysUntil(date, now)).toLowerCase()})` : 'no fixed deadline';
        return `- ${item.title}, ${item.organizationName}\n  ${when}. ${item.reason}.\n  ${opportunityUrl(item)}`;
      }),
    ]),
    '',
    `See all your matches: ${siteUrl()}/opportunities/for-you`,
    `Email settings: ${preferencesUrl}`,
  ].join('\n');

  return { subject, html, text };
}
