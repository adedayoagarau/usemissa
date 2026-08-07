import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { ChatServiceError, chatEnabled, readReadOnlyChatConversation } from "@/lib/chat/chatService";

const headers = {
  "cache-control": "private, no-store",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
  if (!chatEnabled()) return NextResponse.json({ error: 'Ask Missa is not enabled in this environment.' }, { status: 404, headers });
  const { conversationId } = await params;
  try {
    const conversation = await readReadOnlyChatConversation({
      accountId: session.account.id,
      conversationId,
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404, headers });
    return NextResponse.json(conversation, { headers });
  } catch (error) {
    if (error instanceof ChatServiceError && error.code === "unavailable") {
      return NextResponse.json({ error: error.message }, { status: 503, headers });
    }
    return NextResponse.json({ error: "The conversation is temporarily unavailable." }, { status: 503, headers });
  }
}
