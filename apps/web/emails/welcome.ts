import { letterText, renderLetter, type LetterProps } from "./components/letter";
import { siteUrl } from "../lib/siteUrl";
import { sendMail, type SendMailReport } from "../lib/mail-service";
import { sp, type Spelling } from "../lib/spelling";

export interface WelcomeEmailProps {
  accountId: string;
  email: string;
  givenName?: string;
  displayName?: string;
  /** UK readers get UK spelling (lib/spelling.ts). */
  spelling?: Spelling;
}

/** The first letter after sign-up: what Missa is, and three ways to make it yours. */
export function renderWelcomeEmail(props: WelcomeEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welcome to Missa";
  const name = props.givenName?.trim() || props.displayName?.trim() || "";
  const url = (path: string) => new URL(path, `${siteUrl()}/`).toString();
  const letter: LetterProps = {
    subject,
    preheader: sp("Every call links to the organizer's own page. Here's how to make Missa yours.", props.spelling),
    from: { kind: "missa" },
    headline: name ? `Welcome to Missa, ${name}.` : "Welcome to Missa.",
    blocks: [
      {
        kind: "paragraph",
        text: sp("Missa lists open calls, grants and residencies, each linked to the organizer's own page. Three things make it yours.", props.spelling),
      },
      {
        kind: "steps",
        steps: [
          {
            title: "Choose what you make",
            line: "Pick your disciplines and genres. The Sunday List and Selected for you follow them.",
            link: { label: "Choose your disciplines", url: url("/profile") },
          },
          {
            title: "Save a call to your Tracker",
            line: "Saved calls show their deadline, what to send and where you are.",
            link: { label: "Browse open calls", url: url("/opportunities") },
          },
          {
            title: "Keep reminder emails on",
            line: "Missa emails the reminders you set, in your own time zone.",
            link: { label: "Check your settings", url: url("/inbox") },
          },
        ],
      },
    ],
    footer: { reason: "You get this because you created a Missa account.", preferencesUrl: url("/inbox") },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
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
    templateVersion: "welcome.v3",
    metadata: { accountId: props.accountId },
    connectionString,
    retryFailed: true,
  });
}
