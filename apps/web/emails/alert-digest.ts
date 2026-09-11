import { renderBaseEmailLayout, escapeHtml, EMAIL_COLORS } from './components/base-layout';
import { buildUnsubscribeUrl } from '../lib/email-tokens';
import { siteUrl } from '../lib/siteUrl';
import type { Alert } from '@missa/radar-engine';

export interface AlertDigestEmailProps {
  alerts: Alert[];
  accountId: string;
  email: string;
}

export function renderAlertDigestEmail(props: AlertDigestEmailProps): { subject: string; html: string } {
  const updateLabel = `${props.alerts.length} opportunity update${props.alerts.length === 1 ? '' : 's'}`;
  const subject = `Missa: ${updateLabel}`;

  const bodyHtml = props.alerts
    .map(
      (alert) =>
        `<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid ${EMAIL_COLORS.border};">
          <div style="font-weight:600;font-size:15px;color:${EMAIL_COLORS.ink};margin-bottom:4px;">${escapeHtml(alert.title)}</div>
          <div style="font-size:14px;line-height:20px;color:${EMAIL_COLORS.inkSecondary};margin-bottom:6px;">${escapeHtml(alert.body)}</div>
          <div style="font-size:12px;color:${EMAIL_COLORS.inkMuted};">Why this is here: ${escapeHtml(alert.reason)}</div>
        </div>`,
    )
    .join('');

  const html = renderBaseEmailLayout({
    subject,
    title: `You have ${updateLabel} in your Inbox.`,
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

  return { subject, html };
}
