import { NextResponse } from "next/server";
import { driveSession } from "../_shared";
import { exchangeDriveCode } from "@/lib/writing-google-drive";
import { consumeWritingOAuthState } from "@/lib/writing-connections";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await driveSession(request);
  if ("response" in session) return session.response;
  const query = new URL(request.url).searchParams;
  let result = "failed",
    returnPath = "/doc";
  try {
    const state = query.get("state");
    if (!state || state.length > 200) throw new Error("Invalid state");
    const consumed = await consumeWritingOAuthState(session.accountId, state);
    if (consumed) returnPath = consumed.returnPath;
    if (!consumed || !query.get("code") || query.has("error"))
      throw new Error("Invalid authorization");
    await exchangeDriveCode(
      session.accountId,
      query.get("code")!,
      consumed.verifier,
      consumed.redirectUri,
    );
    result = "connected";
  } catch {
    /* No tokens or provider errors enter redirects/logs. */
  }
  const target = new URL(returnPath, request.url);
  target.searchParams.set("drive", result);
  return NextResponse.redirect(target);
}
