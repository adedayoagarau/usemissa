import {
  EMAIL_COLORS,
  EMAIL_FONTS,
  escapeHtml,
} from './components/base-layout';
import { siteUrl } from '../lib/siteUrl';

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_MISSA_CONTACT_EMAIL?.trim() || 'hello@usemissa.com';

export type AuthOtpType =
  | 'email-verification'
  | 'sign-in'
  | 'forget-password';

export interface AuthOtpEmailProps {
  email: string;
  code: string;
  type: AuthOtpType;
  expiresInMinutes: number;
}

const copyByType: Record<
  AuthOtpType,
  { subject: string; title: string; instruction: string }
> = {
  'email-verification': {
    subject: 'Verify your email for Missa',
    title: 'Verify your email',
    instruction: 'finish creating your Missa account',
  },
  'sign-in': {
    subject: 'Your Missa sign-in code',
    title: 'Sign in to Missa',
    instruction: 'sign in to your Missa account',
  },
  'forget-password': {
    subject: 'Reset your Missa password',
    title: 'Reset your password',
    instruction: 'continue resetting your Missa password',
  },
};

function pluralMinutes(value: number): string {
  return `${value} minute${value === 1 ? '' : 's'}`;
}

export function renderAuthOtpEmail(props: AuthOtpEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  if (!/^\d{6}$/u.test(props.code)) {
    throw new Error('Authentication codes must contain exactly six digits.');
  }

  const copy = copyByType[props.type];
  const safeCode = escapeHtml(props.code);
  const safeEmail = escapeHtml(props.email.trim().toLowerCase());
  const expiresInMinutes = Math.max(1, Math.round(props.expiresInMinutes));
  const expiry = pluralMinutes(expiresInMinutes);
  const logoUrl = new URL(
    '/brand/missa-wordmark-240.svg',
    `${siteUrl()}/`,
  ).toString();

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(copy.subject)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .missa-auth-frame { padding: 24px 18px !important; }
        .missa-auth-code { font-size: 34px !important; letter-spacing: 0.18em !important; }
        .missa-auth-title { font-size: 30px !important; line-height: 35px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .missa-auth-body, .missa-auth-shell { background: #171418 !important; }
        .missa-auth-frame { background: #1f1c20 !important; border-color: #45413d !important; }
        .missa-auth-title, .missa-auth-code, .missa-auth-lead { color: #ffffff !important; }
        .missa-auth-copy, .missa-auth-footer { color: #d4d3d0 !important; }
        .missa-auth-rule { border-color: #45413d !important; }
        .missa-auth-code-block { background: #285649 !important; border-color: #397060 !important; }
      }
    </style>
  </head>
  <body class="missa-auth-body" style="margin:0;padding:0;width:100%;background:${EMAIL_COLORS.cardSurface};color:${EMAIL_COLORS.ink};font-family:${EMAIL_FONTS.interface};-webkit-font-smoothing:antialiased;">
    <div lang="en" dir="ltr" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">A six-digit Missa security code was requested for your email address.</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="missa-auth-shell" style="background:${EMAIL_COLORS.cardSurface};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="missa-auth-frame" style="max-width:560px;margin:0 auto;padding:38px 42px 34px;background:${EMAIL_COLORS.cardSurface};border:1px solid ${EMAIL_COLORS.border};text-align:left;">
            <tr>
              <td>
                <a href="${siteUrl()}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
                  <img src="${escapeHtml(logoUrl)}" alt="Missa" height="25" style="display:block;width:auto;height:25px;border:0;">
                </a>
              </td>
            </tr>
            <tr>
              <td class="missa-auth-rule" style="padding-top:26px;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding-top:38px;">
                <h1 class="missa-auth-title" style="margin:0 0 14px;font-family:${EMAIL_FONTS.editorial};font-size:38px;font-weight:500;line-height:43px;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink};">${escapeHtml(copy.title)}</h1>
                <p class="missa-auth-lead" style="margin:0;font-family:${EMAIL_FONTS.interface};font-size:16px;line-height:25px;color:${EMAIL_COLORS.ink};">
                  Use this code to ${escapeHtml(copy.instruction)}.
                </p>
                <p class="missa-auth-copy" style="margin:8px 0 0;font-family:${EMAIL_FONTS.interface};font-size:14px;line-height:22px;color:${EMAIL_COLORS.inkSecondary};">
                  The request was made for <strong>${safeEmail}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 0 24px;">
                <div class="missa-auth-code-block" style="padding:25px 22px 23px;background:${EMAIL_COLORS.forest50};border:1px solid ${EMAIL_COLORS.forest600};text-align:center;">
                  <div style="margin-bottom:8px;font-family:${EMAIL_FONTS.interface};font-size:11px;font-weight:700;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${EMAIL_COLORS.forest700};">Your verification code</div>
                  <div class="missa-auth-code" aria-label="Verification code ${safeCode}" style="font-family:'Fragment Mono','SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:42px;font-weight:600;line-height:50px;letter-spacing:0.22em;color:${EMAIL_COLORS.ink};font-variant-numeric:tabular-nums;white-space:nowrap;">${safeCode}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <p class="missa-auth-copy" style="margin:0 0 10px;font-family:${EMAIL_FONTS.interface};font-size:14px;line-height:22px;color:${EMAIL_COLORS.inkSecondary};">
                  Enter the six digits in the Missa window you already opened. This code expires in <strong>${expiry}</strong>.
                </p>
                <p class="missa-auth-copy" style="margin:0;font-family:${EMAIL_FONTS.interface};font-size:14px;line-height:22px;color:${EMAIL_COLORS.inkSecondary};">
                  If you did not make this request, you can ignore this email. Missa will never ask you to send this code by email or chat.
                </p>
              </td>
            </tr>
            <tr>
              <td class="missa-auth-rule" style="padding-top:34px;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="missa-auth-footer" style="padding-top:22px;font-family:${EMAIL_FONTS.interface};font-size:12px;line-height:19px;color:${EMAIL_COLORS.inkMuted};">
                This is a security email from Missa. No marketing content or tracking is required to use this code.<br>
                Need help? <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${EMAIL_COLORS.forest600};text-decoration:underline;">${escapeHtml(CONTACT_EMAIL)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${copy.subject}\n\nUse this code to ${copy.instruction}:\n\n${props.code}\n\nThe request was made for ${props.email.trim().toLowerCase()}. This code expires in ${expiry}.\n\nIf you did not make this request, you can ignore this email. Missa will never ask you to send this code by email or chat.\n\nNeed help? ${CONTACT_EMAIL}`;

  return { subject: copy.subject, html, text };
}
