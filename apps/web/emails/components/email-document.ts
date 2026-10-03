import { siteUrl } from '../../lib/siteUrl';
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_POSTAL_ADDRESS, hasPostalAddress } from '../../lib/legalContact';
import { EMAIL_FONTS, escapeHtml } from './base-layout';

/**
 * Hex values of the Missa tokens the creator emails use; email clients cannot
 * read CSS variables. Citron is the approved homepage highlight, used here for
 * the one action on a Forest ground.
 */
export const CREATOR_EMAIL_COLORS = {
  forestDeep: '#1d4037',
  forest: '#285649',
  onForest: '#ffffff',
  onForestSoft: '#cfe0d8',
  onForestMuted: '#9fbdb1',
  forestRule: '#2f5a4d',
  citron: '#ddf45b',
  ochreTint: '#f5ecd9',
  ochreRule: '#e2cfa9',
  ochreDeep: '#78551e',
  paper: '#ffffff',
  ink: '#171418',
  inkSecondary: '#45413d',
  inkMuted: '#6d6670',
  rule: '#e3e7e5',
  night: '#171418',
  onNight: '#b9afbd',
  canvas: '#f2f2f0',
  lichenTint: '#eef1e8',
} as const;

/**
 * Inline style for a coloured ground. The Gmail app inverts every colour in
 * dark mode, but leaves gradients alone, so a flat gradient keeps the colour.
 */
export const fill = (color: string) => `background-color:${color};background-image:linear-gradient(${color},${color});`;

/**
 * Keeps light text light on a dark ground in the Gmail app's dark mode. Gmail
 * renders the email inside <u> + .body, so the blend rules apply only there and
 * cancel its inversion; other clients ignore them. Only white survives the
 * blend, so softer tints on Forest read as white in Gmail dark mode.
 */
export const keepLight = (html: string) =>
  `<div class="gmail-blend-screen"><div class="gmail-blend-difference">${html}</div></div>`;

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap';

export const wordmark = (variant: 'white' | 'ink', width = 102) => {
  const file = variant === 'white' ? 'missa-wordmark-email-white.png' : 'missa-wordmark-email.png';
  const height = Math.round((width * 57) / 265);
  return `<img src="${escapeHtml(new URL(`/brand/${file}`, `${siteUrl()}/`).toString())}" alt="Missa" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;border:0;outline:none;text-decoration:none;" />`;
};

/**
 * The outer document every creator email shares: light colour scheme, Missa's
 * faces where the client loads web fonts (Georgia and Helvetica elsewhere), a
 * hidden preheader, and the mobile overrides the templates opt into by class.
 */
export function renderEmailDocument(props: { subject: string; preheader: string; background: string; bodyHtml: string }): string {
  const f = EMAIL_FONTS;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(props.subject)}</title>
    <link rel="stylesheet" href="${FONT_STYLESHEET}">
    <style>
      :root { color-scheme: light only; supported-color-schemes: light; }
      body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
      table { border-collapse: collapse; }
      u + .body .gmail-blend-screen { background: #000; mix-blend-mode: screen; }
      u + .body .gmail-blend-difference { background: #000; mix-blend-mode: difference; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      @media only screen and (max-width: 520px) {
        .m-pad { padding-left: 20px !important; padding-right: 20px !important; }
        .m-hide { display: none !important; width: 0 !important; }
        .m-full { display: block !important; width: 100% !important; }
        .m-title { font-size: 52px !important; line-height: 54px !important; }
        .m-display { font-size: 88px !important; line-height: 76px !important; }
        .m-placard { font-size: 28px !important; line-height: 32px !important; }
      }
    </style>
  </head>
  <body class="body" bgcolor="${props.background}" style="margin:0;padding:0;width:100%;${fill(props.background)}font-family:${f.interface};-webkit-font-smoothing:antialiased;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(props.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${props.background}" style="${fill(props.background)}">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${props.background}" style="max-width:600px;margin:0 auto;text-align:left;${fill(props.background)}">
            ${props.bodyHtml}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Footer rows: why the email came, the settings and unsubscribe links, and the
 * sender's legal identity. Tone follows the ground the footer sits on.
 */
export function renderEmailFooter(props: {
  tone: 'forest' | 'night';
  reason: string;
  preferencesUrl?: string;
  preferencesLabel?: string;
  unsubscribeUrl?: string;
  /** Replaces the legal sender line, e.g. "Poets House sent this through Missa". */
  senderLine?: string;
}): string {
  const c = CREATOR_EMAIL_COLORS;
  const f = EMAIL_FONTS;
  const color = props.tone === 'forest' ? c.onForestMuted : c.onNight;
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:underline;">${escapeHtml(label)}</a>`;
  const preferences = link(props.preferencesUrl ?? new URL('/inbox', `${siteUrl()}/`).toString(), props.preferencesLabel ?? 'Email settings');
  const unsubscribe = props.unsubscribeUrl ? ` &nbsp;·&nbsp; ${link(props.unsubscribeUrl, 'Unsubscribe')}` : '';
  const address = hasPostalAddress() ? `, ${escapeHtml(LEGAL_POSTAL_ADDRESS).replace(/\n/g, ', ')}` : '';
  const ground = props.tone === 'night' ? c.night : c.forestDeep;
  const top = props.tone === 'forest' ? `border-top:1px solid ${c.forestRule};` : '';
  const mark = props.tone === 'night' ? `<div style="margin:0 0 14px;">${wordmark('white', 72)}</div>` : '';
  return `
    <tr>
      <td class="m-pad" bgcolor="${ground}" style="${fill(ground)}${top}padding:28px 40px 40px;font-family:${f.interface};font-size:12px;line-height:19px;color:${color};">
        ${mark}
        ${keepLight(`<p style="margin:0 0 10px;">${escapeHtml(props.reason)}</p>
        <p style="margin:0 0 10px;">${preferences}${unsubscribe}</p>
        <p style="margin:0;">${props.senderLine ? escapeHtml(props.senderLine) : `${escapeHtml(LEGAL_ENTITY_NAME || 'Missa')}${address}`} &nbsp;·&nbsp; ${link(`mailto:${LEGAL_CONTACT_EMAIL}`, LEGAL_CONTACT_EMAIL)}</p>`)}
      </td>
    </tr>`;
}
