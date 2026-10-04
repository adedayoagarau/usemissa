import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { acceptedOutcomes } from "@/lib/accepted-outcomes";

export const dynamic = "force-dynamic";

/** The creator's own acceptances, offered as Confirmed Track record entries. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to see your acceptances." },
      { status: 401 },
    );
  return NextResponse.json(
    { outcomes: await acceptedOutcomes(session.account.id) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
