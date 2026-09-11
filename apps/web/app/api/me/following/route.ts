import { NextResponse } from "next/server";
import { z } from "zod";
import {
  creatorCommandEnvelope,
  CreatorConflictError,
  CreatorIdempotencyConflictError,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import {
  CreatorFollowingRepository,
  FollowingValidationError,
} from "@/lib/creator-following";
const headers = { "Cache-Control": "private, no-store" };
const target = z.object({
  kind: z.enum(["organization", "program"]),
  id: z.string().min(1).max(200),
});
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to view Following." },
      { status: 401, headers },
    );
  const p = new URL(request.url).searchParams,
    kind = p.get("kind") === "program" ? "program" : "organization";
  try {
    const repo = new CreatorFollowingRepository();
    if (p.get("id")) {
      const detail = await repo.detail(session.account.id, kind, p.get("id")!);
      return NextResponse.json(
        detail ?? { error: "This record is unavailable." },
        { status: detail ? 200 : 404, headers },
      );
    }
    const result = await repo.search(session.account.id, {
      kind,
      query: (p.get("q") ?? "").slice(0, 160),
      discipline: p.get("discipline") || undefined,
      followed: p.get("followed") === "1",
      page: Math.max(0, Math.min(500, Math.floor(Number(p.get("page")) || 0))),
    });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json(
      { error: "Following could not load. Try again." },
      { status: 503, headers },
    );
  }
}
async function change(request: Request, remove: boolean) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Sign in to follow organizations and programs." },
      { status: 401, headers },
    );
  const input = target.safeParse(await request.json().catch(() => null)),
    revision = remove ? Number(request.headers.get("If-Match")) : 1;
  if (!input.success || !Number.isSafeInteger(revision) || revision < 1)
    return NextResponse.json(
      { error: "Refresh this record before changing it." },
      { status: 400, headers },
    );
  try {
    const repo = new CreatorFollowingRepository(),
      envelope = creatorCommandEnvelope(
        session.account.id,
        remove ? "following.remove" : "following.add",
        request.headers.get("Idempotency-Key") ?? "",
        input.data,
        revision,
      );
    const receipt = await (remove
      ? repo.unfollow(envelope, input.data.kind, input.data.id)
      : repo.follow(envelope, input.data.kind, input.data.id));
    return NextResponse.json({ receipt }, { headers });
  } catch (e) {
    const conflict =
      e instanceof CreatorConflictError ||
      e instanceof CreatorIdempotencyConflictError;
    return NextResponse.json(
      {
        error: conflict
          ? "Following changed. Reload this record before trying again."
          : e instanceof FollowingValidationError
            ? e.message
            : "The change could not be saved. Try again.",
      },
      {
        status: conflict
          ? 409
          : e instanceof FollowingValidationError
            ? 400
            : 503,
        headers,
      },
    );
  }
}
export const POST = (request: Request) => change(request, false);
export const DELETE = (request: Request) => change(request, true);
