import type { WeeklyDigestItem } from '@missa/radar-adapters';
import { EMAIL_FONTS, escapeHtml } from './base-layout';
import { calendarDate, dayMonth, daysLeftLabel, daysUntil, feeLabel, longDate, prizeLabel, typeLabel } from './call-facts';
import { CREATOR_EMAIL_COLORS as c, keepLight } from './email-document';
import { siteUrl } from '../../lib/siteUrl';

/**
 * The Forest wall shared by the digests: section headings in white, a large
 * placard for the lead call, and staggered wall labels for the rest. Each
 * label is one link to its opportunity page.
 */
export type WallItem = WeeklyDigestItem & {
  /** Where the label leads when it is not the opportunity's own page. */
  href?: string;
  /** Missa does not hold this call's deadline, so the label says nothing about it. */
  deadlineUnknown?: boolean;
};

const f = EMAIL_FONTS;
/** Horizontal offsets that stagger labels down the page; mobile stacks them. */
const OFFSETS = [0, 24, 8, 18, 4, 20];
const LABEL_WIDTH = 76;

export const opportunityUrl = (item: WallItem) =>
  new URL(`/opportunities/${encodeURIComponent(item.opportunityId)}`, `${siteUrl()}/`).toString();

export function dateLine(item: WallItem, now: Date): { text: string; urgent: boolean } {
  const date = calendarDate(item.deadline);
  if (!date) return { text: item.deadline ? `Closes ${item.deadline}` : 'No fixed deadline', urgent: false };
  const days = daysUntil(date, now);
  if (days === 0) return { text: 'Closes today', urgent: true };
  if (days < 7) return { text: `Closing this week · ${longDate(date, now)}`, urgent: true };
  return { text: `Closes ${dayMonth(date, now)}`, urgent: false };
}

export function factsLine(item: WallItem, withPrize = false): string {
  return [typeLabel(item.type), withPrize ? prizeLabel(item.prize) : null, feeLabel(item.feeStatus, item.feeCents, item.feeCurrency)]
    .filter(Boolean)
    .join(' · ');
}

export function sectionHeading(title: string, note?: string): string {
  return `
    <tr>
      <td class="m-pad" style="padding:56px 40px 20px;">
        ${keepLight(`<div style="font-family:${f.editorial};font-size:26px;line-height:32px;font-weight:400;color:${c.onForest};">${escapeHtml(title)}</div>
        ${note ? `<div style="font-family:${f.interface};font-size:14px;line-height:20px;color:${c.onForestMuted};margin-top:4px;">${escapeHtml(note)}</div>` : ''}`)}
      </td>
    </tr>`;
}

/** The lead call: a large placard, ochre when it is the creator's own. */
export function placard(item: WallItem, own: boolean, now: Date): string {
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
            <td bgcolor="${ground}" style="background-color:${ground};padding:0;">
              <a href="${escapeHtml(opportunityUrl(item))}" style="display:block;padding:24px 26px 22px;color:${c.ink};text-decoration:none;">
                <div style="font-family:${f.interface};font-size:15px;line-height:20px;font-weight:600;color:${c.ink};">${escapeHtml(item.organizationName)}</div>
                <div class="m-placard" style="margin:6px 0 10px;font-family:${f.editorial};font-size:34px;line-height:38px;font-weight:500;letter-spacing:-0.015em;color:${c.ink};">${escapeHtml(item.title)}</div>
                ${facts ? `<div style="font-family:${f.interface};font-size:15px;line-height:23px;color:${c.inkSecondary};">${escapeHtml(facts)}</div>` : ''}
                <div style="margin-top:18px;border-top:1px solid ${own ? c.ochreRule : c.rule};padding-top:12px;font-family:${f.interface};font-size:14px;line-height:20px;">
                  <span style="float:right;margin-left:16px;font-weight:600;color:${c.ink};text-decoration:underline;text-underline-offset:3px;">View opportunity</span>
                  <span style="font-weight:600;color:${own ? c.ochreDeep : c.inkSecondary};">${escapeHtml(when)}</span>
                </div>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** One wall label: organisation, title, what it is, when it closes, why it is here. */
export function label(item: WallItem, index: number, own: boolean, now: Date): string {
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
            <td class="m-full" width="${LABEL_WIDTH}%" valign="top" bgcolor="${ground}" style="width:${LABEL_WIDTH}%;background-color:${ground};padding:0;">
              <a href="${escapeHtml(item.href ?? opportunityUrl(item))}" style="display:block;padding:20px 22px 22px;color:${c.ink};text-decoration:none;">
                ${item.organizationName ? `<div style="font-family:${f.interface};font-size:14px;line-height:20px;font-weight:600;color:${c.ink};">${escapeHtml(item.organizationName)}</div>` : ''}
                <div style="margin:4px 0 8px;font-family:${f.editorial};font-size:24px;line-height:29px;font-weight:500;color:${c.ink};">${escapeHtml(item.title)}</div>
                ${facts ? `<div style="font-family:${f.interface};font-size:14px;line-height:21px;color:${c.inkSecondary};">${escapeHtml(facts)}</div>` : ''}
                ${item.deadlineUnknown ? '' : `<div style="font-family:${f.interface};font-size:14px;line-height:21px;${when.urgent ? `font-weight:600;color:${c.ochreDeep};` : `color:${c.inkSecondary};`}">${escapeHtml(when.text)}</div>`}
                <div style="margin-top:10px;font-family:${f.interface};font-size:13px;line-height:18px;color:${c.inkMuted};">
                  <span style="float:right;margin-left:12px;font-weight:600;color:${c.ink};text-decoration:underline;text-underline-offset:3px;">View</span>
                  ${escapeHtml(item.reason)}
                </div>
              </a>
            </td>
            ${spacer(rest)}
          </tr>
        </table>
      </td>
    </tr>`;
}

