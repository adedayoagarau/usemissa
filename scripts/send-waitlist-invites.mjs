import { Resend } from "resend";
import {
  sendWaitlistInvites,
  previewWaitlistInviteCandidates,
} from "../packages/radar-adapters/dist/src/waitlistInvites.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required for waitlist:send-invites");

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const expiresArg = process.argv.find((value) =>
  value.startsWith("--expires-days="),
);
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : 100;
const expiresInDays = expiresArg
  ? Number(expiresArg.slice("--expires-days=".length))
  : 14;

if (!args.has("--send")) {
  const candidates = await previewWaitlistInviteCandidates(
    connectionString,
    limit,
  );
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        sendOrder: "waitlist_signups.created_at asc, id asc",
        count: candidates.length,
        candidates: candidates.map(({ id, email, createdAt }) => ({
          id,
          email,
          createdAt,
        })),
        next: "Pass --send only after the publication-match report has been reviewed.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;
if (!apiKey || !from)
  throw new Error("RESEND_API_KEY and RESEND_FROM are required with --send");
const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL || "https://usemissa.com"
).replace(/\/$/u, "");
const resend = new Resend(apiKey);

const results = await sendWaitlistInvites({
  connectionString,
  limit,
  expiresInDays,
  deliver: async (invite) => {
    const inviteUrl = `${appUrl}/signup?invite=${encodeURIComponent(invite.rawToken)}`;
    const text = [
      "Your Missa invite is ready.",
      "",
      "Create your Missa account from this link:",
      inviteUrl,
      "",
      `This invite expires on ${invite.expiresAt}. If you use a different email address, enter the waitlist email you used when you joined so your priority can be connected.`,
      "",
      "If you did not join the Missa waitlist, you can ignore this message.",
    ].join("\n");
    const result = await resend.emails.send({
      from,
      to: invite.email,
      subject: "Your Missa invite is ready",
      text,
      html: `<p>Your Missa invite is ready.</p><p><a href="${inviteUrl}">Create your Missa account</a></p><p>This invite expires on ${invite.expiresAt}. If you use a different email address, enter the waitlist email you used when you joined so your priority can be connected.</p><p>If you did not join the Missa waitlist, you can ignore this message.</p>`,
      tags: [{ name: "email_type", value: "waitlist_invite" }],
    });
    if (result.error) throw new Error(result.error.message);
  },
});
console.log(
  JSON.stringify(
    {
      dryRun: false,
      sendOrder: "waitlist_signups.created_at asc, id asc",
      results: results.map(
        ({ id, waitlistSignupId, email, status, expiresAt, reason }) => ({
          id,
          waitlistSignupId,
          email,
          status,
          expiresAt,
          ...(reason ? { reason } : {}),
        }),
      ),
    },
    null,
    2,
  ),
);
