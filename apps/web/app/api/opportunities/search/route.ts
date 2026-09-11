import { NextResponse } from "next/server";
import { opportunityBrowseResponseSchema } from "@missa/contracts";
import { getSessionAccount } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { parseOpportunityBrowseQuery } from "@/lib/opportunityQuery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseOpportunityBrowseQuery(url.searchParams);
  const session = await getSessionAccount(request.headers.get("cookie"));
  const repository = getOpportunityRepository();

  const result = await repository.browse(
    query,
    session?.account.id ? { accountId: session.account.id } : undefined
  );

  const response = opportunityBrowseResponseSchema.parse({
    items: result.items.map(({ createdAt: _createdAt, simultaneousAllowed: _simultaneousAllowed, ...item }) => item),
    nextCursor: result.nextCursor,
    total: result.total,
    query,
  });

  return NextResponse.json(response, {
    headers: {
      "cache-control": session ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
