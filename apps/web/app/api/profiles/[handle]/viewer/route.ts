import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorConnectionsRepository } from "@/lib/creatorRepositories";
import {
  invitingOrganizations,
  publishedProfileOwner,
} from "@/lib/profile-connections";

export const dynamic = "force-dynamic";

/**
 * What the current visitor can do on a public profile: follow, write, invite.
 * Signed-out visitors get the same shape with every account action off.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const owner = await publishedProfileOwner((await params).handle);
  if (!owner)
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const session = await getSessionAccount(request.headers.get("cookie"));
  const repo = getCreatorConnectionsRepository();
  const isOwner = session?.account.id === owner.accountId;
  const following =
    session && repo && !isOwner
      ? await repo
          .isFollowing(session.account.id, owner.accountId)
          .catch(() => false)
      : false;
  const organizations =
    session && !isOwner && owner.invitations
      ? await invitingOrganizations(session)
      : [];
  return NextResponse.json(
    {
      signedIn: Boolean(session),
      isOwner,
      following,
      inquiries: owner.inquiries,
      senderName: session?.account.displayName ?? "",
      senderEmail: session?.account.email ?? "",
      organizations,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
