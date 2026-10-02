import type { WeeklyDigest, WeeklyDigestItem } from '@missa/radar-adapters';
import { EMAIL_FONTS, escapeHtml } from './components/base-layout';
import {
  calendarDate,
  capitalise,
  dayMonth,
  daysLeftLabel,
  daysUntil,
  feeLabel,
  longDate,
  numberWord,
  prizeLabel,
  relativeDay,
  typeLabel,
} from './components/call-facts';
import { CREATOR_EMAIL_COLORS as c, renderEmailDocument, renderEmailFooter, wordmark } from './components/email-document';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';

export interface WeeklyDigestEmailProps {
  accountId: string;
  email: string;
  digest: WeeklyDigest;
  /** Render time; defaults to now. */
  now?: Date;
}

const f = EMAIL_FONTS;
/** Horizontal offsets that stagger labels down the page; mobile stacks them. */
const OFFSETS = [0, 24, 8, 18, 4, 20];
const LABEL_WIDTH = 76;

const opportunityUrl = (item: WeeklyDigestItem) =>
  new URL(`/opportunities/${encodeURIComponent(item.opportunityId)}`, `${siteUrl()}/`).toString();

const closingThisWeek = (item: WeeklyDigestItem, now: Date) => {
  const date = calendarDate(item.deadline);
  return date !== null && daysUntil(date, now) < 7;
};

function dateLine(item: WeeklyDigestItem, now: Date): { text: string; urgent: boolean } {
  const date = calendarDate(item.deadline);
  if (!date) return { text: item.deadline ? `Closes ${item.deadline}` : 'No fixed deadline', urgent: false };
  const days = daysUntil(date, now);
  if (days === 0) return { text: 'Closes today', urgent: true };
  if (days < 7) return { text: `Closing this week · ${longDate(date, now)}`, urgent: true };
  return { text: `Closes ${dayMonth(date, now)}`, urgent: false };
}

function factsLine(item: WeeklyDigestItem, withPrize = false): string {
  return [typeLabel(item.type), withPrize ? prizeLabel(item.prize) : null, feeLabel(item.feeStatus, item.feeCents, item.feeCurrency)]
    .filter(Boolean)
    .join(' · ');
}

function sectionHeading(title: string, note?: string): string {
  return `
    <tr>
      <td class="m-pad" style="padding:56px 40px 20px;">
        <div style="font-family:${f.editorial};font-size:26px;line-height:32px;font-weight:400;color:${c.onForest};">${escapeHtml(title)}</div>
        ${note ? `<div style="font-family:${f.interface};font-size:14px;line-height:20px;color:${c.onForestMuted};margin-top:4px;">${escapeHtml(note)}</div>` : ''}
      </td>
    </tr>`;
}

/** The lead call: a large placard, ochre when it is the creator's own. */
function placard(item: WeeklyDigestItem, own: boolean, now: Date): string {
  const date = calendarDate(item.deadline);
  const days = date ? daysUntil(date, now) : null;
  const when =
    date === null || days === null
      ? dateLine(item, now).text
      : days === 0
        ? `Closes today, ${longDate(date, now)}`
        : `Closes ${longDate(date, now)} · ${daysLeftLabel(days)}`;
  const facts = factsLine(item, true);
  const ground = own ? c.ochreTint : c.paper;
  return `
    <tr>
      <td class="m-pad" style="padding:0 40px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td bgcolor="${ground}" style="background-color:${ground};padding:24px 26px 22px;color:${c.ink};">
              <div style="font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;">${escapeHtml(item.organizationName)}</div>
              <a href="${escapeHtml(opportunityUrl(item))}" class="m-placard" style="display:block;margin:6px 0 10px;font-family:${f.editorial};font-size:34px;line-height:38px;font-weight:500;letter-spacing:-0.015em;color:${c.ink};text-decoration:none;">${escapeHtml(item.title)}</a>
              ${facts ? `<div style="font-family:${f.interface};font-size:15px;line-height:23px;color:${c.inkSecondary};">${escapeHtml(facts)}</div>` : ''}
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="border-top:1px solid ${own ? c.ochreRule : c.rule};padding-top:12px;font-family:${f.interface};font-size:14px;line-height:20px;font-weight:600;color:${own ? c.ochreDeep : c.inkSecondary};">${escapeHtml(when)}</td>
                  <td align="right" valign="bottom" style="border-top:1px solid ${own ? c.ochreRule : c.rule};padding:12px 0 0 16px;font-family:${f.interface};font-size:14px;line-height:20px;white-space:nowrap;">
                    <a href="${escapeHtml(opportunityUrl(item))}" style="color:${c.ink};font-weight:600;text-decoration:underline;text-underline-offset:3px;">View</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** One wall label: organisation, title, what it is, when it closes, why it is here. */
function label(item: WeeklyDigestItem, index: number, own: boolean, now: Date): string {
  const offset = OFFSETS[index % OFFSETS.length]!;
  const rest = 100 - LABEL_WIDTH - offset;
  const when = dateLine(item, now);
  const facts = factsLine(item);
  const ground = own ? c.ochreTint : c.paper;
  const spacer = (width: number) =>
    width > 0 ? `<td class="m-hide" width="${width}%" style="width:${width}%;font-size:0;line-height:0;">&nbsp;</td>` : '';
  return `
    <tr>
      <td class="m-pad" style="padding:0 40px 20px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            ${spacer(offset)}
            <td class="m-full" width="${LABEL_WIDTH}%" valign="top" bgcolor="${ground}" style="width:${LABEL_WIDTH}%;background-color:${ground};padding:20px 22px 22px;color:${c.ink};">
              <div style="font-family:${f.interface};font-size:14px;line-height:20px;font-weight:600;">${escapeHtml(item.organizationName)}</div>
              <a href="${escapeHtml(opportunityUrl(item))}" style="display:block;margin:4px 0 8px;font-family:${f.editorial};font-size:24px;line-height:29px;font-weight:500;color:${c.ink};text-decoration:none;">${escapeHtml(item.title)}</a>
              ${facts ? `<div style="font-family:${f.interface};font-size:14px;line-height:21px;color:${c.inkSecondary};">${escapeHtml(facts)}</div>` : ''}
              <div style="font-family:${f.interface};font-size:14px;line-height:21px;${when.urgent ? `font-weight:600;color:${c.ochreDeep};` : `color:${c.inkSecondary};`}">${escapeHtml(when.text)}</div>
              <div style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.inkMuted};margin-top:10px;">${escapeHtml(item.reason)}</div>
            </td>
            ${spacer(rest)}
          </tr>
        </table>
      </td>
    </tr>`;
}

/** "today", "tomorrow", "on Wednesday" or "on 18 October". */
function closesOn(date: Date, now: Date): string {
  const day = relativeDay(date, now);
  return day === 'today' || day === 'tomorrow' ? day : `on ${day}`;
}

/** One plain sentence that says what is in this week's email. */
function lede(digest: WeeklyDigest, now: Date): string {
  const total = digest.yourDeadlines.length + digest.newForYou.length + digest.closingSoon.length;
  const who = digest.recipientName ? `for ${digest.recipientName}` : 'for you';
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
  return `The Sunday List: ${numberWord(n)} ${n === 1 ? 'call' : 'calls'} closing soon`;
}

/**
 * The Sunday List: the weekly digest laid out as labels on a Forest wall. The
 * creator's own nearest deadline leads as an ochre placard; without one, the
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

  const rows: string[] = [];
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
            <td align="right" valign="middle" style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.onForestMuted};">${escapeHtml(today)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="m-pad" style="padding:64px 40px 0;">
        <h1 class="m-title" style="margin:0;font-family:${f.editorial};font-size:72px;line-height:68px;font-weight:500;letter-spacing:-0.035em;color:${c.onForest};">The Sunday List</h1>
        <p style="margin:22px 0 0;max-width:470px;font-family:${f.editorial};font-size:20px;line-height:30px;color:${c.onForestSoft};">${escapeHtml(summary)}</p>
      </td>
    </tr>
    ${rows.join('')}
    <tr>
      <td class="m-pad" style="padding:36px 40px 56px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td bgcolor="${c.citron}" style="background-color:${c.citron};border-radius:999px;">
              <a href="${escapeHtml(forYou)}" style="display:inline-block;padding:15px 26px;font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.forestDeep};text-decoration:none;">See everything selected for you</a>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:${f.interface};font-size:14px;line-height:20px;">
          <a href="${escapeHtml(profile)}" style="color:${c.onForest};text-decoration:underline;text-underline-offset:3px;">Change what you follow</a>
        </p>
      </td>
    </tr>
    ${renderEmailFooter({
      tone: 'forest',
      reason: "Selected from the disciplines and genres you chose, leaving out anything you excluded. Dates come from each organisation's official page. You get The Sunday List because the weekly digest is on.",
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
    ...textSection('In your Tracker', digest.yourDeadlines),
    ...textSection('Just opened', digest.newForYou),
    ...textSection('Closing soon', digest.closingSoon),
    '',
    `See everything selected for you: ${forYou}`,
    `Email settings: ${siteUrl()}/inbox`,
  ].join('\n');

  return { subject, html, text };
}
