import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorConnectionsRepository } from "@/lib/creatorRepositories";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

/** Everything that reached this creator through their public profile. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const repo = getCreatorConnectionsRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Your profile inbox is unavailable right now." },
      { status: 503 },
    );
  try {
    const id = session.account.id;
    const [inquiries, invitations, followers, following] = await Promise.all([
      repo.inquiries(id),
      repo.invitations(id),
      repo.followers(id),
      repo.following(id),
    ]);
    return NextResponse.json(
      { inquiries, invitations, followers, following },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load your profile inbox. Please retry." },
      { status: 503 },
    );
  }
}

const change = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("inquiry"),
    id: z.string().min(1).max(64),
    status: z.enum(["new", "read", "archived"]),
  }),
  z.object({
    type: z.literal("invitation"),
    id: z.string().min(1).max(64),
    status: z.enum(["sent", "read", "declined", "archived"]),
  }),
]);

export async function PATCH(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const repo = getCreatorConnectionsRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Your profile inbox is unavailable right now." },
      { status: 503 },
    );
  const parsed = change.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success)
    return NextResponse.json({ error: "Unknown change." }, { status: 400 });
  const { type, id, status } = parsed.data;
  const updated =
    type === "inquiry"
      ? await repo.setInquiryStatus(session.account.id, id, status)
      : await repo.setInvitationStatus(session.account.id, id, status);
  if (!updated)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ updated: true });
}
