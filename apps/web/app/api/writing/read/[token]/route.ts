import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getWritingRepository } from "@/lib/writing-repository";
import {
  boundedWritingJson,
  readerCommentSchema,
} from "@/lib/writing-studio-data";

type Context = { params: Promise<{ token: string }> };
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });

export async function GET(_request: Request, context: Context) {
  const repository = getWritingRepository();
  if (!repository)
    return json({ error: "Reader copies are unavailable here." }, 503);
  try {
    const copy = await repository.readReaderCopy((await context.params).token);
    return copy
      ? json(copy)
      : json({ error: "This reader link is unavailable or expired." }, 404);
  } catch {
    return json(
      { error: "We could not load this reader copy. Try again." },
      500,
    );
  }
}

export async function POST(request: Request, context: Context) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Sign in to leave a comment." }, 401);
  const repository = getWritingRepository();
  if (!repository)
    return json({ error: "Reader copies are unavailable here." }, 503);
  const parsed = readerCommentSchema.safeParse(
    await boundedWritingJson(request, 32_000),
  );
  if (!parsed.success)
    return json(
      { error: "Select a quote and add a comment under 5,000 characters." },
      400,
    );
  try {
    const result = await repository.addReaderComment(
      session.account.id,
      (await context.params).token,
      parsed.data,
    );
    if (result.kind === "created")
      return json({ comment: result.comment }, 201);
    if (result.kind === "limit")
      return json(
        { error: "The comment limit has been reached. Try again later." },
        429,
      );
    if (result.kind === "invalid-anchor")
      return json(
        { error: "The quote must appear in a piece in this reader copy." },
        400,
      );
    return json({ error: "This reader link is unavailable or expired." }, 404);
  } catch {
    return json({ error: "We could not save your comment. Try again." }, 500);
  }
}
