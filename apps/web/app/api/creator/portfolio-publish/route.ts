import { NextResponse } from "next/server";
import { readUserHandle } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { verifiedOutcomes } from "@/lib/accepted-outcomes";
import {
  portfolioSchema,
  portfolioMediaIds,
  publicationIssue,
  publicPortfolioProjection,
  withServerProvenance,
} from "@/lib/creator-portfolio-schema";
import {
  normalizedCollaborators,
  reviewPortfolioDraft,
} from "@/lib/portfolio-server-facts";
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Sign in to publish." }, { status: 401 });
  const repo = getCreatorProfileRepository();
  if (!repo || !process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Publishing is unavailable." },
      { status: 503 },
    );
  try {
    const body = await request.json();
    const handle = await readUserHandle(
      process.env.DATABASE_URL,
      session.account.userId,
    );
    if (!handle)
      return NextResponse.json(
        { error: "Choose and claim a handle first." },
        { status: 409 },
      );
    const state = await repo.portfolioState(session.account.id);
    const parsed = portfolioSchema.safeParse(state.draft);
    if (!parsed.success || !parsed.data.name.trim())
      return NextResponse.json(
        { error: "Add your display name before publishing." },
        { status: 400 },
      );
    const draft = normalizedCollaborators(parsed.data);
    const { facts, issue: factsIssue } = await reviewPortfolioDraft(draft, {
      accountId: session.account.id,
      userId: session.account.userId,
    });
    if (factsIssue)
      return NextResponse.json({ error: factsIssue }, { status: 400 });
    // The snapshot keeps credits that are still waiting, so the people named
    // can confirm them against it; every public read drops them again.
    const projection = publicPortfolioProjection(
      withServerProvenance(
        draft,
        await verifiedOutcomes(session.account.id),
        facts,
      ),
      { keepOutcomeIds: true, keepPendingCollaborators: true },
    );
    const issue = publicationIssue(projection);
    if (issue) return NextResponse.json({ error: issue }, { status: 400 });
    if (body.revision !== state.revision)
      return NextResponse.json(
        { error: "Your draft changed. Save and review it again." },
        { status: 409 },
      );
    const publishedAt = await repo.publishPortfolio(
      session.account.id,
      state.revision,
      portfolioMediaIds(projection),
      projection,
    );
    return NextResponse.json({ publishedAt, href: `/@${handle.handleKey}` });
  } catch {
    return NextResponse.json(
      { error: "Could not publish. Save and review your draft, then retry." },
      { status: 409 },
    );
  }
}
export async function DELETE(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to unpublish." },
      { status: 401 },
    );
  const repo = getCreatorProfileRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Publishing is unavailable." },
      { status: 503 },
    );
  try {
    await repo.unpublishPortfolio(session.account.id);
    return NextResponse.json({ publishedAt: null });
  } catch {
    return NextResponse.json(
      { error: "Could not unpublish. Please retry." },
      { status: 503 },
    );
  }
}
