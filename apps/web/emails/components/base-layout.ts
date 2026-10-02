import { siteUrl } from '../../lib/siteUrl';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_POSTAL_ADDRESS,
  hasPostalAddress,
} from '../../lib/legalContact';

export interface BaseEmailLayoutProps {
  subject: string;
  preheader?: string;
  eyebrow?: string;
  title: string;
  /** Short editorial introduction under the title, set in Newsreader. Plain text. */
  lede?: string;
  /** Right-hand masthead line in Fragment Mono, e.g. "Week 40 · 2 Oct 2026". Plain text. */
  dateline?: string;
  bodyHtml: string;
  callToAction?: {
    label: string;
    url: string;
  };
  secondaryAction?: {
    label: string;
    url: string;
  };
  noteHtml?: string;
  /** Why this person is receiving the email, shown first in the footer. Plain text. */
  footerReason?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  logoUrl?: string;
}

/** Hex values of the Missa tokens in app/globals.css; email clients cannot read CSS variables. */
export const EMAIL_COLORS = {
  forest600: '#285649',
  forest700: '#1d4037',
  forest50: '#edf3f0',
  ochreDeep: '#78551e',
  ink: '#171418',
  inkSecondary: '#45413d',
  inkMuted: '#6d6670',
  canvas: '#ffffff',
  cardSurface: '#ffffff',
  border: '#e3e7e5',
} as const;

/**
 * Missa's three families with fallbacks for clients that ignore web fonts
 * (Gmail, Outlook). Apple Mail, iOS Mail and Samsung Mail load the real faces.
 */
export const EMAIL_FONTS = {
  interface: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  editorial: "'Newsreader', Georgia, 'Times New Roman', serif",
  data: "'Fragment Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

/**
 * Basic HTML to clean plain-text fallback generator for email accessibility
 * and anti-spam scoring.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/p>|<br\s*\/?>|<\/tr>|<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * The Missa email shell: a white page with a masthead, an editorial headline
 * and a plain footer, following DESIGN.md. No card, no tinted canvas; hierarchy
 * comes from Newsreader, Instrument Sans, Fragment Mono and hairline rules.
 */
export function renderBaseEmailLayout(props: BaseEmailLayoutProps): string {
  const defaultLogo = new URL('/brand/missa-wordmark-email.png', `${siteUrl()}/`).toString();
  const safeLogoUrl = escapeHtml(props.logoUrl || defaultLogo);
  const safeTitle = escapeHtml(props.title);
  const safeSubject = escapeHtml(props.subject);
  const defaultPreferencesUrl = new URL('/inbox', `${siteUrl()}/`).toString();
  const safePreferencesUrl = escapeHtml(props.preferencesUrl || defaultPreferencesUrl);
  const c = EMAIL_COLORS;
  const f = EMAIL_FONTS;

  const preheaderHtml = props.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(props.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>`
    : '';

  const datelineHtml = props.dateline
    ? `<td align="right" style="font-family:${f.data};font-size:12px;line-height:16px;color:${c.inkMuted};white-space:nowrap;">${escapeHtml(props.dateline)}</td>`
    : '';

  const eyebrowHtml = props.eyebrow
    ? `<div style="font-family:${f.interface};font-size:11px;font-weight:600;letter-spacing:0.12em;line-height:16px;text-transform:uppercase;color:${c.forest600};margin:0 0 12px;">${escapeHtml(props.eyebrow)}</div>`
    : '';

  const ledeHtml = props.lede
    ? `<p class="missa-email-lede" style="margin:0 0 8px;font-family:${f.editorial};font-size:19px;line-height:28px;color:${c.inkSecondary};">${escapeHtml(props.lede)}</p>`
    : '';

  const ctaHtml = props.callToAction
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
        <tr>
          <td style="background-color:${c.forest600};border-radius:6px;">
            <a href="${escapeHtml(props.callToAction.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 22px;font-family:${f.interface};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;">${escapeHtml(props.callToAction.label)}</a>
          </td>
        </tr>
      </table>`
    : '';

  const secondaryActionHtml = props.secondaryAction
    ? `<p style="margin:16px 0 0;font-family:${f.interface};font-size:14px;line-height:20px;">
        <a href="${escapeHtml(props.secondaryAction.url)}" target="_blank" rel="noopener noreferrer" style="color:${c.forest600};font-weight:500;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(props.secondaryAction.label)}</a>
      </p>`
    : '';

  const noteBlockHtml = props.noteHtml
    ? `<div style="margin:32px 0 0;padding:0 0 0 16px;border-left:2px solid ${c.forest600};font-family:${f.interface};font-size:14px;line-height:22px;color:${c.inkSecondary};">${props.noteHtml}</div>`
    : '';

  const reasonHtml = props.footerReason
    ? `<p style="margin:0 0 10px;">${escapeHtml(props.footerReason)}</p>`
    : '';

  const unsubscribeLink = props.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${escapeHtml(props.unsubscribeUrl)}" style="color:${c.inkMuted};text-decoration:underline;">Unsubscribe</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${safeSubject}</title>
    <link rel="stylesheet" href="${FONT_STYLESHEET}">
    <style>
      :root { color-scheme: light; supported-color-schemes: light; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      @media only screen and (max-width: 620px) {
        .missa-email-outer { padding: 24px 16px 32px !important; }
        .missa-email-title { font-size: 30px !important; line-height: 36px !important; }
        .missa-email-lede { font-size: 17px !important; line-height: 26px !important; }
        .missa-email-date { width: 56px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:${c.canvas};color:${c.ink};font-family:${f.interface};-webkit-font-smoothing:antialiased;">
    ${preheaderHtml}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${c.canvas};">
      <tr>
        <td align="center" class="missa-email-outer" style="padding:40px 24px 48px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;text-align:left;">
            <tr>
              <td style="padding:0 0 14px;border-bottom:2px solid ${c.ink};">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td valign="bottom">
                      <a href="${siteUrl()}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
                        <img src="${safeLogoUrl}" alt="Missa" width="102" height="22" style="display:block;width:102px;height:22px;border:0;outline:none;" />
                      </a>
                    </td>
                    ${datelineHtml}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 0 0;color:${c.ink};">
                ${eyebrowHtml}
                <h1 class="missa-email-title" style="margin:0 0 14px;font-family:${f.editorial};font-size:38px;font-weight:500;letter-spacing:-0.02em;line-height:44px;color:${c.ink};">${safeTitle}</h1>
                ${ledeHtml}
                <div style="font-family:${f.interface};font-size:16px;line-height:24px;color:${c.inkSecondary};">
                  ${props.bodyHtml}
                </div>
                ${noteBlockHtml}
                ${ctaHtml}
                ${secondaryActionHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:48px 0 0;">
                <div style="border-top:1px solid ${c.border};padding:20px 0 0;font-family:${f.interface};font-size:12px;line-height:18px;color:${c.inkMuted};">
                  ${reasonHtml}
                  <p style="margin:0 0 10px;">
                    <a href="${safePreferencesUrl}" style="color:${c.inkMuted};text-decoration:underline;">Email settings</a>${unsubscribeLink}
                  </p>
                  <p style="margin:0;">
                    ${escapeHtml(LEGAL_ENTITY_NAME || 'Missa')}${
                      hasPostalAddress()
                        ? `, ${escapeHtml(LEGAL_POSTAL_ADDRESS).replace(/\n/g, ', ')}`
                        : ''
                    } &nbsp;·&nbsp; <a href="mailto:${escapeHtml(LEGAL_CONTACT_EMAIL)}" style="color:${c.inkMuted};text-decoration:underline;">${escapeHtml(LEGAL_CONTACT_EMAIL)}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
