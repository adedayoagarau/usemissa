import { createHmac } from "node:crypto";
import { INQUIRY_TOPICS, resolveHandle } from "@missa/radar-adapters";
import { z } from "zod";
import { clientAddress } from "@/lib/auth-rate-limit";
import { sessionSecret, type SessionAccount } from "@/lib/auth";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";
import {
  getCreatorConnectionsRepository,
  getCreatorProfileRepository,
} from "@/lib/creatorRepositories";
import { portfolioSchema } from "@/lib/creator-portfolio-schema";
import { organizationRoleCan } from "@/lib/organizationProduct";

/**
 * The account behind a published `@handle`. Follow, inquiries and invitations
 * only exist for published profiles, so an unpublished handle resolves to
 * nothing and the caller answers 404.
 */
export async function publishedProfileOwner(rawHandle: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;
  const handle = decodeURIComponent(rawHandle).replace(/^@/, "");
  const resolved = await resolveHandle(databaseUrl, handle).catch(() => null);
  if (
    !resolved ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    return undefined;
  const published = await getCreatorProfileRepository()?.publishedPortfolio(
    resolved.subjectId,
  );
  const parsed = portfolioSchema.safeParse(published?.data);
  if (!published || !parsed.success) return undefined;
  return {
    accountId: published.accountId,
    handleKey: resolved.handleKey,
    name: parsed.data.name.trim() || `@${resolved.handleKey}`,
    inquiries: parsed.data.inquiries,
    invitations: parsed.data.invitations,
  };
}

/**
 * Organizations whose members may invite creators: roles that manage the
 * organization. Viewers and reviewers can read calls but not invite.
 */
export async function invitingOrganizations(session: SessionAccount) {
  const memberships = session.memberships.filter((membership) =>
    organizationRoleCan(membership.role, "organization.manage"),
  );
  return creatorShellOrganizations(memberships);
}

/** A keyed hash of the sender's address, so repeat sends can be limited without storing it. */
export function inquirySenderKey(request: Request) {
  const address = clientAddress(request);
  if (address === "unknown") return undefined;
  return createHmac("sha256", sessionSecret())
    .update(`inquiry:${address}`)
    .digest("hex")
    .slice(0, 32);
}

export const inquiryInput = z.object({
  name: z.string().trim().min(1, "Add your name.").max(120),
  email: z
    .string()
    .trim()
    .email("Add an email address you can be reached at.")
    .max(254),
  topic: z.enum(INQUIRY_TOPICS),
  message: z
    .string()
    .trim()
    .min(10, "Write a little more so they know what you're asking.")
    .max(4000),
  /** Honeypot: people never see or fill this field; bots that do are ignored. */
  website: z.string().max(2000).optional(),
});

export const invitationInput = z.object({
  organizationId: z.string().min(1).max(200),
  opportunityId: z.string().min(1).max(200),
  message: z.string().trim().max(1000).default(""),
});

export function connectionsUnavailable() {
  return !getCreatorConnectionsRepository();
}
