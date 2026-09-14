import { siteUrl } from '../../lib/siteUrl';

/**
 * Missa email shell.
 *
 * Two registers, one vocabulary:
 *
 * - `expressive` — welcome, waitlist, acceptance, campaigns. A large Newsreader
 *   statement on a tinted band, one citron highlight, generous spacing.
 * - `operational` — digests, deadline reminders, password resets, decisions.
 *   An Instrument Sans title, denser bands, scan-critical values in Fragment
 *   Mono. Reaches the same inbox 52 times a year, so it does not shout.
 *
 * Both are built from full-bleed horizontal bands rather than a single floating
 * card: the surface change between bands is what creates structure, per
 * DESIGN.md §7 ("depth is mostly created by white surfaces, neutral surface
 * changes, hairline borders, and clear spacing").
 */

export type EmailRegister = 'expressive' | 'operational';

export interface EmailAction {
  label: string;
  url: string;
}

export interface BaseEmailLayoutProps {
  subject: string;
  preheader?: string;
  /** Defaults to `operational` — the quieter register is the common case. */
  register?: EmailRegister;
  title: string;
  /**
   * A phrase inside `title` to set in citron. Must appear in `title` verbatim;
   * ignored when it does not. One highlight per email — it is the only place
   * the accent is spent.
   */
  titleHighlight?: string;
  /** Short standfirst under the title. Expressive register only. */
  lede?: string;
  bodyHtml: string;
  callToAction?: EmailAction;
  secondaryAction?: EmailAction;
  noteHtml?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  logoUrl?: string;
}

export const EMAIL_COLORS = {
  forest600: '#285649',
  forest700: '#1d4037',
  forest100: '#e3ece8',
  forest50: '#edf3f0',
  citron: '#ddf45b',
  ink: '#171418',
  inkSecondary: '#45413d',
  inkMuted: '#74716d',
  canvas: '#f7f7f7',
  cardSurface: '#ffffff',
  border: '#e7e7e5',
  borderStrong: '#d4d4d0',
  onInk: '#f2f2ee',
  onInkMuted: '#9a978f',
} as const;

export const EMAIL_FONTS = {
  interface: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  editorial: "'Newsreader', Georgia, 'Times New Roman', serif",
  data: "'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace",
} as const;

/** Outer width of the email. 600px is the widest every client renders unscaled. */
export const EMAIL_WIDTH = 600;

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
 * Wraps a phrase in the citron highlight. Takes already-escaped HTML.
 * `box-decoration-break` keeps the mark intact when the phrase wraps lines.
 */
export function highlight(escapedHtml: string): string {
  return `<span class="m-mark" style="background-color:${EMAIL_COLORS.citron};color:${EMAIL_COLORS.ink};padding:0 0.12em;box-decoration-break:clone;-webkit-box-decoration-break:clone;">${escapedHtml}</span>`;
}

/**
 * Sets a scan-critical value — a date, count, fee, or countdown — in Fragment
 * Mono. DESIGN.md §4 restricts this face to exactly these values, so do not
 * pass it a sentence.
 */
export function dataValue(value: string, options: { color?: string; size?: number } = {}): string {
  const color = options.color ?? EMAIL_COLORS.ink;
  const size = options.size ?? 13;
  return `<span class="m-text" style="font-family:${EMAIL_FONTS.data};font-size:${size}px;line-height:1.4;color:${color};">${escapeHtml(value)}</span>`;
}

/**
 * A heading inside the body, for emails that carry more than one list.
 *
 * Sentence case at body weight — not a tracked uppercase label. Those read as
 * eyebrows, and the system does not use eyebrows.
 */
export function renderSectionHeading(text: string, options: { first?: boolean } = {}): string {
  return `<div class="m-text" style="margin:${options.first ? '0' : '32px'} 0 2px;font-family:${EMAIL_FONTS.interface};font-size:15px;font-weight:700;line-height:22px;letter-spacing:-0.008em;color:${EMAIL_COLORS.ink};">${escapeHtml(text)}</div>`;
}

export interface RecordRowOptions {
  /** Opportunity, magazine, or org name — the quiet line above the title. */
  kicker?: string;
  title: string;
  /** Scan-critical value shown at the right of the kicker line, in Fragment Mono. */
  flag?: string;
  /** True when the flag is urgent — renders on citron rather than the sage tint. */
  flagUrgent?: boolean;
  /** Supporting line under the title: dates, category, fee. */
  meta?: string;
  /** Wraps the title in a link when given. */
  url?: string;
  /** Closes the list with a bottom rule. Set on the final row. */
  last?: boolean;
}

/**
 * One record in a list — a closing opportunity, a digest entry, a submission.
 *
 * Built as a two-cell table rather than flexbox: Outlook's Word engine ignores
 * `display:flex` entirely and collapses the row.
 */
export function renderRecordRow(options: RecordRowOptions): string {
  const flagBackground = options.flagUrgent ? EMAIL_COLORS.citron : EMAIL_COLORS.forest50;
  const flagColor = options.flagUrgent ? EMAIL_COLORS.ink : EMAIL_COLORS.forest700;

  const flagCell = options.flag
    ? `<td align="right" valign="top" style="padding:0 0 0 12px;white-space:nowrap;">
         <span class="m-flag" style="display:inline-block;background-color:${flagBackground};color:${flagColor};font-family:${EMAIL_FONTS.data};font-size:12px;line-height:16px;padding:3px 8px;border-radius:4px;">${escapeHtml(options.flag)}</span>
       </td>`
    : '';

  const kickerCell = options.kicker
    ? `<td valign="top" style="font-family:${EMAIL_FONTS.interface};font-size:12px;font-weight:600;line-height:16px;letter-spacing:0.01em;color:${EMAIL_COLORS.inkMuted};" class="m-muted">${escapeHtml(options.kicker)}</td>`
    : '<td></td>';

  const titleText = escapeHtml(options.title);
  const titleHtml = options.url
    ? `<a href="${escapeHtml(options.url)}" target="_blank" rel="noopener noreferrer" class="m-text" style="color:${EMAIL_COLORS.ink};text-decoration:none;">${titleText}</a>`
    : titleText;

  const metaHtml = options.meta
    ? `<div class="m-muted" style="margin-top:5px;font-family:${EMAIL_FONTS.interface};font-size:13px;line-height:19px;color:${EMAIL_COLORS.inkMuted};">${options.meta}</div>`
    : '';

  const edges = options.last
    ? `border-top:1px solid ${EMAIL_COLORS.border};border-bottom:1px solid ${EMAIL_COLORS.border};`
    : `border-top:1px solid ${EMAIL_COLORS.border};`;

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="m-record" style="width:100%;${edges}">
    <tr>
      <td style="padding:16px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>${kickerCell}${flagCell}</tr>
        </table>
        <div class="m-text" style="margin-top:4px;font-family:${EMAIL_FONTS.interface};font-size:17px;font-weight:600;line-height:24px;letter-spacing:-0.012em;color:${EMAIL_COLORS.ink};">
          ${titleHtml}
        </div>
        ${metaHtml}
      </td>
    </tr>
  </table>`;
}

function renderButton(action: EmailAction, variant: 'primary' | 'secondary'): string {
  if (variant === 'secondary') {
    return `<div style="margin-top:14px;">
      <a href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer" class="m-link" style="font-family:${EMAIL_FONTS.interface};font-size:14px;font-weight:600;line-height:20px;color:${EMAIL_COLORS.forest600};text-decoration:underline;">${escapeHtml(action.label)}</a>
    </div>`;
  }

  // Outlook's Word engine drops padding and border-radius on anchors, so the
  // primary button is drawn as VML there and as a normal anchor everywhere else.
  const width = Math.round(action.label.length * 8.6) + 48;

  return `<div style="margin-top:26px;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(action.url)}" style="height:46px;v-text-anchor:middle;width:${width}px;" arcsize="18%" stroke="f" fillcolor="${EMAIL_COLORS.forest600}">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;">${escapeHtml(action.label)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer" class="m-button" style="display:inline-block;background-color:${EMAIL_COLORS.forest600};color:#ffffff;font-family:${EMAIL_FONTS.interface};font-size:15px;font-weight:600;line-height:22px;text-decoration:none;padding:12px 26px;border-radius:8px;mso-line-height-rule:exactly;">${escapeHtml(action.label)}</a>
    <!--<![endif]-->
  </div>`;
}

function renderTitle(props: BaseEmailLayoutProps, register: EmailRegister): string {
  const safeTitle = escapeHtml(props.title);
  let titleHtml = safeTitle;

  if (props.titleHighlight) {
    const safeHighlight = escapeHtml(props.titleHighlight);
    if (safeTitle.includes(safeHighlight)) {
      titleHtml = safeTitle.replace(safeHighlight, highlight(safeHighlight));
    }
  }

  if (register === 'expressive') {
    return `<h1 class="m-display m-text" style="margin:0;font-family:${EMAIL_FONTS.editorial};font-size:44px;font-weight:500;letter-spacing:-0.025em;line-height:48px;color:${EMAIL_COLORS.ink};mso-line-height-rule:exactly;">${titleHtml}</h1>`;
  }

  return `<h1 class="m-title m-text" style="margin:0;font-family:${EMAIL_FONTS.interface};font-size:27px;font-weight:700;letter-spacing:-0.022em;line-height:34px;color:${EMAIL_COLORS.ink};mso-line-height-rule:exactly;">${titleHtml}</h1>`;
}

/**
 * Renders the production Missa email HTML shell.
 */
export function renderBaseEmailLayout(props: BaseEmailLayoutProps): string {
  const register: EmailRegister = props.register ?? 'operational';
  const defaultLogo = new URL('/brand/missa-wordmark-240.svg', `${siteUrl()}/`).toString();
  const safeLogoUrl = escapeHtml(props.logoUrl || defaultLogo);
  const safeSubject = escapeHtml(props.subject);
  const defaultPreferencesUrl = new URL('/profile', `${siteUrl()}/`).toString();
  const safePreferencesUrl = escapeHtml(props.preferencesUrl || defaultPreferencesUrl);

  const heroBackground = register === 'expressive' ? EMAIL_COLORS.forest50 : EMAIL_COLORS.cardSurface;
  const heroClass = register === 'expressive' ? 'm-band-tint' : 'm-band-white';
  const heroPadding = register === 'expressive' ? '40px 36px 36px' : '32px 36px 8px';

  // Trailing invisible characters stop Gmail from pulling body copy into the
  // inbox preview after the preheader ends.
  const preheaderHtml = props.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(props.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(30)}</div>`
    : '';

  const ledeHtml = props.lede && register === 'expressive'
    ? `<p class="m-secondary" style="margin:18px 0 0;font-family:${EMAIL_FONTS.interface};font-size:17px;font-weight:400;line-height:27px;color:${EMAIL_COLORS.inkSecondary};">${escapeHtml(props.lede)}</p>`
    : '';

  const noteBlockHtml = props.noteHtml
    ? `<tr>
        <td class="m-band-tint m-pad" style="padding:22px 36px;background-color:${EMAIL_COLORS.forest50};border-top:1px solid ${EMAIL_COLORS.border};">
          <div class="m-note" style="font-family:${EMAIL_FONTS.interface};font-size:14px;line-height:22px;color:${EMAIL_COLORS.forest700};">${props.noteHtml}</div>
        </td>
      </tr>`
    : '';

  const ctaHtml = props.callToAction ? renderButton(props.callToAction, 'primary') : '';
  const secondaryHtml = props.secondaryAction ? renderButton(props.secondaryAction, 'secondary') : '';

  const hasActions = Boolean(ctaHtml || secondaryHtml);

  const actionsHtml = hasActions
    ? `<tr>
        <td class="m-band-white m-pad" style="padding:0 36px 36px;background-color:${EMAIL_COLORS.cardSurface};">${ctaHtml}${secondaryHtml}</td>
      </tr>`
    : '';

  // The button carries its own 26px top margin, so the body band above it stops
  // short rather than stacking two gaps into a dead band.
  const bodyPaddingBottom = hasActions ? '6px' : '30px';

  const unsubscribeLink = props.unsubscribeUrl
    ? `&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${escapeHtml(props.unsubscribeUrl)}" style="color:${EMAIL_COLORS.onInkMuted};text-decoration:underline;">Unsubscribe</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${safeSubject}</title>
    <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Fragment+Mono&display=swap">
    <!--<![endif]-->
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }

      @media only screen and (max-width: 620px) {
        .m-pad { padding-left: 22px !important; padding-right: 22px !important; }
        .m-display { font-size: 34px !important; line-height: 38px !important; }
        .m-title { font-size: 23px !important; line-height: 29px !important; }
        .m-outer { padding: 0 !important; }
      }

      /* Apple Mail, iOS, and Outlook for Mac honour prefers-color-scheme.
         Gmail and Outlook.com force-invert instead, which these tokens are
         chosen to survive: citron and forest both hold up on a dark ground. */
      @media (prefers-color-scheme: dark) {
        .m-body, .m-outer { background-color: #101210 !important; }
        .m-band-white { background-color: #191b18 !important; }
        .m-band-tint { background-color: #1d241f !important; }
        .m-text, .m-text a { color: #eceee8 !important; }
        .m-secondary { color: #c3c6bd !important; }
        .m-muted { color: #8f9289 !important; }
        .m-note { color: #b9d6c6 !important; }
        .m-record { border-color: #2b302b !important; }
        .m-hairline { border-color: #2b302b !important; }
        .m-link { color: #8fc4ae !important; }
        .m-button { background-color: #2f6b59 !important; }
        .m-mark { background-color: ${EMAIL_COLORS.citron} !important; color: #141608 !important; }
        .m-flag { background-color: #24302a !important; color: #b9d6c6 !important; }
      }
    </style>
  </head>
  <body class="m-body" style="margin:0;padding:0;width:100%;background-color:${EMAIL_COLORS.canvas};color:${EMAIL_COLORS.ink};font-family:${EMAIL_FONTS.interface};-webkit-font-smoothing:antialiased;">
    ${preheaderHtml}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="m-outer" style="background-color:${EMAIL_COLORS.canvas};">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:${EMAIL_WIDTH}px;margin:0 auto;text-align:left;">

            <tr>
              <td class="m-band-white m-pad" style="padding:22px 36px;background-color:${EMAIL_COLORS.cardSurface};">
                <a href="${siteUrl()}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
                  <img src="${safeLogoUrl}" alt="Missa" height="24" style="display:block;height:24px;width:auto;border:0;">
                </a>
              </td>
            </tr>

            <tr>
              <td class="${heroClass} m-pad" style="padding:${heroPadding};background-color:${heroBackground};">
                ${renderTitle(props, register)}
                ${ledeHtml}
              </td>
            </tr>

            <tr>
              <td class="m-band-white m-pad" style="padding:${register === 'expressive' ? '32px' : '20px'} 36px ${bodyPaddingBottom};background-color:${EMAIL_COLORS.cardSurface};">
                <div class="m-secondary" style="font-family:${EMAIL_FONTS.interface};font-size:16px;line-height:25px;color:${EMAIL_COLORS.inkSecondary};">
                  ${props.bodyHtml}
                </div>
              </td>
            </tr>

            ${actionsHtml}
            ${noteBlockHtml}

            <tr>
              <td class="m-pad" style="padding:26px 36px 30px;background-color:${EMAIL_COLORS.ink};font-family:${EMAIL_FONTS.interface};font-size:12px;line-height:19px;color:${EMAIL_COLORS.onInkMuted};">
                <div style="color:${EMAIL_COLORS.onInk};font-size:13px;font-weight:600;margin-bottom:5px;">Missa</div>
                <div style="margin-bottom:12px;">Open calls for writers, kept in one place.</div>
                <div>
                  <a href="${safePreferencesUrl}" style="color:${EMAIL_COLORS.onInkMuted};text-decoration:underline;">Email settings</a>${unsubscribeLink}
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
