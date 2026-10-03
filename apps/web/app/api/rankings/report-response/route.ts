import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { clientAddress } from "@/lib/auth-rate-limit";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { submitResponseReport } from "@/lib/responseReportSubmission";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const session = await getSessionAccount(request.headers.get("cookie"));
    const body = session ? await request.json().catch(() => null) : null;
    const repo = getMagazineRankingRepository();
    const result = await submitResponseReport({
      body,
      account: session?.account,
      ip: clientAddress(request),
      recordReport: (report) => repo.recordSubmissionTelemetry(report),
    });

    const profileId =
      result.status === 200 && body && typeof body.profileId === "string"
        ? body.profileId.trim()
        : null;
    const telemetrySummary = profileId
      ? await repo.getTelemetrySummary(profileId)
      : undefined;

    return NextResponse.json(
      telemetrySummary ? { ...result.body, telemetrySummary } : result.body,
      {
        status: result.status,
        headers: result.retryAfter
          ? { ...noStore, "Retry-After": String(result.retryAfter) }
          : noStore,
      },
    );
  } catch (error: unknown) {
    console.error("[POST report-response] Failed to save report:", error);
    return NextResponse.json(
      { error: "We could not save your report. Try again later." },
      { status: 500, headers: noStore },
    );
  }
}
