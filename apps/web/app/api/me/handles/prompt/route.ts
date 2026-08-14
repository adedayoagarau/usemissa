import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  user.handlePromptDismissedAt = new Date().toISOString();
  await persistRadar();
  return NextResponse.json({ dismissed: true });
}
