import type { WeeklyDigest, WeeklyDigestItem } from '@missa/radar-adapters';
import { EMAIL_FONTS, escapeHtml } from './components/base-layout';
import {
  calendarDate,
  capitalise,
  dayMonth,
  daysUntil,
  numberWord,
  relativeDay,
} from './components/call-facts';
import { CREATOR_EMAIL_COLORS as c, keepLight, renderEmailDocument, renderEmailFooter, wordmark } from './components/email-document';
import { dateLine, factsLine, label, opportunityUrl, placard, sectionHeading } from './components/wall';
import { digestPlanningSummary, planningRows, planningText } from './components/planning-wall';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import { sp, type Spelling } from '../lib/spelling';

export interface WeeklyDigestEmailProps {
  accountId: string;
  email: string;
  digest: WeeklyDigest;
  /** Render time; defaults to now. */
  now?: Date;
  /** UK readers get UK spelling (lib/spelling.ts). */
  spelling?: Spelling;
}

const f = EMAIL_FONTS;

const closingThisWeek = (item: WeeklyDigestItem, now: Date) => {
  const date = calendarDate(item.deadline);
  return date !== null && daysUntil(date, now) < 7;
};

/** "today", "tomorrow", "on Wednesday" or "on 18 October". */
function closesOn(date: Date, now: Date): string {
  const day = relativeDay(date, now);
  return day === 'today' || day === 'tomorrow' ? day : `on ${day}`;
}

/** One plain sentence that says what is in this week's email. */
function lede(digest: WeeklyDigest, now: Date): string {
  const total = digest.yourDeadlines.length + digest.newForYou.length + digest.closingSoon.length;
  const who = digest.recipientName ? `for ${digest.recipientName}` : 'for you';
  if (!total) {
    const next = digestPlanningSummary(digest.planning, now).three[0];
    const nextDate = calendarDate(next?.dueOn);
    if (next && nextDate)
      return `Your plan ${who} this week. Next up: ${next.kind === 'deadline' ? `${next.title} closes` : next.label} ${closesOn(nextDate, now)}.`;
  }
  const opening = `${capitalise(numberWord(total))} ${total === 1 ? 'call' : 'calls'} ${who} this week.`;
  const clauses: string[] = [];
  const mine = digest.yourDeadlines[0];
  const mineDate = calendarDate(mine?.deadline);
  if (mine && mineDate) clauses.push(`${mine.title} in your Tracker closes ${closesOn(mineDate, now)}`);
  if (digest.newForYou.length) clauses.push(`${numberWord(digest.newForYou.length)} just opened`);
  if (digest.closingSoon.length) {
    const soon = digest.closingSoon.length;
    const thisWeek = digest.closingSoon.every((item) => closingThisWeek(item, now));
    clauses.push(`${numberWord(soon)} ${soon === 1 ? 'is' : 'are'} ${thisWeek ? 'closing this week' : 'closing soon'}`);
  }
  if (!clauses.length) return opening;
  const joined = clauses.length > 1 ? `${clauses.slice(0, -1).join(', ')} and ${clauses.at(-1)}` : clauses[0]!;
  return `${opening} ${capitalise(joined)}.`;
}

function subjectLine(digest: WeeklyDigest, now: Date): string {
  const mine = digest.yourDeadlines[0];
  const mineDate = calendarDate(mine?.deadline);
  if (mine && mineDate) return `The Sunday List: ${mine.title} closes ${closesOn(mineDate, now)}`;
  if (digest.newForYou.length) {
    const n = digest.newForYou.length;
    return `The Sunday List: ${numberWord(n)} ${n === 1 ? 'call' : 'calls'} just opened for you`;
  }
  const n = digest.closingSoon.length;
  if (n) return `The Sunday List: ${numberWord(n)} ${n === 1 ? 'call' : 'calls'} closing soon`;
  return 'The Sunday List: your week ahead';
}

/**
 * The Sunday List: the weekly digest laid out as labels on a Forest wall. It
 * opens with "This week's three" (the next dated steps across saved
 * applications) and the season at a glance (triage buckets and busy weeks)
 * when the creator has saved applications. The creator's own nearest deadline
 * then leads as an ochre placard; without one, the
 * first new call leads on white. Empty sections are omitted, and callers skip
 * sending when every section is empty.
 */
export function renderWeeklyDigestEmail(props: WeeklyDigestEmailProps): { subject: string; html: string; text: string } {
  const now = props.now ?? new Date();
  const { digest } = props;
  const subject = subjectLine(digest, now);
  const summary = lede(digest, now);
  const forYou = new URL('/opportunities/for-you', `${siteUrl()}/`).toString();
  const profile = new URL('/profile', `${siteUrl()}/`).toString();
  const today = `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(now)} ${dayMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), now)}`;

  const planning = digestPlanningSummary(digest.planning, now);
  const rows: string[] = [...planningRows(planning, now)];
  const [mine, ...moreMine] = digest.yourDeadlines;
  let newItems = digest.newForYou;
  let index = 0;
  if (mine) {
    rows.push(sectionHeading('In your Tracker'), placard(mine, true, now));
    if (moreMine.length) rows.push('<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>');
    for (const item of moreMine) rows.push(label(item, index++, true, now));
  }
  if (newItems.length) {
    rows.push(sectionHeading('Just opened', 'Selected for you from the disciplines and genres you follow'));
    if (!mine) {
      rows.push(placard(newItems[0]!, false, now), '<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>');
      newItems = newItems.slice(1);
    }
    for (const item of newItems) rows.push(label(item, index++, false, now));
  }
  if (digest.closingSoon.length) {
    const thisWeek = digest.closingSoon.every((item) => closingThisWeek(item, now));
    rows.push(sectionHeading(thisWeek ? 'Closing this week' : 'Closing soon', 'Selected for you, with a deadline in the next two weeks'));
    for (const item of digest.closingSoon) rows.push(label(item, index++, false, now));
  }

  const bodyHtml = `
    <tr>
      <td class="m-pad" style="padding:30px 40px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle"><a href="${escapeHtml(siteUrl())}" style="text-decoration:none;">${wordmark('white', 84)}</a></td>
            <td align="right" valign="middle" style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.onForestMuted};">${keepLight(escapeHtml(today))}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="m-pad" style="padding:64px 40px 0;">
        ${keepLight(`<h1 class="m-title" style="margin:0;font-family:${f.editorial};font-size:72px;line-height:68px;font-weight:500;letter-spacing:-0.035em;color:${c.onForest};">The Sunday List</h1>
        <p style="margin:22px 0 0;max-width:470px;font-family:${f.editorial};font-size:20px;line-height:30px;color:${c.onForestSoft};">${escapeHtml(summary)}</p>`)}
      </td>
    </tr>
    ${rows.join('')}
    <tr>
      <td class="m-pad" style="padding:36px 40px 56px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td bgcolor="${c.citron}" style="background-color:${c.citron};border-radius:999px;mso-padding-alt:15px 26px;">
              <a href="${escapeHtml(forYou)}" style="display:inline-block;padding:15px 26px;font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.forestDeep};text-decoration:none;">See everything selected for you</a>
            </td>
          </tr>
        </table>
        ${keepLight(`<p style="margin:20px 0 0;font-family:${f.interface};font-size:14px;line-height:20px;">
          <a href="${escapeHtml(profile)}" style="color:${c.onForest};text-decoration:underline;text-underline-offset:3px;">Change what you follow</a>
        </p>`)}
      </td>
    </tr>
    ${renderEmailFooter({
      tone: 'forest',
      reason: sp("Selected from the disciplines and genres you chose, leaving out anything you excluded. Dates come from each organization's official page. You get The Sunday List because the weekly digest is on.", props.spelling),
      unsubscribeUrl: buildUnsubscribeUrl({ accountId: props.accountId, email: props.email, category: 'notification_digest' }),
    })}`;

  const html = renderEmailDocument({ subject, preheader: summary, background: c.forestDeep, bodyHtml });

  const textItem = (item: WeeklyDigestItem) => {
    const facts = factsLine(item, true);
    return `- ${item.title}, ${item.organizationName}\n  ${[facts, dateLine(item, now).text].filter(Boolean).join('. ')}. ${item.reason}.\n  ${opportunityUrl(item)}`;
  };
  const textSection = (title: string, items: WeeklyDigestItem[]) => (items.length ? ['', title.toUpperCase(), ...items.map(textItem)] : []);
  const text = [
    'The Sunday List',
    '',
    summary,
    ...planningText(planning, now),
    ...textSection('In your Tracker', digest.yourDeadlines),
    ...textSection('Just opened', digest.newForYou),
    ...textSection('Closing soon', digest.closingSoon),
    '',
    `See everything selected for you: ${forYou}`,
    `Email settings: ${siteUrl()}/inbox`,
  ].join('\n');

  return { subject, html, text };
}
