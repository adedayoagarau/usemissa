import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getWritingRepository } from "@/lib/writing-repository";

const headers = { "Cache-Control": "private, no-store" };

/** The signed-in creator's entries, newest first, without their full text. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  const repository = getWritingRepository();
  if (!repository) {
    return NextResponse.json(
      {
        error: "Saving to your account is not available here.",
        unavailable: true,
      },
      { status: 503, headers },
    );
  }
  try {
    return NextResponse.json(
      { entries: await repository.list(session.account.id) },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "We could not load your writing. Try again." },
      { status: 500, headers },
    );
  }
}
