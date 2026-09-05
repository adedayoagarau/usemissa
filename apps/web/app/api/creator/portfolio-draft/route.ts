import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import {
  portfolioSchema,
  portfolioMediaIds,
} from "@/lib/creator-portfolio-schema";
import { portfolioRequestBody } from "@/lib/portfolio-request";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to save your profile." },
      { status: 401 },
    );
  const repo = getCreatorProfileRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Account storage is unavailable." },
      { status: 503 },
    );
  try {
    return NextResponse.json(await repo.portfolioState(session.account.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load your profile. Please retry." },
      { status: 503 },
    );
  }
}
export async function PUT(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to save your profile." },
      { status: 401 },
    );
  const repo = getCreatorProfileRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Account storage is unavailable." },
      { status: 503 },
    );
  let raw;
  try {
    raw = new TextDecoder().decode(
      await portfolioRequestBody(request, 1500000),
    );
  } catch {
    return NextResponse.json(
      { error: "This profile is too large." },
      { status: 413 },
    );
  }
  if (raw.length > 1500000)
    return NextResponse.json(
      { error: "This profile is too large." },
      { status: 413 },
    );
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }
  const parsed = portfolioSchema.safeParse(body.draft);
  if (!parsed.success || !Number.isInteger(body.revision) || body.revision < 0)
    return NextResponse.json(
      {
        error: parsed.success
          ? "Reload your profile before saving."
          : parsed.error.issues[0]?.message,
      },
      { status: 400 },
    );
  try {
    if (
      !(await repo.ownPortfolioMedia(
        session.account.id,
        portfolioMediaIds(parsed.data),
      ))
    )
      return NextResponse.json(
        { error: "Some media does not belong to this account." },
        { status: 400 },
      );
    const revision = await repo.writePortfolio(
      session.account.id,
      parsed.data,
      body.revision,
    );
    return NextResponse.json({ revision });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("another session")
            ? "This profile changed on another device. Reload before editing further."
            : "Could not save your profile. Retry shortly.",
      },
      {
        status:
          error instanceof Error && error.message.includes("another session")
            ? 409
            : 503,
      },
    );
  }
}
