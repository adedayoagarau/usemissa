import { NextResponse } from "next/server";
import { getEditorialIntelligenceRepository } from "@/lib/editorialIntelligenceRepository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Publication identifier is required." },
        { status: 400 },
      );
    }

    const repo = getEditorialIntelligenceRepository();
    const data = await repo.getIntelligenceByProfileId(id);

    if (!data) {
      return NextResponse.json(
        { error: "Publication intelligence not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch publication intelligence",
      },
      { status: 500 },
    );
  }
}
