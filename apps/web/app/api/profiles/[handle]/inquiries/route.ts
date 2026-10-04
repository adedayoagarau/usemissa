import { NextResponse } from "next/server";
import { InquiryRateLimitError } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorConnectionsRepository } from "@/lib/creatorRepositories";
import {
  inquiryInput,
  inquirySenderKey,
  publishedProfileOwner,
} from "@/lib/profile-connections";
import {
  deliverProfileConnectionEmail,
  renderProfileInquiryEmail,
} from "@/emails/profile-connections";

/**
 * A visitor writes to a creator. The creator's address is never returned; the
 * message lands in their profile inbox and, when email is configured, in a
 * notification email.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const owner = await publishedProfileOwner((await params).handle);
  if (!owner)
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (!owner.inquiries)
    return NextResponse.json(
      { error: "This creator isn't taking messages through Missa." },
      { status: 403 },
    );
  const repo = getCreatorConnectionsRepository();
  if (!repo)
    return NextResponse.json(
      { error: "Messages are unavailable right now." },
      { status: 503 },
    );
  const parsed = inquiryInput.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 400 },
    );
  // Bots that fill the hidden field get the same answer as people.
  if (parsed.data.website) return NextResponse.json({ sent: true });
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (session?.account.id === owner.accountId)
    return NextResponse.json(
      { error: "This is your own profile." },
      { status: 400 },
    );
  try {
    const inquiry = await repo.createInquiry({
      creatorAccountId: owner.accountId,
      senderAccountId: session?.account.id,
      senderName: parsed.data.name,
      senderEmail: parsed.data.email,
      topic: parsed.data.topic,
      message: parsed.data.message,
      senderKey: inquirySenderKey(request),
    });
    const email = await repo.accountEmail(owner.accountId);
    if (email)
      await deliverProfileConnectionEmail({
        kind: "profile-inquiry",
        id: inquiry.id,
        accountId: owner.accountId,
        email,
        rendered: renderProfileInquiryEmail({
          senderName: inquiry.senderName,
          topic: inquiry.topic,
          message: inquiry.message,
        }),
      }).catch(() => undefined);
    return NextResponse.json({ sent: true }, { status: 201 });
  } catch (error) {
    if (error instanceof InquiryRateLimitError)
      return NextResponse.json(
        { error: "You've sent several messages today. Try again tomorrow." },
        { status: 429 },
      );
    return NextResponse.json(
      { error: "Your message wasn't sent. Please try again." },
      { status: 503 },
    );
  }
}
