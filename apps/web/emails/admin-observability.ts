import { EMAIL_FONTS, escapeHtml } from './components/base-layout';
import { CREATOR_EMAIL_COLORS as c, renderEmailDocument } from './components/email-document';

/** Internal founder emails: instant alerts and the Monday summary. Plain, scannable, and linked to the admin. */

const f = EMAIL_FONTS;

export interface AdminAlertEmailItem {
  title: string;
  detail: string;
  state: 'fired' | 'resolved';
}

function shell(subject: string, preheader: string, inner: string): string {
  return renderEmailDocument({
    subject,
    preheader,
    background: c.paper,
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;"><tr><td class="m-pad" style="padding:32px 28px;font-family:${f.interface};color:${c.ink};">${inner}</td></tr></table>`,
  });
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:20px;padding:12px 18px;border-radius:8px;background:${c.forest};color:${c.onForest};font-family:${f.interface};font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function renderAdminAlertEmail(props: { items: AdminAlertEmailItem[]; adminUrl: string }): { subject: string; html: string; text: string } {
  const firing = props.items.filter((item) => item.state === 'fired');
  const resolved = props.items.filter((item) => item.state === 'resolved');
  const subject = firing.length
    ? `Missa alert: ${firing[0]!.title}${firing.length > 1 ? ` and ${firing.length - 1} more` : ''}`
    : `Resolved: ${resolved[0]?.title ?? 'Missa alert'}`;
  const row = (item: AdminAlertEmailItem) => `
    <tr><td style="padding:12px 0;border-top:1px solid ${c.mineralRule};">
      <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${item.state === 'fired' ? c.ochreDeep : c.forest};">${item.state === 'fired' ? 'Needs attention' : 'Resolved'}</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${c.ink};">${escapeHtml(item.title)}</p>
      <p style="margin:4px 0 0;font-size:14px;line-height:21px;color:${c.inkSecondary};">${escapeHtml(item.detail)}</p>
    </td></tr>`;
  const inner = `
    <p style="margin:0;font-size:13px;color:${c.inkMuted};">Missa monitoring</p>
    <h1 style="margin:6px 0 16px;font-size:22px;line-height:28px;color:${c.ink};">${escapeHtml(firing.length ? 'Something needs your attention' : 'Back to normal')}</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${[...firing, ...resolved].map(row).join('')}</table>
    ${button(`${props.adminUrl}/admin/health`, 'Open health dashboard')}`;
  const text = [firing.length ? 'Something needs your attention' : 'Back to normal', '', ...props.items.map((item) => `${item.state === 'fired' ? '[!]' : '[ok]'} ${item.title}\n${item.detail}`), '', `${props.adminUrl}/admin/health`].join('\n');
  return { subject, html: shell(subject, firing[0]?.detail ?? resolved[0]?.detail ?? '', inner), text };
}

export interface WeeklyDigestMetric {
  label: string;
  value: string;
  change?: string;
  good?: boolean;
}

export function renderAdminWeeklyDigest(props: { weekOf: string; metrics: WeeklyDigestMetric[]; highlights: string[]; adminUrl: string }): { subject: string; html: string; text: string } {
  const subject = `Missa this week: ${props.metrics.slice(0, 2).map((metric) => `${metric.value} ${metric.label.toLowerCase()}`).join(', ')}`;
  const cells = props.metrics.map((metric) => `
    <td class="m-full" width="50%" style="padding:12px 12px 12px 0;vertical-align:top;">
      <p style="margin:0;font-size:12px;color:${c.inkMuted};">${escapeHtml(metric.label)}</p>
      <p style="margin:4px 0 0;font-family:${f.data};font-size:24px;line-height:28px;color:${c.ink};">${escapeHtml(metric.value)}</p>
      ${metric.change ? `<p style="margin:2px 0 0;font-size:12px;color:${metric.good === false ? c.ochreDeep : c.forest};">${escapeHtml(metric.change)} vs last week</p>` : ''}
    </td>`);
  const rows: string[] = [];
  for (let index = 0; index < cells.length; index += 2) rows.push(`<tr>${cells[index]}${cells[index + 1] ?? '<td></td>'}</tr>`);
  const inner = `
    <p style="margin:0;font-size:13px;color:${c.inkMuted};">Week of ${escapeHtml(props.weekOf)}</p>
    <h1 style="margin:6px 0 12px;font-size:22px;line-height:28px;color:${c.ink};">Missa this week</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>
    ${props.highlights.length ? `<p style="margin:20px 0 6px;font-size:14px;font-weight:600;color:${c.ink};">Worth knowing</p><ul style="margin:0;padding-left:18px;font-size:14px;line-height:22px;color:${c.inkSecondary};">${props.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    ${button(`${props.adminUrl}/admin`, 'Open the dashboard')}`;
  const text = [`Missa this week (week of ${props.weekOf})`, '', ...props.metrics.map((metric) => `${metric.label}: ${metric.value}${metric.change ? ` (${metric.change} vs last week)` : ''}`), '', ...props.highlights.map((item) => `- ${item}`), '', `${props.adminUrl}/admin`].join('\n');
  return { subject, html: shell(subject, props.metrics.map((metric) => `${metric.label} ${metric.value}`).join(' · '), inner), text };
}
