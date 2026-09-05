import { siteUrl } from '../../lib/siteUrl';

export interface BaseEmailLayoutProps {
  subject: string;
  preheader?: string;
  eyebrow?: string;
  title: string;
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
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  logoUrl?: string;
}

export const EMAIL_COLORS = {
  forest600: '#285649',
  forest700: '#1d4037',
  forest50: '#edf3f0',
  ink: '#171418',
  inkSecondary: '#45413d',
  inkMuted: '#74716d',
  canvas: '#f7f7f7',
  cardSurface: '#ffffff',
  border: '#e7e7e5',
} as const;

export const EMAIL_FONTS = {
  interface: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  editorial: "'Newsreader', Georgia, 'Times New Roman', serif",
} as const;

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
 * Renders the production Missa email HTML shell adhering to DESIGN.md
 * with Forest (#285649), Instrument Sans, Newsreader, and RFC/CAN-SPAM footer.
 */
export function renderBaseEmailLayout(props: BaseEmailLayoutProps): string {
  const defaultLogo = new URL('/brand/missa-wordmark-240.svg', `${siteUrl()}/`).toString();
  const safeLogoUrl = escapeHtml(props.logoUrl || defaultLogo);
  const safeTitle = escapeHtml(props.title);
  const safeSubject = escapeHtml(props.subject);
  const defaultPreferencesUrl = new URL('/profile', `${siteUrl()}/`).toString();
  const safePreferencesUrl = escapeHtml(props.preferencesUrl || defaultPreferencesUrl);

  const preheaderHtml = props.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${EMAIL_COLORS.canvas};">${escapeHtml(props.preheader)}</div>`
    : '';

  const eyebrowHtml = props.eyebrow
    ? `<div style="font-family:${EMAIL_FONTS.interface};font-size:11px;font-weight:700;letter-spacing:0.12em;line-height:16px;text-transform:uppercase;color:${EMAIL_COLORS.forest600};margin-bottom:8px;">${escapeHtml(props.eyebrow)}</div>`
    : '';

  const ctaHtml = props.callToAction
    ? `<div style="margin:28px 0 16px;">
        <a href="${escapeHtml(props.callToAction.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${EMAIL_COLORS.forest600};color:#ffffff;font-family:${EMAIL_FONTS.interface};font-size:15px;font-weight:600;line-height:20px;text-decoration:none;padding:12px 24px;border-radius:8px;text-align:center;">
          ${escapeHtml(props.callToAction.label)}
        </a>
      </div>`
    : '';

  const secondaryActionHtml = props.secondaryAction
    ? `<div style="margin:12px 0 16px;">
        <a href="${escapeHtml(props.secondaryAction.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;color:${EMAIL_COLORS.forest600};font-family:${EMAIL_FONTS.interface};font-size:14px;font-weight:500;line-height:20px;text-decoration:underline;">
          ${escapeHtml(props.secondaryAction.label)}
        </a>
      </div>`
    : '';

  const noteBlockHtml = props.noteHtml
    ? `<div style="margin:24px 0;padding:16px 18px;background-color:${EMAIL_COLORS.forest50};border-left:3px solid ${EMAIL_COLORS.forest600};border-radius:4px;color:${EMAIL_COLORS.forest700};font-family:${EMAIL_FONTS.interface};font-size:14px;line-height:22px;">
        ${props.noteHtml}
      </div>`
    : '';

  const unsubscribeLink = props.unsubscribeUrl
    ? ` • <a href="${escapeHtml(props.unsubscribeUrl)}" style="color:${EMAIL_COLORS.inkMuted};text-decoration:underline;">Unsubscribe</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${safeSubject}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .missa-email-outer { padding: 16px 8px !important; }
        .missa-email-card { border-radius: 8px !important; }
        .missa-email-content { padding: 28px 20px 24px !important; }
        .missa-email-header { padding: 20px 20px !important; }
        .missa-email-title { font-size: 26px !important; line-height: 32px !important; }
        .missa-email-footer { padding: 20px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:${EMAIL_COLORS.canvas};color:${EMAIL_COLORS.ink};font-family:${EMAIL_FONTS.interface};-webkit-font-smoothing:antialiased;">
    ${preheaderHtml}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL_COLORS.canvas};">
      <tr>
        <td align="center" class="missa-email-outer" style="padding:40px 16px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="missa-email-card" style="max-width:600px;background-color:${EMAIL_COLORS.cardSurface};border:1px solid ${EMAIL_COLORS.border};border-radius:12px;overflow:hidden;margin:0 auto;text-align:left;">
            <tr>
              <td class="missa-email-header" style="padding:24px 36px;border-bottom:1px solid ${EMAIL_COLORS.border};">
                <a href="${siteUrl()}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
                  <img src="${safeLogoUrl}" alt="Missa" height="26" style="display:block;height:26px;width:auto;border:0;" />
                </a>
              </td>
            </tr>
            <tr>
              <td class="missa-email-content" style="padding:36px 36px 32px;color:${EMAIL_COLORS.ink};">
                ${eyebrowHtml}
                <h1 class="missa-email-title" style="margin:0 0 18px;font-family:${EMAIL_FONTS.editorial};font-size:32px;font-weight:500;letter-spacing:-0.015em;line-height:38px;color:${EMAIL_COLORS.ink};">
                  ${safeTitle}
                </h1>
                <div style="font-family:${EMAIL_FONTS.interface};font-size:15px;line-height:24px;color:${EMAIL_COLORS.inkSecondary};">
                  ${props.bodyHtml}
                </div>
                ${noteBlockHtml}
                ${ctaHtml}
                ${secondaryActionHtml}
              </td>
            </tr>
            <tr>
              <td class="missa-email-footer" style="padding:24px 36px;border-top:1px solid ${EMAIL_COLORS.border};background-color:${EMAIL_COLORS.canvas};font-family:${EMAIL_FONTS.interface};font-size:12px;line-height:18px;color:${EMAIL_COLORS.inkMuted};">
                <div style="margin-bottom:6px;">
                  Missa • Creative opportunities with source &amp; limits kept visible.
                </div>
                <div>
                  <a href="${safePreferencesUrl}" style="color:${EMAIL_COLORS.inkMuted};text-decoration:underline;">Notification preferences</a>${unsubscribeLink}
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
