import { opportunityDetailResponseSchema } from "@missa/contracts";
import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getOpportunityRepository, OpportunityRepositoryUnavailableError } from "@/lib/opportunityRepository";

const PUBLIC_STATUSES = new Set(["opening-soon", "open", "closing-soon", "deadline-extended"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  const { id } = await params;
  let result;
  try {
    result = await getOpportunityRepository().getById(
      id,
      session?.account.id ? { accountId: session.account.id } : undefined,
    );
  } catch (error) {
    if (error instanceof OpportunityRepositoryUnavailableError) {
      return NextResponse.json({ error: "Opportunity catalogue unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    throw error;
  }

  if (!result) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }
  if (!session && !PUBLIC_STATUSES.has(result.status)) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404, headers: { "cache-control": "public, s-maxage=60" } });
  }

  const response = opportunityDetailResponseSchema.parse({
    ...result,
    createdAt: undefined,
  });

  return NextResponse.json(response, {
    headers: {
      "cache-control": session ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
