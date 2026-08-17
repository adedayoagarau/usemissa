import { Resend } from "resend";
import {
  beginPlatformMessageEffect,
  completePlatformMessageEffect,
} from "@missa/radar-adapters";

export type ProfileContactField =
  "senderName" | "senderEmail" | "message" | "idempotencyKey";

export interface ProfileContactInput {
  senderName: string;
  senderEmail: string;
  message: string;
  idempotencyKey: string;
}

export class ProfileContactValidationError extends Error {
  constructor(
    readonly field: ProfileContactField,
    message: string,
  ) {
    super(message);
    this.name = "ProfileContactValidationError";
  }
}

function requiredText(
  value: unknown,
  field: ProfileContactField,
  label: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string")
    throw new ProfileContactValidationError(field, `${label} is required.`);
  const normalized = value.trim().replace(/\r\n?/gu, "\n");
  if (normalized.length < minimum)
    throw new ProfileContactValidationError(field, `${label} is required.`);
  if (normalized.length > maximum)
    throw new ProfileContactValidationError(
      field,
      `${label} must be ${maximum} characters or fewer.`,
    );
  if (/[^\P{C}\n\t]/u.test(normalized))
    throw new ProfileContactValidationError(
      field,
      `${label} contains unsupported characters.`,
    );
  return normalized;
}

export function normalizeProfileContactInput(
  value: unknown,
): ProfileContactInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ProfileContactValidationError(
      "message",
      "Add your contact details and message.",
    );
  const candidate = value as Record<string, unknown>;
  const senderName = requiredText(
    candidate.senderName,
    "senderName",
    "Your name",
    2,
    100,
  );
  const senderEmail = requiredText(
    candidate.senderEmail,
    "senderEmail",
    "Your email",
    3,
    320,
  ).toLowerCase();
  if (!/^\S+@\S+\.\S+$/u.test(senderEmail))
    throw new ProfileContactValidationError(
      "senderEmail",
      "Enter a valid email address.",
    );
  const message = requiredText(
    candidate.message,
    "message",
    "Your message",
    20,
    2_000,
  );
  const idempotencyKey = requiredText(
    candidate.idempotencyKey,
    "idempotencyKey",
    "Message identifier",
    16,
    100,
  );
  if (!/^[A-Za-z0-9_-]+$/u.test(idempotencyKey))
    throw new ProfileContactValidationError(
      "idempotencyKey",
      "Message identifier is invalid.",
    );
  return { senderName, senderEmail, message, idempotencyKey };
}

export async function deliverProfileContactEmail(input: {
  contact: ProfileContactInput;
  recipientAccountId: string;
  recipientEmail: string;
}): Promise<"sent" | "replayed" | "unavailable"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const connectionString = process.env.DATABASE_URL;
  if (!apiKey || !from || !connectionString) return "unavailable";

  const effect = await beginPlatformMessageEffect(connectionString, {
    idempotencyKey: `profile-contact:${input.recipientAccountId}:${input.contact.idempotencyKey}`,
    kind: "profile-contact",
    provider: "resend",
    metadata: {
      source: "public-profile",
      recipientAccountId: input.recipientAccountId,
    },
  });
  if (!effect.shouldDeliver) return "replayed";

  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: input.recipientEmail,
      replyTo: input.contact.senderEmail,
      subject: "New message through your Missa Profile",
      text: `${input.contact.senderName} sent you a message through your Missa Profile.\n\n${input.contact.message}\n\nReply to this email to write back to ${input.contact.senderName}.`,
    });
    if (result.error) throw new Error("Provider send failed");
    await completePlatformMessageEffect({
      connectionString,
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      status: "sent",
      providerMessageId: result.data?.id,
    });
    return "sent";
  } catch {
    await completePlatformMessageEffect({
      connectionString,
      effectId: effect.effectId,
      attemptNumber: effect.attemptNumber,
      status: "failed",
      error: "Provider send failed",
    }).catch(() => undefined);
    return "unavailable";
  }
}
