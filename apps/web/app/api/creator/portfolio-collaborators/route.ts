import { NextResponse } from "next/server";
import { readUserHandle } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { consumeCollaboratorLookupRateLimit } from "@/lib/collaborator-rate-limit";
import { MAX_COLLABORATOR_LOOKUPS } from "@/lib/portfolio-collaborators";
import { collaboratorStatuses } from "@/lib/portfolio-server-facts";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

/**
 * Where each credit in the studio stands: Confirmed once the other creator's
 * published profile lists you back, otherwise waiting. Signed-in creators only,
 * at most twelve handles, rate limited.
 *
 * The answer only ever says "confirmed", "waiting" or "no published profile".
 * An unclaimed handle and a claimed one that has not published read the same,
 * which is all `/@handle` says, so nothing leaks. Confirmed is computed from
 * the other creator's published profile and your own handle, never from
 * anything sent in the request.
 */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json(
      { error: "Sign in to check your credits." },
      { status: 401, headers: noStore },
    );
  const retryAfter = consumeCollaboratorLookupRateLimit({
    sessionKey: session.account.id,
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown",
  });
  if (retryAfter)
    return NextResponse.json(
      { error: "Please wait a little before checking again." },
      {
        status: 429,
        headers: { ...noStore, "Retry-After": String(retryAfter) },
      },
    );
  const handles = (new URL(request.url).searchParams.get("handles") ?? "")
    .split(",")
    .map((handle) => handle.trim().slice(0, 60))
    .filter(Boolean);
  if (handles.length > MAX_COLLABORATOR_LOOKUPS)
    return NextResponse.json(
      { error: `Check up to ${MAX_COLLABORATOR_LOOKUPS} people at a time.` },
      { status: 400, headers: noStore },
    );
  if (!getCreatorProfileRepository() || !process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Account storage is unavailable." },
      { status: 503, headers: noStore },
    );
  try {
    const [yourHandle, collaborators] = await Promise.all([
      readUserHandle(process.env.DATABASE_URL, session.account.userId),
      collaboratorStatuses(
        { accountId: session.account.id, userId: session.account.userId },
        handles,
      ),
    ]);
    return NextResponse.json(
      { yourHandle: yourHandle?.handleKey ?? null, collaborators },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not check your credits. Please retry." },
      { status: 503, headers: noStore },
    );
  }
}
