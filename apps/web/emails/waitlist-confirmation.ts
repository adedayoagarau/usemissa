export const WAITLIST_CONFIRMATION_SUBJECT = 'You’re on the Missa waitlist';
export const WAITLIST_CONFIRMATION_PREHEADER = 'We’ll send you an invite when Missa is ready.';

export interface WaitlistConfirmationEmailProps {
  logoUrl: string;
}

const colors = {
  ink: '#171418',
  muted: '#6d6670',
  border: '#e7e7e5',
  canvas: '#f7f7f7',
  aubergine: '#5a3f68',
  aubergineDark: '#473050',
  aubergineTint: '#f1edf3',
  white: '#ffffff',
};

const styles = {
  body: `background-color:${colors.canvas};color:${colors.ink};font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;width:100%;`,
  preheader: `color:${colors.canvas};display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;`,
  outerCell: 'padding:40px 16px;',
  card: `background-color:${colors.white};border:1px solid ${colors.border};border-radius:12px;margin:0 auto;max-width:600px;overflow:hidden;width:100%;`,
  header: `border-bottom:1px solid ${colors.border};padding:24px 40px;`,
  logo: 'display:block;height:auto;width:120px;',
  content: 'padding:44px 40px 40px;',
  eyebrow: `color:${colors.aubergine};font-size:11px;font-weight:700;letter-spacing:0.16em;line-height:16px;text-transform:uppercase;`,
  title: `color:${colors.ink};font-family:'Ysabeau',Georgia,'Times New Roman',serif;font-size:40px;font-weight:500;letter-spacing:-0.025em;line-height:44px;margin:12px 0 22px;`,
  paragraph: `color:${colors.ink};font-size:16px;line-height:26px;margin:0 0 18px;`,
  note: `background-color:${colors.aubergineTint};border-left:3px solid ${colors.aubergine};color:${colors.aubergineDark};font-size:14px;line-height:22px;margin:28px 0;padding:16px 18px;`,
  footer: `border-top:1px solid ${colors.border};color:${colors.muted};font-size:12px;line-height:19px;padding:24px 40px 28px;`,
} as const;

const responsiveStyles = `
  @media only screen and (max-width: 620px) {
    .missa-email-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .missa-email-content { padding-top: 36px !important; padding-bottom: 32px !important; }
    .missa-email-title { font-size: 34px !important; line-height: 38px !important; }
  }
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function renderWaitlistConfirmationEmail({ logoUrl }: WaitlistConfirmationEmailProps): string {
  const safeLogoUrl = escapeHtml(logoUrl);
  return `
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${WAITLIST_CONFIRMATION_SUBJECT}</title>
    <style>${responsiveStyles}</style>
  </head>
  <body style="${styles.body}">
    <div style="${styles.preheader}">${WAITLIST_CONFIRMATION_PREHEADER}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tbody>
        <tr>
          <td class="missa-email-pad" style="${styles.outerCell}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${styles.card}">
              <tbody>
                <tr>
                  <td class="missa-email-pad" style="${styles.header}">
                    <img src="${safeLogoUrl}" alt="Missa" width="120" style="${styles.logo}">
                  </td>
                </tr>
                <tr>
                  <td class="missa-email-content" style="${styles.content}">
                    <div style="${styles.eyebrow}">Waitlist confirmation</div>
                    <h1 class="missa-email-title" style="${styles.title}">You’re on the waitlist.</h1>
                    <p style="${styles.paragraph}">Your email has been added to the Missa waitlist. We’ll send you an invite when Missa is ready.</p>
                    <p style="${styles.paragraph}">Missa helps you find the calls that fit your work, prepare what you need, and stay on top of every deadline—with the original source close at hand.</p>
                    <div style="${styles.note}">We’re building a clearer way to move from finding an opportunity to being ready for it.</div>
                  </td>
                </tr>
                <tr>
                  <td class="missa-email-pad" style="${styles.footer}">
                    <p style="margin:0 0 8px;">Questions? Reply to this email—we read every response.</p>
                    <p style="margin:0;">You received this message because you joined the Missa waitlist at usemissa.com. If you didn’t join, you can ignore it.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`.trim();
}

export function waitlistConfirmationText(): string {
  return [
    'You’re on the waitlist.',
    '',
    'Your email has been added to the Missa waitlist. We’ll send you an invite when Missa is ready.',
    '',
    'Missa helps you find the calls that fit your work, prepare what you need, and stay on top of every deadline—with the original source close at hand.',
    '',
    'We’re building a clearer way to move from finding an opportunity to being ready for it.',
    '',
    'Questions? Reply to this email—we read every response.',
    '',
    'You received this message because you joined the Missa waitlist at usemissa.com. If you didn’t join, you can ignore it.',
  ].join('\n');
}
