import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const session = token ? await getSessionAccountFromToken(token) : null;

    const body = await request.json().catch(() => null);
    if (!body || typeof body.profileId !== "string" || !body.profileId.trim()) {
      return NextResponse.json(
        { error: "A valid magazine identifier is required." },
        { status: 400, headers: noStore }
      );
    }

    if (!body.submittedDate || typeof body.submittedDate !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid submission date (YYYY-MM-DD)." },
        { status: 400, headers: noStore }
      );
    }

    const repo = getMagazineRankingRepository();
    const result = await repo.recordSubmissionTelemetry({
      profileId: body.profileId.trim(),
      userId: session?.account?.userId ?? null,
      genre: body.genre && ["fiction", "poetry", "nonfiction", "hybrid"].includes(body.genre) ? body.genre : null,
      submittedDate: body.submittedDate,
      decisionDate: body.decisionDate || null,
      responseDays: typeof body.responseDays === "number" ? Math.max(1, Math.round(body.responseDays)) : null,
      outcome: body.outcome && ["accepted", "rejected", "withdrawn", "pending"].includes(body.outcome) ? body.outcome : null,
      rejectionType: body.rejectionType && ["form", "tiered_personal", "editor_note"].includes(body.rejectionType) ? body.rejectionType : null,
      feePaidCents: typeof body.feePaidCents === "number" ? Math.max(0, Math.round(body.feePaidCents)) : 0,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Could not record telemetry. Please try again." },
        { status: 500, headers: noStore }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for contributing to the community turnaround index!",
        newMedianDays: result.newMedianDays,
      },
      { status: 200, headers: noStore }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: noStore }
    );
  }
}
