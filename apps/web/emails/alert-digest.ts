import { renderBaseEmailLayout, renderRecordRow, escapeHtml, EMAIL_COLORS, EMAIL_FONTS } from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import type { Alert } from '@missa/radar-engine';

export interface AlertDigestEmailProps {
  alerts: Alert[];
  accountId: string;
  email: string;
}

export function renderAlertDigestEmail(props: AlertDigestEmailProps): { subject: string; html: string; text: string } {
  const count = props.alerts.length;
  const countLabel = `${count} update${count === 1 ? '' : 's'}`;
  const subject = `Missa: ${count} opportunity update${count === 1 ? '' : 's'}`;

  const bodyHtml = props.alerts
    .map((alert, index) => {
      // "Why this is here" is the promise Missa makes in its own footer — every
      // alert states the reason it reached you, in the same place, every time.
      const reason = `<span style="font-family:${EMAIL_FONTS.interface};font-size:12px;line-height:18px;color:${EMAIL_COLORS.inkMuted};">Why this is here: ${escapeHtml(alert.reason)}</span>`;
      const meta = `${escapeHtml(alert.body)}<div style="margin-top:8px;">${reason}</div>`;

      return renderRecordRow({ title: alert.title, meta, last: index === count - 1 });
    })
    .join('');

  const html = renderBaseEmailLayout({
    subject,
    register: 'operational',
    preheader: `${countLabel} across the calls you follow.`,
    title: `${countLabel} in your inbox.`,
    titleHighlight: countLabel,
    bodyHtml,
    callToAction: {
      label: 'Review in Missa',
      url: new URL('/inbox', `${siteUrl()}/`).toString(),
    },
    unsubscribeUrl: buildUnsubscribeUrl({
      accountId: props.accountId,
      email: props.email,
      category: 'notification_digest',
    }),
  });

  const alertLines = props.alerts
    .map((alert) => `• ${alert.title}\n  ${alert.body}\n  Why this is here: ${alert.reason}`)
    .join('\n\n');

  const text = `${countLabel} in your inbox.\n\n${alertLines}\n\nReview in Missa: ${siteUrl()}/inbox\nManage notifications: ${siteUrl()}/profile`;

  return { subject, html, text };
}
