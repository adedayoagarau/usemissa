import {
  letterText,
  renderLetter,
  type LetterProps,
} from "./components/letter";
import { siteUrl } from "../lib/siteUrl";
import { sendMail, type SendMailReport } from "../lib/mail-service";

const TOPIC_LABELS: Record<string, string> = {
  commission: "A commission",
  booking: "A booking or reading",
  publication: "Publication or rights",
  collaboration: "A collaboration",
  other: "Something else",
};

export function inquiryTopicLabel(topic: string) {
  return TOPIC_LABELS[topic] ?? TOPIC_LABELS.other!;
}

const url = (path: string) => new URL(path, `${siteUrl()}/`).toString();

/**
 * Tells a creator that someone wrote to them from their public profile. The
 * sender's message is quoted in full so the creator can decide from the email;
 * replying goes to the sender, never through the creator's own address.
 */
export function renderProfileInquiryEmail(props: {
  senderName: string;
  topic: string;
  message: string;
}) {
  const subject = `${props.senderName} wrote to you on Missa`;
  const letter: LetterProps = {
    subject,
    preheader: `${inquiryTopicLabel(props.topic)}: ${props.message.slice(0, 90)}`,
    from: { kind: "missa" },
    headline: `${props.senderName} wrote to you from your profile.`,
    blocks: [
      {
        kind: "facts",
        facts: [{ label: "About", value: inquiryTopicLabel(props.topic) }],
      },
      { kind: "paragraph", text: props.message },
      {
        kind: "action",
        label: "Open your profile inbox",
        url: url("/profile/inbox"),
      },
      {
        kind: "small",
        text: "Your email address was not shared. Reply from your profile inbox when you're ready; your reply comes from your own email.",
      },
    ],
    footer: {
      reason: "You get this because your public profile accepts messages.",
      preferencesUrl: url("/profile/portfolio"),
      preferencesLabel: "Turn off messages",
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

/** Tells a creator an organization invited them to apply to an open call. */
export function renderProfileInvitationEmail(props: {
  organizationName: string;
  opportunityTitle: string;
  opportunityPath: string;
  deadline?: string;
  message: string;
}) {
  const subject = `${props.organizationName} invited you to apply`;
  const blocks: LetterProps["blocks"] = [
    {
      kind: "facts",
      facts: [
        { label: "Call", value: props.opportunityTitle },
        ...(props.deadline
          ? [{ label: "Deadline", value: props.deadline, reference: true }]
          : []),
      ],
    },
  ];
  if (props.message.trim())
    blocks.push({ kind: "paragraph", text: props.message.trim() });
  blocks.push(
    { kind: "action", label: "See the call", url: url(props.opportunityPath) },
    {
      kind: "small",
      text: "An invitation is not an acceptance. The call's usual guidelines and deadline apply.",
    },
  );
  const letter: LetterProps = {
    subject,
    preheader: `${props.organizationName} would like you to apply to ${props.opportunityTitle}.`,
    from: { kind: "missa" },
    headline: `${props.organizationName} would like you to apply.`,
    blocks,
    footer: {
      reason: "You get this because your public profile accepts invitations.",
      preferencesUrl: url("/profile/portfolio"),
      preferencesLabel: "Turn off invitations",
    },
  };
  return { subject, html: renderLetter(letter), text: letterText(letter) };
}

export function deliverProfileConnectionEmail(input: {
  kind: "profile-inquiry" | "profile-invitation";
  id: string;
  accountId: string;
  email: string;
  rendered: { subject: string; html: string; text: string };
}): Promise<SendMailReport> {
  return sendMail({
    recipientEmail: input.email,
    recipientAccountId: input.accountId,
    kind: input.kind,
    idempotencyKey: `${input.kind}:${input.id}`,
    subject: input.rendered.subject,
    html: input.rendered.html,
    text: input.rendered.text,
    templateKey: input.kind,
    templateVersion: `${input.kind}.v1`,
    metadata: { accountId: input.accountId, id: input.id },
  });
}
