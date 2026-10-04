import { NextResponse } from "next/server";
import { creatorPoolFor, creatorRelationalAuthorityEnabled } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { trackedDeadlineFacts } from "@/lib/tracker-facts";

const headers = { "Cache-Control": "private, no-store" };

/**
 * Stages, fee tiers and date confidence for one call in the creator's
 * Tracker, for the Tracker item sheet. A call outside this account's Tracker
 * is not found; a Tracker without relational authority has no facts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Sign in to see this call." }, { status: 401, headers });
  const databaseUrl = process.env.DATABASE_URL;
  if (!creatorRelationalAuthorityEnabled(process.env) || !databaseUrl)
    return NextResponse.json({ facts: null }, { headers });
  const { opportunityId } = await params;
  try {
    const facts = await trackedDeadlineFacts(
      creatorPoolFor(databaseUrl),
      session.account.id,
      opportunityId.slice(0, 240),
    );
    if (facts === undefined)
      return NextResponse.json({ error: "Tracker item not found" }, { status: 404, headers });
    return NextResponse.json({ facts }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Deadline details could not load. Try again." },
      { status: 503, headers },
    );
  }
}
