import { NextResponse } from "next/server";
import { readUserHandle } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Handle publishing is not available here." },
      { status: 503 },
    );
  const handle = await readUserHandle(
    process.env.DATABASE_URL,
    session.account.userId,
  );
  if (!handle)
    return NextResponse.json(
      { error: "Claim a handle before publishing your Profile." },
      { status: 409 },
    );
  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (engine.publicUserProfile(user.id)?.isPrivate)
    return NextResponse.json(
      { error: "Choose at least one public Profile field before publishing." },
      { status: 409 },
    );
  user.publicProfilePublishedAt = new Date().toISOString();
  await persistRadar();
  return NextResponse.json({
    published: true,
    publishedAt: user.publicProfilePublishedAt,
  });
}
