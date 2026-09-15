import { readUserHandle, resolveHandle } from "@missa/radar-adapters";
import { NextResponse } from "next/server";

import { portfolioSchema } from "@/lib/creator-portfolio-schema";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { getEngine } from "@/lib/engine";
import { publicCreatorProjection } from "@/lib/public-creator-projection";

const noStore = { "Cache-Control": "no-store" };

function boundedInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const { identifier: rawIdentifier } = await params;
  const searchParams = new URL(request.url).searchParams;
  const workLimit = boundedInteger(searchParams.get("workLimit"), 8, 1, 12);
  const includeWorkText = searchParams.get("includeWorkText") === "true";
  const identifier = rawIdentifier.trim();
  if (!/^@?[A-Za-z0-9_-]{1,200}$/u.test(identifier)) {
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 404, headers: noStore },
    );
  }

  const repository = getCreatorProfileRepository();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  let userId = identifier;
  let handle: string | undefined;

  if (identifier.startsWith("@")) {
    if (!databaseUrl || !repository) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404, headers: noStore },
      );
    }
    const resolved = await resolveHandle(
      databaseUrl,
      identifier.slice(1),
    ).catch(() => null);
    if (
      !resolved ||
      resolved.state !== "claimed" ||
      resolved.subjectType !== "user"
    ) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404, headers: noStore },
      );
    }
    userId = resolved.subjectId;
    handle = resolved.handleKey;
  } else if (databaseUrl) {
    handle =
      (await readUserHandle(databaseUrl, userId).catch(() => null))
        ?.handleKey ?? undefined;
  }

  const profile = repository
    ? await repository.publicProfile(userId)
    : (await getEngine()).publicUserProfile(userId);
  const parsedPortfolio = repository
    ? portfolioSchema.safeParse(await repository.publicPortfolio(userId))
    : undefined;
  const portfolio = parsedPortfolio?.success
    ? { ...parsedPortfolio.data, handle: handle ?? parsedPortfolio.data.handle }
    : undefined;
  const publicProfile = profile && !profile.isPrivate ? profile : undefined;

  if (!publicProfile && !portfolio) {
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 404, headers: noStore },
    );
  }

  const canonicalPath =
    portfolio && handle
      ? `/@${encodeURIComponent(handle)}`
      : `/profile/${encodeURIComponent(userId)}`;

  return NextResponse.json(
    publicCreatorProjection({
      canonicalPath,
      handle,
      profile: publicProfile,
      portfolio,
      workLimit,
      includeWorkText,
    }),
    { headers: noStore },
  );
}
