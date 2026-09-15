import {
  EMAIL_COLORS,
  EMAIL_FONTS,
  escapeHtml,
} from "./components/base-layout";
import { siteUrl } from "../lib/siteUrl";
import { sendMail, type SendMailReport } from "../lib/mail-service";

export interface WelcomeEmailProps {
  accountId: string;
  email: string;
  givenName?: string;
  displayName?: string;
}

export function renderWelcomeEmail(props: WelcomeEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welcome to Missa";
  const name = props.givenName?.trim() || props.displayName?.trim() || "";
  const safeName = escapeHtml(name);
  const title = name ? `Welcome to Missa, ${safeName}.` : "Welcome to Missa.";
  const opportunitiesUrl = new URL(
    "/opportunities",
    `${siteUrl()}/`,
  ).toString();
  const logoUrl = new URL(
    "/brand/missa-wordmark-240.svg",
    `${siteUrl()}/`,
  ).toString();
  const welcomeImageUrl = new URL(
    "/media/missa-bosphorus-poster.jpg",
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
    <title>${subject}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .missa-welcome-frame { padding: 24px 18px 28px !important; }
        .missa-welcome-title { font-size: 34px !important; line-height: 38px !important; }
        .missa-welcome-action { display: block !important; text-align: center !important; }
      }
      @media (prefers-color-scheme: dark) {
        .missa-welcome-body, .missa-welcome-shell { background: #171418 !important; }
        .missa-welcome-frame { background: #1f1c20 !important; border-color: #45413d !important; }
        .missa-welcome-title, .missa-welcome-lead { color: #ffffff !important; }
        .missa-welcome-copy, .missa-welcome-footer { color: #d4d3d0 !important; }
        .missa-welcome-rule { border-color: #45413d !important; }
      }
    </style>
  </head>
  <body class="missa-welcome-body" style="margin:0;padding:0;width:100%;background:${EMAIL_COLORS.cardSurface};color:${EMAIL_COLORS.ink};font-family:${EMAIL_FONTS.interface};-webkit-font-smoothing:antialiased;">
    <div lang="en" dir="ltr" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your Missa account is ready.</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="missa-welcome-shell" style="background:${EMAIL_COLORS.cardSurface};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="missa-welcome-frame" style="max-width:560px;margin:0 auto;padding:38px 42px 34px;background:${EMAIL_COLORS.cardSurface};border:1px solid ${EMAIL_COLORS.border};text-align:left;">
            <tr>
              <td>
                <a href="${siteUrl()}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
                  <img src="${escapeHtml(logoUrl)}" alt="Missa" height="25" style="display:block;width:auto;height:25px;border:0;">
                </a>
              </td>
            </tr>
            <tr>
              <td class="missa-welcome-rule" style="padding-top:26px;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                <img src="${escapeHtml(welcomeImageUrl)}" alt="Seabirds flying above the Bosphorus." width="476" style="display:block;width:100%;max-width:476px;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding-top:36px;">
                <h1 class="missa-welcome-title" style="margin:0 0 20px;font-family:${EMAIL_FONTS.editorial};font-size:42px;font-weight:500;line-height:46px;letter-spacing:-0.025em;color:${EMAIL_COLORS.ink};">${title}</h1>
                <p class="missa-welcome-lead" style="margin:0 0 14px;font-family:${EMAIL_FONTS.interface};font-size:18px;line-height:28px;color:${EMAIL_COLORS.ink};">Your account is ready, and we’re glad you’re here.</p>
                <p class="missa-welcome-copy" style="margin:0;font-family:${EMAIL_FONTS.interface};font-size:15px;line-height:24px;color:${EMAIL_COLORS.inkSecondary};">Browse opportunities, learn about the organizations behind them, and compare open calls from around the world.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:30px;">
                <a class="missa-welcome-action" href="${escapeHtml(opportunitiesUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 24px;background:${EMAIL_COLORS.forest600};color:#ffffff;font-family:${EMAIL_FONTS.interface};font-size:15px;font-weight:650;line-height:20px;text-decoration:none;border-radius:8px;">Browse opportunities</a>
              </td>
            </tr>
            <tr>
              <td class="missa-welcome-rule" style="padding-top:42px;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="missa-welcome-footer" style="padding-top:20px;font-family:${EMAIL_FONTS.interface};font-size:12px;line-height:19px;color:${EMAIL_COLORS.inkMuted};">You received this email because you created a Missa account.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${name ? `Welcome to Missa, ${name}.` : "Welcome to Missa."}\n\nYour account is ready, and we’re glad you’re here.\n\nBrowse opportunities, learn about the organizations behind them, and compare open calls from around the world.\n\nBrowse opportunities: ${opportunitiesUrl}\n\nYou received this email because you created a Missa account.`;

  return { subject, html, text };
}

/**
 * Dispatches the welcome email after account creation.
 * Durable, idempotent per accountId.
 */
export async function deliverWelcomeEmail(
  props: WelcomeEmailProps,
  connectionString?: string,
): Promise<SendMailReport> {
  const { subject, html, text } = renderWelcomeEmail(props);
  return sendMail({
    recipientEmail: props.email,
    recipientAccountId: props.accountId,
    kind: "welcome-email",
    idempotencyKey: `welcome:${props.accountId}`,
    subject,
    html,
    text,
    templateKey: "welcome-email",
    templateVersion: "welcome.v2",
    metadata: { accountId: props.accountId },
    connectionString,
    retryFailed: true,
  });
}
