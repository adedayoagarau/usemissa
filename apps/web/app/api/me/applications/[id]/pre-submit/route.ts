import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { preSubmitChecks } from "@/lib/pre-submit-check";
import { PreSubmitRepository } from "@/lib/pre-submit-repository";

const headers = { "Cache-Control": "private, no-store" };

/** What Missa can and cannot verify before this application is sent. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to check this application." },
      { status: 401, headers },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Checks are unavailable." },
      { status: 503, headers },
    );
  try {
    const input = await new PreSubmitRepository().input(
      session.account.id,
      (await params).id,
    );
    if (!input)
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404, headers },
      );
    return NextResponse.json({ checks: preSubmitChecks(input) }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Checks could not load." },
      { status: 503, headers },
    );
  }
}
