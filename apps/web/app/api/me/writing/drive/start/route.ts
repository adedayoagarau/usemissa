import { isWritingEntryId } from "@/lib/writing";
import { NextResponse } from "next/server";
import { driveSession } from "../_shared";
import { driveConfig, driveAuthorization } from "@/lib/writing-google-drive";
import { createWritingOAuthState } from "@/lib/writing-connections";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await driveSession(request);
  if ("response" in session) return session.response;
  try {
    const query = new URL(request.url).searchParams;
    const entry = query.get("entry");
    const params = new URLSearchParams();
    if (isWritingEntryId(entry)) params.set("entry", entry);
    else params.set("driveNew", "1");
    const action = query.get("action");
    if (action === "open" || action === "save")
      params.set("driveAction", action);
    const returnPath = params.size ? `/doc?${params}` : "/doc";
    const state = await createWritingOAuthState(
      session.accountId,
      driveConfig().redirectUri!,
      returnPath,
    );
    return NextResponse.redirect(
      driveAuthorization(state.state, state.challenge),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/doc?drive=unavailable", request.url),
    );
  }
}
