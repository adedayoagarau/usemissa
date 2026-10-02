import type { WeeklyDigest, WeeklyDigestItem } from '@missa/radar-adapters';
import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS } from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export interface WeeklyDigestEmailProps {
  accountId: string;
  email: string;
  digest: WeeklyDigest;
}

const SECTIONS: { key: keyof WeeklyDigest; heading: string; intro: string }[] = [
  { key: 'yourDeadlines', heading: 'Your deadlines', intro: 'Saved applications closing in the next three weeks.' },
  { key: 'newForYou', heading: 'New for you', intro: 'Added to Missa this week and matching what you make.' },
  { key: 'closingSoon', heading: 'Closing soon', intro: 'Matching calls that close in the next two weeks.' },
];

const opportunityUrl = (item: WeeklyDigestItem) =>
  new URL(`/opportunities/${encodeURIComponent(item.opportunityId)}`, `${siteUrl()}/`).toString();

function itemHtml(item: WeeklyDigestItem): string {
  const deadline = item.deadline ? `Deadline ${escapeHtml(item.deadline)}` : 'No fixed deadline';
  return `
    <div style="margin-bottom:12px;padding:14px 16px;background-color:${EMAIL_COLORS.cardSurface};border:1px solid ${EMAIL_COLORS.border};border-radius:8px;">
      <div style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_COLORS.forest600};margin-bottom:4px;">${escapeHtml(item.organizationName)}</div>
      <a href="${escapeHtml(opportunityUrl(item))}" style="font-size:16px;font-weight:600;color:${EMAIL_COLORS.ink};text-decoration:none;">${escapeHtml(item.title)}</a>
      <div style="font-size:13px;color:${EMAIL_COLORS.inkMuted};margin-top:4px;">${deadline} · ${escapeHtml(item.reason)}</div>
    </div>`;
}

/**
 * Weekly personalised digest. Sections without items are omitted, so a quiet
 * week sends a short email; callers skip sending when every section is empty.
 */
export function renderWeeklyDigestEmail(props: WeeklyDigestEmailProps): { subject: string; html: string; text: string } {
  const sections = SECTIONS.filter((section) => props.digest[section.key].length);
  const newCount = props.digest.newForYou.length;
  const deadlineCount = props.digest.yourDeadlines.length;
  const subject = 'Your week in calls';
  const preheader = [
    deadlineCount ? `${deadlineCount} saved deadline${deadlineCount === 1 ? '' : 's'} coming up` : '',
    newCount ? `${newCount} new call${newCount === 1 ? '' : 's'} for you` : '',
  ].filter(Boolean).join(' · ') || 'Calls matching what you make';

  const bodyHtml = sections
    .map(
      (section) => `
        <h2 style="font-size:17px;line-height:24px;color:${EMAIL_COLORS.ink};margin:24px 0 4px;">${escapeHtml(section.heading)}</h2>
        <p style="margin:0 0 12px;font-size:14px;line-height:20px;color:${EMAIL_COLORS.inkSecondary};">${escapeHtml(section.intro)}</p>
        ${props.digest[section.key].map(itemHtml).join('')}`,
    )
    .join('');

  const html = renderBaseEmailLayout({
    subject,
    preheader,
    eyebrow: 'Weekly',
    title: 'Your week in calls',
    bodyHtml,
    noteHtml: 'Matches come from the disciplines and genres in your profile. Update them any time to change what appears here.',
    callToAction: { label: 'Open Missa', url: new URL('/opportunities/for-you', `${siteUrl()}/`).toString() },
    unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'notification_digest' }),
  });

  const text = [
    'Your week in calls',
    ...sections.flatMap((section) => [
      '',
      section.heading,
      ...props.digest[section.key].map(
        (item) => `• ${item.title} (${item.organizationName}) — ${item.deadline ? `deadline ${item.deadline}` : 'no fixed deadline'} — ${item.reason}\n  ${opportunityUrl(item)}`,
      ),
    ]),
    '',
    `Manage notifications: ${siteUrl()}/profile`,
  ].join('\n');

  return { subject, html, text };
}
