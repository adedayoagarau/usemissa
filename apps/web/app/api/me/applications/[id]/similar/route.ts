import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAccount } from "@/lib/auth";
import { scoreSimilar } from "@/lib/similar-opportunities";
import { SimilarOpportunityRepository } from "@/lib/similar-opportunity-repository";

const headers = { "Cache-Control": "private, no-store" };

/** Similar open calls for one tracked application, with plain reasons. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to see similar calls." },
      { status: 401, headers },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Similar calls are unavailable." },
      { status: 503, headers },
    );
  try {
    const repository = new SimilarOpportunityRepository();
    const found = await repository.anchor(
      session.account.id,
      (await params).id,
    );
    if (!found)
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404, headers },
      );
    const matches = scoreSimilar({
      anchor: found.anchor,
      reason: found.reason,
      candidates: await repository.candidates(session.account.id, found.anchor),
    });
    return NextResponse.json({ reason: found.reason, matches }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Similar calls could not load." },
      { status: 503, headers },
    );
  }
}

const hideInput = z.object({ opportunityId: z.string().min(1).max(240) });

/** Hide one suggestion for this application only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to change suggestions." },
      { status: 401, headers },
    );
  const input = hideInput.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Choose a call to hide." },
      { status: 400, headers },
    );
  try {
    const repository = new SimilarOpportunityRepository();
    const anchorId = (await params).id;
    if (!(await repository.anchor(session.account.id, anchorId)))
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404, headers },
      );
    await repository.hide(
      session.account.id,
      anchorId,
      input.data.opportunityId,
    );
    return NextResponse.json({ hidden: true }, { headers });
  } catch {
    return NextResponse.json(
      { error: "That suggestion could not be hidden." },
      { status: 503, headers },
    );
  }
}
