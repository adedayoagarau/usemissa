import { NextResponse } from "next/server";
import { chatPostInputSchema } from "@missa/contracts";
import { getSessionAccount } from "@/lib/auth";
import {
  ChatServiceError,
  chatEnabled,
  listReadOnlyChatConversations,
  runReadOnlyChatTurn,
} from "@/lib/chat/chatService";

const headers = {
  "cache-control": "private, no-store",
};

function serviceError(error: unknown): NextResponse {
  if (error instanceof ChatServiceError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.code === "not_found" ? 404 : error.code === "unavailable" ? 503 : 502,
        headers,
      },
    );
  }
  return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 503, headers });
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  if (!chatEnabled()) return NextResponse.json({ error: 'Ask Missa is not enabled in this environment.' }, { status: 404, headers });
  try {
    return NextResponse.json(
      { conversations: await listReadOnlyChatConversations(session.account.id) },
      { headers },
    );
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  if (!chatEnabled()) return NextResponse.json({ error: 'Ask Missa is not enabled in this environment.' }, { status: 404, headers });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413, headers });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "Idempotency-Key is required." }, { status: 400, headers });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = chatPostInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "message must be between 1 and 2,000 characters." }, { status: 400, headers });
  }

  if (parsed.data.organizationId && !session.memberships.some((membership) => membership.organizationId === parsed.data.organizationId)) {
    return NextResponse.json({ error: "You are not a member of this organization." }, { status: 403, headers });
  }

  try {
    const result = await runReadOnlyChatTurn({
      accountId: session.account.id,
      chat: parsed.data,
      clientIdempotencyKey: idempotencyKey,
    });
    const status = result.status === "running" ? 202 : result.idempotent ? 200 : 201;
    return NextResponse.json(result, { status, headers });
  } catch (error) {
    return serviceError(error);
  }
}
