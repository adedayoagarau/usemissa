import { opportunityDetailResponseSchema } from "@missa/contracts";
import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionAccount(request.headers.get("cookie"));
  const result = await getOpportunityRepository().getById(
    id,
    session?.account.id ? { accountId: session.account.id } : undefined,
  );

  if (!result) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
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
