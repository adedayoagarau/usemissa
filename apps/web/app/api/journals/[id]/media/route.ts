import { NextResponse } from "next/server";
import { getProfileRepository } from "@/lib/profileRepository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const repository = getProfileRepository();
  if (!repository) {
    return NextResponse.json(
      { error: "Journal media is unavailable." },
      { status: 503 },
    );
  }

  try {
    const { id } = await params;
    const media = await repository.getMediaByProfileId(id);
    if (!media) {
      return NextResponse.json(
        { error: "Journal image not found." },
        { status: 404 },
      );
    }
    if (!/^image\/[a-z0-9.+-]+$/i.test(media.contentType)) {
      return NextResponse.json(
        { error: "Journal image has an unsupported media type." },
        { status: 415 },
      );
    }

    return new NextResponse(new Uint8Array(media.payload), {
      headers: {
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
        "content-disposition": "inline",
        "content-length": String(media.byteSize),
        "content-type": media.contentType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Journal image is temporarily unavailable." },
      { status: 503 },
    );
  }
}
