import { NextResponse } from "next/server";
import { getProfileRepository } from "@/lib/profileRepository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const repository = getProfileRepository();
  if (!repository)
    return NextResponse.json(
      { error: "Journal directory is unavailable." },
      { status: 503 },
    );
  const { id } = await params;
  const profile = await repository.getById(id);
  return profile
    ? NextResponse.json(profile, {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      })
    : NextResponse.json({ error: "Journal not found" }, { status: 404 });
}
