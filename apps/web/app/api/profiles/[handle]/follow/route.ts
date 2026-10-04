import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorConnectionsRepository } from "@/lib/creatorRepositories";
import { publishedProfileOwner } from "@/lib/profile-connections";

async function change(
  request: Request,
  params: Promise<{ handle: string }>,
  following: boolean,
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to follow creators." },
      { status: 401 },
    );
  const owner = await publishedProfileOwner((await params).handle);
  if (!owner)
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (owner.accountId === session.account.id)
    return NextResponse.json(
      { error: "This is your own profile." },
      { status: 400 },
    );
  const repo = getCreatorConnectionsRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Following is unavailable right now." },
      { status: 503 },
    );
  try {
    if (following) await repo.follow(session.account.id, owner.accountId);
    else await repo.unfollow(session.account.id, owner.accountId);
    return NextResponse.json({ following });
  } catch {
    return NextResponse.json(
      { error: "Could not update. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  return change(request, params, true);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  return change(request, params, false);
}
