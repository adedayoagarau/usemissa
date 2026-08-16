import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || /[^a-zA-Z0-9_-]/.test(userId))
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  const engine = await getEngine();
  const user = engine.store.users.get(userId);
  if (!user)
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  const profile = user.publicProfilePublishedAt
    ? engine.publicUserProfile(userId)
    : { isPrivate: true as const };
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "no-store" },
  });
}
