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
    const entry = new URL(request.url).searchParams.get("entry");
    const returnPath = isWritingEntryId(entry) ? `/doc?entry=${entry}` : "/doc";
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
