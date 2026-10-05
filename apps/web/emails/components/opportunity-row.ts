import { EMAIL_COLORS, EMAIL_FONTS, escapeHtml } from './base-layout';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY = 86_400_000;

/** Parse a "YYYY-MM-DD" deadline as a calendar date; anything else is left as written. */
export function calendarDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

/** Whole days from today (UTC) until the deadline date; 0 on the day itself. */
export function daysUntil(date: Date, now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((date.getTime() - today) / DAY));
}

/** "Sunday 18 October" for sentences; the year only when it is not the current one. */
export function longDate(date: Date, now = new Date()): string {
  const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  const year = date.getUTCFullYear() === now.getUTCFullYear() ? '' : ` ${date.getUTCFullYear()}`;
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${month}${year}`;
}

export function daysLeftLabel(days: number): string {
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `${days} days left`;
}

export type OpportunityRow = {
  url: string;
  title: string;
  organizationName: string;
  /** "YYYY-MM-DD", a preformatted date, or null for a rolling call. */
  deadline: string | null;
  /** Overrides the computed count, for callers that already know it. */
  daysRemaining?: number;
  /** Plain-text reason this call is in the email, e.g. "Because you chose Poetry". */
  reason?: string;
};

/**
 * One call in an email: a date column in Fragment Mono, the title in
 * Newsreader, then organisation, time left and the reason it was chosen.
 * Calls closing within a week carry ochre time-left text, never colour alone.
 */
export function renderOpportunityRow(row: OpportunityRow, options: { first?: boolean; now?: Date } = {}): string {
  const c = EMAIL_COLORS;
  const f = EMAIL_FONTS;
  const date = calendarDate(row.deadline);
  const days = row.daysRemaining ?? (date ? daysUntil(date, options.now) : undefined);
  const urgent = days !== undefined && days <= 7;

  const dateBlock = (top: string, bottom: string) =>
    `<div style="font-family:${f.data};font-size:24px;line-height:26px;color:${urgent ? c.ochreDeep : c.ink};font-variant-numeric:tabular-nums;">${top}</div>
     <div style="font-family:${f.data};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${urgent ? c.ochreDeep : c.inkMuted};">${bottom}</div>`;
  const dateCell = date
    ? dateBlock(String(date.getUTCDate()).padStart(2, '0'), MONTHS[date.getUTCMonth()]!)
    : row.deadline
      ? `<div style="font-family:${f.data};font-size:12px;line-height:16px;color:${c.inkMuted};padding:5px 8px 0 0;">${escapeHtml(row.deadline)}</div>`
      : dateBlock('&ndash;', 'Open');

  const meta = [
    days !== undefined
      ? `<span style="font-family:${f.data};font-size:12px;color:${urgent ? c.ochreDeep : c.inkMuted};">${urgent ? '&#9650;&nbsp;' : ''}${escapeHtml(daysLeftLabel(days))}</span>`
      : `<span style="font-family:${f.data};font-size:12px;color:${c.inkMuted};">No fixed deadline</span>`,
    row.reason ? `<span>${escapeHtml(row.reason)}</span>` : '',
  ].filter(Boolean).join(`<span style="color:${c.border};">&nbsp; / &nbsp;</span>`);

  return `
    <tr>
      <td class="missa-email-date" valign="top" width="72" style="width:72px;padding:18px 0;${options.first ? '' : `border-top:1px solid ${c.border};`}">${dateCell}</td>
      <td valign="top" style="padding:18px 0;${options.first ? '' : `border-top:1px solid ${c.border};`}">
        <div style="font-family:${f.interface};font-size:13px;line-height:18px;color:${c.inkMuted};margin:0 0 3px;">${escapeHtml(row.organizationName)}</div>
        <a href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer" style="font-family:${f.editorial};font-size:20px;font-weight:500;line-height:26px;letter-spacing:-0.01em;color:${c.ink};text-decoration:none;">${escapeHtml(row.title)}</a>
        <div style="font-family:${f.interface};font-size:13px;line-height:20px;color:${c.inkMuted};margin:6px 0 0;">${meta}</div>
      </td>
    </tr>`;
}

/** A labelled group of calls: small forest label, count, rule, rows. */
export function renderOpportunitySection(heading: string, rows: OpportunityRow[], options: { now?: Date } = {}): string {
  const c = EMAIL_COLORS;
  const f = EMAIL_FONTS;
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:40px 0 0;">
      <tr>
        <td style="padding:0 0 10px;border-bottom:1px solid ${c.ink};font-family:${f.interface};font-size:11px;font-weight:600;letter-spacing:0.12em;line-height:16px;text-transform:uppercase;color:${c.forest600};">${escapeHtml(heading)}</td>
        <td align="right" style="padding:0 0 10px;border-bottom:1px solid ${c.ink};font-family:${f.data};font-size:12px;line-height:16px;color:${c.inkMuted};">${String(rows.length).padStart(2, '0')}</td>
      </tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      ${rows.map((row, index) => renderOpportunityRow(row, { first: index === 0, now: options.now })).join('')}
    </table>`;
}
